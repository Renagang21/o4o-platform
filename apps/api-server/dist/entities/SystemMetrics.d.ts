export interface MetricTags {
    userId?: string;
    sessionId?: string;
    userAgent?: string;
    ipAddress?: string;
    country?: string;
    device?: string;
    browser?: string;
    [key: string]: unknown;
}
export interface MetricMetadata {
    requestSize?: number;
    responseSize?: number;
    cacheHit?: boolean;
    queryCount?: number;
    errorType?: string;
    errorMessage?: string;
    stackTrace?: string;
    featureName?: string;
    actionType?: string;
    conversionStep?: string;
    [key: string]: unknown;
}
export declare enum MetricType {
    PERFORMANCE = "performance",
    USAGE = "usage",
    ERROR = "error",
    SYSTEM = "system",
    BUSINESS = "business"
}
export declare enum MetricCategory {
    RESPONSE_TIME = "response_time",
    LOAD_TIME = "load_time",
    API_LATENCY = "api_latency",
    DATABASE_QUERY_TIME = "database_query_time",
    MEMORY_USAGE = "memory_usage",
    CPU_USAGE = "cpu_usage",
    NETWORK_LATENCY = "network_latency",
    ACTIVE_USERS = "active_users",
    SESSION_DURATION = "session_duration",
    PAGE_VIEWS = "page_views",
    CONTENT_VIEWS = "content_views",
    SIGNAGE_CREATIONS = "signage_creations",
    FEEDBACK_SUBMISSIONS = "feedback_submissions",
    ERROR_RATE = "error_rate",
    ERROR_COUNT = "error_count",
    FAILED_REQUESTS = "failed_requests",
    TIMEOUT_COUNT = "timeout_count",
    UPTIME = "uptime",
    THROUGHPUT = "throughput",
    CONCURRENT_USERS = "concurrent_users",
    STORAGE_USAGE = "storage_usage",
    USER_ENGAGEMENT = "user_engagement",
    FEATURE_ADOPTION = "feature_adoption",
    CONVERSION_RATE = "conversion_rate",
    RETENTION_RATE = "retention_rate",
    RECOVERY_ATTEMPTS = "recovery_attempts",
    RECOVERY_SUCCESS_RATE = "recovery_success_rate",
    RECOVERY_TIME = "recovery_time",
    CIRCUIT_BREAKER_EVENTS = "circuit_breaker_events",
    CIRCUIT_BREAKER_STATE = "circuit_breaker_state",
    CIRCUIT_BREAKER_RESET = "circuit_breaker_reset",
    CIRCUIT_BREAKER_MANUAL_OPEN = "circuit_breaker_manual_open",
    DEGRADED_FEATURES = "degraded_features",
    DEGRADATION_EVENT = "degradation_event",
    DEGRADATION_ACTIVE = "degradation_active",
    ESCALATION_EVENT = "escalation_event",
    ACTIVE_ESCALATIONS = "active_escalations",
    ACTIVE_DEPLOYMENTS = "active_deployments",
    DEPLOYMENT_EVENT = "deployment_event",
    SYSTEM_ISSUES = "system_issues",
    HEALING_ACTIONS = "healing_actions",
    DEPLOYMENT_EVENTS = "deployment_events"
}
export declare class SystemMetrics {
    id: string;
    metricType: MetricType;
    metricCategory: MetricCategory;
    metricName: string;
    value: string;
    unit?: string;
    source?: string;
    endpoint?: string;
    component?: string;
    environment?: string;
    tags?: MetricTags;
    metadata?: MetricMetadata;
    createdAt: Date;
    static createPerformanceMetric(category: MetricCategory, name: string, value: number, unit: string, source?: string, endpoint?: string, metadata?: MetricMetadata): Partial<SystemMetrics>;
    static createUsageMetric(category: MetricCategory, name: string, value: number, unit: string, tags?: MetricTags, metadata?: MetricMetadata): Partial<SystemMetrics>;
    static createErrorMetric(category: MetricCategory, name: string, value: number, source?: string, endpoint?: string, errorInfo?: {
        errorType?: string;
        errorMessage?: string;
        stackTrace?: string;
    }): Partial<SystemMetrics>;
    static createSystemMetric(category: MetricCategory, name: string, value: number, unit: string, component?: string, metadata?: MetricMetadata): Partial<SystemMetrics>;
    static createBusinessMetric(category: MetricCategory, name: string, value: number, unit: string, tags?: MetricTags, metadata?: MetricMetadata): Partial<SystemMetrics>;
    getDisplayName(): string;
    getFormattedValue(): string;
    private formatBytes;
    isPerformanceMetric(): boolean;
    isErrorMetric(): boolean;
    isBusinessMetric(): boolean;
    getPerformanceRating(): 'excellent' | 'good' | 'average' | 'poor' | 'unknown';
}
//# sourceMappingURL=SystemMetrics.d.ts.map