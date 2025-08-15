export declare enum IncidentStatus {
    INVESTIGATING = "investigating",
    IDENTIFIED = "identified",
    MONITORING = "monitoring",
    RESOLVED = "resolved"
}
export declare enum IncidentImpact {
    NONE = "none",
    MINOR = "minor",
    MAJOR = "major",
    CRITICAL = "critical"
}
export declare enum ServiceStatus {
    OPERATIONAL = "operational",
    DEGRADED_PERFORMANCE = "degraded_performance",
    PARTIAL_OUTAGE = "partial_outage",
    MAJOR_OUTAGE = "major_outage",
    MAINTENANCE = "maintenance"
}
export declare enum ComponentType {
    SERVICE = "service",
    API = "api",
    DATABASE = "database",
    CDN = "cdn",
    INFRASTRUCTURE = "infrastructure"
}
export declare class StatusPageIncident {
    id: string;
    title: string;
    description: string;
    status: IncidentStatus;
    impact: IncidentImpact;
    affectedComponents?: string[];
    updates?: IncidentUpdate[];
    resolvedAt?: Date;
    createdBy?: string;
    isPublic: boolean;
    createdAt: Date;
    updatedAt: Date;
    addUpdate(status: IncidentStatus, message: string, userId?: string): void;
    getLatestUpdate(): IncidentUpdate | undefined;
    getDurationMinutes(): number;
    isActive(): boolean;
    getImpactColor(): string;
    getStatusColor(): string;
}
export declare class StatusPageComponent {
    id: string;
    name: string;
    description?: string;
    componentType: ComponentType;
    status: ServiceStatus;
    healthCheckUrl?: string;
    sortOrder: number;
    isActive: boolean;
    showUptime: boolean;
    metadata?: {
        version?: string;
        region?: string;
        provider?: string;
        dependencies?: string[];
        custom?: Record<string, string | number | boolean>;
    };
    createdAt: Date;
    updatedAt: Date;
    updateStatus(status: ServiceStatus): void;
    isOperational(): boolean;
    hasIssues(): boolean;
    getStatusColor(): string;
    getStatusDisplayName(): string;
}
export declare class StatusPageMetric {
    id: string;
    componentId: string;
    metricName: string;
    value: number;
    unit: string;
    timestamp: Date;
    metadata?: {
        region?: string;
        endpoint?: string;
        statusCode?: number;
        responseTime?: number;
        custom?: Record<string, string | number | boolean>;
    };
    static createUptimeMetric(componentId: string, isUp: boolean, responseTime?: number): Partial<StatusPageMetric>;
    static createResponseTimeMetric(componentId: string, responseTime: number, endpoint?: string): Partial<StatusPageMetric>;
}
export declare class StatusPageMaintenance {
    id: string;
    title: string;
    description: string;
    affectedComponents?: string[];
    scheduledStart: Date;
    scheduledEnd: Date;
    actualStart?: Date;
    actualEnd?: Date;
    status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
    updates?: MaintenanceUpdate[];
    createdBy?: string;
    createdAt: Date;
    updatedAt: Date;
    start(): void;
    complete(): void;
    cancel(): void;
    addUpdate(message: string, userId?: string): void;
    isActive(): boolean;
    isUpcoming(): boolean;
    getDurationMinutes(): number;
}
export declare class StatusPageSubscriber {
    id: string;
    email: string;
    subscribedComponents?: string[];
    notificationTypes?: ('incident' | 'maintenance' | 'status_change')[];
    isActive: boolean;
    confirmationToken?: string;
    confirmedAt?: Date;
    unsubscribeToken?: string;
    createdAt: Date;
    updatedAt: Date;
    confirm(): void;
    isConfirmed(): boolean;
    generateUnsubscribeUrl(): string;
}
export interface IncidentUpdate {
    id: string;
    status: IncidentStatus;
    message: string;
    timestamp: Date;
    updatedBy?: string;
}
export interface MaintenanceUpdate {
    id: string;
    message: string;
    timestamp: Date;
    updatedBy?: string;
}
//# sourceMappingURL=StatusPage.d.ts.map