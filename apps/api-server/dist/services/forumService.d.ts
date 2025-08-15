import { ForumCategory } from '../entities/ForumCategory';
import { ForumPost, PostStatus, PostType } from '../entities/ForumPost';
import { ForumComment } from '../entities/ForumComment';
export interface ForumSearchOptions {
    query?: string;
    categoryId?: string;
    authorId?: string;
    tags?: string[];
    type?: PostType;
    status?: PostStatus;
    page?: number;
    limit?: number;
    sortBy?: 'latest' | 'popular' | 'trending' | 'oldest';
    dateRange?: {
        start?: Date;
        end?: Date;
    };
}
export interface ForumStatistics {
    totalPosts: number;
    totalComments: number;
    totalUsers: number;
    todayPosts: number;
    todayComments: number;
    popularTags: Array<{
        name: string;
        count: number;
    }>;
    activeCategories: Array<{
        name: string;
        postCount: number;
    }>;
    topContributors: Array<{
        userId: string;
        username: string;
        postCount: number;
        commentCount: number;
    }>;
}
export declare class ForumService {
    private categoryRepository;
    private postRepository;
    private commentRepository;
    private tagRepository;
    private userRepository;
    createCategory(data: Partial<ForumCategory>, creatorId: string): Promise<ForumCategory>;
    updateCategory(categoryId: string, data: Partial<ForumCategory>): Promise<ForumCategory | null>;
    getCategories(includeInactive?: boolean): Promise<ForumCategory[]>;
    getCategoryBySlug(slug: string): Promise<ForumCategory | null>;
    createPost(data: Partial<ForumPost>, authorId: string): Promise<ForumPost>;
    updatePost(postId: string, data: Partial<ForumPost>, userId: string, userRole: string): Promise<ForumPost | null>;
    getPost(postId: string, userId?: string): Promise<ForumPost | null>;
    getPostBySlug(slug: string, userId?: string): Promise<ForumPost | null>;
    searchPosts(options: ForumSearchOptions, userRole?: string): Promise<{
        posts: ForumPost[];
        totalCount: number;
        pagination: {
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    createComment(data: Partial<ForumComment>, authorId: string): Promise<ForumComment>;
    getComments(postId: string, page?: number, limit?: number): Promise<{
        comments: ForumComment[];
        totalCount: number;
        pagination: {
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    getForumStatistics(): Promise<ForumStatistics>;
    private generateSlug;
    private processTags;
    private updateCategoryStats;
    private updatePostStats;
    private updateCommentStats;
    private incrementPostViews;
    private getPopularTags;
    private getActiveCategories;
    private getTopContributors;
    private invalidateCategoryCache;
    private invalidatePostCache;
}
export declare const forumService: ForumService;
//# sourceMappingURL=forumService.d.ts.map