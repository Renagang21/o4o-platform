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
exports.Alert = exports.AlertChannel = exports.AlertStatus = exports.AlertSeverity = exports.AlertType = void 0;
const typeorm_1 = require("typeorm");
var AlertType;
(function (AlertType) {
    AlertType["PERFORMANCE"] = "performance";
    AlertType["ERROR"] = "error";
    AlertType["USAGE"] = "usage";
    AlertType["SECURITY"] = "security";
    AlertType["SYSTEM"] = "system";
    AlertType["BUSINESS"] = "business";
    AlertType["DATABASE"] = "database";
    AlertType["DEPLOYMENT"] = "deployment";
    AlertType["CIRCUIT_BREAKER"] = "circuit_breaker";
})(AlertType || (exports.AlertType = AlertType = {}));
var AlertSeverity;
(function (AlertSeverity) {
    AlertSeverity["LOW"] = "low";
    AlertSeverity["MEDIUM"] = "medium";
    AlertSeverity["HIGH"] = "high";
    AlertSeverity["CRITICAL"] = "critical";
})(AlertSeverity || (exports.AlertSeverity = AlertSeverity = {}));
var AlertStatus;
(function (AlertStatus) {
    AlertStatus["ACTIVE"] = "active";
    AlertStatus["ACKNOWLEDGED"] = "acknowledged";
    AlertStatus["RESOLVED"] = "resolved";
    AlertStatus["DISMISSED"] = "dismissed";
})(AlertStatus || (exports.AlertStatus = AlertStatus = {}));
var AlertChannel;
(function (AlertChannel) {
    AlertChannel["EMAIL"] = "email";
    AlertChannel["SLACK"] = "slack";
    AlertChannel["WEBHOOK"] = "webhook";
    AlertChannel["DASHBOARD"] = "dashboard";
})(AlertChannel || (exports.AlertChannel = AlertChannel = {}));
let Alert = class Alert {
    // Static factory methods
    static createPerformanceAlert(title, message, severity, metricName, currentValue, thresholdValue, operator, unit, source, endpoint, context) {
        return {
            alertType: AlertType.PERFORMANCE,
            severity,
            title,
            message,
            metricName,
            currentValue,
            thresholdValue,
            comparisonOperator: operator,
            unit,
            source,
            endpoint,
            context,
            notificationChannels: severity === AlertSeverity.CRITICAL ? [AlertChannel.EMAIL, AlertChannel.SLACK] : [AlertChannel.DASHBOARD],
            firstOccurrence: new Date(),
            lastOccurrence: new Date()
        };
    }
    static createErrorAlert(title, message, severity, source, endpoint, errorDetails, context) {
        return {
            alertType: AlertType.ERROR,
            severity,
            title,
            message,
            source,
            endpoint,
            context,
            metadata: errorDetails,
            notificationChannels: severity === AlertSeverity.CRITICAL ? [AlertChannel.EMAIL, AlertChannel.SLACK] : [AlertChannel.DASHBOARD],
            firstOccurrence: new Date(),
            lastOccurrence: new Date()
        };
    }
    static createUsageAlert(title, message, severity, metricName, currentValue, thresholdValue, operator, unit, usageDetails, context) {
        return {
            alertType: AlertType.USAGE,
            severity,
            title,
            message,
            metricName,
            currentValue,
            thresholdValue,
            comparisonOperator: operator,
            unit,
            context,
            metadata: usageDetails,
            notificationChannels: [AlertChannel.DASHBOARD],
            firstOccurrence: new Date(),
            lastOccurrence: new Date()
        };
    }
    static createSecurityAlert(title, message, severity, source, securityDetails, context) {
        return {
            alertType: AlertType.SECURITY,
            severity,
            title,
            message,
            source,
            context,
            metadata: securityDetails,
            notificationChannels: [AlertChannel.EMAIL, AlertChannel.SLACK, AlertChannel.DASHBOARD],
            firstOccurrence: new Date(),
            lastOccurrence: new Date()
        };
    }
    static createSystemAlert(title, message, severity, source, component, systemDetails, context) {
        return {
            alertType: AlertType.SYSTEM,
            severity,
            title,
            message,
            source,
            component,
            context,
            metadata: systemDetails,
            notificationChannels: severity === AlertSeverity.CRITICAL ?
                [AlertChannel.EMAIL, AlertChannel.SLACK, AlertChannel.DASHBOARD] :
                [AlertChannel.DASHBOARD],
            firstOccurrence: new Date(),
            lastOccurrence: new Date()
        };
    }
    static createBusinessAlert(title, message, severity, source, businessDetails, context) {
        return {
            alertType: AlertType.BUSINESS,
            severity,
            title,
            message,
            source,
            context,
            metadata: businessDetails,
            notificationChannels: [AlertChannel.DASHBOARD],
            firstOccurrence: new Date(),
            lastOccurrence: new Date()
        };
    }
    // Instance methods
    acknowledge(userId, note) {
        this.status = AlertStatus.ACKNOWLEDGED;
        this.acknowledgedBy = userId;
        this.acknowledgedAt = new Date();
        this.acknowledgmentNote = note;
    }
    resolve(userId, note, action) {
        this.status = AlertStatus.RESOLVED;
        this.resolvedBy = userId;
        this.resolvedAt = new Date();
        this.resolutionNote = note;
        this.resolutionAction = action;
    }
    dismiss(userId, note) {
        this.status = AlertStatus.DISMISSED;
        this.resolvedBy = userId;
        this.resolvedAt = new Date();
        this.resolutionNote = note;
        this.resolutionAction = 'dismissed';
    }
    escalate(rule) {
        var _a;
        this.isEscalated = true;
        this.escalatedAt = new Date();
        this.escalationRule = rule;
        // Add email notification for escalated alerts
        if (!((_a = this.notificationChannels) === null || _a === void 0 ? void 0 : _a.includes(AlertChannel.EMAIL))) {
            this.notificationChannels = [...(this.notificationChannels || []), AlertChannel.EMAIL];
        }
    }
    recordOccurrence() {
        this.occurrenceCount++;
        this.lastOccurrence = new Date();
        if (this.occurrenceCount > 1) {
            this.isRecurring = true;
        }
    }
    markNotificationSent() {
        this.notificationSent = true;
        this.notificationSentAt = new Date();
    }
    incrementNotificationRetries() {
        this.notificationRetries++;
    }
    isActive() {
        return this.status === AlertStatus.ACTIVE;
    }
    isResolved() {
        return this.status === AlertStatus.RESOLVED;
    }
    isAcknowledged() {
        return this.status === AlertStatus.ACKNOWLEDGED;
    }
    isDismissed() {
        return this.status === AlertStatus.DISMISSED;
    }
    isCritical() {
        return this.severity === AlertSeverity.CRITICAL;
    }
    isHigh() {
        return this.severity === AlertSeverity.HIGH;
    }
    requiresImmediateAttention() {
        return this.severity === AlertSeverity.CRITICAL || this.severity === AlertSeverity.HIGH;
    }
    getAgeInMinutes() {
        return Math.floor((Date.now() - this.createdAt.getTime()) / (1000 * 60));
    }
    getAgeInHours() {
        return Math.floor((Date.now() - this.createdAt.getTime()) / (1000 * 60 * 60));
    }
    shouldEscalate(escalationTimeMinutes = 30) {
        return !this.isEscalated &&
            this.isActive() &&
            this.requiresImmediateAttention() &&
            this.getAgeInMinutes() >= escalationTimeMinutes;
    }
    getDisplayTitle() {
        const severityIcon = {
            [AlertSeverity.LOW]: '🔵',
            [AlertSeverity.MEDIUM]: '🟡',
            [AlertSeverity.HIGH]: '🟠',
            [AlertSeverity.CRITICAL]: '🔴'
        };
        return `${severityIcon[this.severity]} ${this.title}`;
    }
    getSeverityDisplayName() {
        return this.severity.charAt(0).toUpperCase() + this.severity.slice(1);
    }
    getTypeDisplayName() {
        return this.alertType.charAt(0).toUpperCase() + this.alertType.slice(1);
    }
    getStatusDisplayName() {
        return this.status.charAt(0).toUpperCase() + this.status.slice(1);
    }
    getFormattedValue() {
        if (this.currentValue === null || this.currentValue === undefined)
            return 'N/A';
        if (this.unit === 'ms') {
            return `${this.currentValue}ms`;
        }
        else if (this.unit === 'bytes') {
            return this.formatBytes(this.currentValue);
        }
        else if (this.unit === '%') {
            return `${this.currentValue}%`;
        }
        else if (this.unit === 'count') {
            return this.currentValue.toString();
        }
        return `${this.currentValue} ${this.unit || ''}`;
    }
    formatBytes(bytes) {
        if (bytes === 0)
            return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
};
exports.Alert = Alert;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Alert.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: AlertType }),
    __metadata("design:type", String)
], Alert.prototype, "alertType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: AlertSeverity }),
    __metadata("design:type", String)
], Alert.prototype, "severity", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: AlertStatus, default: AlertStatus.ACTIVE }),
    __metadata("design:type", String)
], Alert.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255 }),
    __metadata("design:type", String)
], Alert.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], Alert.prototype, "message", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], Alert.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, nullable: true }),
    __metadata("design:type", String)
], Alert.prototype, "source", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", String)
], Alert.prototype, "component", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", String)
], Alert.prototype, "endpoint", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", String)
], Alert.prototype, "metricName", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 15, scale: 4, nullable: true }),
    __metadata("design:type", Number)
], Alert.prototype, "currentValue", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 15, scale: 4, nullable: true }),
    __metadata("design:type", Number)
], Alert.prototype, "thresholdValue", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 50, nullable: true }),
    __metadata("design:type", String)
], Alert.prototype, "comparisonOperator", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 50, nullable: true }),
    __metadata("design:type", String)
], Alert.prototype, "unit", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], Alert.prototype, "context", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], Alert.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', nullable: true }),
    __metadata("design:type", String)
], Alert.prototype, "acknowledgedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], Alert.prototype, "acknowledgedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], Alert.prototype, "acknowledgmentNote", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', nullable: true }),
    __metadata("design:type", String)
], Alert.prototype, "resolvedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], Alert.prototype, "resolvedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], Alert.prototype, "resolutionNote", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", String)
], Alert.prototype, "resolutionAction", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-array', nullable: true }),
    __metadata("design:type", Array)
], Alert.prototype, "notificationChannels", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], Alert.prototype, "notificationSent", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], Alert.prototype, "notificationSentAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], Alert.prototype, "notificationRetries", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], Alert.prototype, "isEscalated", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], Alert.prototype, "escalatedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", String)
], Alert.prototype, "escalationRule", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 50, nullable: true }),
    __metadata("design:type", String)
], Alert.prototype, "escalationLevel", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', nullable: true }),
    __metadata("design:type", String)
], Alert.prototype, "assignedTo", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], Alert.prototype, "isRecurring", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 1 }),
    __metadata("design:type", Number)
], Alert.prototype, "occurrenceCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], Alert.prototype, "firstOccurrence", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], Alert.prototype, "lastOccurrence", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Alert.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], Alert.prototype, "updatedAt", void 0);
exports.Alert = Alert = __decorate([
    (0, typeorm_1.Entity)('alerts'),
    (0, typeorm_1.Index)(['alertType', 'severity', 'status', 'createdAt']),
    (0, typeorm_1.Index)(['status', 'createdAt']),
    (0, typeorm_1.Index)(['source', 'createdAt'])
], Alert);
//# sourceMappingURL=Alert.js.map