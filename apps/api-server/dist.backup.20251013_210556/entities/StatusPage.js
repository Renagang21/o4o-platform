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
exports.StatusPageSubscriber = exports.StatusPageMaintenance = exports.StatusPageMetric = exports.StatusPageComponent = exports.StatusPageIncident = exports.ComponentType = exports.ServiceStatus = exports.IncidentImpact = exports.IncidentStatus = void 0;
const typeorm_1 = require("typeorm");
var IncidentStatus;
(function (IncidentStatus) {
    IncidentStatus["INVESTIGATING"] = "investigating";
    IncidentStatus["IDENTIFIED"] = "identified";
    IncidentStatus["MONITORING"] = "monitoring";
    IncidentStatus["RESOLVED"] = "resolved";
})(IncidentStatus || (exports.IncidentStatus = IncidentStatus = {}));
var IncidentImpact;
(function (IncidentImpact) {
    IncidentImpact["NONE"] = "none";
    IncidentImpact["MINOR"] = "minor";
    IncidentImpact["MAJOR"] = "major";
    IncidentImpact["CRITICAL"] = "critical";
})(IncidentImpact || (exports.IncidentImpact = IncidentImpact = {}));
var ServiceStatus;
(function (ServiceStatus) {
    ServiceStatus["OPERATIONAL"] = "operational";
    ServiceStatus["DEGRADED_PERFORMANCE"] = "degraded_performance";
    ServiceStatus["PARTIAL_OUTAGE"] = "partial_outage";
    ServiceStatus["MAJOR_OUTAGE"] = "major_outage";
    ServiceStatus["MAINTENANCE"] = "maintenance";
})(ServiceStatus || (exports.ServiceStatus = ServiceStatus = {}));
var ComponentType;
(function (ComponentType) {
    ComponentType["SERVICE"] = "service";
    ComponentType["API"] = "api";
    ComponentType["DATABASE"] = "database";
    ComponentType["CDN"] = "cdn";
    ComponentType["INFRASTRUCTURE"] = "infrastructure";
})(ComponentType || (exports.ComponentType = ComponentType = {}));
let StatusPageIncident = class StatusPageIncident {
    // Instance methods
    addUpdate(status, message, userId) {
        if (!this.updates)
            this.updates = [];
        this.updates.push({
            id: `update-${Date.now()}`,
            status,
            message,
            timestamp: new Date(),
            updatedBy: userId
        });
        this.status = status;
        if (status === IncidentStatus.RESOLVED) {
            this.resolvedAt = new Date();
        }
    }
    getLatestUpdate() {
        if (!this.updates || this.updates.length === 0)
            return undefined;
        return this.updates[this.updates.length - 1];
    }
    getDurationMinutes() {
        const endTime = this.resolvedAt || new Date();
        return Math.floor((endTime.getTime() - this.createdAt.getTime()) / (1000 * 60));
    }
    isActive() {
        return this.status !== IncidentStatus.RESOLVED;
    }
    getImpactColor() {
        const colorMap = {
            [IncidentImpact.NONE]: '#22c55e',
            [IncidentImpact.MINOR]: '#eab308',
            [IncidentImpact.MAJOR]: '#f97316',
            [IncidentImpact.CRITICAL]: '#dc2626'
        };
        return colorMap[this.impact];
    }
    getStatusColor() {
        const colorMap = {
            [IncidentStatus.INVESTIGATING]: '#dc2626',
            [IncidentStatus.IDENTIFIED]: '#f97316',
            [IncidentStatus.MONITORING]: '#eab308',
            [IncidentStatus.RESOLVED]: '#22c55e'
        };
        return colorMap[this.status];
    }
};
exports.StatusPageIncident = StatusPageIncident;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], StatusPageIncident.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255 }),
    __metadata("design:type", String)
], StatusPageIncident.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], StatusPageIncident.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: IncidentStatus }),
    __metadata("design:type", String)
], StatusPageIncident.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: IncidentImpact }),
    __metadata("design:type", String)
], StatusPageIncident.prototype, "impact", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-array', nullable: true }),
    __metadata("design:type", Array)
], StatusPageIncident.prototype, "affectedComponents", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Array)
], StatusPageIncident.prototype, "updates", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], StatusPageIncident.prototype, "resolvedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', nullable: true }),
    __metadata("design:type", String)
], StatusPageIncident.prototype, "createdBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], StatusPageIncident.prototype, "isPublic", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], StatusPageIncident.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], StatusPageIncident.prototype, "updatedAt", void 0);
exports.StatusPageIncident = StatusPageIncident = __decorate([
    (0, typeorm_1.Entity)('status_page_incidents'),
    (0, typeorm_1.Index)(['status', 'impact', 'createdAt']),
    (0, typeorm_1.Index)(['createdAt'])
], StatusPageIncident);
let StatusPageComponent = class StatusPageComponent {
    // Instance methods
    updateStatus(status) {
        this.status = status;
        this.updatedAt = new Date();
    }
    isOperational() {
        return this.status === ServiceStatus.OPERATIONAL;
    }
    hasIssues() {
        return this.status !== ServiceStatus.OPERATIONAL && this.status !== ServiceStatus.MAINTENANCE;
    }
    getStatusColor() {
        const colorMap = {
            [ServiceStatus.OPERATIONAL]: '#22c55e',
            [ServiceStatus.DEGRADED_PERFORMANCE]: '#eab308',
            [ServiceStatus.PARTIAL_OUTAGE]: '#f97316',
            [ServiceStatus.MAJOR_OUTAGE]: '#dc2626',
            [ServiceStatus.MAINTENANCE]: '#6b7280'
        };
        return colorMap[this.status];
    }
    getStatusDisplayName() {
        return this.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
};
exports.StatusPageComponent = StatusPageComponent;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], StatusPageComponent.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255 }),
    __metadata("design:type", String)
], StatusPageComponent.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], StatusPageComponent.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: ComponentType }),
    __metadata("design:type", String)
], StatusPageComponent.prototype, "componentType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: ServiceStatus, default: ServiceStatus.OPERATIONAL }),
    __metadata("design:type", String)
], StatusPageComponent.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", String)
], StatusPageComponent.prototype, "healthCheckUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], StatusPageComponent.prototype, "sortOrder", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], StatusPageComponent.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], StatusPageComponent.prototype, "showUptime", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], StatusPageComponent.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], StatusPageComponent.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], StatusPageComponent.prototype, "updatedAt", void 0);
exports.StatusPageComponent = StatusPageComponent = __decorate([
    (0, typeorm_1.Entity)('status_page_components'),
    (0, typeorm_1.Index)(['componentType', 'isActive']),
    (0, typeorm_1.Index)(['status'])
], StatusPageComponent);
let StatusPageMetric = class StatusPageMetric {
    // Static factory methods
    static createUptimeMetric(componentId, isUp, responseTime) {
        return {
            componentId,
            metricName: 'uptime',
            value: isUp ? 1 : 0,
            unit: 'boolean',
            timestamp: new Date(),
            metadata: {
                responseTime
            }
        };
    }
    static createResponseTimeMetric(componentId, responseTime, endpoint) {
        return {
            componentId,
            metricName: 'response_time',
            value: responseTime,
            unit: 'ms',
            timestamp: new Date(),
            metadata: {
                endpoint
            }
        };
    }
};
exports.StatusPageMetric = StatusPageMetric;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], StatusPageMetric.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], StatusPageMetric.prototype, "componentId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100 }),
    __metadata("design:type", String)
], StatusPageMetric.prototype, "metricName", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 4 }),
    __metadata("design:type", Number)
], StatusPageMetric.prototype, "value", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 20 }),
    __metadata("design:type", String)
], StatusPageMetric.prototype, "unit", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp' }),
    __metadata("design:type", Date)
], StatusPageMetric.prototype, "timestamp", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], StatusPageMetric.prototype, "metadata", void 0);
exports.StatusPageMetric = StatusPageMetric = __decorate([
    (0, typeorm_1.Entity)('status_page_metrics'),
    (0, typeorm_1.Index)(['componentId', 'timestamp']),
    (0, typeorm_1.Index)(['timestamp'])
], StatusPageMetric);
let StatusPageMaintenance = class StatusPageMaintenance {
    // Instance methods
    start() {
        this.status = 'in_progress';
        this.actualStart = new Date();
    }
    complete() {
        this.status = 'completed';
        this.actualEnd = new Date();
    }
    cancel() {
        this.status = 'cancelled';
    }
    addUpdate(message, userId) {
        if (!this.updates)
            this.updates = [];
        this.updates.push({
            id: `update-${Date.now()}`,
            message,
            timestamp: new Date(),
            updatedBy: userId
        });
    }
    isActive() {
        const now = new Date();
        return this.status === 'in_progress' ||
            (this.status === 'scheduled' && this.scheduledStart <= now && this.scheduledEnd >= now);
    }
    isUpcoming() {
        const now = new Date();
        return this.status === 'scheduled' && this.scheduledStart > now;
    }
    getDurationMinutes() {
        const start = this.actualStart || this.scheduledStart;
        const end = this.actualEnd || this.scheduledEnd;
        return Math.floor((end.getTime() - start.getTime()) / (1000 * 60));
    }
};
exports.StatusPageMaintenance = StatusPageMaintenance;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], StatusPageMaintenance.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255 }),
    __metadata("design:type", String)
], StatusPageMaintenance.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], StatusPageMaintenance.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-array', nullable: true }),
    __metadata("design:type", Array)
], StatusPageMaintenance.prototype, "affectedComponents", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp' }),
    __metadata("design:type", Date)
], StatusPageMaintenance.prototype, "scheduledStart", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp' }),
    __metadata("design:type", Date)
], StatusPageMaintenance.prototype, "scheduledEnd", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], StatusPageMaintenance.prototype, "actualStart", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], StatusPageMaintenance.prototype, "actualEnd", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: ['scheduled', 'in_progress', 'completed', 'cancelled'], default: 'scheduled' }),
    __metadata("design:type", String)
], StatusPageMaintenance.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Array)
], StatusPageMaintenance.prototype, "updates", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', nullable: true }),
    __metadata("design:type", String)
], StatusPageMaintenance.prototype, "createdBy", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], StatusPageMaintenance.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], StatusPageMaintenance.prototype, "updatedAt", void 0);
exports.StatusPageMaintenance = StatusPageMaintenance = __decorate([
    (0, typeorm_1.Entity)('status_page_maintenance'),
    (0, typeorm_1.Index)(['scheduledStart', 'scheduledEnd']),
    (0, typeorm_1.Index)(['status'])
], StatusPageMaintenance);
let StatusPageSubscriber = class StatusPageSubscriber {
    // Instance methods
    confirm() {
        this.confirmedAt = new Date();
        this.confirmationToken = undefined;
    }
    isConfirmed() {
        return this.confirmedAt !== null && this.confirmedAt !== undefined;
    }
    generateUnsubscribeUrl() {
        const baseUrl = process.env.PUBLIC_URL || 'https://your-domain.com';
        return `${baseUrl}/status/unsubscribe/${this.unsubscribeToken}`;
    }
};
exports.StatusPageSubscriber = StatusPageSubscriber;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], StatusPageSubscriber.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255 }),
    __metadata("design:type", String)
], StatusPageSubscriber.prototype, "email", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-array', nullable: true }),
    __metadata("design:type", Array)
], StatusPageSubscriber.prototype, "subscribedComponents", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-array', nullable: true }),
    __metadata("design:type", Array)
], StatusPageSubscriber.prototype, "notificationTypes", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], StatusPageSubscriber.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", String)
], StatusPageSubscriber.prototype, "confirmationToken", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], StatusPageSubscriber.prototype, "confirmedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", String)
], StatusPageSubscriber.prototype, "unsubscribeToken", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], StatusPageSubscriber.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], StatusPageSubscriber.prototype, "updatedAt", void 0);
exports.StatusPageSubscriber = StatusPageSubscriber = __decorate([
    (0, typeorm_1.Entity)('status_page_subscribers'),
    (0, typeorm_1.Index)(['email'])
], StatusPageSubscriber);
//# sourceMappingURL=StatusPage.js.map