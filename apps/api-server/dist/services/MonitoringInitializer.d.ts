export declare class MonitoringInitializer {
    private operationsService;
    private statusPageService;
    constructor();
    initialize(): Promise<void>;
    shutdown(): Promise<void>;
    private initializeStatusPageComponents;
    private initializeAutoRecoverySystem;
    private setupHealthCheckSchedules;
    getMonitoringStatus(): Promise<{
        isRunning: boolean;
        services: {
            operations: boolean;
            statusPage: boolean;
            healthChecks: boolean;
        };
        uptime: number;
    }>;
    createSampleIncident(): Promise<void>;
    createSampleMaintenance(): Promise<void>;
    populateSampleMetrics(): Promise<void>;
    setupDevelopmentEnvironment(): Promise<void>;
}
export declare const monitoringInitializer: MonitoringInitializer;
//# sourceMappingURL=MonitoringInitializer.d.ts.map