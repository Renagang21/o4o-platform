import { CustomPostType } from '../../../entities/CustomPostType';
import { CustomPost, PostStatus } from '../../../entities/CustomPost';
/**
 * CPT Service - Business logic layer for Custom Post Types
 * Follows the pattern from affiliate module
 */
export declare class CPTService {
    private get cptRepository();
    private get postRepository();
    /**
     * Get all Custom Post Types
     */
    getAllCPTs(active?: boolean): Promise<{
        success: boolean;
        data: CustomPostType[];
        total: number;
    }>;
    /**
     * Get CPT by slug
     */
    getCPTBySlug(slug: string): Promise<{
        success: boolean;
        error: string;
        data?: undefined;
    } | {
        success: boolean;
        data: CustomPostType;
        error?: undefined;
    }>;
    /**
     * Create new CPT
     */
    createCPT(data: Partial<CustomPostType>): Promise<{
        success: boolean;
        error: string;
        data?: undefined;
    } | {
        success: boolean;
        data: CustomPostType;
        error?: undefined;
    }>;
    /**
     * Update CPT by slug
     */
    updateCPT(slug: string, data: Partial<CustomPostType>): Promise<{
        success: boolean;
        error: string;
        data?: undefined;
    } | {
        success: boolean;
        data: CustomPostType;
        error?: undefined;
    }>;
    /**
     * Delete CPT by slug
     */
    deleteCPT(slug: string): Promise<{
        success: boolean;
        error: string;
        message?: undefined;
    } | {
        success: boolean;
        message: string;
        error?: undefined;
    }>;
    /**
     * Get posts by CPT
     */
    getPostsByCPT(slug: string, options?: {
        page?: number;
        limit?: number;
        status?: PostStatus;
        search?: string;
        orderBy?: string;
        order?: 'ASC' | 'DESC';
    }): Promise<{
        success: boolean;
        data: CustomPost[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
        };
    }>;
    /**
     * Create post for CPT
     */
    createPost(slug: string, data: Partial<CustomPost>, userId: string): Promise<{
        success: boolean;
        error: string;
        data?: undefined;
    } | {
        success: boolean;
        data: CustomPost;
        error?: undefined;
    }>;
    /**
     * Update post
     */
    updatePost(postId: string, data: Partial<CustomPost>): Promise<{
        success: boolean;
        error: string;
        data?: undefined;
    } | {
        success: boolean;
        data: CustomPost;
        error?: undefined;
    }>;
    /**
     * Delete post
     */
    deletePost(postId: string): Promise<{
        success: boolean;
        error: string;
        message?: undefined;
    } | {
        success: boolean;
        message: string;
        error?: undefined;
    }>;
    /**
     * Initialize default CPTs
     */
    initializeDefaults(): Promise<{
        success: boolean;
        message: string;
        data?: undefined;
    } | {
        success: boolean;
        data: any[];
        message: string;
    }>;
}
export declare const cptService: CPTService;
//# sourceMappingURL=cpt.service.d.ts.map