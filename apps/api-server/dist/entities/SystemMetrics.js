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
exports.SystemMetrics = exports.MetricCategory = exports.MetricType = void 0;
const typeorm_1 = require("typeorm");
var MetricType;
(function (MetricType) {
    MetricType["PERFORMANCE"] = "performance";
    MetricType["USAGE"] = "usage";
    MetricType["ERROR"] = "error";
    MetricType["SYSTEM"] = "system";
    MetricType["BUSINESS"] = "business";
})(MetricType || (exports.MetricType = MetricType = {}));
var MetricCategory;
(function (MetricCategory) {
    // Performance metrics
    MetricCategory["RESPONSE_TIME"] = "response_time";
    MetricCategory["LOAD_TIME"] = "load_time";
    MetricCategory["API_LATENCY"] = "api_latency";
    MetricCategory["DATABASE_QUERY_TIME"] = "database_query_time";
    MetricCategory["MEMORY_USAGE"] = "memory_usage";
    MetricCategory["CPU_USAGE"] = "cpu_usage";
    MetricCategory["NETWORK_LATENCY"] = "network_latency";
    // Usage metrics
    MetricCategory["ACTIVE_USERS"] = "active_users";
    MetricCategory["SESSION_DURATION"] = "session_duration";
    MetricCategory["PAGE_VIEWS"] = "page_views";
    MetricCategory["CONTENT_VIEWS"] = "content_views";
    MetricCategory["SIGNAGE_CREATIONS"] = "signage_creations";
    MetricCategory["FEEDBACK_SUBMISSIONS"] = "feedback_submissions";
    // Error metrics
    MetricCategory["ERROR_RATE"] = "error_rate";
    MetricCategory["ERROR_COUNT"] = "error_count";
    MetricCategory["FAILED_REQUESTS"] = "failed_requests";
    MetricCategory["TIMEOUT_COUNT"] = "timeout_count";
    // System metrics
    MetricCategory["UPTIME"] = "uptime";
    MetricCategory["THROUGHPUT"] = "throughput";
    MetricCategory["CONCURRENT_USERS"] = "concurrent_users";
    MetricCategory["STORAGE_USAGE"] = "storage_usage";
    // Business metrics
    MetricCategory["USER_ENGAGEMENT"] = "user_engagement";
    MetricCategory["FEATURE_ADOPTION"] = "feature_adoption";
    MetricCategory["CONVERSION_RATE"] = "conversion_rate";
    MetricCategory["RETENTION_RATE"] = "retention_rate";
    // Auto-recovery metrics
    MetricCategory["RECOVERY_ATTEMPTS"] = "recovery_attempts";
    MetricCategory["RECOVERY_SUCCESS_RATE"] = "recovery_success_rate";
    MetricCategory["RECOVERY_TIME"] = "recovery_time";
    MetricCategory["CIRCUIT_BREAKER_EVENTS"] = "circuit_breaker_events";
    MetricCategory["CIRCUIT_BREAKER_STATE"] = "circuit_breaker_state";
    MetricCategory["CIRCUIT_BREAKER_RESET"] = "circuit_breaker_reset";
    MetricCategory["CIRCUIT_BREAKER_MANUAL_OPEN"] = "circuit_breaker_manual_open";
    MetricCategory["DEGRADED_FEATURES"] = "degraded_features";
    MetricCategory["DEGRADATION_EVENT"] = "degradation_event";
    MetricCategory["DEGRADATION_ACTIVE"] = "degradation_active";
    MetricCategory["ESCALATION_EVENT"] = "escalation_event";
    MetricCategory["ACTIVE_ESCALATIONS"] = "active_escalations";
    MetricCategory["ACTIVE_DEPLOYMENTS"] = "active_deployments";
    MetricCategory["DEPLOYMENT_EVENT"] = "deployment_event";
    MetricCategory["SYSTEM_ISSUES"] = "system_issues";
    MetricCategory["HEALING_ACTIONS"] = "healing_actions";
    MetricCategory["DEPLOYMENT_EVENTS"] = "deployment_events";
})(MetricCategory || (exports.MetricCategory = MetricCategory = {}));
let SystemMetrics = class SystemMetrics {
    // Static factory methods
    static createPerformanceMetric(category, name, value, unit, source, endpoint, metadata) {
        return {
            metricType: MetricType.PERFORMANCE,
            metricCategory: category,
            metricName: name,
            value: value.toString(),
            unit,
            source,
            endpoint,
            metadata
        };
    }
    static createUsageMetric(category, name, value, unit, tags, metadata) {
        return {
            metricType: MetricType.USAGE,
            metricCategory: category,
            metricName: name,
            value: value.toString(),
            unit,
            tags,
            metadata
        };
    }
    static createErrorMetric(category, name, value, source, endpoint, errorInfo) {
        return {
            metricType: MetricType.ERROR,
            metricCategory: category,
            metricName: name,
            value: value.toString(),
            unit: 'count',
            source,
            endpoint,
            metadata: errorInfo
        };
    }
    static createSystemMetric(category, name, value, unit, component, metadata) {
        return {
            metricType: MetricType.SYSTEM,
            metricCategory: category,
            metricName: name,
            value: value.toString(),
            unit,
            component,
            metadata
        };
    }
    static createBusinessMetric(category, name, value, unit, tags, metadata) {
        return {
            metricType: MetricType.BUSINESS,
            metricCategory: category,
            metricName: name,
            value: value.toString(),
            unit,
            tags,
            metadata
        };
    }
    // Instance methods
    getDisplayName() {
        return this.metricName || this.metricCategory.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
    getFormattedValue() {
        if (this.unit === 'ms') {
            return `${this.value}ms`;
        }
        else if (this.unit === 'bytes') {
            return this.formatBytes(parseFloat(this.value));
        }
        else if (this.unit === '%') {
            return `${this.value}%`;
        }
        else if (this.unit === 'count') {
            return this.value.toString();
        }
        return `${this.value} ${this.unit || ''}`;
    }
    formatBytes(bytes) {
        if (bytes === 0)
            return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    isPerformanceMetric() {
        return this.metricType === MetricType.PERFORMANCE;
    }
    isErrorMetric() {
        return this.metricType === MetricType.ERROR;
    }
    isBusinessMetric() {
        return this.metricType === MetricType.BUSINESS;
    }
    getPerformanceRating() {
        if (!this.isPerformanceMetric())
            return 'unknown';
        const numValue = parseFloat(this.value);
        switch (this.metricCategory) {
            case MetricCategory.RESPONSE_TIME:
            case MetricCategory.LOAD_TIME:
            case MetricCategory.API_LATENCY:
                if (numValue < 100)
                    return 'excellent';
                if (numValue < 300)
                    return 'good';
                if (numValue < 1000)
                    return 'average';
                return 'poor';
            case MetricCategory.ERROR_RATE:
                if (numValue < 0.1)
                    return 'excellent';
                if (numValue < 1)
                    return 'good';
                if (numValue < 5)
                    return 'average';
                return 'poor';
            case MetricCategory.CPU_USAGE:
            case MetricCategory.MEMORY_USAGE:
                if (numValue < 50)
                    return 'excellent';
                if (numValue < 70)
                    return 'good';
                if (numValue < 85)
                    return 'average';
                return 'poor';
            default:
                return 'unknown';
        }
    }
};
exports.SystemMetrics = SystemMetrics;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], SystemMetrics.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: MetricType }),
    __metadata("design:type", String)
], SystemMetrics.prototype, "metricType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: MetricCategory }),
    __metadata("design:type", String)
], SystemMetrics.prototype, "metricCategory", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255 }),
    __metadata("design:type", String)
], SystemMetrics.prototype, "metricName", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 15, scale: 4 }),
    __metadata("design:type", String)
], SystemMetrics.prototype, "value", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 50, nullable: true }),
    __metadata("design:type", String)
], SystemMetrics.prototype, "unit", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, nullable: true }),
    __metadata("design:type", String)
], SystemMetrics.prototype, "source", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", String)
], SystemMetrics.prototype, "endpoint", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, nullable: true }),
    __metadata("design:type", String)
], SystemMetrics.prototype, "component", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, nullable: true }),
    __metadata("design:type", String)
], SystemMetrics.prototype, "environment", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], SystemMetrics.prototype, "tags", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], SystemMetrics.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], SystemMetrics.prototype, "createdAt", void 0);
exports.SystemMetrics = SystemMetrics = __decorate([
    (0, typeorm_1.Entity)('system_metrics'),
    (0, typeorm_1.Index)(['metricType', 'metricCategory', 'createdAt']),
    (0, typeorm_1.Index)(['createdAt']),
    (0, typeorm_1.Index)(['source', 'createdAt'])
], SystemMetrics);
//# sourceMappingURL=SystemMetrics.js.map