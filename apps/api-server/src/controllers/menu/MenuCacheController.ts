import { Request, Response } from 'express';
import { Repository } from 'typeorm';
import { AppDataSource } from '../../database/connection';
import { Menu } from '../../entities/Menu';
import { MenuItem } from '../../entities/MenuItem';
import logger from '../../utils/logger';
import { AuthRequest } from '../../types/auth';
import * as crypto from 'crypto';

interface CacheEntry {
  menuId: string;
  key: string;
  data: any;
  html?: string;
  createdAt: Date;
  expiresAt: Date;
  hits: number;
  size: number;
  version: string;
}

interface CacheStatus {
  totalCached: number;
  totalSize: number;
  oldestCache: Date | null;
  newestCache: Date | null;
  hitRate: number;
  missRate: number;
  averageResponseTime: number;
  cacheEntries: CacheEntry[];
}

export class MenuCacheController {
  private menuRepository: Repository<Menu>;
  private menuItemRepository: Repository<MenuItem>;
  
  // In production, use Redis or similar cache storage
  private cache: Map<string, CacheEntry> = new Map();
  private cacheHits = 0;
  private cacheMisses = 0;
  private responseTimes: number[] = [];

  constructor() {
    this.menuRepository = AppDataSource.getRepository(Menu);
    this.menuItemRepository = AppDataSource.getRepository(MenuItem);
  }

  /**
   * POST /api/v1/menus/:id/cache
   * Create or refresh menu cache
   */
  async createMenuCache(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { ttl = 3600, prerender = false } = req.body; // TTL in seconds

      const startTime = Date.now();

      // Fetch menu with all items
      const menu = await this.menuRepository.findOne({
        where: { id },
        relations: ['items']
      });

      if (!menu) {
        res.status(404).json({
          success: false,
          error: 'Menu not found'
        });
        return;
      }

      // Build menu tree structure
      const menuTree = await this.buildMenuTree(menu);

      // Generate cache key
      const cacheKey = this.generateCacheKey(id);

      // Calculate data size
      const dataString = JSON.stringify(menuTree);
      const dataSize = Buffer.byteLength(dataString, 'utf8');

      // Create cache entry
      const cacheEntry: CacheEntry = {
        menuId: id,
        key: cacheKey,
        data: menuTree,
        html: prerender ? await this.prerenderMenuHTML(menuTree) : undefined,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + ttl * 1000),
        hits: 0,
        size: dataSize,
        version: crypto.randomBytes(8).toString('hex')
      };

      // Store in cache
      this.cache.set(cacheKey, cacheEntry);

      // Invalidate old entries for this menu
      this.invalidateOldCacheEntries(id, cacheKey);

      const responseTime = Date.now() - startTime;
      this.responseTimes.push(responseTime);

