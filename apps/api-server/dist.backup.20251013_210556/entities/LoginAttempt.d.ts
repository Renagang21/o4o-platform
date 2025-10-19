export declare class LoginAttempt {
    id: string;
    email: string;
    ipAddress: string;
    userAgent?: string;
    successful: boolean;
    failureReason?: string;
    deviceId?: string;
    location?: string;
    attemptedAt: Date;
    static shouldLockAccount(attempts: LoginAttempt[]): boolean;
    static getLockDuration(failedAttempts: number): number;
}
//# sourceMappingURL=LoginAttempt.d.ts.map