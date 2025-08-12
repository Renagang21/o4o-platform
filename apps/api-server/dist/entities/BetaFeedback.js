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
exports.BetaFeedback = exports.SignageFeature = exports.FeedbackPriority = exports.FeedbackStatus = exports.FeedbackType = void 0;
const typeorm_1 = require("typeorm");
const BetaUser_1 = require("./BetaUser");
const User_1 = require("./User");
const FeedbackConversation_1 = require("./FeedbackConversation");
var FeedbackType;
(function (FeedbackType) {
    FeedbackType["BUG_REPORT"] = "bug_report";
    FeedbackType["FEATURE_REQUEST"] = "feature_request";
    FeedbackType["GENERAL_FEEDBACK"] = "general_feedback";
    FeedbackType["USABILITY"] = "usability";
    FeedbackType["PERFORMANCE"] = "performance";
    FeedbackType["SUGGESTION"] = "suggestion";
    FeedbackType["COMPLAINT"] = "complaint"; // 불만사항
})(FeedbackType || (exports.FeedbackType = FeedbackType = {}));
var FeedbackStatus;
(function (FeedbackStatus) {
    FeedbackStatus["PENDING"] = "pending";
    FeedbackStatus["REVIEWED"] = "reviewed";
    FeedbackStatus["IN_PROGRESS"] = "in_progress";
    FeedbackStatus["RESOLVED"] = "resolved";
    FeedbackStatus["REJECTED"] = "rejected";
    FeedbackStatus["ARCHIVED"] = "archived"; // 보관됨
})(FeedbackStatus || (exports.FeedbackStatus = FeedbackStatus = {}));
var FeedbackPriority;
(function (FeedbackPriority) {
    FeedbackPriority["LOW"] = "low";
    FeedbackPriority["MEDIUM"] = "medium";
    FeedbackPriority["HIGH"] = "high";
    FeedbackPriority["CRITICAL"] = "critical";
})(FeedbackPriority || (exports.FeedbackPriority = FeedbackPriority = {}));
var SignageFeature;
(function (SignageFeature) {
    SignageFeature["CONTENT_MANAGEMENT"] = "content_management";
    SignageFeature["PLAYLIST_MANAGEMENT"] = "playlist_management";
    SignageFeature["SCHEDULING"] = "scheduling";
    SignageFeature["TEMPLATES"] = "templates";
    SignageFeature["ANALYTICS"] = "analytics";
    SignageFeature["STORE_MANAGEMENT"] = "store_management";
    SignageFeature["USER_INTERFACE"] = "user_interface";
    SignageFeature["MOBILE_APP"] = "mobile_app";
    SignageFeature["API"] = "api";
    SignageFeature["INTEGRATION"] = "integration";
})(SignageFeature || (exports.SignageFeature = SignageFeature = {}));
let BetaFeedback = class BetaFeedback {
    // Methods
    canBeResponded() {
        return [FeedbackStatus.PENDING, FeedbackStatus.REVIEWED].includes(this.status);
    }
    canBeResolved() {
        return [FeedbackStatus.REVIEWED, FeedbackStatus.IN_PROGRESS].includes(this.status);
    }
    assignTo(userId) {
        this.assignedTo = userId;
        if (this.status === FeedbackStatus.PENDING) {
            this.status = FeedbackStatus.REVIEWED;
        }
    }
    respond(response, respondedBy) {
        this.adminResponse = response;
        this.responseAt = new Date();
        this.respondedBy = respondedBy;
        if (this.status === FeedbackStatus.PENDING) {
            this.status = FeedbackStatus.REVIEWED;
        }
    }
    markInProgress() {
        this.status = FeedbackStatus.IN_PROGRESS;
    }
    resolve(resolvedBy) {
        this.status = FeedbackStatus.RESOLVED;
        this.resolvedAt = new Date();
        this.resolvedBy = resolvedBy;
    }
    reject(rejectedBy, reason) {
        this.status = FeedbackStatus.REJECTED;
        this.resolvedAt = new Date();
        this.resolvedBy = rejectedBy;
        if (reason) {
            this.adminResponse = reason;
        }
    }
    archive() {
        this.status = FeedbackStatus.ARCHIVED;
    }
    addTag(tag) {
        if (!this.tags)
            this.tags = [];
        if (!this.tags.includes(tag)) {
            this.tags.push(tag);
        }
    }
    removeTag(tag) {
        if (this.tags) {
            this.tags = this.tags.filter((t) => t !== tag);
        }
    }
    getDaysOpen() {
        const endDate = this.resolvedAt || new Date();
        return Math.floor((endDate.getTime() - this.createdAt.getTime()) / (1000 * 60 * 60 * 24));
    }
    getBusinessImpactScore() {
        let score = 0;
        // Priority weight
        switch (this.priority) {
            case FeedbackPriority.CRITICAL:
                score += 10;
                break;
            case FeedbackPriority.HIGH:
                score += 7;
                break;
            case FeedbackPriority.MEDIUM:
                score += 4;
                break;
            case FeedbackPriority.LOW:
                score += 1;
                break;
        }
        // Type weight
        switch (this.type) {
            case FeedbackType.BUG_REPORT:
                score += 5;
                break;
            case FeedbackType.FEATURE_REQUEST:
                score += 3;
                break;
            case FeedbackType.PERFORMANCE:
                score += 4;
                break;
            case FeedbackType.USABILITY:
                score += 2;
                break;
            default: score += 1;
        }
        // Age penalty (older feedback gets higher score)
        const daysOld = this.getDaysOpen();
        if (daysOld > 30)
            score += 3;
        else if (daysOld > 14)
            score += 2;
        else if (daysOld > 7)
            score += 1;
        return score;
    }
    // Real-time support methods
    markAsViewed(viewedBy) {
        this.lastViewedAt = new Date();
        this.lastViewedBy = viewedBy;
        this.viewCount += 1;
    }
    startLiveSupport() {
        this.isLive = true;
        this.hasActiveConversation = true;
        this.needsImmediateAttention = true;
    }
    endLiveSupport() {
        this.isLive = false;
        this.needsImmediateAttention = false;
    }
    updateNotificationSent() {
        this.lastNotificationSent = new Date();
    }
    needsAttention() {
        return this.needsImmediateAttention ||
            this.priority === FeedbackPriority.CRITICAL ||
            this.isLive;
    }
    getMinutesSinceLastView() {
        if (!this.lastViewedAt)
            return Infinity;
        return Math.floor((Date.now() - this.lastViewedAt.getTime()) / (1000 * 60));
    }
    shouldNotify() {
        // Notify if critical or high priority and no notification sent in last 30 minutes
        if (this.priority === FeedbackPriority.CRITICAL || this.priority === FeedbackPriority.HIGH) {
            if (!this.lastNotificationSent)
                return true;
            const minutesSinceLastNotification = Math.floor((Date.now() - this.lastNotificationSent.getTime()) / (1000 * 60));
            return minutesSinceLastNotification >= 30;
        }
        return false;
    }
};
exports.BetaFeedback = BetaFeedback;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], BetaFeedback.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: FeedbackType }),
    __metadata("design:type", String)
], BetaFeedback.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 200 }),
    __metadata("design:type", String)
], BetaFeedback.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], BetaFeedback.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], BetaFeedback.prototype, "reproductionSteps", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], BetaFeedback.prototype, "expectedBehavior", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], BetaFeedback.prototype, "actualBehavior", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: SignageFeature, nullable: true }),
    __metadata("design:type", String)
], BetaFeedback.prototype, "feature", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: FeedbackStatus, default: FeedbackStatus.PENDING }),
    __metadata("design:type", String)
], BetaFeedback.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: FeedbackPriority, default: FeedbackPriority.MEDIUM }),
    __metadata("design:type", String)
], BetaFeedback.prototype, "priority", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], BetaFeedback.prototype, "betaUserId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", String)
], BetaFeedback.prototype, "contactEmail", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, nullable: true }),
    __metadata("design:type", String)
], BetaFeedback.prototype, "browserInfo", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 50, nullable: true }),
    __metadata("design:type", String)
], BetaFeedback.prototype, "deviceType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, nullable: true }),
    __metadata("design:type", String)
], BetaFeedback.prototype, "screenResolution", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 500, nullable: true }),
    __metadata("design:type", String)
], BetaFeedback.prototype, "currentUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 50, nullable: true }),
    __metadata("design:type", String)
], BetaFeedback.prototype, "appVersion", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-array', nullable: true }),
    __metadata("design:type", Array)
], BetaFeedback.prototype, "attachments", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-array', nullable: true }),
    __metadata("design:type", Array)
], BetaFeedback.prototype, "screenshots", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], BetaFeedback.prototype, "adminResponse", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', nullable: true }),
    __metadata("design:type", String)
], BetaFeedback.prototype, "assignedTo", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], BetaFeedback.prototype, "responseAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', nullable: true }),
    __metadata("design:type", String)
], BetaFeedback.prototype, "respondedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], BetaFeedback.prototype, "resolvedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', nullable: true }),
    __metadata("design:type", String)
], BetaFeedback.prototype, "resolvedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', nullable: true }),
    __metadata("design:type", Number)
], BetaFeedback.prototype, "rating", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], BetaFeedback.prototype, "additionalComments", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-array', nullable: true }),
    __metadata("design:type", Array)
], BetaFeedback.prototype, "tags", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], BetaFeedback.prototype, "internalNotes", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], BetaFeedback.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], BetaFeedback.prototype, "hasActiveConversation", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], BetaFeedback.prototype, "needsImmediateAttention", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], BetaFeedback.prototype, "lastViewedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', nullable: true }),
    __metadata("design:type", String)
], BetaFeedback.prototype, "lastViewedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], BetaFeedback.prototype, "viewCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], BetaFeedback.prototype, "lastNotificationSent", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], BetaFeedback.prototype, "isLive", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], BetaFeedback.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], BetaFeedback.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => BetaUser_1.BetaUser, betaUser => betaUser.feedback),
    (0, typeorm_1.JoinColumn)({ name: 'betaUserId' }),
    __metadata("design:type", BetaUser_1.BetaUser)
], BetaFeedback.prototype, "betaUser", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_1.User, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'assignedTo' }),
    __metadata("design:type", User_1.User)
], BetaFeedback.prototype, "assignee", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_1.User, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'respondedBy' }),
    __metadata("design:type", User_1.User)
], BetaFeedback.prototype, "responder", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_1.User, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'resolvedBy' }),
    __metadata("design:type", User_1.User)
], BetaFeedback.prototype, "resolver", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => FeedbackConversation_1.FeedbackConversation, conversation => conversation.feedback),
    __metadata("design:type", Array)
], BetaFeedback.prototype, "conversations", void 0);
exports.BetaFeedback = BetaFeedback = __decorate([
    (0, typeorm_1.Entity)('beta_feedback'),
    (0, typeorm_1.Index)(['betaUserId', 'status', 'createdAt']),
    (0, typeorm_1.Index)(['type', 'status']),
    (0, typeorm_1.Index)(['feature', 'priority']),
    (0, typeorm_1.Index)(['status', 'priority', 'createdAt'])
], BetaFeedback);
//# sourceMappingURL=BetaFeedback.js.map