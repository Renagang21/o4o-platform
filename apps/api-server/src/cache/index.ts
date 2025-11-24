/**
 * Cache Module Exports
 * R-8-7: Performance Optimization - Caching Strategy
 */

export { ICacheService } from './ICacheService.js';
export { MemoryCacheService } from './MemoryCacheService.js';
export { RedisCacheService } from './RedisCacheService.js';
export {
  initializeCacheService,
  getCacheService,
  cachedOperation,
  Cached,
  cacheService
} from './CacheService.js';
export {
  getCacheConfig,
  CacheKeys,
  generateRangeKey,
  type CacheConfig
} from './cache.config.js';
