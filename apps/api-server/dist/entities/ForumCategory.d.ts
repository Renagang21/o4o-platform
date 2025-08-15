import { ForumPost } from './ForumPost';
import { User } from './User';
export declare class ForumCategory {
    id: string;
    name: string;
    description?: string;
    slug: string;
    color?: string;
    sortOrder: number;
    isActive: boolean;
    requireApproval: boolean;
    accessLevel: string;
    postCount: number;
    createdBy?: string;
    createdAt: Date;
    updatedAt: Date;
    creator?: User;
    posts?: ForumPost[];
    canUserAccess(userRole: string): boolean;
    canUserPost(userRole: string): boolean;
    incrementPostCount(): void;
    decrementPostCount(): void;
    incrementCommentCount(): void;
    decrementCommentCount(): void;
}
//# sourceMappingURL=ForumCategory.d.ts.map