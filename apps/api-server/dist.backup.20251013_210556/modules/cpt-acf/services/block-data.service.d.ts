/**
 * Block Data Service - Optimized data service for block editor
 * Provides unified API for blocks to access CPT and ACF data
 */
export declare class BlockDataService {
    private postRepo;
    private customPostRepo;
    private cache;
    private cacheTTL;
    /**
     * Get all block data for a post (optimized single query)
     */
    getBlockData(postId: string, postType?: 'post' | 'page' | 'custom'): Promise<{
        success: boolean;
        data: any;
        source: string;
        error?: undefined;
    } | {
        success: boolean;
        error: string;
        data?: undefined;
        source?: undefined;
    }>;
    /**
     * Get featured image for a post
     */
    getFeaturedImage(postId: string, postType?: 'post' | 'page' | 'custom'): Promise<{
        success: boolean;
        data: any;
        source: string;
    }>;
    /**
     * Get specific ACF field value
     */
    getACFField(postId: string, fieldName: string, entityType?: string): Promise<{
        success: boolean;
        data: any;
        source: string;
    }>;
    /**
     * Get dynamic content for blocks
     */
    getDynamicContent(request: {
        postId?: string;
        postType?: string;
        fields?: string[];
        includeACF?: boolean;
        includeMeta?: boolean;
    }): Promise<{
        success: boolean;
        error: string;
        data?: undefined;
    } | {
        success: boolean;
        data: any;
        error?: undefined;
    }>;
    /**
     * Clear cache for a specific post
     */
    clearCache(postId?: string): {
        success: boolean;
        message: string;
    };
    /**
     * Private helper: Extract dynamic sources from fields
     */
    private extractDynamicSources;
    /**
     * Private helper: Get cached data
     */
    private getCached;
    /**
     * Private helper: Set cache
     */
    private setCache;
}
export declare const blockDataService: BlockDataService;
//# sourceMappingURL=block-data.service.d.ts.map