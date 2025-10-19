/**
 * Prometheus Metrics Service
 * Sprint 4: Expose AI job metrics in Prometheus format
 *
 * Metrics exposed:
 * - ai_jobs_total: Total number of jobs (by provider, status)
 * - ai_jobs_processing_duration_seconds: Job processing time histogram
 * - ai_jobs_retry_total: Total retry count
 * - ai_jobs_validation_pass_rate: Validation pass rate
 * - ai_queue_size: Queue size by status (waiting, active, completed, failed)
 * - ai_llm_tokens_total: LLM token usage (by provider, type)
 */
declare class PrometheusMetricsService {
    private static instance;
    private registry;
    private jobsTotalCounter;
    private jobsProcessingDurationHistogram;
    private jobsRetryCounter;
    private validationPassRateGauge;
    private queueSizeGauge;
    private llmTokensCounter;
    private constructor();
    static getInstance(): PrometheusMetricsService;
    /**
     * Update metrics from AI metrics service
     * Call this periodically or on-demand
     */
    updateMetrics(): Promise<void>;
    /**
     * Record job completion (called from worker)
     */
    recordJobCompletion(provider: string, model: string, status: 'success' | 'failed', durationMs: number, retryCount: number, tokens?: {
        prompt?: number;
        completion?: number;
    }): void;
    /**
     * Get metrics in Prometheus format
     */
    getMetrics(): Promise<string>;
    /**
     * Get content type for Prometheus
     */
    getContentType(): string;
    /**
     * Reset all metrics (for testing)
     */
    reset(): void;
}
export declare const prometheusMetrics: PrometheusMetricsService;
export {};
//# sourceMappingURL=prometheus-metrics.service.d.ts.map