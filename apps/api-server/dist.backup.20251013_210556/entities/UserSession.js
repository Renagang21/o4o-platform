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
exports.UserSession = exports.DeviceType = exports.SessionStatus = void 0;
const typeorm_1 = require("typeorm");
const BetaUser_1 = require("./BetaUser");
var SessionStatus;
(function (SessionStatus) {
    SessionStatus["ACTIVE"] = "active";
    SessionStatus["INACTIVE"] = "inactive";
    SessionStatus["EXPIRED"] = "expired";
})(SessionStatus || (exports.SessionStatus = SessionStatus = {}));
var DeviceType;
(function (DeviceType) {
    DeviceType["DESKTOP"] = "desktop";
    DeviceType["TABLET"] = "tablet";
    DeviceType["MOBILE"] = "mobile";
    DeviceType["UNKNOWN"] = "unknown";
})(DeviceType || (exports.DeviceType = DeviceType = {}));
let UserSession = class UserSession {
    // Methods
    updateActivity() {
        this.lastActivityAt = new Date();
        this.calculateDuration();
    }
    endSession() {
        this.status = SessionStatus.INACTIVE;
        this.endedAt = new Date();
        this.calculateDuration();
    }
    markExpired() {
        this.status = SessionStatus.EXPIRED;
        this.endedAt = new Date();
        this.calculateDuration();
    }
    incrementPageViews() {
        this.pageViews++;
        this.updateActivity();
    }
    incrementActions() {
        this.actions++;
        this.updateActivity();
    }
    incrementFeedback() {
        this.feedbackSubmitted++;
        this.updateActivity();
    }
    incrementContentViewed() {
        this.contentViewed++;
        this.updateActivity();
    }
    incrementErrors() {
        this.errorsEncountered++;
        this.updateActivity();
    }
    calculateDuration() {
        if (this.endedAt) {
            this.durationMinutes = Math.floor((this.endedAt.getTime() - this.createdAt.getTime()) / (1000 * 60));
        }
        else if (this.lastActivityAt) {
            this.durationMinutes = Math.floor((this.lastActivityAt.getTime() - this.createdAt.getTime()) / (1000 * 60));
        }
    }
    isActive() {
        return this.status === SessionStatus.ACTIVE;
    }
    getEngagementScore() {
        const baseScore = this.pageViews * 1 + this.actions * 2 + this.feedbackSubmitted * 5 + this.contentViewed * 3;
        const timeBonus = Math.min(this.durationMinutes / 10, 10); // Max 10 points for time
        const errorPenalty = this.errorsEncountered * -1;
        return Math.max(0, baseScore + timeBonus + errorPenalty);
    }
};
exports.UserSession = UserSession;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], UserSession.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], UserSession.prototype, "betaUserId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => BetaUser_1.BetaUser),
    (0, typeorm_1.JoinColumn)({ name: 'betaUserId' }),
    __metadata("design:type", BetaUser_1.BetaUser)
], UserSession.prototype, "betaUser", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255 }),
    __metadata("design:type", String)
], UserSession.prototype, "sessionId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 45 }),
    __metadata("design:type", String)
], UserSession.prototype, "ipAddress", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], UserSession.prototype, "userAgent", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: DeviceType, default: DeviceType.UNKNOWN }),
    __metadata("design:type", String)
], UserSession.prototype, "deviceType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, nullable: true }),
    __metadata("design:type", String)
], UserSession.prototype, "browser", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 50, nullable: true }),
    __metadata("design:type", String)
], UserSession.prototype, "operatingSystem", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 50, nullable: true }),
    __metadata("design:type", String)
], UserSession.prototype, "screenResolution", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: SessionStatus, default: SessionStatus.ACTIVE }),
    __metadata("design:type", String)
], UserSession.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], UserSession.prototype, "lastActivityAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], UserSession.prototype, "endedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], UserSession.prototype, "durationMinutes", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], UserSession.prototype, "pageViews", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], UserSession.prototype, "actions", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], UserSession.prototype, "feedbackSubmitted", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], UserSession.prototype, "contentViewed", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], UserSession.prototype, "errorsEncountered", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 10, nullable: true }),
    __metadata("design:type", String)
], UserSession.prototype, "country", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, nullable: true }),
    __metadata("design:type", String)
], UserSession.prototype, "city", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 10, nullable: true }),
    __metadata("design:type", String)
], UserSession.prototype, "timezone", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], UserSession.prototype, "referrer", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, nullable: true }),
    __metadata("design:type", String)
], UserSession.prototype, "utmSource", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, nullable: true }),
    __metadata("design:type", String)
], UserSession.prototype, "utmMedium", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, nullable: true }),
    __metadata("design:type", String)
], UserSession.prototype, "utmCampaign", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], UserSession.prototype, "performanceMetrics", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], UserSession.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], UserSession.prototype, "updatedAt", void 0);
exports.UserSession = UserSession = __decorate([
    (0, typeorm_1.Entity)('user_sessions'),
    (0, typeorm_1.Index)(['betaUserId', 'status', 'createdAt']),
    (0, typeorm_1.Index)(['status', 'endedAt']),
    (0, typeorm_1.Index)(['deviceType', 'createdAt'])
], UserSession);
//# sourceMappingURL=UserSession.js.map