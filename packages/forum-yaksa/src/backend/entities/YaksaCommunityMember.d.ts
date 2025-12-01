import { YaksaCommunity } from './YaksaCommunity.js';
import type { User } from '../../../../../apps/api-server/src/entities/User.js';
export declare enum CommunityMemberRole {
    OWNER = "owner",
    ADMIN = "admin",
    MEMBER = "member"
}
export declare class YaksaCommunityMember {
    id: string;
    communityId: string;
    userId: string;
    role: CommunityMemberRole;
    joinedAt: Date;
    community?: Promise<YaksaCommunity>;
    user?: User;
    canManageCommunity(): boolean;
    canPost(): boolean;
}
//# sourceMappingURL=YaksaCommunityMember.d.ts.map