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
exports.BetaUser = exports.InterestArea = exports.BetaUserType = exports.BetaUserStatus = void 0;
const typeorm_1 = require("typeorm");
const BetaFeedback_1 = require("./BetaFeedback");
const FeedbackConversation_1 = require("./FeedbackConversation");
var BetaUserStatus;
(function (BetaUserStatus) {
    BetaUserStatus["PENDING"] = "pending";
    BetaUserStatus["APPROVED"] = "approved";
    BetaUserStatus["ACTIVE"] = "active";
    BetaUserStatus["INACTIVE"] = "inactive";
    BetaUserStatus["SUSPENDED"] = "suspended"; // 정지된 사용자
})(BetaUserStatus || (exports.BetaUserStatus = BetaUserStatus = {}));
var BetaUserType;
(function (BetaUserType) {
    BetaUserType["INDIVIDUAL"] = "individual";
    BetaUserType["BUSINESS"] = "business";
    BetaUserType["DEVELOPER"] = "developer";
    BetaUserType["PARTNER"] = "partner"; // 파트너
})(BetaUserType || (exports.BetaUserType = BetaUserType = {}));
var InterestArea;
(function (InterestArea) {
    InterestArea["RETAIL"] = "retail";
    InterestArea["HEALTHCARE"] = "healthcare";
    InterestArea["FOOD_SERVICE"] = "food_service";
    InterestArea["CORPORATE"] = "corporate";
    InterestArea["EDUCATION"] = "education";
    InterestArea["GOVERNMENT"] = "government";
    InterestArea["OTHER"] = "other"; // 기타
})(InterestArea || (exports.InterestArea = InterestArea = {}));
let BetaUser = class BetaUser {
    // Methods
    canProvideFeedback() {
        return this.status === BetaUserStatus.ACTIVE || this.status === BetaUserStatus.APPROVED;
    }
    approve(approvedBy, notes) {
        this.status = BetaUserStatus.APPROVED;
        this.approvedAt = new Date();
        this.approvedBy = approvedBy;
        this.approvalNotes = notes;
    }
    activate() {
        if (this.status === BetaUserStatus.APPROVED) {
            this.status = BetaUserStatus.ACTIVE;
            this.lastActiveAt = new Date();
        }
    }
    updateActivity() {
        this.lastActiveAt = new Date();
    }
    recordLogin() {
        this.loginCount++;
        this.lastLoginAt = new Date();
        if (!this.firstLoginAt) {
            this.firstLoginAt = new Date();
        }
        this.updateActivity();
    }
    incrementFeedbackCount() {
        this.feedbackCount++;
        this.updateActivity();
    }
    getEngagementLevel() {
        if (this.feedbackCount >= 10 && this.loginCount >= 20) {
            return 'high';
        }
        else if (this.feedbackCount >= 3 && this.loginCount >= 5) {
            return 'medium';
        }
        return 'low';
    }
    getDaysSinceRegistration() {
        return Math.floor((Date.now() - this.createdAt.getTime()) / (1000 * 60 * 60 * 24));
    }
    getDaysSinceLastActive() {
        if (!this.lastActiveAt)
            return -1;
        return Math.floor((Date.now() - this.lastActiveAt.getTime()) / (1000 * 60 * 60 * 24));
    }
};
exports.BetaUser = BetaUser;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], BetaUser.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, unique: true }),
    __metadata("design:type", String)
], BetaUser.prototype, "email", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100 }),
    __metadata("design:type", String)
], BetaUser.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 20, nullable: true }),
    __metadata("design:type", String)
], BetaUser.prototype, "phone", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, nullable: true }),
    __metadata("design:type", String)
], BetaUser.prototype, "company", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, nullable: true }),
    __metadata("design:type", String)
], BetaUser.prototype, "jobTitle", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: BetaUserStatus, default: BetaUserStatus.PENDING }),
    __metadata("design:type", String)
], BetaUser.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: BetaUserType, default: BetaUserType.INDIVIDUAL }),
    __metadata("design:type", String)
], BetaUser.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: InterestArea, default: InterestArea.OTHER }),
    __metadata("design:type", String)
], BetaUser.prototype, "interestArea", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], BetaUser.prototype, "useCase", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], BetaUser.prototype, "expectations", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-array', nullable: true }),
    __metadata("design:type", Array)
], BetaUser.prototype, "interestedFeatures", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], BetaUser.prototype, "approvedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', nullable: true }),
    __metadata("design:type", String)
], BetaUser.prototype, "approvedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], BetaUser.prototype, "approvalNotes", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], BetaUser.prototype, "lastActiveAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], BetaUser.prototype, "feedbackCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], BetaUser.prototype, "loginCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], BetaUser.prototype, "firstLoginAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], BetaUser.prototype, "lastLoginAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], BetaUser.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], BetaUser.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], BetaUser.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => BetaFeedback_1.BetaFeedback, feedback => feedback.betaUser),
    __metadata("design:type", Array)
], BetaUser.prototype, "feedback", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => FeedbackConversation_1.FeedbackConversation, conversation => conversation.betaUser),
    __metadata("design:type", Array)
], BetaUser.prototype, "conversations", void 0);
exports.BetaUser = BetaUser = __decorate([
    (0, typeorm_1.Entity)('beta_users'),
    (0, typeorm_1.Index)(['email'], { unique: true }),
    (0, typeorm_1.Index)(['status', 'createdAt']),
    (0, typeorm_1.Index)(['type', 'status'])
], BetaUser);
//# sourceMappingURL=BetaUser.js.map