export interface RegisterUserDto {
    email: string;
    password: string;
    name: string;
    termsAccepted: boolean;
    privacyAccepted: boolean;
    marketingAccepted?: boolean;
}
export interface LoginUserDto {
    email: string;
    password: string;
    rememberMe?: boolean;
}
export interface ResetPasswordRequestDto {
    email: string;
}
export interface ResetPasswordDto {
    token: string;
    newPassword: string;
    confirmPassword: string;
}
export interface VerifyEmailDto {
    token: string;
}
export interface JwtPayload {
    userId: string;
    email: string;
    role: string;
    emailVerified: boolean;
    iat?: number;
    exp?: number;
}
export interface AuthResponse {
    success: boolean;
    message: string;
    data?: {
        user: {
            id: string;
            email: string;
            name: string;
            role: string;
            emailVerified: boolean;
            createdAt: Date;
        };
        accessToken: string;
        refreshToken?: string;
    };
}
export interface EmailTemplateData {
    name: string;
    actionUrl: string;
    supportEmail: string;
    companyName: string;
    year: number;
}
export interface VerificationEmailData extends EmailTemplateData {
    verificationCode?: string;
}
export interface PasswordResetEmailData extends EmailTemplateData {
    resetCode?: string;
    expiresIn?: string;
}
export interface EmailOptions {
    to: string;
    subject: string;
    template?: 'verification' | 'passwordReset' | 'welcome' | 'accountLocked';
    data?: EmailTemplateData;
    html?: string;
    text?: string;
}
export interface EmailVerificationToken {
    token: string;
    userId: string;
    email: string;
    expiresAt: Date;
    usedAt?: Date;
}
export interface PasswordResetToken {
    token: string;
    userId: string;
    email: string;
    expiresAt: Date;
    usedAt?: Date;
}
export interface LinkedAccount {
    userId: string;
    provider: 'google' | 'kakao' | 'naver' | 'email';
    providerId?: string;
    email: string;
    accessToken?: string;
    refreshToken?: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface AccountLinkingDto {
    userId: string;
    provider: 'google' | 'kakao' | 'naver';
    providerId: string;
    email: string;
}
export interface AuthError {
    code: AuthErrorCode;
    message: string;
    field?: string;
}
export declare enum AuthErrorCode {
    INVALID_CREDENTIALS = "INVALID_CREDENTIALS",
    EMAIL_ALREADY_EXISTS = "EMAIL_ALREADY_EXISTS",
    EMAIL_NOT_VERIFIED = "EMAIL_NOT_VERIFIED",
    INVALID_TOKEN = "INVALID_TOKEN",
    TOKEN_EXPIRED = "TOKEN_EXPIRED",
    USER_NOT_FOUND = "USER_NOT_FOUND",
    ACCOUNT_LOCKED = "ACCOUNT_LOCKED",
    WEAK_PASSWORD = "WEAK_PASSWORD",
    RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED",
    OAUTH_LINK_FAILED = "OAUTH_LINK_FAILED"
}
//# sourceMappingURL=email-auth.d.ts.map