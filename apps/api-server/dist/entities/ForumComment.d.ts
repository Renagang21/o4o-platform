import { ForumPost } from './ForumPost';
import { User } from './User';
export declare enum CommentStatus {
    PUBLISHED = "published",
    PENDING = "pending",
    DELETED = "deleted"
}
export declare class ForumComment {
    id: string;
    content: string;
    postId: string;
    authorId: string;
    parentId?: string;
    status: CommentStatus;
    likeCount: number;
    replyCount: number;
    isEdited: boolean;
    createdAt: Date;
    updatedAt: Date;
    post?: ForumPost;
    author?: User;
    parent?: ForumComment;
    replies?: ForumComment[];
    canUserView(userRole: string, userId: string): boolean;
    canUserEdit(userId: string, userRole: string): boolean;
    incrementLike(): void;
    decrementLike(): void;
    incrementReplyCount(): void;
    decrementReplyCount(): void;
    softDelete(): void;
    extractMentions(): void;
}
//# sourceMappingURL=ForumComment.d.ts.map