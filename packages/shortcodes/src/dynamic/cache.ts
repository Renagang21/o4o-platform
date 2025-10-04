/**
 * Cache Manager for Dynamic Shortcodes
 * Implements LRU (Least Recently Used) cache with TTL (Time To Live)
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class ShortcodeCache {
  private cache: Map<string, CacheEntry<any>>;
  private maxSize: number;
  private defaultTTL: number;

  constructor(maxSize = 100, defaultTTL = 5 * 60 * 1000) { // 5 minutes default
    this.cache = new Map();
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
  }

  /**
   * Generate a unique cache key from shortcode attributes
   */
  generateKey(type: string, attributes: Record<string, any>, context?: any): string {
    const contextKey = context?.postId || context?.currentPost?.id || 'global';
    const attrKey = Object.entries(attributes)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}:${value}`)
      .join('|');
    
    return `${type}:${contextKey}:${attrKey}`;
  }

  /**
   * Get cached data if valid
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.timestamp + entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    // Move to end (LRU)
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.data as T;
  }

  /**
   * Set cache data
   */
  set<T>(key: string, data: T, ttl?: number): void {
    // Ensure cache doesn't exceed max size
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      // Remove oldest entry (first in map)
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
    });
  }

  /**
   * Clear specific cache entries by pattern
   */
  clearByPattern(pattern: string): void {
    const regex = new RegExp(pattern);
    const keysToDelete: string[] = [];
    
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
  } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: 0, // Would need to track hits/misses for accurate rate
    };
  }
}

// Singleton instance
export const shortcodeCache = new ShortcodeCache();

/**
 * React hook for using cache with shortcodes
 */
export function useShortcodeCache<T>(
  cacheKey: string,
  fetcher: () => Promise<T>,
  ttl?: number
): {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
} {
  const [data, setData] = React.useState<T | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  const fetchData = React.useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);

      // Check cache first
      if (!forceRefresh) {
        const cached = shortcodeCache.get<T>(cacheKey);
        if (cached !== null) {
          setData(cached);
          setLoading(false);
          return;
        }
      }

      // Fetch fresh data
      const freshData = await fetcher();
      
      // Update cache
      shortcodeCache.set(cacheKey, freshData, ttl);
      
      setData(freshData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [cacheKey, fetcher, ttl]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refetch = React.useCallback(() => fetchData(true), [fetchData]);

  return { data, loading, error, refetch };
}

/**
 * Cache configuration per shortcode type
 */
export const CACHE_CONFIG = {
  cpt_list: {
    ttl: 5 * 60 * 1000, // 5 minutes
    maxSize: 50,
  },
  cpt_field: {
    ttl: 10 * 60 * 1000, // 10 minutes
    maxSize: 200,
  },
  acf_field: {
    ttl: 10 * 60 * 1000, // 10 minutes
    maxSize: 200,
  },
  meta_field: {
    ttl: 10 * 60 * 1000, // 10 minutes
    maxSize: 200,
  },
};

/**
 * Invalidate cache for specific post or post type
 */
export function invalidatePostCache(postId?: string, postType?: string): void {
  if (postId) {
    // Clear all cache entries for specific post
    shortcodeCache.clearByPattern(`.*:${postId}:.*`);
  }
  
  if (postType) {
    // Clear all cache entries for post type
    shortcodeCache.clearByPattern(`cpt_list:.*type:${postType}.*`);
  }
}

/**
 * Preload cache for common queries
 */
export async function preloadCommonQueries(): Promise<void> {
  const commonQueries = [
    { type: 'ds_product', count: 6, template: 'grid' },
    { type: 'ds_supplier', count: 10, template: 'list' },
    { type: 'ds_product', count: 4, template: 'card' },
  ];

  // Preload in background
  commonQueries.forEach(async (query) => {
    const key = shortcodeCache.generateKey('cpt_list', query);
    if (!shortcodeCache.get(key)) {
      try {
        const response = await fetch(`/api/cpt/${query.type}/posts?limit=${query.count}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          shortcodeCache.set(key, data, CACHE_CONFIG.cpt_list.ttl);
        }
      } catch (error) {
        console.error('Preload failed for', query, error);
      }
    }
  });
}

// Missing React import
import * as React from 'react';

export default shortcodeCache;