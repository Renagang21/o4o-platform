/**
 * App Cache Service
 *
 * Centralized caching for remote app manifests and resources
 * Part of AppStore Phase 4 - Remote App Distribution
 */

import type { AppManifest } from '@o4o/types';
import logger from '../utils/logger.js';

/**
 * Cache Entry with TTL
 */
interface CacheEntry<T> {
  value: T;
  timestamp: number;
  ttl: number; // milliseconds
}

/**
 * Manifest Cache Entry
 */
interface ManifestCacheEntry extends CacheEntry<AppManifest> {
  hash: string;
  sourceUrl: string;
}

/**
 * Resource Cache Entry
 */
interface ResourceCacheEntry extends CacheEntry<string> {
  hash: string;
  contentType: string;
  size: number;
}

/**
 * Cache Statistics
 */
export interface CacheStats {
  manifestCount: number;
  resourceCount: number;
  totalSize: number;
  hitCount: number;
  missCount: number;
  hitRate: number;
}

/**
 * Cache Configuration
 */
export interface CacheConfig {
  /** Default TTL for manifests in milliseconds (default: 5 minutes) */
  manifestTTL?: number;
  /** Default TTL for resources in milliseconds (default: 1 hour) */
  resourceTTL?: number;
  /** Maximum number of cached manifests */
  maxManifests?: number;
  /** Maximum number of cached resources */
  maxResources?: number;
  /** Maximum total cache size in bytes */
  maxTotalSize?: number;
}

const DEFAULT_CONFIG: Required<CacheConfig> = {
  manifestTTL: 5 * 60 * 1000, // 5 minutes
  resourceTTL: 60 * 60 * 1000, // 1 hour
  maxManifests: 100,
  maxResources: 500,
  maxTotalSize: 100 * 1024 * 1024, // 100 MB
};

/**
 * App Cache Service
 *
 * Provides:
 * - In-memory caching with TTL
 * - LRU eviction when limits exceeded
 * - Cache statistics and monitoring
 * - Manual cache invalidation
 */
export class AppCacheService {
  private manifests = new Map<string, ManifestCacheEntry>();
  private resources = new Map<string, ResourceCacheEntry>();
  private config: Required<CacheConfig>;
  private stats = {
    hitCount: 0,
    missCount: 0,
  };

  constructor(config?: CacheConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    logger.info(`[AppCacheService] Initialized with TTL: manifest=${this.config.manifestTTL}ms, resource=${this.config.resourceTTL}ms`);
  }

  // ==================== Manifest Cache ====================

  /**
   * Get cached manifest
   *
   * @param key - Cache key (usually manifest URL or appId)
   * @returns Cached manifest or undefined
   */
  getManifest(key: string): AppManifest | undefined {
    const entry = this.manifests.get(key);
    if (!entry) {
      this.stats.missCount++;
      return undefined;
    }

    // Check TTL
    if (this.isExpired(entry)) {
      this.manifests.delete(key);
      this.stats.missCount++;
      logger.info(`[AppCacheService] Manifest cache expired: ${key}`);
      return undefined;
    }

    this.stats.hitCount++;
    logger.info(`[AppCacheService] Manifest cache hit: ${key}`);
    return entry.value;
  }

  /**
   * Set manifest in cache
   *
   * @param key - Cache key
   * @param manifest - Manifest to cache
   * @param hash - Manifest hash
   * @param sourceUrl - Source URL
   * @param ttl - Custom TTL (optional)
   */
  setManifest(
    key: string,
    manifest: AppManifest,
    hash: string,
    sourceUrl: string,
    ttl?: number
  ): void {
    // Evict if at capacity
    if (this.manifests.size >= this.config.maxManifests) {
      this.evictOldestManifest();
    }

    this.manifests.set(key, {
      value: manifest,
      hash,
      sourceUrl,
      timestamp: Date.now(),
      ttl: ttl || this.config.manifestTTL,
    });

    logger.info(`[AppCacheService] Manifest cached: ${key} (TTL: ${ttl || this.config.manifestTTL}ms)`);
  }

  /**
   * Get manifest with metadata
   *
   * @param key - Cache key
   * @returns Full cache entry or undefined
   */
  getManifestEntry(key: string): ManifestCacheEntry | undefined {
    const entry = this.manifests.get(key);
    if (!entry || this.isExpired(entry)) {
      return undefined;
    }
    return entry;
  }

  /**
   * Invalidate manifest cache
   *
   * @param key - Cache key to invalidate
   */
  invalidateManifest(key: string): boolean {
    const deleted = this.manifests.delete(key);
    if (deleted) {
      logger.info(`[AppCacheService] Manifest invalidated: ${key}`);
    }
    return deleted;
  }

  // ==================== Resource Cache ====================

  /**
   * Get cached resource
   *
   * @param key - Cache key (usually resource URL)
   * @returns Cached resource content or undefined
   */
  getResource(key: string): string | undefined {
    const entry = this.resources.get(key);
    if (!entry) {
      this.stats.missCount++;
      return undefined;
    }

    // Check TTL
    if (this.isExpired(entry)) {
      this.resources.delete(key);
      this.stats.missCount++;
      logger.info(`[AppCacheService] Resource cache expired: ${key}`);
      return undefined;
    }

    this.stats.hitCount++;
    return entry.value;
  }

