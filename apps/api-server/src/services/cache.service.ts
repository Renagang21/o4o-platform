import { RedisService } from './redis.service';
import logger from '../utils/logger';

export enum CacheKeys {
  // Vendor caching
  VENDOR_LIST = 'vendor:list',
  VENDOR_DETAILS = 'vendor:details',
  VENDOR_STATS = 'vendor:stats',
  VENDOR_COMMISSION = 'vendor:commission',
  
  // Supplier caching  
  SUPPLIER_LIST = 'supplier:list',
  SUPPLIER_DETAILS = 'supplier:details',
  SUPPLIER_PRODUCTS = 'supplier:products',
  SUPPLIER_SETTLEMENT = 'supplier:settlement',
  
  // Commission caching
  COMMISSION_STATS = 'commission:stats',
  COMMISSION_HISTORY = 'commission:history',
  SETTLEMENT_STATS = 'settlement:stats',
  
  // Analytics caching
  PERFORMANCE_STATS = 'analytics:performance',
  ERROR_STATS = 'analytics:errors',
  DASHBOARD_DATA = 'dashboard:data',
  
  // Product caching
  PRODUCT_LIST = 'product:list',
  INVENTORY_STATUS = 'inventory:status',
  STOCK_ALERTS = 'stock:alerts'
}

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  compress?: boolean; // Compress large objects
  tags?: string[]; // Cache invalidation tags
}

export class CacheService {
  private redis: RedisService;
  private defaultTTL = 300; // 5 minutes default
  private compressionThreshold = 1024; // 1KB

  constructor() {
    this.redis = new RedisService();
  }

  // Generic cache methods
  async get<T>(key: string): Promise<T | null> {
    try {
      const cached = await this.redis.get(key);
      if (!cached) {
        return null;
      }

      // Check if compressed
      if (cached.startsWith('COMPRESSED:')) {
        const compressed = cached.substring(11);
        const decompressed = this.decompress(compressed);
        return JSON.parse(decompressed);
      }

      return JSON.parse(cached);
    } catch (error) {
      logger.error('Cache get error:', { key, error });
      return null;
    }
  }

  async set<T>(key: string, value: T, options: CacheOptions = {}): Promise<boolean> {
    try {
      const ttl = options.ttl || this.defaultTTL;
      let serialized = JSON.stringify(value);

      // Compress if large
      if (options.compress && serialized.length > this.compressionThreshold) {
        serialized = 'COMPRESSED:' + this.compress(serialized);
      }

      await this.redis.setex(key, ttl, serialized);

      // Store cache tags for invalidation
      if (options.tags && options.tags.length > 0) {
        await this.storeCacheTags(key, options.tags, ttl);
      }

      return true;
    } catch (error) {
      logger.error('Cache set error:', { key, error });
      return false;
    }
  }

  async del(key: string): Promise<boolean> {
    try {
      await this.redis.del(key);
      return true;
    } catch (error) {
      logger.error('Cache delete error:', { key, error });
      return false;
    }
  }

  async invalidateByTag(tag: string): Promise<number> {
    try {
      const keys = await this.redis.smembers(`tag:${tag}`);
      if (keys.length === 0) {
        return 0;
      }

      // Delete all keys with this tag
      await this.redis.del(...keys);
      
      // Clean up tag set
      await this.redis.del(`tag:${tag}`);

      logger.info(`Invalidated ${keys.length} cache entries for tag: ${tag}`);
      return keys.length;
    } catch (error) {
      logger.error('Cache invalidation error:', { tag, error });
      return 0;
    }
  }

  // Vendor-specific cache methods
  async getVendorList(filters: any): Promise<any[] | null> {
    const cacheKey = `${CacheKeys.VENDOR_LIST}:${this.hashFilters(filters)}`;
    return this.get(cacheKey);
  }

  async setVendorList(filters: any, data: any[], ttl: number = 300): Promise<boolean> {
    const cacheKey = `${CacheKeys.VENDOR_LIST}:${this.hashFilters(filters)}`;
    return this.set(cacheKey, data, { ttl, tags: ['vendors'] });
  }

  async getVendorDetails(vendorId: string): Promise<any | null> {
    const cacheKey = `${CacheKeys.VENDOR_DETAILS}:${vendorId}`;
    return this.get(cacheKey);
  }

  async setVendorDetails(vendorId: string, data: any, ttl: number = 600): Promise<boolean> {
    const cacheKey = `${CacheKeys.VENDOR_DETAILS}:${vendorId}`;
    return this.set(cacheKey, data, { ttl, tags: ['vendors', `vendor:${vendorId}`] });
  }

  async getVendorCommission(vendorId: string, filters: any): Promise<any | null> {
    const cacheKey = `${CacheKeys.VENDOR_COMMISSION}:${vendorId}:${this.hashFilters(filters)}`;
    return this.get(cacheKey);
  }

  async setVendorCommission(vendorId: string, filters: any, data: any, ttl: number = 300): Promise<boolean> {
    const cacheKey = `${CacheKeys.VENDOR_COMMISSION}:${vendorId}:${this.hashFilters(filters)}`;
    return this.set(cacheKey, data, { ttl, tags: ['commissions', `vendor:${vendorId}`] });
  }

  // Supplier-specific cache methods
  async getSupplierList(filters: any): Promise<any[] | null> {
    const cacheKey = `${CacheKeys.SUPPLIER_LIST}:${this.hashFilters(filters)}`;
    return this.get(cacheKey);
  }

  async setSupplierList(filters: any, data: any[], ttl: number = 300): Promise<boolean> {
    const cacheKey = `${CacheKeys.SUPPLIER_LIST}:${this.hashFilters(filters)}`;
    return this.set(cacheKey, data, { ttl, tags: ['suppliers'] });
  }

