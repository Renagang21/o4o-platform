"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OperationsDashboard = exports.RefreshInterval = exports.WidgetType = exports.DashboardType = void 0;
const typeorm_1 = require("typeorm");
var DashboardType;
(function (DashboardType) {
    DashboardType["OVERVIEW"] = "overview";
    DashboardType["INFRASTRUCTURE"] = "infrastructure";
    DashboardType["PERFORMANCE"] = "performance";
    DashboardType["ALERTS"] = "alerts";
    DashboardType["SERVICES"] = "services";
    DashboardType["CUSTOM"] = "custom";
})(DashboardType || (exports.DashboardType = DashboardType = {}));
var WidgetType;
(function (WidgetType) {
    WidgetType["METRIC_CARD"] = "metric_card";
    WidgetType["LINE_CHART"] = "line_chart";
    WidgetType["BAR_CHART"] = "bar_chart";
    WidgetType["PIE_CHART"] = "pie_chart";
    WidgetType["TABLE"] = "table";
    WidgetType["ALERT_LIST"] = "alert_list";
    WidgetType["SERVICE_STATUS"] = "service_status";
    WidgetType["UPTIME_STATUS"] = "uptime_status";
    WidgetType["LOG_VIEWER"] = "log_viewer";
    WidgetType["GAUGE"] = "gauge";
})(WidgetType || (exports.WidgetType = WidgetType = {}));
var RefreshInterval;
(function (RefreshInterval) {
    RefreshInterval["REAL_TIME"] = "real_time";
    RefreshInterval["THIRTY_SECONDS"] = "30s";
    RefreshInterval["ONE_MINUTE"] = "1m";
    RefreshInterval["FIVE_MINUTES"] = "5m";
    RefreshInterval["FIFTEEN_MINUTES"] = "15m";
    RefreshInterval["THIRTY_MINUTES"] = "30m";
    RefreshInterval["ONE_HOUR"] = "1h";
})(RefreshInterval || (exports.RefreshInterval = RefreshInterval = {}));
let OperationsDashboard = class OperationsDashboard {
    // Static factory methods
    static createOverviewDashboard(name, createdBy) {
        return {
            name,
            description: 'System overview dashboard showing key metrics and alerts',
            dashboardType: DashboardType.OVERVIEW,
            isActive: true,
            isDefault: true,
            createdBy,
            layout: {
                columns: 12,
                rows: 6,
                widgets: [
                    {
                        id: 'system-status',
                        type: WidgetType.SERVICE_STATUS,
                        title: 'System Status',
                        position: { x: 0, y: 0, width: 6, height: 2 },
                        config: {
                            showDetails: true,
                            showResponseTimes: true
                        }
                    },
                    {
                        id: 'active-alerts',
                        type: WidgetType.ALERT_LIST,
                        title: 'Active Alerts',
                        position: { x: 6, y: 0, width: 6, height: 2 },
                        config: {
                            maxItems: 5,
                            showSeverityFilter: true
                        }
                    },
                    {
                        id: 'response-time',
                        type: WidgetType.LINE_CHART,
                        title: 'Average Response Time',
                        position: { x: 0, y: 2, width: 6, height: 2 },
                        config: {
                            metricType: 'performance',
                            metricCategory: 'response_time',
                            timeRange: '1h'
                        }
                    },
                    {
                        id: 'memory-usage',
                        type: WidgetType.GAUGE,
                        title: 'Memory Usage',
                        position: { x: 6, y: 2, width: 3, height: 2 },
                        config: {
                            metricType: 'system',
                            metricCategory: 'memory_usage',
                            thresholds: {
                                warning: 70,
                                critical: 85
                            }
                        }
                    },
                    {
                        id: 'cpu-usage',
                        type: WidgetType.GAUGE,
                        title: 'CPU Usage',
                        position: { x: 9, y: 2, width: 3, height: 2 },
                        config: {
                            metricType: 'system',
                            metricCategory: 'cpu_usage',
                            thresholds: {
                                warning: 70,
                                critical: 85
                            }
                        }
                    },
                    {
                        id: 'uptime-status',
                        type: WidgetType.UPTIME_STATUS,
                        title: 'Service Uptime (24h)',
                        position: { x: 0, y: 4, width: 12, height: 2 },
                        config: {
                            services: ['api-server', 'web-app', 'admin-dashboard', 'database'],
                            timeRange: '24h'
                        }
                    }
                ]
            },
            settings: {
                refreshInterval: RefreshInterval.THIRTY_SECONDS,
                autoRefresh: true,
                showTimestamp: true,
                theme: 'auto',
                timeRange: '24h',
                timezone: 'UTC',
                notifications: {
                    enabled: true,
                    soundEnabled: false,
                    desktopNotifications: true
                }
            }
        };
    }
    static createInfrastructureDashboard(name, createdBy) {
        return {
            name,
            description: 'Infrastructure monitoring dashboard',
            dashboardType: DashboardType.INFRASTRUCTURE,
            isActive: true,
            createdBy,
            layout: {
                columns: 12,
                rows: 8,
                widgets: [
                    {
                        id: 'server-metrics',
                        type: WidgetType.METRIC_CARD,
                        title: 'Server Metrics',
                        position: { x: 0, y: 0, width: 12, height: 1 },
                        config: {
                            metrics: ['cpu_usage', 'memory_usage', 'disk_usage', 'network_io'],
                            showTrends: true
                        }
                    },
                    {
                        id: 'cpu-chart',
                        type: WidgetType.LINE_CHART,
                        title: 'CPU Usage Over Time',
                        position: { x: 0, y: 1, width: 6, height: 3 },
                        config: {
                            metricType: 'system',
                            metricCategory: 'cpu_usage',
                            timeRange: '6h'
                        }
                    },
                    {
                        id: 'memory-chart',
                        type: WidgetType.LINE_CHART,
                        title: 'Memory Usage Over Time',
                        position: { x: 6, y: 1, width: 6, height: 3 },
                        config: {
                            metricType: 'system',
                            metricCategory: 'memory_usage',
                            timeRange: '6h'
                        }
                    },
                    {
                        id: 'disk-usage',
                        type: WidgetType.PIE_CHART,
                        title: 'Disk Usage',
                        position: { x: 0, y: 4, width: 4, height: 2 },
                        config: {
                            metricType: 'system',
                            metricCategory: 'storage_usage'
                        }
                    },
                    {
                        id: 'network-stats',
                        type: WidgetType.BAR_CHART,
                        title: 'Network Statistics',
                        position: { x: 4, y: 4, width: 8, height: 2 },
                        config: {
                            metricType: 'system',
                            metricCategory: 'network_io',
                            timeRange: '1h'
                        }
                    },
                    {
                        id: 'database-connections',
                        type: WidgetType.LINE_CHART,
                        title: 'Database Connections',
                        position: { x: 0, y: 6, width: 6, height: 2 },
                        config: {
                            metricType: 'system',
                            metricCategory: 'concurrent_users',
                            source: 'database'
                        }
                    },
                    {
                        id: 'load-average',
                        type: WidgetType.LINE_CHART,
                        title: 'System Load Average',
                        position: { x: 6, y: 6, width: 6, height: 2 },
                        config: {
                            metricType: 'system',
                            metricCategory: 'load_average',
                            timeRange: '2h'
                        }
                    }
                ]
            },
            settings: {
                refreshInterval: RefreshInterval.ONE_MINUTE,
                autoRefresh: true,
                showTimestamp: true,
                theme: 'dark',
                timeRange: '6h',
                timezone: 'UTC',
                notifications: {
                    enabled: false,
                    soundEnabled: false,
                    desktopNotifications: false
                }
            }
        };
    }
    static createPerformanceDashboard(name, createdBy) {
        return {
            name,
            description: 'Application performance monitoring dashboard',
            dashboardType: DashboardType.PERFORMANCE,
            isActive: true,
            createdBy,
            layout: {
                columns: 12,
                rows: 6,
                widgets: [
                    {
                        id: 'performance-overview',
                        type: WidgetType.METRIC_CARD,
                        title: 'Performance Overview',
                        position: { x: 0, y: 0, width: 12, height: 1 },
                        config: {
                            metrics: ['avg_response_time', 'error_rate', 'throughput', 'apdex_score'],
                            showComparison: true
                        }
                    },
                    {
                        id: 'response-times',
                        type: WidgetType.LINE_CHART,
                        title: 'Response Times by Endpoint',
                        position: { x: 0, y: 1, width: 8, height: 3 },
                        config: {
                            metricType: 'performance',
                            metricCategory: 'response_time',
                            groupBy: 'endpoint',
                            timeRange: '2h'
                        }
                    },
                    {
                        id: 'error-rate-gauge',
                        type: WidgetType.GAUGE,
                        title: 'Error Rate',
                        position: { x: 8, y: 1, width: 4, height: 2 },
                        config: {
                            metricType: 'error',
                            metricCategory: 'error_rate',
                            thresholds: {
                                warning: 2,
                                critical: 5
                            }
                        }
                    },
                    {
                        id: 'throughput-chart',
                        type: WidgetType.LINE_CHART,
                        title: 'Request Throughput',
                        position: { x: 8, y: 3, width: 4, height: 1 },
                        config: {
                            metricType: 'system',
                            metricCategory: 'throughput',
                            timeRange: '1h'
                        }
                    },
                    {
                        id: 'slow-queries',
                        type: WidgetType.TABLE,
                        title: 'Slow Database Queries',
                        position: { x: 0, y: 4, width: 6, height: 2 },
                        config: {
                            metricType: 'performance',
                            metricCategory: 'database_query_time',
                            showTop: 10,
                            sortBy: 'response_time'
                        }
                    },
                    {
                        id: 'api-performance',
                        type: WidgetType.BAR_CHART,
                        title: 'API Endpoint Performance',
                        position: { x: 6, y: 4, width: 6, height: 2 },
                        config: {
                            metricType: 'performance',
                            metricCategory: 'api_latency',
                            groupBy: 'endpoint',
                            timeRange: '1h'
                        }
                    }
                ]
            },
            settings: {
                refreshInterval: RefreshInterval.THIRTY_SECONDS,
                autoRefresh: true,
                showTimestamp: true,
                theme: 'light',
                timeRange: '2h',
                timezone: 'UTC',
                notifications: {
                    enabled: true,
                    soundEnabled: true,
                    desktopNotifications: true
                }
            }
        };
    }
    // Instance methods
    addWidget(widget) {
        this.layout.widgets.push(widget);
    }
    removeWidget(widgetId) {
        this.layout.widgets = this.layout.widgets.filter((w) => w.id !== widgetId);
    }
    updateWidget(widgetId, updates) {
        const widgetIndex = this.layout.widgets.findIndex(w => w.id === widgetId);
        if (widgetIndex !== -1) {
            this.layout.widgets[widgetIndex] = {
                ...this.layout.widgets[widgetIndex],
                ...updates
            };
        }
    }
    getWidget(widgetId) {
        return this.layout.widgets.find((w) => w.id === widgetId);
    }
    isAccessibleBy(userId, userRoles) {
        // Public dashboards are accessible to everyone
        if (this.isPublic)
            return true;
        // Check if user is the creator
        if (this.createdBy === userId)
            return true;
        // Check allowed users
        if (this.allowedUsers && this.allowedUsers.includes(userId))
            return true;
        // Check allowed roles
        if (this.allowedRoles && userRoles.some((role) => this.allowedRoles.includes(role)))
            return true;
        return false;
    }
    canBeEditedBy(userId, userRoles) {
        // Only creator and admins can edit
        if (this.createdBy === userId)
            return true;
        if (userRoles.includes('admin'))
            return true;
        return false;
    }
    getRefreshIntervalMs() {
        var _a;
        const intervalMap = {
            [RefreshInterval.REAL_TIME]: 5000,
            [RefreshInterval.THIRTY_SECONDS]: 30000,
            [RefreshInterval.ONE_MINUTE]: 60000,
            [RefreshInterval.FIVE_MINUTES]: 300000,
            [RefreshInterval.FIFTEEN_MINUTES]: 900000,
            [RefreshInterval.THIRTY_MINUTES]: 1800000,
            [RefreshInterval.ONE_HOUR]: 3600000
        };
        return intervalMap[((_a = this.settings) === null || _a === void 0 ? void 0 : _a.refreshInterval) || RefreshInterval.ONE_MINUTE];
    }
    generatePublicUrl() {
        if (!this.isPublic) {
            throw new Error('Dashboard must be public to generate URL');
        }
        const baseUrl = process.env.PUBLIC_URL || 'https://your-domain.com';
        return `${baseUrl}/status/dashboard/${this.id}`;
    }
    clone(newName, createdBy) {
        return {
            name: newName,
            description: `Copy of ${this.name}`,
            dashboardType: this.dashboardType,
            isActive: true,
            isDefault: false,
            isPublic: false,
            createdBy,
            layout: JSON.parse(JSON.stringify(this.layout)),
            settings: JSON.parse(JSON.stringify(this.settings)),
            allowedRoles: this.allowedRoles ? [...this.allowedRoles] : undefined,
            allowedUsers: undefined
        };
    }
};
exports.OperationsDashboard = OperationsDashboard;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], OperationsDashboard.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255 }),
    __metadata("design:type", String)
], OperationsDashboard.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], OperationsDashboard.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: DashboardType }),
    __metadata("design:type", String)
], OperationsDashboard.prototype, "dashboardType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], OperationsDashboard.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], OperationsDashboard.prototype, "isDefault", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], OperationsDashboard.prototype, "isPublic", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', nullable: true }),
    __metadata("design:type", String)
], OperationsDashboard.prototype, "createdBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json' }),
    __metadata("design:type", Object)
], OperationsDashboard.prototype, "layout", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], OperationsDashboard.prototype, "settings", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-array', nullable: true }),
    __metadata("design:type", Array)
], OperationsDashboard.prototype, "allowedRoles", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-array', nullable: true }),
    __metadata("design:type", Array)
], OperationsDashboard.prototype, "allowedUsers", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], OperationsDashboard.prototype, "sharing", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], OperationsDashboard.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], OperationsDashboard.prototype, "updatedAt", void 0);
exports.OperationsDashboard = OperationsDashboard = __decorate([
    (0, typeorm_1.Entity)('operations_dashboards'),
    (0, typeorm_1.Index)(['dashboardType', 'isActive']),
    (0, typeorm_1.Index)(['createdBy'])
], OperationsDashboard);
//# sourceMappingURL=OperationsDashboard.js.map