import { UserRole, UserStatus } from '../../../types/auth.js';
import { BusinessInfo } from '../../../types/user.js';
import type { Role } from './Role.js';
export { UserRole, UserStatus };
export declare class User {
    id: string;
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    name?: string;
    avatar?: string;
    phone?: string;
    status: UserStatus;
    businessInfo?: BusinessInfo;
    /**
     * @deprecated Phase P0: DO NOT USE for authorization
     *
     * This field is kept for backward compatibility only.
     * Use role_assignments table for RBAC instead.
     *
     * @see RoleAssignment entity
     * @see docs/dev/investigations/user-refactor_2025-11/zerodata/01_schema_baseline.md
     * @see docs/dev/investigations/user-refactor_2025-11/zerodata/04_rbac_policy.md
     */
    role: UserRole;
    /**
     * @deprecated Phase P0: DO NOT USE for authorization
     *
     * Legacy string array for multiple roles.
     * Use role_assignments table for RBAC instead.
     *
     * @see RoleAssignment entity
     */
    roles: string[];
    /**
     * @deprecated Phase P0: DO NOT USE for authorization
     *
     * Legacy ManyToMany relation with roles table.
     * Use role_assignments table for RBAC instead.
     *
     * @see RoleAssignment entity
     */
    dbRoles?: Role[];
    /**
     * @deprecated Phase P0: DO NOT USE for authorization
     *
     * Legacy active role selector.
     * Use role_assignments table to query active roles instead.
     *
     * @see RoleAssignment entity
     * @see RoleAssignment.isActive
     */
    activeRole?: Role | null;
    permissions: string[];
    isActive: boolean;
    isEmailVerified: boolean;
    refreshTokenFamily?: string;
    lastLoginAt?: Date;
    lastLoginIp?: string;
    loginAttempts: number;
    lockedUntil?: Date;
    domain?: string;
    createdAt: Date;
    updatedAt: Date;
    approvedAt?: Date;
    approvedBy?: string;
    provider?: string;
    provider_id?: string;
    resetPasswordToken?: string | null;
    resetPasswordExpires?: Date | null;
    onboardingCompleted: boolean;
    get isLocked(): boolean;
    get fullName(): string;
    refreshTokens?: any[];
    approvalLogs?: any[];
    adminActions?: any[];
    linkedAccounts?: any[];
    accountActivities?: any[];
    supplier?: any;
    seller?: any;
    partner?: any;
    hashPassword(): Promise<void>;
    validatePassword(password: string): Promise<boolean>;
    hasRole(role: UserRole | string): boolean;
    hasAnyRole(roles: (UserRole | string)[]): boolean;
    isAdmin(): boolean;
    getAllPermissions(): string[];
    hasPermission(permission: string): boolean;
    hasAnyPermission(permissions: string[]): boolean;
    hasAllPermissions(permissions: string[]): boolean;
    getRoleNames(): string[];
    isPending(): boolean;
    isActiveUser(): boolean;
    isSupplier(): boolean;
    isSeller(): boolean;
    isPartner(): boolean;
    getDropshippingRoles(): string[];
    getActiveRole(): Role | null;
    canSwitchToRole(roleId: string): boolean;
    hasMultipleRoles(): boolean;
    toPublicData(): {
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        fullName: string;
        phone: string;
        role: UserRole;
        roles: string[];
        activeRole: {
            id: string;
            name: string;
            displayName: string;
        };
        dbRoles: {
            id: string;
            name: string;
            displayName: string;
        }[];
        canSwitchRoles: boolean;
        status: UserStatus;
        permissions: string[];
        isActive: boolean;
        isEmailVerified: boolean;
        lastLoginAt: Date;
        createdAt: Date;
        updatedAt: Date;
    };
}
//# sourceMappingURL=User.d.ts.map