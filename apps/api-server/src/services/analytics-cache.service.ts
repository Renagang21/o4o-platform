import { cacheService } from './cache.service';
import logger from '../utils/logger';
import { EventEmitter } from 'events';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  tags?: string[]; // Tags for cache invalidation
  refreshInterval?: number; // Auto-refresh interval in seconds
  priority?: 'high' | 'medium' | 'low'; // Cache priority
}

export interface CacheEntry {
  key: string;
  data: any;
  tags: string[];
  createdAt: Date;
  expiresAt: Date;
  accessCount: number;
  lastAccessed: Date;
  priority: string;
}

export class AnalyticsCacheService extends EventEmitter {
  private readonly defaultTTL = 300; // 5 minutes
  private readonly maxCacheSize = 1000;
  private readonly cleanupInterval = 60000; // 1 minute
  private cleanupTimer?: NodeJS.Timer;
  
  // Cache metadata store (in-memory for fast access)
  private cacheMetadata = new Map<string, Omit<CacheEntry, 'data'>>();
  
  constructor() {
    super();
    this.startCleanupTask();
    
    // Listen for data changes to invalidate related cache entries
    this.setupEventListeners();
  }

  /**
   * Enhanced cache set with tagging and analytics-specific optimizations
   */
  async set(key: string, data: any, options: CacheOptions = {}): Promise<void> {
    const {
      ttl = this.defaultTTL,
      tags = [],
      priority = 'medium'
    } = options;

    try {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + (ttl * 1000));
      
      // Store data in Redis
      await cacheService.set(key, data, { ttl } as any);
      
      // Store metadata locally for fast tag-based operations
      this.cacheMetadata.set(key, {
        key,
        tags: [...tags, 'analytics'], // Always add 'analytics' tag
        createdAt: now,
        expiresAt,
        accessCount: 0,
        lastAccessed: now,
        priority
      });
      
      // Store tag mappings for reverse lookup
      for (const tag of tags) {
        await this.addKeyToTag(tag, key);
      }
      
      // Emit cache set event
      this.emit('cache:set', { key, tags, ttl });
      
      // Clean up if cache is too large
      if (this.cacheMetadata.size > this.maxCacheSize) {
        await this.evictLRU();
      }
    } catch (error) {
      logger.error('Error setting analytics cache:', error);
      throw error;
    }
  }

  /**
   * Enhanced cache get with access tracking
   */
  async get(key: string): Promise<any> {
    try {
      const metadata = this.cacheMetadata.get(key);
      
      if (!metadata) {
        return null;
      }
      
      // Check if expired
      if (new Date() > metadata.expiresAt) {
        await this.delete(key);
        return null;
      }
      
      // Get data from Redis
      const data = await cacheService.get(key);
      
      if (data === null) {
        // Data not in Redis but metadata exists - clean up metadata
        this.cacheMetadata.delete(key);
        return null;
      }
      
      // Update access statistics
      metadata.accessCount++;
      metadata.lastAccessed = new Date();
      
      // Emit cache hit event
      this.emit('cache:hit', { key, accessCount: metadata.accessCount });
      
      return data;
    } catch (error) {
      logger.error('Error getting from analytics cache:', error);
      return null;
    }
  }

  /**
   * Delete a specific cache entry
   */
  async delete(key: string): Promise<void> {
    try {
      const metadata = this.cacheMetadata.get(key);
      
      if (metadata) {
        // Remove from tag mappings
        for (const tag of metadata.tags) {
          await this.removeKeyFromTag(tag, key);
        }
        
        // Remove metadata
        this.cacheMetadata.delete(key);
      }
      
      // Remove from Redis
      await cacheService.delete(key);
      
      this.emit('cache:delete', { key });
    } catch (error) {
      logger.error('Error deleting from analytics cache:', error);
    }
  }

  /**
   * Invalidate all cache entries with specific tags
   */
  async invalidateByTags(tags: string[]): Promise<void> {
    try {
      const keysToInvalidate = new Set<string>();
      
      for (const tag of tags) {
        const tagKeys = await this.getKeysWithTag(tag);
        tagKeys.forEach(key => keysToInvalidate.add(key));
      }
      
      // Delete all matching keys
      const deletePromises = Array.from(keysToInvalidate).map(key => this.delete(key));
      await Promise.all(deletePromises);
      
      logger.info(`Invalidated ${keysToInvalidate.size} cache entries with tags: ${tags.join(', ')}`);
      
      this.emit('cache:invalidate', { tags, count: keysToInvalidate.size });
    } catch (error) {
      logger.error('Error invalidating cache by tags:', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    totalEntries: number;
    totalAccessCount: number;
    hitRate: number;
    memoryUsage: string;
    topKeys: Array<{ key: string; accessCount: number; tags: string[] }>;
    tagDistribution: { [tag: string]: number };
  }> {
    const entries = Array.from(this.cacheMetadata.values());
    const totalAccessCount = entries.reduce((sum, entry) => sum + entry.accessCount, 0);
    
    // Get top accessed keys
    const topKeys = entries
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, 10)
      .map(entry => ({
        key: entry.key,
        accessCount: entry.accessCount,
        tags: entry.tags
      }));
    
    // Get tag distribution
    const tagDistribution: { [tag: string]: number } = {};
    entries.forEach(entry => {
      entry.tags.forEach(tag => {
        tagDistribution[tag] = (tagDistribution[tag] || 0) + 1;
      });
    });
    
    return {
      totalEntries: entries.length,
      totalAccessCount,
      hitRate: 0, // Would need miss tracking to calculate
      memoryUsage: `${entries.length * 100} bytes`, // Rough estimate
      topKeys,
      tagDistribution
    };
  }

  /**
   * Warm up cache with frequently accessed data
   */
  async warmUp(): Promise<void> {
    try {
      logger.info('Starting analytics cache warm-up...');
      
      // Import services that generate analytics data
      // Note: Using dynamic import with type-only import to avoid circular dependency
      const analyticsModule = await import('./analytics.service');
      const AnalyticsService = analyticsModule.AnalyticsService;
      const analyticsService = new AnalyticsService();
      
      // Warm up common dashboard analytics
      const commonFilters = [
        {}, // No filters - overall data
        { startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, // Last 7 days
        { startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }, // Last 30 days
      ];
      
      const warmUpTasks = [];
      
      for (const filters of commonFilters) {
        // Dashboard analytics
        warmUpTasks.push(
          analyticsService.getDashboardAnalytics(filters).catch(err => 
            logger.warn('Cache warm-up failed for dashboard analytics:', err.message)
          )
        );
        
        // Inventory overview
        warmUpTasks.push(
          analyticsService.getInventoryOverview(filters).catch(err => 
            logger.warn('Cache warm-up failed for inventory overview:', err.message)
          )
        );
        
        // Vendor rankings
        warmUpTasks.push(
          analyticsService.getVendorRankings(filters, 10).catch(err => 
            logger.warn('Cache warm-up failed for vendor rankings:', err.message)
          )
        );
      }
      
      await Promise.all(warmUpTasks);
      
      logger.info('Analytics cache warm-up completed');
    } catch (error) {
      logger.error('Error during cache warm-up:', error);
    }
  }

  /**
   * Clear all analytics cache entries
   */
  async clear(): Promise<void> {
    try {
      const keys = Array.from(this.cacheMetadata.keys());
      const deletePromises = keys.map(key => this.delete(key));
      await Promise.all(deletePromises);
      
      logger.info(`Cleared ${keys.length} analytics cache entries`);
    } catch (error) {
      logger.error('Error clearing analytics cache:', error);
    }
  }

  // Private helper methods

  private async addKeyToTag(tag: string, key: string): Promise<void> {
    try {
      const tagKey = `tag:${tag}`;
      const existingKeys = await cacheService.get(tagKey) || [];
      const updatedKeys = Array.from(new Set([...(existingKeys as any), key]));
      await cacheService.set(tagKey, updatedKeys, { ttl: 86400 } as any); // 24 hours TTL for tag mappings
    } catch (error) {
      logger.error(`Error adding key to tag ${tag}:`, error);
    }
  }

  private async removeKeyFromTag(tag: string, key: string): Promise<void> {
    try {
      const tagKey = `tag:${tag}`;
      const existingKeys = await cacheService.get(tagKey) || [];
      const updatedKeys = (existingKeys as any).filter((k: string) => k !== key);
      
      if (updatedKeys.length > 0) {
        await cacheService.set(tagKey, updatedKeys, { ttl: 86400 } as any);
      } else {
        await cacheService.delete(tagKey);
      }
    } catch (error) {
      logger.error(`Error removing key from tag ${tag}:`, error);
    }
  }

  private async getKeysWithTag(tag: string): Promise<string[]> {
    try {
      const tagKey = `tag:${tag}`;
      return await cacheService.get(tagKey) || [];
    } catch (error) {
      logger.error(`Error getting keys with tag ${tag}:`, error);
      return [];
    }
  }

  private async evictLRU(): Promise<void> {
    try {
      const entries = Array.from(this.cacheMetadata.values());
      
      // Sort by last accessed (oldest first) and priority (low priority first)
      entries.sort((a, b) => {
        if (a.priority !== b.priority) {
          const priorityOrder = { low: 0, medium: 1, high: 2 };
          return priorityOrder[a.priority as keyof typeof priorityOrder] - 
                 priorityOrder[b.priority as keyof typeof priorityOrder];
        }
        return a.lastAccessed.getTime() - b.lastAccessed.getTime();
      });
      
      // Remove oldest 10% of entries
      const toRemove = Math.floor(entries.length * 0.1);
      const keysToRemove = entries.slice(0, toRemove).map(entry => entry.key);
      
      const deletePromises = keysToRemove.map(key => this.delete(key));
      await Promise.all(deletePromises);
      
      logger.info(`Evicted ${toRemove} cache entries using LRU strategy`);
    } catch (error) {
      logger.error('Error during LRU eviction:', error);
    }
  }

  private startCleanupTask(): void {
    this.cleanupTimer = setInterval(async () => {
      try {
        const now = new Date();
        const expiredKeys: string[] = [];
        
        for (const [key, metadata] of this.cacheMetadata.entries()) {
          if (now > metadata.expiresAt) {
            expiredKeys.push(key);
          }
        }
        
        if (expiredKeys.length > 0) {
          const deletePromises = expiredKeys.map(key => this.delete(key));
          await Promise.all(deletePromises);
          
          logger.debug(`Cleaned up ${expiredKeys.length} expired cache entries`);
        }
      } catch (error) {
        logger.error('Error during cache cleanup:', error);
      }
    }, this.cleanupInterval);
  }

  private setupEventListeners(): void {
    // Listen for data change events to invalidate related cache
    this.on('data:inventory:updated', () => {
      this.invalidateByTags(['inventory', 'dashboard', 'analytics']);
    });
    
    this.on('data:order:created', () => {
      this.invalidateByTags(['sales', 'revenue', 'dashboard', 'analytics']);
    });
    
    this.on('data:commission:updated', () => {
      this.invalidateByTags(['commission', 'vendor', 'dashboard', 'analytics']);
    });
    
    this.on('data:vendor:updated', () => {
      this.invalidateByTags(['vendor', 'dashboard', 'analytics']);
    });
  }

  /**
   * Manually trigger cache invalidation for data changes
   */
  async invalidateForDataChange(changeType: string, entityId?: string): Promise<void> {
    const tagMap: { [key: string]: string[] } = {
      'inventory': ['inventory', 'dashboard', 'forecast'],
      'order': ['sales', 'revenue', 'dashboard', 'forecast'],
      'commission': ['commission', 'vendor', 'dashboard'],
      'vendor': ['vendor', 'dashboard'],
      'supplier': ['supplier', 'inventory', 'dashboard'],
      'product': ['product', 'inventory', 'dashboard', 'forecast']
    };
    
    const tagsToInvalidate = tagMap[changeType] || ['analytics'];
    
    if (entityId) {
      tagsToInvalidate.push(`${changeType}:${entityId}`);
    }
    
    await this.invalidateByTags(tagsToInvalidate);
    
    logger.debug(`Invalidated cache for ${changeType} change`, { entityId, tags: tagsToInvalidate });
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer as any);
      this.cleanupTimer = undefined;
    }
    
    this.cacheMetadata.clear();
    this.removeAllListeners();
  }
}

// Export singleton instance
export const analyticsCacheService = new AnalyticsCacheService();