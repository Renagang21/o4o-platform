/**
 * Tracking Updater Job
 * 배송 추적 정보를 주기적으로 업데이트
 */
declare class TrackingUpdaterJob {
    private job;
    /**
     * Start the tracking updater job
     * Runs every 30 minutes
     */
    start(): void;
    /**
     * Stop the job
     */
    stop(): void;
    /**
     * Run the job immediately (for testing)
     */
    runNow(): Promise<void>;
}
export declare const trackingUpdaterJob: TrackingUpdaterJob;
export {};
//# sourceMappingURL=trackingUpdater.d.ts.map