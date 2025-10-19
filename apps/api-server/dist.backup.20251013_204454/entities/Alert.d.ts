export interface AlertContext {
    userId?: string;
    sessionId?: string;
    requestId?: string;
    userAgent?: string;
    ipAddress?: string;
    timestamp?: string;
    environment?: string;
    version?: string;
    [key: string]: unknown;
}
export interface UsageDetails {
    userCount?: number;
    sessionCount?: number;
    requestCount?: number;
    [key: string]: unknown;
}
export interface SystemDetails {
    memoryUsage?: number;
    cpuUsage?: number;
    diskUsage?: number;
    processCount?: number;
    [key: string]: unknown;
}
export interface BusinessDetails {
    revenue?: number;
    orderCount?: number;
    customerCount?: number;
    conversionRate?: number;
    [key: string]: unknown;
}
export declare enum AlertType {
    PERFORMANCE = "performance",
    ERROR = "error",
    USAGE = "usage",
    SECURITY = "security",
    SYSTEM = "system",
    BUSINESS = "business",
    DATABASE = "database",
    DEPLOYMENT = "deployment",
    CIRCUIT_BREAKER = "circuit_breaker"
}
export declare enum AlertSeverity {
    LOW = "low",
    MEDIUM = "medium",
    HIGH = "high",
    CRITICAL = "critical"
}
export declare enum AlertStatus {
    ACTIVE = "active",
    ACKNOWLEDGED = "acknowledged",
    RESOLVED = "resolved",
    DISMISSED = "dismissed"
}
export declare enum AlertChannel {
    EMAIL = "email",
    SLACK = "slack",
    WEBHOOK = "webhook",
    DASHBOARD = "dashboard"
}
export declare class Alert {
    id: string;
    alertType: AlertType;
    severity: AlertSeverity;
    status: AlertStatus;
    title: string;
    message: string;
    description?: string;
    source?: string;
    component?: string;
    endpoint?: string;
    metricName?: string;
    currentValue?: number;
    thresholdValue?: number;
    comparisonOperator?: string;
    unit?: string;
    context?: AlertContext;
    metadata?: {
        errorType?: string;
        errorMessage?: string;
        stackTrace?: string;
        errorCode?: string;
        responseTime?: number;
        loadTime?: number;
        memoryUsage?: number;
        cpuUsage?: number;
        userCount?: number;
        sessionCount?: number;
        requestCount?: number;
        attemptCount?: number;
        sourceIP?: string;
        userAgent?: string;
        [key: string]: unknown;
    };
    acknowledgedBy?: string;
    acknowledgedAt?: Date;
    acknowledgmentNote?: string;
    resolvedBy?: string;
    resolvedAt?: Date;
    resolutionNote?: string;
    resolutionAction?: string;
    notificationChannels?: AlertChannel[];
    notificationSent: boolean;
    notificationSentAt?: Date;
    notificationRetries: number;
    isEscalated: boolean;
    escalatedAt?: Date;
    escalationRule?: string;
    escalationLevel?: string;
    assignedTo?: string;
    isRecurring: boolean;
    occurrenceCount: number;
    firstOccurrence?: Date;
    lastOccurrence?: Date;
    createdAt: Date;
    updatedAt: Date;
    static createPerformanceAlert(title: string, message: string, severity: AlertSeverity, metricName: string, currentValue: number, thresholdValue: number, operator: string, unit: string, source?: string, endpoint?: string, context?: AlertContext): Partial<Alert>;
    static createErrorAlert(title: string, message: string, severity: AlertSeverity, source?: string, endpoint?: string, errorDetails?: {
        errorType?: string;
        errorMessage?: string;
        stackTrace?: string;
        errorCode?: string;
    }, context?: AlertContext): Partial<Alert>;
    static createUsageAlert(title: string, message: string, severity: AlertSeverity, metricName: string, currentValue: number, thresholdValue: number, operator: string, unit: string, usageDetails?: UsageDetails, context?: AlertContext): Partial<Alert>;
    static createSecurityAlert(title: string, message: string, severity: AlertSeverity, source?: string, securityDetails?: {
        attemptCount?: number;
        sourceIP?: string;
        userAgent?: string;
    }, context?: AlertContext): Partial<Alert>;
    static createSystemAlert(title: string, message: string, severity: AlertSeverity, source?: string, component?: string, systemDetails?: SystemDetails, context?: AlertContext): Partial<Alert>;
    static createBusinessAlert(title: string, message: string, severity: AlertSeverity, source?: string, businessDetails?: BusinessDetails, context?: AlertContext): Partial<Alert>;
    acknowledge(userId: string, note?: string): void;
    resolve(userId: string, note?: string, action?: string): void;
    dismiss(userId: string, note?: string): void;
    escalate(rule: string): void;
    recordOccurrence(): void;
    markNotificationSent(): void;
    incrementNotificationRetries(): void;
    isActive(): boolean;
    isResolved(): boolean;
    isAcknowledged(): boolean;
    isDismissed(): boolean;
    isCritical(): boolean;
    isHigh(): boolean;
    requiresImmediateAttention(): boolean;
    getAgeInMinutes(): number;
    getAgeInHours(): number;
    shouldEscalate(escalationTimeMinutes?: number): boolean;
    getDisplayTitle(): string;
    getSeverityDisplayName(): string;
    getTypeDisplayName(): string;
    getStatusDisplayName(): string;
    getFormattedValue(): string;
    private formatBytes;
}
//# sourceMappingURL=Alert.d.ts.map