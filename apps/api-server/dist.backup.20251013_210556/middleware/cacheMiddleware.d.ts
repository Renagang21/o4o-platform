/**
 * Cache Middleware
 * HTTP response caching middleware with intelligent invalidation
 */
import { Request, Response, NextFunction } from 'express';
interface CacheConfig {
    ttl?: number;
    tags?: string[];
    varyBy?: string[];
    condition?: (req: Request) => boolean;
    keyGenerator?: (req: Request) => string;
    shouldCache?: (req: Request, res: Response) => boolean;
}
/**
 * Cache middleware factory
 */
export declare function cache(customConfig?: CacheConfig): (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Cache invalidation middleware
 */
export declare function invalidateCache(tags?: string[], pattern?: string): (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Automatic cache invalidation based on mutations
 */
export declare function autoCacheInvalidation(): (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Cache statistics endpoint
 */
export declare function cacheStats(req: Request, res: Response): void;
/**
 * Clear cache endpoint
 */
export declare function clearCache(req: Request, res: Response): Promise<void>;
/**
 * Warm cache endpoint
 */
export declare function warmCache(req: Request, res: Response): Promise<void>;
export {};
//# sourceMappingURL=cacheMiddleware.d.ts.map