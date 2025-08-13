import type { BaseEntity } from '@o4o/types';
import type { ForumPost } from './post';
export declare enum CommentStatus {
    PUBLISHED = "published",
    PENDING = "pending",
    DELETED = "deleted"
}
export interface ForumComment extends BaseEntity {
    postId: string;
    authorId: string;
    content: string;
    status: CommentStatus;
    parentId?: string;
    depth: number;
    likeCount: number;
    replyCount: number;
    isEdited: boolean;
    editedAt?: Date | string;
    deletedAt?: Date | string;
    deletedBy?: string;
    deletionReason?: string;
    post?: ForumPost;
    author?: any;
    parent?: ForumComment;
    replies?: ForumComment[];
    authorName?: string;
}
export interface CommentFormData {
    content: string;
    parentId?: string;
}
export interface CommentUpdateData {
    content: string;
}
export interface CommentFilters {
    postId?: string;
    authorId?: string;
    status?: CommentStatus;
    parentId?: string | null;
    includeReplies?: boolean;
    sortBy?: 'createdAt' | 'likeCount' | 'replyCount';
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
}
export interface CommentTree extends ForumComment {
    replies: CommentTree[];
}
//# sourceMappingURL=comment.d.ts.map