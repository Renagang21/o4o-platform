import type { BaseEntity } from '@o4o/types';
import type { ForumCategory } from './category';
import type { ForumComment } from './comment';
export declare enum PostStatus {
    DRAFT = "draft",
    PUBLISHED = "published",
    PENDING = "pending",
    REJECTED = "rejected",
    ARCHIVED = "archived"
}
export declare enum PostType {
    DISCUSSION = "discussion",
    QUESTION = "question",
    ANNOUNCEMENT = "announcement",
    POLL = "poll",
    GUIDE = "guide"
}
export interface ForumPost extends BaseEntity {
    title: string;
    slug: string;
    content: string;
    excerpt?: string;
    type: PostType;
    status: PostStatus;
    categoryId: string;
    authorId: string;
    isPinned: boolean;
    isLocked: boolean;
    allowComments: boolean;
    viewCount: number;
    commentCount: number;
    likeCount: number;
    tags?: string[];
    featuredImageUrl?: string;
    publishedAt?: Date | string;
    archivedAt?: Date | string;
    lockedAt?: Date | string;
    rejectionReason?: string;
    metaTitle?: string;
    metaDescription?: string;
    category?: ForumCategory;
    author?: any;
    comments?: ForumComment[];
    authorName?: string;
}
export interface PostFormData {
    title: string;
    content: string;
    excerpt?: string;
    type: PostType;
    categoryId: string;
    tags?: string[];
    featuredImageUrl?: string;
    metaTitle?: string;
    metaDescription?: string;
    allowComments?: boolean;
    status?: PostStatus;
}
export interface PostFilters {
    categoryId?: string;
    type?: PostType | PostType[];
    status?: PostStatus | PostStatus[];
    authorId?: string;
    tags?: string[];
    isPinned?: boolean;
    isLocked?: boolean;
    search?: string;
    dateFrom?: Date | string;
    dateTo?: Date | string;
    sortBy?: 'createdAt' | 'updatedAt' | 'viewCount' | 'commentCount' | 'likeCount' | 'title';
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
}
export interface PostStatistics {
    totalViews: number;
    totalComments: number;
    totalLikes: number;
    averageReadTime?: number;
    engagementRate?: number;
}
//# sourceMappingURL=post.d.ts.map