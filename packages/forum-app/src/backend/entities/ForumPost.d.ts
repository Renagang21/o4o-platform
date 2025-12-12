import { ForumCategory } from './ForumCategory.js';
import type { User } from '../../../../../apps/api-server/src/entities/User.js';
import type { Block } from '@o4o/types';
import type { ForumPostMetadata } from '../types/index.js';
export declare enum PostStatus {
    DRAFT = "draft",
    PUBLISHED = "publish",
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
export declare class ForumPost {
    id: string;
    title: string;
    slug: string;
    content: Block[];
    excerpt?: string;
    type: PostType;
    status: PostStatus;
    categoryId: string;
    authorId: string;
    organizationId?: string;
    isOrganizationExclusive: boolean;
    isPinned: boolean;
    isLocked: boolean;
    allowComments: boolean;
    viewCount: number;
    commentCount: number;
    likeCount: number;
    tags?: string[];
    metadata?: ForumPostMetadata;
    publishedAt?: Date;
    lastCommentAt?: Date;
    lastCommentBy?: string;
    createdAt: Date;
    updatedAt: Date;
    category?: Promise<ForumCategory>;
    author?: User;
    lastCommenter?: User;
    organization?: any;
    canUserView(userRole: string): boolean;
    canUserEdit(userId: string, userRole: string): boolean;
    canUserComment(userRole: string): boolean;
    incrementViewCount(): void;
    incrementCommentCount(userId: string): void;
    decrementCommentCount(): void;
    publish(): void;
    generateSlug(): string;
}
//# sourceMappingURL=ForumPost.d.ts.map