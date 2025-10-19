import { ForumCategory } from './ForumCategory';
import { User } from './User';
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
    metadata?: Record<string, unknown>;
    publishedAt?: Date;
    lastCommentAt?: Date;
    lastCommentBy?: string;
    createdAt: Date;
    updatedAt: Date;
    category?: Promise<ForumCategory>;
    author?: User;
    lastCommenter?: User;
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