"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = exports.UserStatus = exports.UserRole = void 0;
const typeorm_1 = require("typeorm");
const auth_1 = require("../types/auth");
Object.defineProperty(exports, "UserRole", { enumerable: true, get: function () { return auth_1.UserRole; } });
Object.defineProperty(exports, "UserStatus", { enumerable: true, get: function () { return auth_1.UserStatus; } });
const Role_1 = require("./Role");
const bcrypt = __importStar(require("bcryptjs"));
let User = class User {
    // 계정 잠금 상태 확인
    get isLocked() {
        return !!(this.lockedUntil && this.lockedUntil > new Date());
    }
    // 전체 이름 반환
    get fullName() {
        return `${this.firstName || ''} ${this.lastName || ''}`.trim() || this.email;
    }
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
        var _a, _b;
        // Check database roles first
        const hasDbRole = ((_a = this.dbRoles) === null || _a === void 0 ? void 0 : _a.some(r => r.name === role)) || false;
        // Check legacy roles array
        const hasLegacyRoles = ((_b = this.roles) === null || _b === void 0 ? void 0 : _b.includes(role)) || false;
        // Check legacy role field
        const hasLegacyRole = this.role === role;
        return hasDbRole || hasLegacyRoles || hasLegacyRole;
    }
    hasAnyRole(roles) {
        return roles.some((role) => this.hasRole(role));
    }
    isAdmin() {
        return this.hasAnyRole([auth_1.UserRole.SUPER_ADMIN, auth_1.UserRole.ADMIN]);
    }
    // Get all permissions from database roles and direct permissions
    getAllPermissions() {
        var _a;
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
        const rolePermissions = ((_a = this.dbRoles) === null || _a === void 0 ? void 0 : _a.flatMap(role => role.getPermissionKeys())) || [];
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
        return this.status === auth_1.UserStatus.PENDING;
    }
    isActiveUser() {
        return this.status === auth_1.UserStatus.ACTIVE || this.status === auth_1.UserStatus.APPROVED;
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
        var _a;
        const activeRole = this.getActiveRole();
        return {
            id: this.id,
            email: this.email,
            firstName: this.firstName,
            lastName: this.lastName,
            fullName: this.fullName,
            role: this.role,
            roles: this.getRoleNames(), // Return role names as string array
            activeRole: activeRole ? {
                id: activeRole.id,
                name: activeRole.name,
                displayName: activeRole.displayName
            } : null,
            dbRoles: ((_a = this.dbRoles) === null || _a === void 0 ? void 0 : _a.map(r => ({
                id: r.id,
                name: r.name,
                displayName: r.displayName
            }))) || [],
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
exports.User = User;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], User.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, unique: true })
    // @IsEmail()
    ,
    __metadata("design:type", String)
], User.prototype, "email", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255 }),
    __metadata("design:type", String)
], User.prototype, "password", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, nullable: true })
    // @IsOptional()
    ,
    __metadata("design:type", String)
], User.prototype, "firstName", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, nullable: true })
    // @IsOptional()
    ,
    __metadata("design:type", String)
], User.prototype, "lastName", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 200, nullable: true }),
    __metadata("design:type", String)
], User.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 500, nullable: true }),
    __metadata("design:type", String)
], User.prototype, "avatar", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: auth_1.UserStatus,
        default: auth_1.UserStatus.PENDING
    }),
    __metadata("design:type", String)
], User.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], User.prototype, "businessInfo", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: auth_1.UserRole,
        default: auth_1.UserRole.CUSTOMER
    })
    // @IsEnum(UserRole)
    ,
    __metadata("design:type", String)
], User.prototype, "role", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'simple-array',
        default: () => `'${auth_1.UserRole.CUSTOMER}'`
    }),
    __metadata("design:type", Array)
], User.prototype, "roles", void 0);
__decorate([
    (0, typeorm_1.ManyToMany)(() => Role_1.Role, role => role.users, { eager: true }),
    (0, typeorm_1.JoinTable)({
        name: 'user_roles',
        joinColumn: { name: 'user_id', referencedColumnName: 'id' },
        inverseJoinColumn: { name: 'role_id', referencedColumnName: 'id' }
    }),
    __metadata("design:type", Array)
], User.prototype, "dbRoles", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Role_1.Role, { nullable: true, eager: true }),
    (0, typeorm_1.JoinColumn)({ name: 'active_role_id' }),
    __metadata("design:type", Role_1.Role)
], User.prototype, "activeRole", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', default: () => "'[]'" })
    // @IsArray()
    ,
    __metadata("design:type", Array)
], User.prototype, "permissions", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], User.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], User.prototype, "isEmailVerified", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, nullable: true })
    // @IsOptional()
    ,
    __metadata("design:type", String)
], User.prototype, "refreshTokenFamily", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true })
    // @IsOptional()
    ,
    __metadata("design:type", Date)
], User.prototype, "lastLoginAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 50, nullable: true })
    // @IsOptional()
    ,
    __metadata("design:type", String)
], User.prototype, "lastLoginIp", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer', default: 0 }),
    __metadata("design:type", Number)
], User.prototype, "loginAttempts", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true })
    // @IsOptional()
    ,
    __metadata("design:type", Date)
], User.prototype, "lockedUntil", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", String)
], User.prototype, "betaUserId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", String)
], User.prototype, "domain", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], User.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], User.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true })
    // @IsOptional()
    ,
    __metadata("design:type", Date)
], User.prototype, "approvedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, nullable: true })
    // @IsOptional()
    ,
    __metadata("design:type", String)
], User.prototype, "approvedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, nullable: true })
    // @IsOptional()
    ,
    __metadata("design:type", String)
], User.prototype, "provider", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, nullable: true })
    // @IsOptional()
    ,
    __metadata("design:type", String)
], User.prototype, "provider_id", void 0);
__decorate([
    (0, typeorm_1.OneToMany)('RefreshToken', 'user'),
    __metadata("design:type", Array)
], User.prototype, "refreshTokens", void 0);
__decorate([
    (0, typeorm_1.OneToMany)('ApprovalLog', 'user'),
    __metadata("design:type", Array)
], User.prototype, "approvalLogs", void 0);
__decorate([
    (0, typeorm_1.OneToMany)('ApprovalLog', 'admin'),
    __metadata("design:type", Array)
], User.prototype, "adminActions", void 0);
__decorate([
    (0, typeorm_1.OneToMany)('LinkedAccount', 'user'),
    __metadata("design:type", Array)
], User.prototype, "linkedAccounts", void 0);
__decorate([
    (0, typeorm_1.OneToMany)('AccountActivity', 'user'),
    __metadata("design:type", Array)
], User.prototype, "accountActivities", void 0);
__decorate([
    (0, typeorm_1.BeforeInsert)(),
    (0, typeorm_1.BeforeUpdate)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], User.prototype, "hashPassword", null);
exports.User = User = __decorate([
    (0, typeorm_1.Entity)('users'),
    (0, typeorm_1.Index)(['email'], { unique: true }),
    (0, typeorm_1.Index)(['role']),
    (0, typeorm_1.Index)(['isActive'])
], User);
//# sourceMappingURL=User.js.map