"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserActivityLog = exports.ActivityCategory = exports.ActivityType = void 0;
const typeorm_1 = require("typeorm");
const User_1 = require("./User");
var ActivityType;
(function (ActivityType) {
    // Authentication
    ActivityType["LOGIN"] = "login";
    ActivityType["LOGOUT"] = "logout";
    ActivityType["PASSWORD_CHANGE"] = "password_change";
    ActivityType["EMAIL_CHANGE"] = "email_change";
    // Profile Management
    ActivityType["PROFILE_UPDATE"] = "profile_update";
    ActivityType["AVATAR_UPDATE"] = "avatar_update";
    ActivityType["BUSINESS_INFO_UPDATE"] = "business_info_update";
    // Account Status
    ActivityType["ACCOUNT_ACTIVATION"] = "account_activation";
    ActivityType["ACCOUNT_DEACTIVATION"] = "account_deactivation";
    ActivityType["ACCOUNT_SUSPENSION"] = "account_suspension";
    ActivityType["ACCOUNT_UNSUSPENSION"] = "account_unsuspension";
    ActivityType["EMAIL_VERIFICATION"] = "email_verification";
    // Role and Permissions
    ActivityType["ROLE_CHANGE"] = "role_change";
    ActivityType["PERMISSION_GRANT"] = "permission_grant";
    ActivityType["PERMISSION_REVOKE"] = "permission_revoke";
    // Admin Actions
    ActivityType["ADMIN_APPROVAL"] = "admin_approval";
    ActivityType["ADMIN_REJECTION"] = "admin_rejection";
    ActivityType["ADMIN_NOTE_ADD"] = "admin_note_add";
    // Security
    ActivityType["PASSWORD_RESET_REQUEST"] = "password_reset_request";
    ActivityType["PASSWORD_RESET_COMPLETE"] = "password_reset_complete";
    ActivityType["TWO_FACTOR_ENABLE"] = "two_factor_enable";
    ActivityType["TWO_FACTOR_DISABLE"] = "two_factor_disable";
    // API Access
    ActivityType["API_KEY_CREATE"] = "api_key_create";
    ActivityType["API_KEY_DELETE"] = "api_key_delete";
    ActivityType["API_ACCESS_DENIED"] = "api_access_denied";
    // System Events
    ActivityType["DATA_EXPORT"] = "data_export";
    ActivityType["DATA_DELETION"] = "data_deletion";
    ActivityType["GDPR_REQUEST"] = "gdpr_request";
})(ActivityType || (exports.ActivityType = ActivityType = {}));
var ActivityCategory;
(function (ActivityCategory) {
    ActivityCategory["AUTHENTICATION"] = "authentication";
    ActivityCategory["PROFILE"] = "profile";
    ActivityCategory["SECURITY"] = "security";
    ActivityCategory["ADMIN"] = "admin";
    ActivityCategory["SYSTEM"] = "system";
})(ActivityCategory || (exports.ActivityCategory = ActivityCategory = {}));
let UserActivityLog = class UserActivityLog {
    // Helper methods
    static createLoginActivity(userId, ipAddress, userAgent, metadata) {
        return {
            userId,
            activityType: ActivityType.LOGIN,
            activityCategory: ActivityCategory.AUTHENTICATION,
            title: 'User logged in',
            description: 'User successfully logged into the system',
            ipAddress,
            userAgent,
            metadata
        };
    }
    static createLogoutActivity(userId, ipAddress, metadata) {
        return {
            userId,
            activityType: ActivityType.LOGOUT,
            activityCategory: ActivityCategory.AUTHENTICATION,
            title: 'User logged out',
            description: 'User logged out of the system',
            ipAddress,
            metadata
        };
    }
    static createProfileUpdateActivity(userId, changedFields, performedByUserId, metadata) {
        return {
            userId,
            activityType: ActivityType.PROFILE_UPDATE,
            activityCategory: ActivityCategory.PROFILE,
            title: 'Profile updated',
            description: `Updated fields: ${changedFields.join(', ')}`,
            performedByUserId,
            isSystemGenerated: false,
            metadata: {
                changedFields,
                ...metadata
            }
        };
    }
    static createRoleChangeActivity(userId, oldRole, newRole, performedByUserId, reason) {
        return {
            userId,
            activityType: ActivityType.ROLE_CHANGE,
            activityCategory: ActivityCategory.ADMIN,
            title: 'Role changed',
            description: `Role changed from ${oldRole} to ${newRole}`,
            performedByUserId,
            isSystemGenerated: false,
            metadata: {
                oldValue: oldRole,
                newValue: newRole,
                adminReason: reason
            }
        };
    }
    static createAdminApprovalActivity(userId, performedByUserId, reason) {
        return {
            userId,
            activityType: ActivityType.ADMIN_APPROVAL,
            activityCategory: ActivityCategory.ADMIN,
            title: 'Account approved',
            description: 'Account was approved by administrator',
            performedByUserId,
            isSystemGenerated: false,
            metadata: {
                adminReason: reason
            }
        };
    }
    static createAccountStatusActivity(userId, activityType, performedByUserId, reason) {
        const titles = {
            [ActivityType.ACCOUNT_ACTIVATION]: 'Account activated',
            [ActivityType.ACCOUNT_DEACTIVATION]: 'Account deactivated',
            [ActivityType.ACCOUNT_SUSPENSION]: 'Account suspended',
            [ActivityType.ACCOUNT_UNSUSPENSION]: 'Account unsuspended',
            [ActivityType.EMAIL_VERIFICATION]: 'Email verified',
            // Add other activity types as needed
        };
        return {
            userId,
            activityType,
            activityCategory: ActivityCategory.ADMIN,
            title: titles[activityType] || 'Account status changed',
            description: reason || 'Account status was modified',
            performedByUserId,
            isSystemGenerated: !performedByUserId,
            metadata: {
                adminReason: reason
            }
        };
    }
    // Instance methods
    getDisplayTitle() {
        return this.title;
    }
    getDisplayDescription() {
        if (this.description)
            return this.description;
        const typeDisplayNames = {
            [ActivityType.LOGIN]: 'Logged into the system',
            [ActivityType.LOGOUT]: 'Logged out of the system',
            [ActivityType.PROFILE_UPDATE]: 'Updated profile information',
            [ActivityType.ROLE_CHANGE]: 'Role was modified',
            [ActivityType.ACCOUNT_ACTIVATION]: 'Account was activated',
            [ActivityType.ACCOUNT_SUSPENSION]: 'Account was suspended'
        };
        return typeDisplayNames[this.activityType] || 'Activity performed';
    }
    isSecurityRelated() {
        return [
            ActivityType.LOGIN,
            ActivityType.LOGOUT,
            ActivityType.PASSWORD_CHANGE,
            ActivityType.PASSWORD_RESET_REQUEST,
            ActivityType.PASSWORD_RESET_COMPLETE,
            ActivityType.TWO_FACTOR_ENABLE,
            ActivityType.TWO_FACTOR_DISABLE,
            ActivityType.API_ACCESS_DENIED
        ].includes(this.activityType);
    }
    isAdminAction() {
        return this.activityCategory === ActivityCategory.ADMIN;
    }
    getCategoryDisplayName() {
        const categoryNames = {
            [ActivityCategory.AUTHENTICATION]: 'Authentication',
            [ActivityCategory.PROFILE]: 'Profile',
            [ActivityCategory.SECURITY]: 'Security',
            [ActivityCategory.ADMIN]: 'Administration',
            [ActivityCategory.SYSTEM]: 'System'
        };
        return categoryNames[this.activityCategory];
    }
};
exports.UserActivityLog = UserActivityLog;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], UserActivityLog.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], UserActivityLog.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_1.User, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'userId' }),
    __metadata("design:type", User_1.User)
], UserActivityLog.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: ActivityType }),
    __metadata("design:type", String)
], UserActivityLog.prototype, "activityType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: ActivityCategory }),
    __metadata("design:type", String)
], UserActivityLog.prototype, "activityCategory", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255 }),
    __metadata("design:type", String)
], UserActivityLog.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], UserActivityLog.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 45, nullable: true }),
    __metadata("design:type", String)
], UserActivityLog.prototype, "ipAddress", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], UserActivityLog.prototype, "userAgent", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], UserActivityLog.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], UserActivityLog.prototype, "isSystemGenerated", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', nullable: true }),
    __metadata("design:type", String)
], UserActivityLog.prototype, "performedByUserId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_1.User, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'performedByUserId' }),
    __metadata("design:type", User_1.User)
], UserActivityLog.prototype, "performedBy", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], UserActivityLog.prototype, "createdAt", void 0);
exports.UserActivityLog = UserActivityLog = __decorate([
    (0, typeorm_1.Entity)('user_activity_logs'),
    (0, typeorm_1.Index)(['userId', 'activityType', 'createdAt']),
    (0, typeorm_1.Index)(['activityCategory', 'createdAt']),
    (0, typeorm_1.Index)(['createdAt'])
], UserActivityLog);
//# sourceMappingURL=UserActivityLog.js.map