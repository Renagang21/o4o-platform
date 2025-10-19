import { Response } from 'express';
import { AuthRequest } from '../../types/auth';
interface CacheEntry {
    menuId: string;
    key: string;
    data: any;
    html?: string;
    createdAt: Date;
    expiresAt: Date;
    hits: number;
    size: number;
    version: string;
}
export declare class MenuCacheController {
    private menuRepository;
    private menuItemRepository;
    private cache;
    private cacheHits;
    private cacheMisses;
    private responseTimes;
    constructor();
    /**
     * POST /api/v1/menus/:id/cache
     * Create or refresh menu cache
     */
    createMenuCache(req: AuthRequest, res: Response): Promise<void>;
    /**
     * DELETE /api/v1/menus/:id/cache
     * Clear menu cache
     */
    deleteMenuCache(req: AuthRequest, res: Response): Promise<void>;
    /**
     * GET /api/v1/menus/cache-status
     * Get overall cache status
     */
    getCacheStatus(req: AuthRequest, res: Response): Promise<void>;
    /**
     * GET /api/v1/menus/:id/cached
     * Get cached menu (internal use)
     */
    getCachedMenu(menuId: string): Promise<CacheEntry | null>;
    private generateCacheKey;
    private invalidateOldCacheEntries;
    private buildMenuTree;
    private prerenderMenuHTML;
    /**
     * Clear all cache entries
     */
    clearAllCache(): void;
    /**
     * Clear expired cache entries
     */
    clearExpiredCache(): void;
}
export {};
//# sourceMappingURL=MenuCacheController.d.ts.map