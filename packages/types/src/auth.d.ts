export type UserRole = 'admin' | 'business' | 'affiliate' | 'customer' | 'seller' | 'supplier' | 'vendor' | 'manager' | 'retailer';
export interface User {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    isApproved?: boolean;
    avatar?: string;
    lastLoginAt?: Date;
    status?: 'active' | 'inactive' | 'pending';
}
export interface AuthToken {
    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
}
export interface SessionStatus {
    isValid: boolean;
    expiresAt: Date;
    remainingTime: number;
}
//# sourceMappingURL=auth.d.ts.map