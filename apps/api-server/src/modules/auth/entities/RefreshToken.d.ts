import type { User } from './User.js';
export declare class RefreshToken {
    id: string;
    token: string;
    user: User;
    userId: string;
    expiresAt: Date;
    deviceId?: string;
    userAgent?: string;
    ipAddress?: string;
    revoked: boolean;
    revokedAt?: Date;
    revokedReason?: string;
    createdAt: Date;
    updatedAt: Date;
    isExpired(): boolean;
    isValid(): boolean;
}
//# sourceMappingURL=RefreshToken.d.ts.map