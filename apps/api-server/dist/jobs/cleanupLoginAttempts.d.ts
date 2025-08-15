export declare class CleanupLoginAttemptsJob {
    private intervalId;
    private readonly CLEANUP_INTERVAL;
    constructor();
    private cleanup;
    start(): void;
    stop(): void;
    runNow(): Promise<void>;
}
export declare const cleanupLoginAttemptsJob: CleanupLoginAttemptsJob;
//# sourceMappingURL=cleanupLoginAttempts.d.ts.map