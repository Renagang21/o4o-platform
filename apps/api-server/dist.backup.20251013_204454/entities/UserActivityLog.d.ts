import { User } from './User';
export declare enum ActivityType {
    LOGIN = "login",
    LOGOUT = "logout",
    PASSWORD_CHANGE = "password_change",
    EMAIL_CHANGE = "email_change",
    PROFILE_UPDATE = "profile_update",
    AVATAR_UPDATE = "avatar_update",
    BUSINESS_INFO_UPDATE = "business_info_update",
    ACCOUNT_ACTIVATION = "account_activation",
    ACCOUNT_DEACTIVATION = "account_deactivation",
    ACCOUNT_SUSPENSION = "account_suspension",
    ACCOUNT_UNSUSPENSION = "account_unsuspension",
    EMAIL_VERIFICATION = "email_verification",
    ROLE_CHANGE = "role_change",
    PERMISSION_GRANT = "permission_grant",
    PERMISSION_REVOKE = "permission_revoke",
    ADMIN_APPROVAL = "admin_approval",
    ADMIN_REJECTION = "admin_rejection",
    ADMIN_NOTE_ADD = "admin_note_add",
    PASSWORD_RESET_REQUEST = "password_reset_request",
    PASSWORD_RESET_COMPLETE = "password_reset_complete",
    TWO_FACTOR_ENABLE = "two_factor_enable",
    TWO_FACTOR_DISABLE = "two_factor_disable",
    API_KEY_CREATE = "api_key_create",
    API_KEY_DELETE = "api_key_delete",
    API_ACCESS_DENIED = "api_access_denied",
    DATA_EXPORT = "data_export",
    DATA_DELETION = "data_deletion",
    GDPR_REQUEST = "gdpr_request"
}
export declare enum ActivityCategory {
    AUTHENTICATION = "authentication",
    PROFILE = "profile",
    SECURITY = "security",
    ADMIN = "admin",
    SYSTEM = "system"
}
export interface ActivityMetadata {
    ipAddress?: string;
    userAgent?: string;
    location?: {
        country?: string;
        city?: string;
        timezone?: string;
    };
    oldValue?: string;
    newValue?: string;
    changedFields?: string[];
    adminUserId?: string;
    adminUserEmail?: string;
    adminReason?: string;
    loginMethod?: string;
    deviceInfo?: string;
    browserInfo?: string;
    endpoint?: string;
    httpMethod?: string;
    statusCode?: number;
    [key: string]: any;
}
export declare class UserActivityLog {
    id: string;
    userId: string;
    user: User;
    activityType: ActivityType;
    activityCategory: ActivityCategory;
    title: string;
    description?: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: ActivityMetadata;
    isSystemGenerated: boolean;
    performedByUserId?: string;
    performedBy?: User;
    createdAt: Date;
    static createLoginActivity(userId: string, ipAddress?: string, userAgent?: string, metadata?: ActivityMetadata): Partial<UserActivityLog>;
    static createLogoutActivity(userId: string, ipAddress?: string, metadata?: ActivityMetadata): Partial<UserActivityLog>;
    static createProfileUpdateActivity(userId: string, changedFields: string[], performedByUserId?: string, metadata?: ActivityMetadata): Partial<UserActivityLog>;
    static createRoleChangeActivity(userId: string, oldRole: string, newRole: string, performedByUserId: string, reason?: string): Partial<UserActivityLog>;
    static createAdminApprovalActivity(userId: string, performedByUserId: string, reason?: string): Partial<UserActivityLog>;
    static createAccountStatusActivity(userId: string, activityType: ActivityType, performedByUserId?: string, reason?: string): Partial<UserActivityLog>;
    getDisplayTitle(): string;
    getDisplayDescription(): string;
    isSecurityRelated(): boolean;
    isAdminAction(): boolean;
    getCategoryDisplayName(): string;
}
//# sourceMappingURL=UserActivityLog.d.ts.map