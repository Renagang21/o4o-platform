/**
 * Cache Service Interface
 * R-8-7: Performance Optimization - Caching Strategy
 *
 * Defines the contract for cache implementations
 */

export interface ICacheService {
  /**
   * Get value from cache
   */
  get<T>(key: string): Promise<T | null>;

  /**
   * Set value in cache with optional TTL
   * @param key Cache key
   * @param value Value to cache
   * @param ttl Time to live in seconds (optional)
   */
  set<T>(key: string, value: T, ttl?: number): Promise<void>;

  /**
   * Delete a key from cache
   */
  delete(key: string): Promise<void>;

  /**
   * Delete multiple keys matching a pattern
   * @param pattern Glob pattern (e.g., "user:*")
   */
  deletePattern(pattern: string): Promise<number>;

  /**
   * Check if key exists
   */
  exists(key: string): Promise<boolean>;

  /**
   * Get all keys matching a pattern
   */
  keys(pattern: string): Promise<string[]>;

  /**
   * Clear all cache
   */
  clear(): Promise<void>;

  /**
   * Get cache statistics
   */
  stats(): Promise<{
    type: string;
    keys: number;
    hits?: number;
    misses?: number;
    hitRate?: number;
  }>;
}
