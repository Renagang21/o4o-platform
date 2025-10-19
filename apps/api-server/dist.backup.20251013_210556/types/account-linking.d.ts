export type AuthProvider = 'email' | 'google' | 'kakao' | 'naver';
export declare enum LinkingStatus {
    PENDING = "pending",
    VERIFIED = "verified",
    FAILED = "failed"
}
export interface LinkedAccount {
    id: string;
    userId: string;
    provider: AuthProvider;
    providerId?: string;
    email: string;
    displayName?: string;
    profileImage?: string;
    isVerified: boolean;
    isPrimary: boolean;
    linkedAt: Date;
    lastUsedAt?: Date;
}
export interface LinkAccountRequest {
    provider: AuthProvider;
    code?: string;
    email?: string;
    password?: string;
}
export interface UnlinkAccountRequest {
    provider: AuthProvider;
    password?: string;
}
export interface LinkAccountResponse {
    success: boolean;
    message: string;
    linkedAccount?: LinkedAccount;
    requiresVerification?: boolean;
    error?: {
        code: string;
        message: string;
    };
}
export interface ProfileMergeOptions {
    preferredProvider?: AuthProvider;
    mergeFields: {
        name?: boolean;
        profileImage?: boolean;
        email?: boolean;
        phone?: boolean;
        linkedAccounts?: boolean;
        businessInfo?: boolean;
        permissions?: boolean;
        roles?: boolean;
    };
}
export interface MergedProfile {
    id: string;
    email: string;
    name: string;
    profileImage?: string;
    phone?: string;
    emailVerified: boolean;
    providers: AuthProvider[];
    linkedAccounts: LinkedAccount[];
    primaryProvider: AuthProvider;
    createdAt: Date;
    updatedAt: Date;
}
export interface LinkingSession {
    id: string;
    userId: string;
    provider: AuthProvider;
    status: LinkingStatus;
    verificationToken?: string;
    expiresAt: Date;
    metadata?: Record<string, any>;
}
export interface OAuthLinkingState {
    userId: string;
    provider: AuthProvider;
    action: 'link' | 'unlink';
    returnUrl: string;
    sessionId: string;
}
export interface AccountMergeRequest {
    sourceUserId: string;
    targetUserId: string;
    mergeOptions: ProfileMergeOptions;
}
export interface AccountMergeResult {
    success: boolean;
    mergedUserId: string;
    mergedProfile: MergedProfile;
    deletedUserId?: string;
    warnings?: string[];
}
export interface SecurityVerification {
    method: 'password' | 'email' | 'sms';
    token?: string;
    password?: string;
    code?: string;
}
export interface AccountActivity {
    id: string;
    userId: string;
    action: 'linked' | 'unlinked' | 'merged' | 'login' | 'failed_link';
    provider: AuthProvider;
    ipAddress: string;
    userAgent: string;
    metadata?: Record<string, any>;
    createdAt: Date;
}
export declare enum AccountLinkingError {
    ALREADY_LINKED = "ALREADY_LINKED",
    ACCOUNT_NOT_FOUND = "ACCOUNT_NOT_FOUND",
    PROVIDER_ERROR = "PROVIDER_ERROR",
    VERIFICATION_REQUIRED = "VERIFICATION_REQUIRED",
    INVALID_CREDENTIALS = "INVALID_CREDENTIALS",
    MERGE_CONFLICT = "MERGE_CONFLICT",
    SECURITY_VERIFICATION_FAILED = "SECURITY_VERIFICATION_FAILED",
    SESSION_EXPIRED = "SESSION_EXPIRED",
    INVALID_PROVIDER = "INVALID_PROVIDER",
    LAST_PROVIDER = "LAST_PROVIDER"
}
export interface UnifiedLoginRequest {
    provider: AuthProvider;
    credentials?: {
        email: string;
        password: string;
    };
    oauthProfile?: OAuthProfile;
    ipAddress: string;
    userAgent: string;
}
export interface OAuthProfile {
    id: string;
    email: string;
    displayName?: string;
    firstName?: string;
    lastName?: string;
    avatar?: string;
    emailVerified?: boolean;
    metadata?: Record<string, any>;
}
export interface UnifiedLoginResponse {
    success: boolean;
    user: any;
    tokens: {
        accessToken: string;
        refreshToken: string;
        expiresIn: number;
    };
    sessionId: string;
    linkedAccounts: LinkedAccount[];
    isNewUser: boolean;
    autoLinked?: boolean;
}
//# sourceMappingURL=account-linking.d.ts.map