  /**
   * Set resource in cache
   *
   * @param key - Cache key
   * @param content - Resource content
   * @param hash - Content hash
   * @param contentType - MIME type
   * @param ttl - Custom TTL (optional)
   */
  setResource(
    key: string,
    content: string,
    hash: string,
    contentType: string,
    ttl?: number
  ): void {
    // Check total size limit
    const size = content.length;
    if (this.getTotalSize() + size > this.config.maxTotalSize) {
      this.evictUntilFits(size);
    }

    // Evict if at capacity
    if (this.resources.size >= this.config.maxResources) {
      this.evictOldestResource();
    }

    this.resources.set(key, {
      value: content,
      hash,
      contentType,
      size,
      timestamp: Date.now(),
      ttl: ttl || this.config.resourceTTL,
    });

    logger.info(`[AppCacheService] Resource cached: ${key} (${size} bytes, TTL: ${ttl || this.config.resourceTTL}ms)`);
  }

  /**
   * Get resource with metadata
   *
   * @param key - Cache key
   * @returns Full cache entry or undefined
   */
  getResourceEntry(key: string): ResourceCacheEntry | undefined {
    const entry = this.resources.get(key);
    if (!entry || this.isExpired(entry)) {
      return undefined;
    }
    return entry;
  }

  /**
   * Invalidate resource cache
   *
   * @param key - Cache key to invalidate
   */
  invalidateResource(key: string): boolean {
    const deleted = this.resources.delete(key);
    if (deleted) {
      logger.info(`[AppCacheService] Resource invalidated: ${key}`);
    }
    return deleted;
  }

  // ==================== Cache Management ====================

  /**
   * Clear all caches for an app
   *
   * @param appId - App identifier
   */
  clearAppCache(appId: string): void {
    let clearedManifests = 0;
    let clearedResources = 0;

    // Clear manifests containing appId
    for (const [key, entry] of this.manifests.entries()) {
      if (key.includes(appId) || entry.value.appId === appId) {
        this.manifests.delete(key);
        clearedManifests++;
      }
    }

    // Clear resources containing appId
    for (const key of this.resources.keys()) {
      if (key.includes(appId)) {
        this.resources.delete(key);
        clearedResources++;
      }
    }

    logger.info(`[AppCacheService] Cleared cache for ${appId}: ${clearedManifests} manifests, ${clearedResources} resources`);
  }

  /**
   * Clear all caches
   */
  clearAll(): void {
    const manifestCount = this.manifests.size;
    const resourceCount = this.resources.size;

    this.manifests.clear();
    this.resources.clear();
    this.stats.hitCount = 0;
    this.stats.missCount = 0;

    logger.info(`[AppCacheService] Cleared all caches: ${manifestCount} manifests, ${resourceCount} resources`);
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const totalSize = this.getTotalSize();
    const totalRequests = this.stats.hitCount + this.stats.missCount;
    const hitRate = totalRequests > 0 ? this.stats.hitCount / totalRequests : 0;

    return {
      manifestCount: this.manifests.size,
      resourceCount: this.resources.size,
      totalSize,
      hitCount: this.stats.hitCount,
      missCount: this.stats.missCount,
      hitRate,
    };
  }

  /**
   * Clean up expired entries
   */
  cleanup(): void {
    let cleanedManifests = 0;
    let cleanedResources = 0;

    for (const [key, entry] of this.manifests.entries()) {
      if (this.isExpired(entry)) {
        this.manifests.delete(key);
        cleanedManifests++;
      }
    }

    for (const [key, entry] of this.resources.entries()) {
      if (this.isExpired(entry)) {
        this.resources.delete(key);
        cleanedResources++;
      }
    }

    if (cleanedManifests > 0 || cleanedResources > 0) {
      logger.info(`[AppCacheService] Cleanup: removed ${cleanedManifests} manifests, ${cleanedResources} resources`);
    }
  }

  // ==================== Private Methods ====================

  private isExpired(entry: CacheEntry<any>): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  private getTotalSize(): number {
    let total = 0;
    for (const entry of this.resources.values()) {
      total += entry.size;
    }
    return total;
  }

  private evictOldestManifest(): void {
    let oldest: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.manifests.entries()) {
      if (entry.timestamp < oldestTime) {
        oldest = key;
        oldestTime = entry.timestamp;
      }
    }

    if (oldest) {
      this.manifests.delete(oldest);
      logger.info(`[AppCacheService] Evicted oldest manifest: ${oldest}`);
    }
  }

  private evictOldestResource(): void {
    let oldest: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.resources.entries()) {
      if (entry.timestamp < oldestTime) {
        oldest = key;
        oldestTime = entry.timestamp;
      }
    }

    if (oldest) {
      this.resources.delete(oldest);
      logger.info(`[AppCacheService] Evicted oldest resource: ${oldest}`);
    }
  }

  private evictUntilFits(requiredSize: number): void {
    const targetSize = this.config.maxTotalSize - requiredSize;
    let currentSize = this.getTotalSize();

    // Sort by timestamp (oldest first)
    const sorted = Array.from(this.resources.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp);

    for (const [key, entry] of sorted) {
      if (currentSize <= targetSize) break;

      this.resources.delete(key);
      currentSize -= entry.size;
      logger.info(`[AppCacheService] Evicted resource for space: ${key} (${entry.size} bytes)`);
    }
  }
}

// Export singleton instance
export const appCacheService = new AppCacheService();

// Start periodic cleanup (every 5 minutes)
setInterval(() => {
  appCacheService.cleanup();
}, 5 * 60 * 1000);
