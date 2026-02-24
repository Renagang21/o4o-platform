/**
 * Cache Configuration
 * R-8-7: Performance Optimization - Caching Strategy
 *
 * Centralized cache configuration for the application
 */

export interface CacheConfig {
  // Cache implementation type
  type: 'memory' | 'redis';

  // Redis configuration (when type is 'redis')
  redis?: {
    host: string;
    port: number;
    password?: string;
    db?: number;
    keyPrefix?: string;
  };

  // Memory cache configuration
  memory?: {
    max: number; // Maximum number of items
    checkPeriod?: number; // Check for expired items (seconds)
  };

  // Default TTL values (in seconds)
  ttl: {
    short: number; // 30-60 seconds (Dashboard summaries)
    medium: number; // 5 minutes (Computed caches)
    long: number; // 1 hour (Pre-computed data)
    day: number; // 24 hours
  };
}

/**
 * Get cache configuration from environment variables
 */
export function getCacheConfig(): CacheConfig {
  const cacheType = (process.env.CACHE_TYPE || 'memory') as 'memory' | 'redis';

  const config: CacheConfig = {
    type: cacheType,
    ttl: {
      short: parseInt(process.env.CACHE_TTL_SHORT || '60'), // 1 minute
      medium: parseInt(process.env.CACHE_TTL_MEDIUM || '300'), // 5 minutes
      long: parseInt(process.env.CACHE_TTL_LONG || '3600'), // 1 hour
      day: parseInt(process.env.CACHE_TTL_DAY || '86400') // 24 hours
    }
  };

  if (cacheType === 'redis') {
    config.redis = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
      keyPrefix: process.env.REDIS_KEY_PREFIX || 'o4o:'
    };
  } else {
    config.memory = {
      max: parseInt(process.env.MEMORY_CACHE_MAX || '1000'),
      checkPeriod: parseInt(process.env.MEMORY_CACHE_CHECK_PERIOD || '600') // 10 minutes
    };
  }

  return config;
}

/**
 * Cache key patterns
 */
export const CacheKeys = {
  // Dashboard caches (TTL: short)
  SELLER_DASHBOARD_SUMMARY: (sellerId: string) => `dashboard:seller:${sellerId}:summary`,
  SELLER_DASHBOARD_ORDERS: (sellerId: string, page: number, filters: string) =>
    `dashboard:seller:${sellerId}:orders:${page}:${filters}`,

  SUPPLIER_DASHBOARD_SUMMARY: (supplierId: string) => `dashboard:supplier:${supplierId}:summary`,
  SUPPLIER_DASHBOARD_ORDERS: (supplierId: string, page: number, filters: string) =>
    `dashboard:supplier:${supplierId}:orders:${page}:${filters}`,

  CUSTOMER_RECENT_ORDERS: (customerId: string) => `customer:${customerId}:recent-orders`,

  // Settlement caches (TTL: medium)
  SELLER_COMMISSION_SUMMARY: (sellerId: string, from?: string, to?: string) =>
    `settlement:seller:${sellerId}:commission:${from || 'all'}:${to || 'all'}`,

  SUPPLIER_COMMISSION_SUMMARY: (supplierId: string, from?: string, to?: string) =>
    `settlement:supplier:${supplierId}:commission:${from || 'all'}:${to || 'all'}`,

  SETTLEMENT_SUMMARY: (partyType: string, partyId: string) =>
    `settlement:summary:${partyType}:${partyId}`,

  // Pre-computed batch caches (TTL: long or day)
  SELLER_STATS_BATCH: (sellerId: string, date: string) =>
    `batch:seller:${sellerId}:stats:${date}`,

  SUPPLIER_STATS_BATCH: (supplierId: string, date: string) =>
    `batch:supplier:${supplierId}:stats:${date}`,

  // Read Cache: Storefront (TTL: 60s) — WO-O4O-REDIS-READ-CACHE-LAYER-V1
  STOREFRONT_PRODUCTS: (storeId: string, paramsHash: string) =>
    `sf:products:${storeId}:${paramsHash}`,
  STOREFRONT_TABLET: (storeId: string, paramsHash: string) =>
    `sf:tablet:${storeId}:${paramsHash}`,
  STOREFRONT_CATEGORIES: (storeId: string, serviceKey: string) =>
    `sf:cat:${storeId}:${serviceKey}`,

  // Read Cache: Hub (TTL: 30s) — WO-O4O-REDIS-READ-CACHE-LAYER-V1
  HUB_CHANNELS: (orgId: string) => `hub:ch:${orgId}`,
  HUB_KPI_SUMMARY: (orgId: string) => `hub:kpi:${orgId}`,

  // Cache invalidation patterns
  PATTERN: {
    SELLER_ALL: (sellerId: string) => `*:seller:${sellerId}:*`,
    SUPPLIER_ALL: (supplierId: string) => `*:supplier:${supplierId}:*`,
    CUSTOMER_ALL: (customerId: string) => `*customer:${customerId}:*`,
    SETTLEMENT_ALL: (partyType: string, partyId: string) =>
      `settlement:*:${partyType}:${partyId}*`,
    RC_STOREFRONT_ALL: (storeId: string) => `rc:sf:*${storeId}*`,
    RC_HUB_ALL: (orgId: string) => `rc:hub:*${orgId}*`,
  }
} as const;

/**
 * Helper: Generate range key for date filters
 * Converts date range to consistent cache key suffix
 */
export function generateRangeKey(dateRange?: { from?: Date; to?: Date }): string {
  if (!dateRange?.from && !dateRange?.to) {
    return 'all';
  }

  const fromStr = dateRange.from?.toISOString().split('T')[0] || '2020-01-01';
  const toStr = dateRange.to?.toISOString().split('T')[0] || 'now';

  return `${fromStr}_${toStr}`;
}
