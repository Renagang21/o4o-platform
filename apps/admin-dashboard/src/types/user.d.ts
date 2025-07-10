export type UserRole = 'admin' | 'customer' | 'business' | 'affiliate';
export type UserStatus = 'pending' | 'approved' | 'rejected' | 'suspended';
export interface BusinessInfo {
    businessName: string;
    businessType: string;
    businessNumber: string;
    businessAddress?: string;
    representativeName?: string;
    contactPhone?: string;
}
export interface User {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    status: UserStatus;
    businessInfo?: BusinessInfo;
    createdAt: string;
    updatedAt: string;
    approvedAt?: string;
    approvedBy?: string;
    lastLoginAt?: string;
    isEmailVerified: boolean;
    profileImage?: string;
    phone?: string;
}
export interface UserFilters {
    role?: UserRole | 'all';
    status?: UserStatus | 'all';
    search?: string;
    dateFrom?: string;
    dateTo?: string;
    businessType?: string;
}
export interface UserBulkAction {
    action: 'approve' | 'reject' | 'suspend' | 'reactivate' | 'delete';
    userIds: string[];
    reason?: string;
}
export interface UserFormData {
    name: string;
    email: string;
    role: UserRole;
    businessInfo?: Partial<BusinessInfo>;
    password?: string;
    sendWelcomeEmail?: boolean;
}
export interface UserStats {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    suspended: number;
    byRole: Record<UserRole, number>;
    recentRegistrations: User[];
}
export interface UserActivityLog {
    id: string;
    userId: string;
    action: string;
    details: string;
    performedBy: string;
    performedAt: string;
}
export declare const LEGACY_ROLE_MAPPING: Record<string, UserRole>;
export declare const ROLE_LABELS: Record<UserRole, string>;
export declare const STATUS_LABELS: Record<UserStatus, string>;
export declare const BUSINESS_TYPES: readonly ["소매업", "도매업", "제조업", "서비스업", "온라인쇼핑몰", "블로그/미디어", "헬스케어", "뷰티/화장품", "건강기능식품", "기타"];
export type BusinessType = typeof BUSINESS_TYPES[number];
//# sourceMappingURL=user.d.ts.map