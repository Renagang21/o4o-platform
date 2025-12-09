export type UserRole = string;
export type Permission = string;
export declare const COMMON_PERMISSIONS: {
    readonly APPS_MANAGE: "apps:manage";
    readonly APPS_VIEW: "apps:view";
    readonly CONTENT_READ: "content:read";
    readonly CONTENT_WRITE: "content:write";
    readonly CATEGORIES_READ: "categories:read";
    readonly CATEGORIES_WRITE: "categories:write";
    readonly USERS_READ: "users:read";
    readonly USERS_WRITE: "users:write";
    readonly SETTINGS_READ: "settings:read";
    readonly SETTINGS_WRITE: "settings:write";
    readonly TEMPLATES_READ: "templates:read";
    readonly TEMPLATES_WRITE: "templates:write";
    readonly MENUS_READ: "menus:read";
    readonly MENUS_WRITE: "menus:write";
    readonly ECOMMERCE_READ: "ecommerce:read";
    readonly ECOMMERCE_WRITE: "ecommerce:write";
    readonly ORDERS_MANAGE: "orders:manage";
    readonly PRODUCTS_MANAGE: "products:manage";
    readonly FORUM_MODERATE: "forum:moderate";
    readonly SYSTEM_ADMIN: "system:admin";
};
export interface User {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    permissions?: Permission[];
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