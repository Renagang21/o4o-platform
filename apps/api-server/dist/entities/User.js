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
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = exports.UserStatus = exports.UserRole = void 0;
const typeorm_1 = require("typeorm");
const auth_1 = require("../types/auth");
Object.defineProperty(exports, "UserRole", { enumerable: true, get: function () { return auth_1.UserRole; } });
Object.defineProperty(exports, "UserStatus", { enumerable: true, get: function () { return auth_1.UserStatus; } });
const RefreshToken_1 = require("./RefreshToken");
const ApprovalLog_1 = require("./ApprovalLog");
const LinkedAccount_1 = require("./LinkedAccount");
const AccountActivity_1 = require("./AccountActivity");
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
        return this.roles.includes(role) || this.role === role;
    }
    hasAnyRole(roles) {
        return roles.some((role) => this.hasRole(role));
    }
    isAdmin() {
        return this.hasAnyRole([auth_1.UserRole.SUPER_ADMIN, auth_1.UserRole.ADMIN]);
    }
    isPending() {
        return this.status === auth_1.UserStatus.PENDING;
    }
    isActiveUser() {
        return this.status === auth_1.UserStatus.ACTIVE || this.status === auth_1.UserStatus.APPROVED;
    }
    // 민감 정보 제거한 공개 데이터
    toPublicData() {
        return {
            id: this.id,
            email: this.email,
            firstName: this.firstName,
            lastName: this.lastName,
            fullName: this.fullName,
            role: this.role,
            roles: this.roles,
            status: this.status,
            permissions: this.permissions,
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
    (0, typeorm_1.Column)({ type: 'json', default: () => "'[]'" })
    // @IsArray()
    ,
    __metadata("design:type", Array)
], User.prototype, "permissions", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], User.prototype, "metadata", void 0);
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
    (0, typeorm_1.OneToMany)(() => RefreshToken_1.RefreshToken, refreshToken => refreshToken.user),
    __metadata("design:type", Array)
], User.prototype, "refreshTokens", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => ApprovalLog_1.ApprovalLog, log => log.user),
    __metadata("design:type", Array)
], User.prototype, "approvalLogs", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => LinkedAccount_1.LinkedAccount, linkedAccount => linkedAccount.user),
    __metadata("design:type", Array)
], User.prototype, "linkedAccounts", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => AccountActivity_1.AccountActivity, activity => activity.user),
    __metadata("design:type", Array)
], User.prototype, "accountActivities", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => ApprovalLog_1.ApprovalLog, log => log.admin),
    __metadata("design:type", Array)
], User.prototype, "adminActions", void 0);
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