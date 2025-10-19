import { Request, Response, NextFunction } from 'express';
export interface CacheOptions {
    ttl?: number;
    key?: string | ((req: Request) => string);
    condition?: (req: Request) => boolean;
    invalidatePattern?: string;
}
/**
 * Cache middleware for GET requests
 */
export declare const cache: (options?: CacheOptions) => (req: Request, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
/**
 * Invalidate cache by pattern
 */
export declare const invalidateCache: (pattern: string) => Promise<void>;
/**
 * Clear all cache
 */
export declare const clearCache: () => Promise<void>;
/**
 * Cache statistics
 */
export declare const getCacheStats: () => Promise<string> | {
    keys: number;
    hits: number;
    misses: number;
    ksize: number;
    vsize: number;
};
//# sourceMappingURL=cache.d.ts.map