var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, BeforeInsert, BeforeUpdate, OneToMany, ManyToMany, ManyToOne, JoinTable, JoinColumn } from 'typeorm';
import { UserRole, UserStatus } from '../types/auth.js';
import bcrypt from 'bcryptjs';
// Re-export types for external use
export { UserRole, UserStatus };
let User = class User {
    id;
    // @IsEmail()
    email;
    password; // bcrypt hashed
    // @IsOptional()
    firstName;
    // @IsOptional()
    lastName;
    name;
    avatar;
    // Phase 3-3: Phone number for checkout auto-fill
    phone;
    status;
    businessInfo;
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
    // @IsEnum(UserRole)
    role;
    /**
     * @deprecated Phase P0: DO NOT USE for authorization
     *
     * Legacy string array for multiple roles.
     * Use role_assignments table for RBAC instead.
     *
     * @see RoleAssignment entity
     */
    roles;
    /**
     * @deprecated Phase P0: DO NOT USE for authorization
     *
     * Legacy ManyToMany relation with roles table.
     * Use role_assignments table for RBAC instead.
     *
     * @see RoleAssignment entity
     */
    dbRoles;
    /**
     * @deprecated Phase P0: DO NOT USE for authorization
     *
     * Legacy active role selector.
     * Use role_assignments table to query active roles instead.
     *
     * @see RoleAssignment entity
     * @see RoleAssignment.isActive
     */
    activeRole;
    // Direct permissions (in addition to role permissions)
    // @IsArray()
    permissions;
    // @Column({ type: 'json', nullable: true })
    // metadata?: Record<string, any>;
    isActive;
    isEmailVerified;
    // @IsOptional()
    refreshTokenFamily; // 토큰 계열 관리
    // @IsOptional()
    lastLoginAt;
    // @IsOptional()
    lastLoginIp;
    loginAttempts;
    // @IsOptional()
    lockedUntil;
    // Domain for multi-tenant support
    domain;
    createdAt;
    updatedAt;
    // 승인 관련 필드
    // @IsOptional()
    approvedAt;
    // @IsOptional()
    approvedBy; // 승인한 관리자 ID
    // 소셜 로그인 제공자 정보
    // @IsOptional()
    provider; // 'local', 'google', 'kakao' 등
    // @IsOptional()
    provider_id; // 외부 제공자 사용자 ID
    // 비밀번호 재설정 토큰
    resetPasswordToken;
    resetPasswordExpires;
    // Phase 3-2: Onboarding completion flag
    onboardingCompleted;
    // 계정 잠금 상태 확인
    get isLocked() {
        return !!(this.lockedUntil && this.lockedUntil > new Date());
    }
    // 전체 이름 반환
    get fullName() {
        return `${this.firstName || ''} ${this.lastName || ''}`.trim() || this.email;
    }
    // Relations - lazy loaded to prevent circular dependencies
    refreshTokens;
    approvalLogs;
    adminActions;
    linkedAccounts;
    accountActivities;
    // Dropshipping relationships
    supplier; // Will be set via OneToOne in Supplier entity
    seller; // Will be set via OneToOne in Seller entity
    partner; // Will be set via OneToOne in Partner entity
    // Password hashing
    async hashPassword() {
        if (this.password && !this.password.startsWith('$2')) {
            this.password = await bcrypt.hash(this.password, 10);
        }
    }
    // Password validation
    async validatePassword(password) {
        return await bcrypt.compare(password, this.password);
    }
    // Role helper methods
    hasRole(role) {
        // Check database roles first
        const hasDbRole = this.dbRoles?.some(r => r.name === role) || false;
        // Check legacy roles array
        const hasLegacyRoles = this.roles?.includes(role) || false;
        // Check legacy role field
        const hasLegacyRole = this.role === role;
        return hasDbRole || hasLegacyRoles || hasLegacyRole;
    }
    hasAnyRole(roles) {
        return roles.some((role) => this.hasRole(role));
    }
    isAdmin() {
        return this.hasAnyRole([UserRole.SUPER_ADMIN, UserRole.ADMIN]);
    }
    // Get all permissions from database roles and direct permissions
    getAllPermissions() {
        // Legacy admin users (role = 'admin' or 'super_admin') get all permissions
        if (this.isAdmin()) {
            // Return all available permissions for admins
            const allPermissions = [
                // Users
                'users.view', 'users.create', 'users.edit', 'users.delete', 'users.suspend', 'users.approve',
                // Content
                'content.view', 'content.create', 'content.edit', 'content.delete', 'content.publish', 'content.moderate',
                // Categories & Tags
                'categories:write', 'categories:read', 'tags:write', 'tags:read',
                // Admin
                'admin.settings', 'admin.analytics', 'admin.logs', 'admin.backup',
                // ACF
                'acf.manage',
                // CPT
                'cpt.manage',
                // Shortcodes
                'shortcodes.manage',
                // API
                'api.access', 'api.admin'
            ];
            return allPermissions;
        }
        const rolePermissions = this.dbRoles?.flatMap(role => role.getPermissionKeys()) || [];
        const directPermissions = this.permissions || [];
        // Remove duplicates
        return [...new Set([...rolePermissions, ...directPermissions])];
    }
    // Check if user has a specific permission
    hasPermission(permission) {
        return this.getAllPermissions().includes(permission);
    }
    // Check if user has any of the permissions
    hasAnyPermission(permissions) {
        const userPermissions = this.getAllPermissions();
        return permissions.some(p => userPermissions.includes(p));
    }
    // Check if user has all of the permissions
    hasAllPermissions(permissions) {
        const userPermissions = this.getAllPermissions();
        return permissions.every(p => userPermissions.includes(p));
    }
    // Get role names as string array (for backward compatibility)
    getRoleNames() {
        if (this.dbRoles && this.dbRoles.length > 0) {
            return this.dbRoles.map(r => r.name);
        }
        return this.roles || [this.role];
    }
    isPending() {
        return this.status === UserStatus.PENDING;
    }
    isActiveUser() {
        return this.status === UserStatus.ACTIVE || this.status === UserStatus.APPROVED;
    }
    // Dropshipping role helper methods
    isSupplier() {
        return this.hasRole('supplier') || !!this.supplier;
    }
    isSeller() {
        return this.hasRole('seller') || !!this.seller;
    }
    isPartner() {
        return this.hasRole('partner') || !!this.partner;
    }
    // Get active dropshipping roles
    getDropshippingRoles() {
        const roles = [];
        if (this.isSupplier())
            roles.push('supplier');
        if (this.isSeller())
            roles.push('seller');
        if (this.isPartner())
            roles.push('partner');
        return roles;
    }
    // Get active role (with fallback to first dbRole)
    getActiveRole() {
        // If activeRole is explicitly set, use it
        if (this.activeRole) {
            return this.activeRole;
        }
        // Fallback: return first dbRole if available
        if (this.dbRoles && this.dbRoles.length > 0) {
            return this.dbRoles[0];
        }
        return null;
    }
    // Check if user can switch to a specific role
    canSwitchToRole(roleId) {
        if (!this.dbRoles || this.dbRoles.length === 0) {
            return false;
        }
        return this.dbRoles.some(r => r.id === roleId);
    }
    // Check if user has multiple roles
    hasMultipleRoles() {
        return this.dbRoles ? this.dbRoles.length > 1 : false;
    }
    // 민감 정보 제거한 공개 데이터
    toPublicData() {
        const activeRole = this.getActiveRole();
        return {
            id: this.id,
            email: this.email,
            firstName: this.firstName,
            lastName: this.lastName,
            fullName: this.fullName,
            phone: this.phone, // Phase 3-3: Include phone for checkout auto-fill
            role: this.role,
            roles: this.getRoleNames(), // Return role names as string array
            activeRole: activeRole ? {
                id: activeRole.id,
                name: activeRole.name,
                displayName: activeRole.displayName
            } : null,
            dbRoles: this.dbRoles?.map(r => ({
                id: r.id,
                name: r.name,
                displayName: r.displayName
            })) || [],
            canSwitchRoles: this.hasMultipleRoles(),
            status: this.status,
            permissions: this.getAllPermissions(), // Include all permissions from roles and direct
            isActive: this.isActive,
            isEmailVerified: this.isEmailVerified,
            lastLoginAt: this.lastLoginAt,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }
};
__decorate([
    PrimaryGeneratedColumn('uuid'),
    __metadata("design:type", String)
], User.prototype, "id", void 0);
__decorate([
    Column({ type: 'varchar', length: 255, unique: true })
    // @IsEmail()
    ,
    __metadata("design:type", String)
], User.prototype, "email", void 0);
__decorate([
    Column({ type: 'varchar', length: 255 }),
    __metadata("design:type", String)
], User.prototype, "password", void 0);
__decorate([
    Column({ type: 'varchar', length: 100, nullable: true })
    // @IsOptional()
    ,
    __metadata("design:type", String)
], User.prototype, "firstName", void 0);
__decorate([
    Column({ type: 'varchar', length: 100, nullable: true })
    // @IsOptional()
    ,
    __metadata("design:type", String)
], User.prototype, "lastName", void 0);
__decorate([
    Column({ type: 'varchar', length: 200, nullable: true }),
    __metadata("design:type", String)
], User.prototype, "name", void 0);
__decorate([
    Column({ type: 'varchar', length: 500, nullable: true }),
    __metadata("design:type", String)
], User.prototype, "avatar", void 0);
__decorate([
    Column({ type: 'varchar', length: 20, nullable: true }),
    __metadata("design:type", String)
], User.prototype, "phone", void 0);
__decorate([
    Column({
        type: 'enum',
        enum: UserStatus,
        default: UserStatus.PENDING
    }),
    __metadata("design:type", String)
], User.prototype, "status", void 0);
__decorate([
    Column({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], User.prototype, "businessInfo", void 0);
__decorate([
    Column({
        type: 'enum',
        enum: UserRole,
        default: UserRole.USER
    })
    // @IsEnum(UserRole)
    ,
    __metadata("design:type", String)
], User.prototype, "role", void 0);
__decorate([
    Column({
        type: 'simple-array',
        default: () => `'${UserRole.USER}'`
    }),
    __metadata("design:type", Array)
], User.prototype, "roles", void 0);
__decorate([
    ManyToMany('Role', 'users', { eager: true }),
    JoinTable({
        name: 'user_roles',
        joinColumn: { name: 'user_id', referencedColumnName: 'id' },
        inverseJoinColumn: { name: 'role_id', referencedColumnName: 'id' }
    }),
    __metadata("design:type", Array)
], User.prototype, "dbRoles", void 0);
__decorate([
    ManyToOne('Role', { nullable: true, eager: true }),
    JoinColumn({ name: 'active_role_id' }),
    __metadata("design:type", Object)
], User.prototype, "activeRole", void 0);
__decorate([
    Column({ type: 'json', default: () => "'[]'" })
    // @IsArray()
    ,
    __metadata("design:type", Array)
], User.prototype, "permissions", void 0);
__decorate([
    Column({ type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], User.prototype, "isActive", void 0);
__decorate([
    Column({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], User.prototype, "isEmailVerified", void 0);
__decorate([
    Column({ type: 'varchar', length: 255, nullable: true })
    // @IsOptional()
    ,
    __metadata("design:type", String)
], User.prototype, "refreshTokenFamily", void 0);
__decorate([
    Column({ type: 'timestamp', nullable: true })
    // @IsOptional()
    ,
    __metadata("design:type", Date)
], User.prototype, "lastLoginAt", void 0);
__decorate([
    Column({ type: 'varchar', length: 50, nullable: true })
    // @IsOptional()
    ,
    __metadata("design:type", String)
], User.prototype, "lastLoginIp", void 0);
__decorate([
    Column({ type: 'integer', default: 0 }),
    __metadata("design:type", Number)
], User.prototype, "loginAttempts", void 0);
__decorate([
    Column({ type: 'timestamp', nullable: true })
    // @IsOptional()
    ,
    __metadata("design:type", Date)
], User.prototype, "lockedUntil", void 0);
__decorate([
    Column({ type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", String)
], User.prototype, "domain", void 0);
__decorate([
    CreateDateColumn(),
    __metadata("design:type", Date)
], User.prototype, "createdAt", void 0);
__decorate([
    UpdateDateColumn(),
    __metadata("design:type", Date)
], User.prototype, "updatedAt", void 0);
__decorate([
    Column({ type: 'timestamp', nullable: true })
    // @IsOptional()
    ,
    __metadata("design:type", Date)
], User.prototype, "approvedAt", void 0);
__decorate([
    Column({ type: 'varchar', length: 255, nullable: true })
    // @IsOptional()
    ,
    __metadata("design:type", String)
], User.prototype, "approvedBy", void 0);
__decorate([
    Column({ type: 'varchar', length: 100, nullable: true })
    // @IsOptional()
    ,
    __metadata("design:type", String)
], User.prototype, "provider", void 0);
__decorate([
    Column({ type: 'varchar', length: 255, nullable: true })
    // @IsOptional()
    ,
    __metadata("design:type", String)
], User.prototype, "provider_id", void 0);
__decorate([
    Column({ type: 'varchar', length: 255, nullable: true, name: 'reset_password_token' }),
    __metadata("design:type", Object)
], User.prototype, "resetPasswordToken", void 0);
__decorate([
    Column({ type: 'timestamp', nullable: true, name: 'reset_password_expires' }),
    __metadata("design:type", Object)
], User.prototype, "resetPasswordExpires", void 0);
__decorate([
    Column({ type: 'boolean', default: false, name: 'onboarding_completed' }),
    __metadata("design:type", Boolean)
], User.prototype, "onboardingCompleted", void 0);
__decorate([
    OneToMany('RefreshToken', 'user'),
    __metadata("design:type", Array)
], User.prototype, "refreshTokens", void 0);
__decorate([
    OneToMany('ApprovalLog', 'user'),
    __metadata("design:type", Array)
], User.prototype, "approvalLogs", void 0);
__decorate([
    OneToMany('ApprovalLog', 'admin'),
    __metadata("design:type", Array)
], User.prototype, "adminActions", void 0);
__decorate([
    OneToMany('LinkedAccount', 'user'),
    __metadata("design:type", Array)
], User.prototype, "linkedAccounts", void 0);
__decorate([
    OneToMany('AccountActivity', 'user'),
    __metadata("design:type", Array)
], User.prototype, "accountActivities", void 0);
__decorate([
    BeforeInsert(),
    BeforeUpdate(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], User.prototype, "hashPassword", null);
User = __decorate([
    Entity('users'),
    Index(['email'], { unique: true }),
    Index(['role']),
    Index(['isActive'])
], User);
export { User };
