import type { User } from '../../../../../apps/api-server/src/entities/User.js';
export declare enum CommunityType {
    PERSONAL = "personal",
    BRANCH = "branch",
    DIVISION = "division",
    GLOBAL = "global"
}
export declare class YaksaCommunity {
    id: string;
    name: string;
    description?: string;
    type: CommunityType;
    ownerUserId?: string;
    organizationId?: string;
    requireApproval: boolean;
    metadata?: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
    owner?: User;
    organization?: any;
    canUserManage(userId: string, userRole: string): boolean;
    canUserView(): boolean;
}
//# sourceMappingURL=YaksaCommunity.d.ts.map