  async getSupplierProducts(supplierId: string, filters: any): Promise<any[] | null> {
    const cacheKey = `${CacheKeys.SUPPLIER_PRODUCTS}:${supplierId}:${this.hashFilters(filters)}`;
    return this.get(cacheKey);
  }

  async setSupplierProducts(supplierId: string, filters: any, data: any[], ttl: number = 300): Promise<boolean> {
    const cacheKey = `${CacheKeys.SUPPLIER_PRODUCTS}:${supplierId}:${this.hashFilters(filters)}`;
    return this.set(cacheKey, data, { ttl, tags: ['products', `supplier:${supplierId}`] });
  }

  async getSupplierSettlement(supplierId: string, filters: any): Promise<any | null> {
    const cacheKey = `${CacheKeys.SUPPLIER_SETTLEMENT}:${supplierId}:${this.hashFilters(filters)}`;
    return this.get(cacheKey);
  }

  async setSupplierSettlement(supplierId: string, filters: any, data: any, ttl: number = 300): Promise<boolean> {
    const cacheKey = `${CacheKeys.SUPPLIER_SETTLEMENT}:${supplierId}:${this.hashFilters(filters)}`;
    return this.set(cacheKey, data, { ttl, tags: ['settlements', `supplier:${supplierId}`] });
  }

  // Commission-specific cache methods
  async getCommissionStats(timeRange: string): Promise<any | null> {
    const cacheKey = `${CacheKeys.COMMISSION_STATS}:${timeRange}`;
    return this.get(cacheKey);
  }

  async setCommissionStats(timeRange: string, data: any, ttl: number = 600): Promise<boolean> {
    const cacheKey = `${CacheKeys.COMMISSION_STATS}:${timeRange}`;
    return this.set(cacheKey, data, { ttl, tags: ['commissions', 'stats'] });
  }

  // Analytics cache methods
  async getDashboardData(userId: string, role: string): Promise<any | null> {
    const cacheKey = `${CacheKeys.DASHBOARD_DATA}:${role}:${userId}`;
    return this.get(cacheKey);
  }

  async setDashboardData(userId: string, role: string, data: any, ttl: number = 300): Promise<boolean> {
    const cacheKey = `${CacheKeys.DASHBOARD_DATA}:${role}:${userId}`;
    return this.set(cacheKey, data, { ttl, tags: ['dashboard', `user:${userId}`] });
  }

  async getPerformanceStats(timeRange: string): Promise<any | null> {
    const cacheKey = `${CacheKeys.PERFORMANCE_STATS}:${timeRange}`;
    return this.get(cacheKey);
  }

  async setPerformanceStats(timeRange: string, data: any, ttl: number = 300): Promise<boolean> {
    const cacheKey = `${CacheKeys.PERFORMANCE_STATS}:${timeRange}`;
    return this.set(cacheKey, data, { ttl, tags: ['analytics', 'performance'] });
  }

  // Cache warming methods
  async warmVendorCache(): Promise<void> {
    logger.info('Starting vendor cache warm-up');
    
    try {
      // Warm up basic vendor list with common filters
      const commonFilters = [
        { status: 'active' },
        { status: 'pending' },
        { vendorType: 'individual' },
        { vendorType: 'company' }
      ];

      for (const filter of commonFilters) {
        // This would call the actual service to populate cache
        // Implementation depends on your service layer
      }

      logger.info('Vendor cache warm-up completed');
    } catch (error) {
      logger.error('Vendor cache warm-up failed:', error);
    }
  }

  async warmCommissionCache(): Promise<void> {
    logger.info('Starting commission cache warm-up');
    
    try {
      // Warm up commission stats for common time ranges
      const timeRanges = ['hour', 'day', 'week', 'month'];
      
      for (const range of timeRanges) {
        // This would call the commission service to populate cache
        // Implementation depends on your service layer
      }

      logger.info('Commission cache warm-up completed');
    } catch (error) {
      logger.error('Commission cache warm-up failed:', error);
    }
  }

  // Utility methods
  private async storeCacheTags(key: string, tags: string[], ttl: number): Promise<void> {
    for (const tag of tags) {
      await this.redis.sadd(`tag:${tag}`, key);
      await this.redis.expire(`tag:${tag}`, ttl + 60); // Expire tag sets slightly later
    }
  }

  private hashFilters(filters: any): string {
    // Create a consistent hash from filter object
    const sortedKeys = Object.keys(filters).sort();
    const filterString = sortedKeys
      .map(key => `${key}:${JSON.stringify(filters[key])}`)
      .join('|');
    
    // Simple hash function (in production, consider using crypto)
    let hash = 0;
    for (let i = 0; i < filterString.length; i++) {
      const char = filterString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  private compress(data: string): string {
    // Simple compression placeholder
    // In production, use a real compression library like zlib
    return Buffer.from(data).toString('base64');
  }

  private decompress(data: string): string {
    // Simple decompression placeholder
    // In production, use a real compression library like zlib
    return Buffer.from(data, 'base64').toString();
  }

  // Cache statistics
  async getCacheStats(): Promise<any> {
    try {
      const info = await this.redis.info();
      const keyCount = await this.redis.dbsize();
      
      return {
        connected: true,
        keyCount,
        memoryUsed: info.used_memory_human || 'Unknown',
        memoryPeak: info.used_memory_peak_human || 'Unknown',
        uptime: info.uptime_in_seconds || 0
      };
    } catch (error) {
      logger.error('Failed to get cache stats:', error);
      return {
        connected: false,
        error: error.message
      };
    }
  }
}

export const cacheService = new CacheService();