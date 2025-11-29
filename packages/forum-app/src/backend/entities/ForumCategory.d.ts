import type { User } from '../../../../../apps/api-server/src/entities/User.js';
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
    canUserAccess(userRole: string): boolean;
    canUserPost(userRole: string): boolean;
    incrementPostCount(): void;
    decrementPostCount(): void;
    incrementCommentCount(): void;
    decrementCommentCount(): void;
}
//# sourceMappingURL=ForumCategory.d.ts.map