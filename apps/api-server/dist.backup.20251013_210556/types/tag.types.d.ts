/**
 * Tag type definitions
 */
export interface CreateTagDto {
    name: string;
    slug?: string;
    description?: string;
    metaTitle?: string;
    metaDescription?: string;
    meta?: {
        metaTitle?: string;
        metaDescription?: string;
        [key: string]: any;
    };
}
export interface UpdateTagDto {
    name?: string;
    slug?: string;
    description?: string;
    metaTitle?: string;
    metaDescription?: string;
    meta?: {
        metaTitle?: string;
        metaDescription?: string;
        [key: string]: any;
    };
}
export interface TagStatistics {
    tagId: string;
    name: string;
    slug: string;
    postCount: number;
    totalViews: number;
    recentPosts: {
        id: string;
        title: string;
        slug: string;
        createdAt: Date;
        viewCount: number;
    }[];
    popularPosts: {
        id: string;
        title: string;
        slug: string;
        viewCount: number;
    }[];
    createdAt: Date;
    updatedAt: Date;
}
export interface TagResponse {
    id: string;
    name: string;
    slug: string;
    description?: string;
    postCount?: number;
    createdAt: Date;
    updatedAt: Date;
}
export interface TagListResponse {
    success: boolean;
    data: TagResponse[];
    meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}
export interface TagErrorResponse {
    success: false;
    error: {
        code: string;
        message: string;
        details?: any;
    };
}
//# sourceMappingURL=tag.types.d.ts.map