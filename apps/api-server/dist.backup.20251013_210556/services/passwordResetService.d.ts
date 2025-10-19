export declare class PasswordResetService {
    private static readonly RESET_TOKEN_EXPIRY_HOURS;
    private static readonly VERIFICATION_TOKEN_EXPIRY_HOURS;
    /**
     * Request password reset
     */
    static requestPasswordReset(email: string): Promise<boolean>;
    /**
     * Reset password with token
     */
    static resetPassword(token: string, newPassword: string): Promise<boolean>;
    /**
     * Request email verification
     */
    static requestEmailVerification(userId: string): Promise<boolean>;
    /**
     * Verify email with token
     */
    static verifyEmail(token: string): Promise<boolean>;
    /**
     * Clean up expired tokens
     */
    static cleanupExpiredTokens(): Promise<void>;
}
//# sourceMappingURL=passwordResetService.d.ts.map