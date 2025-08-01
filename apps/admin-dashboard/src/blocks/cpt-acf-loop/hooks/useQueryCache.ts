/**
 * Query Cache Hook
 * 
 * Provides caching functionality for post queries
 */

import { useState, useEffect, useRef, useCallback } from '@wordpress/element';
// import { addQueryArgs } from '@wordpress/url';

interface CacheEntry {
  data: any;
  timestamp: number;
  key: string;
}

interface UseQueryCacheOptions {
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum cache size
  enableCache?: boolean;
}

export const useQueryCache = ({
  ttl = 5 * 60 * 1000, // 5 minutes default
  maxSize = 50,
  enableCache = true,
}: UseQueryCacheOptions = {}) => {
  const cache = useRef<Map<string, CacheEntry>>(new Map());
  const [cacheSize, setCacheSize] = useState(0);

  // Generate cache key from query parameters
  const generateCacheKey = useCallback((params: Record<string, any>): string => {
    // Sort keys for consistent cache keys
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((acc, key) => {
        if (params[key] !== undefined && params[key] !== null) {
          acc[key] = params[key];
        }
        return acc;
      }, {} as Record<string, any>);

    return JSON.stringify(sortedParams);
  }, []);

  // Get data from cache
  const getFromCache = useCallback((key: string): any | null => {
    if (!enableCache) return null;

    const entry = cache.current.get(key);
    if (!entry) return null;

    // Check if cache entry has expired
    if (Date.now() - entry.timestamp > ttl) {
      cache.current.delete(key);
      setCacheSize(cache.current.size);
      return null;
    }

    return entry.data;
  }, [enableCache, ttl]);

  // Set data in cache
  const setInCache = useCallback((key: string, data: any): void => {
    if (!enableCache) return;

    // Remove oldest entries if cache is full
    if (cache.current.size >= maxSize) {
      const entries = Array.from(cache.current.entries());
      const sortedEntries = entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      if (sortedEntries.length > 0) {
        const oldestKey = sortedEntries[0][0];
        cache.current.delete(oldestKey);
      }
    }

    cache.current.set(key, {
      data,
      timestamp: Date.now(),
      key,
    });

    setCacheSize(cache.current.size);
  }, [enableCache, maxSize]);

  // Clear cache
  const clearCache = useCallback((): void => {
    cache.current.clear();
    setCacheSize(0);
  }, []);

  // Remove specific cache entry
  const removeFromCache = useCallback((key: string): void => {
    cache.current.delete(key);
    setCacheSize(cache.current.size);
  }, []);

  // Clear expired entries
  const clearExpired = useCallback((): void => {
    const now = Date.now();
    const expiredKeys: string[] = [];

    cache.current.forEach((entry: CacheEntry, key: string) => {
      if (now - entry.timestamp > ttl) {
        expiredKeys.push(key);
      }
    });

    expiredKeys.forEach(key => cache.current.delete(key));
    
    if (expiredKeys.length > 0) {
      setCacheSize(cache.current.size);
    }
  }, [ttl]);

  // Set up periodic cleanup
  useEffect(() => {
    if (!enableCache) return;

    const interval = setInterval(clearExpired, 60000); // Clean up every minute

    return () => clearInterval(interval);
  }, [enableCache, clearExpired]);

  // Get cache stats
  const getCacheStats = useCallback(() => {
    const entries = Array.from(cache.current.values());
    const now = Date.now();

    return {
      size: cache.current.size,
      maxSize,
      entries: entries.map((entry: CacheEntry) => ({
        key: entry.key,
        age: now - entry.timestamp,
        expired: now - entry.timestamp > ttl,
      })),
    };
  }, [maxSize, ttl]);

  return {
    generateCacheKey,
    getFromCache,
    setInCache,
    clearCache,
    removeFromCache,
    clearExpired,
    getCacheStats,
    cacheSize,
  };
};

// Hook for cached API requests
export const useCachedQuery = <T = any>(
  queryFn: () => Promise<T>,
  deps: any[],
  options?: UseQueryCacheOptions & {
    enabled?: boolean;
    onSuccess?: (data: T) => void;
    onError?: (error: any) => void;
  }
) => {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<any>(null);
  
  const { 
    generateCacheKey, 
    getFromCache, 
    setInCache 
  } = useQueryCache(options);

  const cacheKey = generateCacheKey(deps);

  const fetchData = useCallback(async () => {
    // Check cache first
    const cachedData = getFromCache(cacheKey);
    if (cachedData) {
      setData(cachedData);
      options?.onSuccess?.(cachedData);
      return;
    }

    // Fetch fresh data
    setIsLoading(true);
    setError(null);

    try {
      const result = await queryFn();
      setData(result);
      setInCache(cacheKey, result);
      options?.onSuccess?.(result);
    } catch (err) {
      setError(err);
      options?.onError?.(err);
    } finally {
      setIsLoading(false);
    }
  }, [queryFn, cacheKey, getFromCache, setInCache, options]);

  useEffect(() => {
    if (options?.enabled !== false) {
      fetchData();
    }
  }, [fetchData, options?.enabled]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchData,
  };
};