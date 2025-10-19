export declare enum DashboardType {
    OVERVIEW = "overview",
    INFRASTRUCTURE = "infrastructure",
    PERFORMANCE = "performance",
    ALERTS = "alerts",
    SERVICES = "services",
    CUSTOM = "custom"
}
export declare enum WidgetType {
    METRIC_CARD = "metric_card",
    LINE_CHART = "line_chart",
    BAR_CHART = "bar_chart",
    PIE_CHART = "pie_chart",
    TABLE = "table",
    ALERT_LIST = "alert_list",
    SERVICE_STATUS = "service_status",
    UPTIME_STATUS = "uptime_status",
    LOG_VIEWER = "log_viewer",
    GAUGE = "gauge"
}
export declare enum RefreshInterval {
    REAL_TIME = "real_time",
    THIRTY_SECONDS = "30s",
    ONE_MINUTE = "1m",
    FIVE_MINUTES = "5m",
    FIFTEEN_MINUTES = "15m",
    THIRTY_MINUTES = "30m",
    ONE_HOUR = "1h"
}
export declare class OperationsDashboard {
    id: string;
    name: string;
    description?: string;
    dashboardType: DashboardType;
    isActive: boolean;
    isDefault: boolean;
    isPublic: boolean;
    createdBy?: string;
    layout: {
        columns: number;
        rows: number;
        widgets: DashboardWidget[];
    };
    settings?: {
        refreshInterval: RefreshInterval;
        autoRefresh: boolean;
        showTimestamp: boolean;
        theme: 'light' | 'dark' | 'auto';
        timeRange: string;
        timezone: string;
        notifications: {
            enabled: boolean;
            soundEnabled: boolean;
            desktopNotifications: boolean;
        };
    };
    allowedRoles?: string[];
    allowedUsers?: string[];
    sharing?: {
        publicUrl?: string;
        embedEnabled: boolean;
        exportEnabled: boolean;
        allowedDomains?: string[];
    };
    createdAt: Date;
    updatedAt: Date;
    static createOverviewDashboard(name: string, createdBy: string): Partial<OperationsDashboard>;
    static createInfrastructureDashboard(name: string, createdBy: string): Partial<OperationsDashboard>;
    static createPerformanceDashboard(name: string, createdBy: string): Partial<OperationsDashboard>;
    addWidget(widget: DashboardWidget): void;
    removeWidget(widgetId: string): void;
    updateWidget(widgetId: string, updates: Partial<DashboardWidget>): void;
    getWidget(widgetId: string): DashboardWidget | undefined;
    isAccessibleBy(userId: string, userRoles: string[]): boolean;
    canBeEditedBy(userId: string, userRoles: string[]): boolean;
    getRefreshIntervalMs(): number;
    generatePublicUrl(): string;
    clone(newName: string, createdBy: string): Partial<OperationsDashboard>;
}
export interface DashboardWidget {
    id: string;
    type: WidgetType;
    title: string;
    position: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    config: {
        metricType?: string;
        metricCategory?: string;
        source?: string;
        endpoint?: string;
        timeRange?: string;
        refreshInterval?: RefreshInterval;
        thresholds?: {
            warning?: number;
            critical?: number;
        };
        filters?: {
            [key: string]: string | number | boolean | string[];
        };
        displayOptions?: {
            showLegend?: boolean;
            showGrid?: boolean;
            showLabels?: boolean;
            colorScheme?: string;
            aggregation?: 'avg' | 'sum' | 'min' | 'max' | 'count';
        };
        [key: string]: unknown;
    };
}
//# sourceMappingURL=OperationsDashboard.d.ts.map