      res.status(201).json({
        success: true,
        data: {
          cacheKey,
          version: cacheEntry.version,
          expiresAt: cacheEntry.expiresAt,
          size: dataSize,
          prerendered: !!prerender,
          responseTime
        },
        message: 'Menu cache created successfully'
      });
    } catch (error) {
      logger.error('Error creating menu cache:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create menu cache'
      });
    }
  }

  /**
   * DELETE /api/v1/menus/:id/cache
   * Clear menu cache
   */
  async deleteMenuCache(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      let deletedCount = 0;
      
      // Find and delete all cache entries for this menu
      for (const [key, entry] of this.cache.entries()) {
        if (entry.menuId === id) {
          this.cache.delete(key);
          deletedCount++;
        }
      }

      if (deletedCount === 0) {
        res.status(404).json({
          success: false,
          error: 'No cache entries found for this menu'
        });
        return;
      }

      res.json({
        success: true,
        data: {
          deletedEntries: deletedCount
        },
        message: `Cleared ${deletedCount} cache entries for menu`
      });
    } catch (error) {
      logger.error('Error deleting menu cache:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete menu cache'
      });
    }
  }

  /**
   * GET /api/v1/menus/cache-status
   * Get overall cache status
   */
  async getCacheStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      const cacheEntries = Array.from(this.cache.values());
      
      // Calculate statistics
      const totalSize = cacheEntries.reduce((sum, entry) => sum + entry.size, 0);
      const totalHits = cacheEntries.reduce((sum, entry) => sum + entry.hits, 0);
      const totalRequests = this.cacheHits + this.cacheMisses;
      
      const oldestCache = cacheEntries.length > 0
        ? cacheEntries.reduce((oldest, entry) => 
            entry.createdAt < oldest ? entry.createdAt : oldest, 
            cacheEntries[0].createdAt)
        : null;
        
      const newestCache = cacheEntries.length > 0
        ? cacheEntries.reduce((newest, entry) => 
            entry.createdAt > newest ? entry.createdAt : newest, 
            cacheEntries[0].createdAt)
        : null;

      const averageResponseTime = this.responseTimes.length > 0
        ? this.responseTimes.reduce((sum, time) => sum + time, 0) / this.responseTimes.length
        : 0;

      const status: CacheStatus = {
        totalCached: cacheEntries.length,
        totalSize,
        oldestCache,
        newestCache,
        hitRate: totalRequests > 0 ? (this.cacheHits / totalRequests) * 100 : 0,
        missRate: totalRequests > 0 ? (this.cacheMisses / totalRequests) * 100 : 0,
        averageResponseTime,
        cacheEntries: cacheEntries.map(entry => ({
          ...entry,
          data: undefined // Don't include actual data in status response
        }))
      };

      res.json({
        success: true,
        data: status
      });
    } catch (error) {
      logger.error('Error getting cache status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get cache status'
      });
    }
  }

  /**
   * GET /api/v1/menus/:id/cached
   * Get cached menu (internal use)
   */
  async getCachedMenu(menuId: string): Promise<CacheEntry | null> {
    const cacheKey = this.generateCacheKey(menuId);
    const entry = this.cache.get(cacheKey);

    if (!entry) {
      this.cacheMisses++;
      return null;
    }

    // Check if expired
    if (entry.expiresAt < new Date()) {
      this.cache.delete(cacheKey);
      this.cacheMisses++;
      return null;
    }

    // Update hits
    entry.hits++;
    this.cacheHits++;

    return entry;
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private generateCacheKey(menuId: string): string {
    return `menu:${menuId}:${Date.now()}`;
  }

  private invalidateOldCacheEntries(menuId: string, currentKey: string): void {
    for (const [key, entry] of this.cache.entries()) {
      if (entry.menuId === menuId && key !== currentKey) {
        this.cache.delete(key);
      }
    }
  }

  private async buildMenuTree(menu: Menu): Promise<any> {
    const items = await this.menuItemRepository.find({
      where: { menu_id: menu.id },
      order: { order_num: 'ASC' }
    });

    const itemMap = new Map();
    const rootItems: any[] = [];

    // First pass: create all items
    items.forEach(item => {
      itemMap.set(item.id, {
        id: item.id,
        title: item.title,
        url: item.url,
        type: item.type,
        target: item.target,
        cssClasses: item.css_class,
        description: (item as any).description || '',
        metadata: item.metadata,
        children: []
      });
    });

    // Second pass: build tree
    items.forEach(item => {
      const mappedItem = itemMap.get(item.id);
      if (item.parent?.id) {
        const parent = itemMap.get(item.parent.id);
        if (parent) {
          parent.children.push(mappedItem);
        }
      } else {
        rootItems.push(mappedItem);
      }
    });

    return {
      menu: {
        id: menu.id,
        name: menu.name,
        slug: menu.slug,
        location: menu.location
      },
      items: rootItems
    };
  }

  private async prerenderMenuHTML(menuTree: any): Promise<string> {
    // Simple HTML rendering - in production, use a proper template engine
    let html = '<nav class="menu">\n';
    html += '  <ul class="menu-list">\n';
    
    const renderItems = (items: any[], depth = 0): string => {
      let itemsHtml = '';
      const indent = '    '.repeat(depth + 1);
      
      for (const item of items) {
        itemsHtml += `${indent}<li class="menu-item">\n`;
        itemsHtml += `${indent}  <a href="${item.url || '#'}" `;
        
        if (item.target) {
          itemsHtml += `target="${item.target}" `;
        }
        
        if (item.cssClasses) {
          itemsHtml += `class="${item.cssClasses}" `;
        }
        
        itemsHtml += `>${item.title}</a>\n`;
        
        if (item.children && item.children.length > 0) {
          itemsHtml += `${indent}  <ul class="submenu">\n`;
          itemsHtml += renderItems(item.children, depth + 2);
          itemsHtml += `${indent}  </ul>\n`;
        }
        
        itemsHtml += `${indent}</li>\n`;
      }
      
      return itemsHtml;
    };
    
    html += renderItems(menuTree.items);
    html += '  </ul>\n';
    html += '</nav>';
    
    return html;
  }

  /**
   * Clear all cache entries
   */
  clearAllCache(): void {
    this.cache.clear();
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.responseTimes = [];
  }

  /**
   * Clear expired cache entries
   */
  clearExpiredCache(): void {
    const now = new Date();
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt < now) {
        this.cache.delete(key);
      }
    }
  }
}