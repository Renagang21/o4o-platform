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
exports.AnalyticsReport = exports.ReportStatus = exports.ReportCategory = exports.ReportType = void 0;
const typeorm_1 = require("typeorm");
var ReportType;
(function (ReportType) {
    ReportType["DAILY"] = "daily";
    ReportType["WEEKLY"] = "weekly";
    ReportType["MONTHLY"] = "monthly";
    ReportType["CUSTOM"] = "custom";
})(ReportType || (exports.ReportType = ReportType = {}));
var ReportCategory;
(function (ReportCategory) {
    ReportCategory["USER_ACTIVITY"] = "user_activity";
    ReportCategory["SYSTEM_PERFORMANCE"] = "system_performance";
    ReportCategory["CONTENT_USAGE"] = "content_usage";
    ReportCategory["FEEDBACK_ANALYSIS"] = "feedback_analysis";
    ReportCategory["ERROR_ANALYSIS"] = "error_analysis";
    ReportCategory["BUSINESS_METRICS"] = "business_metrics";
    ReportCategory["COMPREHENSIVE"] = "comprehensive";
})(ReportCategory || (exports.ReportCategory = ReportCategory = {}));
var ReportStatus;
(function (ReportStatus) {
    ReportStatus["PENDING"] = "pending";
    ReportStatus["GENERATING"] = "generating";
    ReportStatus["COMPLETED"] = "completed";
    ReportStatus["FAILED"] = "failed";
})(ReportStatus || (exports.ReportStatus = ReportStatus = {}));
let AnalyticsReport = class AnalyticsReport {
    // Static factory methods
    static createDailyReport(category, date, name) {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);
        return {
            reportType: ReportType.DAILY,
            reportCategory: category,
            reportName: name || `Daily ${category.replace('_', ' ')} Report - ${date.toDateString()}`,
            reportPeriodStart: startOfDay,
            reportPeriodEnd: endOfDay,
            status: ReportStatus.PENDING
        };
    }
    static createWeeklyReport(category, weekStart, name) {
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);
        return {
            reportType: ReportType.WEEKLY,
            reportCategory: category,
            reportName: name || `Weekly ${category.replace('_', ' ')} Report - ${weekStart.toDateString()}`,
            reportPeriodStart: weekStart,
            reportPeriodEnd: weekEnd,
            status: ReportStatus.PENDING
        };
    }
    static createMonthlyReport(category, month, name) {
        const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
        const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0, 23, 59, 59, 999);
        return {
            reportType: ReportType.MONTHLY,
            reportCategory: category,
            reportName: name || `Monthly ${category.replace('_', ' ')} Report - ${monthStart.toDateString()}`,
            reportPeriodStart: monthStart,
            reportPeriodEnd: monthEnd,
            status: ReportStatus.PENDING
        };
    }
    static createCustomReport(category, startDate, endDate, name) {
        return {
            reportType: ReportType.CUSTOM,
            reportCategory: category,
            reportName: name,
            reportPeriodStart: startDate,
            reportPeriodEnd: endDate,
            status: ReportStatus.PENDING
        };
    }
    // Instance methods
    markAsGenerating() {
        this.status = ReportStatus.GENERATING;
        this.generatedAt = new Date();
    }
    markAsCompleted(generationTimeMs, filePath, fileType, fileSize) {
        this.status = ReportStatus.COMPLETED;
        this.generationTimeMs = generationTimeMs;
        this.reportFilePath = filePath;
        this.reportFileType = fileType;
        this.reportFileSize = fileSize;
    }
    markAsFailed(error) {
        this.status = ReportStatus.FAILED;
        this.generationError = error;
    }
    isCompleted() {
        return this.status === ReportStatus.COMPLETED;
    }
    isFailed() {
        return this.status === ReportStatus.FAILED;
    }
    isPending() {
        return this.status === ReportStatus.PENDING;
    }
    isGenerating() {
        return this.status === ReportStatus.GENERATING;
    }
    getDurationDays() {
        return Math.ceil((this.reportPeriodEnd.getTime() - this.reportPeriodStart.getTime()) / (1000 * 60 * 60 * 24));
    }
    getFormattedPeriod() {
        const start = this.reportPeriodStart.toLocaleDateString();
        const end = this.reportPeriodEnd.toLocaleDateString();
        if (start === end) {
            return start;
        }
        return `${start} - ${end}`;
    }
    getCategoryDisplayName() {
        const categoryNames = {
            [ReportCategory.USER_ACTIVITY]: 'User Activity',
            [ReportCategory.SYSTEM_PERFORMANCE]: 'System Performance',
            [ReportCategory.CONTENT_USAGE]: 'Content Usage',
            [ReportCategory.FEEDBACK_ANALYSIS]: 'Feedback Analysis',
            [ReportCategory.ERROR_ANALYSIS]: 'Error Analysis',
            [ReportCategory.BUSINESS_METRICS]: 'Business Metrics',
            [ReportCategory.COMPREHENSIVE]: 'Comprehensive'
        };
        return categoryNames[this.reportCategory] || 'Unknown';
    }
    getTypeDisplayName() {
        const typeNames = {
            [ReportType.DAILY]: 'Daily',
            [ReportType.WEEKLY]: 'Weekly',
            [ReportType.MONTHLY]: 'Monthly',
            [ReportType.CUSTOM]: 'Custom'
        };
        return typeNames[this.reportType] || 'Unknown';
    }
    hasData() {
        return !!(this.summary || this.userMetrics || this.systemMetrics || this.contentMetrics || this.feedbackMetrics || this.businessMetrics);
    }
    getDataSize() {
        if (!this.hasData())
            return 0;
        const dataString = JSON.stringify({
            summary: this.summary,
            userMetrics: this.userMetrics,
            systemMetrics: this.systemMetrics,
            contentMetrics: this.contentMetrics,
            feedbackMetrics: this.feedbackMetrics,
            businessMetrics: this.businessMetrics
        });
        return Buffer.byteLength(dataString, 'utf8');
    }
};
exports.AnalyticsReport = AnalyticsReport;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], AnalyticsReport.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: ReportType }),
    __metadata("design:type", String)
], AnalyticsReport.prototype, "reportType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: ReportCategory }),
    __metadata("design:type", String)
], AnalyticsReport.prototype, "reportCategory", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255 }),
    __metadata("design:type", String)
], AnalyticsReport.prototype, "reportName", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], AnalyticsReport.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: ReportStatus, default: ReportStatus.PENDING }),
    __metadata("design:type", String)
], AnalyticsReport.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp' }),
    __metadata("design:type", Date)
], AnalyticsReport.prototype, "reportPeriodStart", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp' }),
    __metadata("design:type", Date)
], AnalyticsReport.prototype, "reportPeriodEnd", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', nullable: true }),
    __metadata("design:type", String)
], AnalyticsReport.prototype, "generatedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], AnalyticsReport.prototype, "generatedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', nullable: true }),
    __metadata("design:type", Number)
], AnalyticsReport.prototype, "generationTimeMs", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], AnalyticsReport.prototype, "generationError", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], AnalyticsReport.prototype, "summary", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], AnalyticsReport.prototype, "userMetrics", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], AnalyticsReport.prototype, "systemMetrics", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], AnalyticsReport.prototype, "contentMetrics", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], AnalyticsReport.prototype, "feedbackMetrics", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], AnalyticsReport.prototype, "businessMetrics", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 500, nullable: true }),
    __metadata("design:type", String)
], AnalyticsReport.prototype, "reportFilePath", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, nullable: true }),
    __metadata("design:type", String)
], AnalyticsReport.prototype, "reportFileType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', nullable: true }),
    __metadata("design:type", Number)
], AnalyticsReport.prototype, "reportFileSize", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], AnalyticsReport.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], AnalyticsReport.prototype, "updatedAt", void 0);
exports.AnalyticsReport = AnalyticsReport = __decorate([
    (0, typeorm_1.Entity)('analytics_reports'),
    (0, typeorm_1.Index)(['reportType', 'reportCategory', 'createdAt']),
    (0, typeorm_1.Index)(['status', 'createdAt']),
    (0, typeorm_1.Index)(['reportPeriodStart', 'reportPeriodEnd'])
], AnalyticsReport);
//# sourceMappingURL=AnalyticsReport.js.map