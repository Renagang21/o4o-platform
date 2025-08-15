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
exports.CrowdfundingProject = void 0;
const typeorm_1 = require("typeorm");
const User_1 = require("./User");
const CrowdfundingParticipation_1 = require("./CrowdfundingParticipation");
let CrowdfundingProject = class CrowdfundingProject {
    // 가상 필드들 (계산된 값)
    get participationRate() {
        if (this.targetParticipantCount === 0)
            return 0;
        return Math.round((this.currentParticipantCount / this.targetParticipantCount) * 100);
    }
    get remainingDays() {
        const endDate = new Date(this.endDate);
        const today = new Date();
        const diffTime = endDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return Math.max(0, diffDays);
    }
    get isActive() {
        const today = new Date();
        const start = new Date(this.startDate);
        const end = new Date(this.endDate);
        return today >= start && today <= end && this.status === 'recruiting';
    }
    get isSuccessful() {
        return this.currentParticipantCount >= this.targetParticipantCount;
    }
};
exports.CrowdfundingProject = CrowdfundingProject;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], CrowdfundingProject.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 255 }),
    __metadata("design:type", String)
], CrowdfundingProject.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)('text'),
    __metadata("design:type", String)
], CrowdfundingProject.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'target_participant_count', type: 'int' }),
    __metadata("design:type", Number)
], CrowdfundingProject.prototype, "targetParticipantCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'current_participant_count', type: 'int', default: 0 }),
    __metadata("design:type", Number)
], CrowdfundingProject.prototype, "currentParticipantCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'start_date', type: 'date' }),
    __metadata("design:type", String)
], CrowdfundingProject.prototype, "startDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'end_date', type: 'date' }),
    __metadata("design:type", String)
], CrowdfundingProject.prototype, "endDate", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ['recruiting', 'in_progress', 'completed', 'cancelled'],
        default: 'recruiting'
    }),
    __metadata("design:type", String)
], CrowdfundingProject.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'creator_id' }),
    __metadata("design:type", String)
], CrowdfundingProject.prototype, "creatorId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_1.User, { eager: true }),
    (0, typeorm_1.JoinColumn)({ name: 'creator_id' }),
    __metadata("design:type", User_1.User)
], CrowdfundingProject.prototype, "creator", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'forum_link', length: 500, nullable: true }),
    __metadata("design:type", String)
], CrowdfundingProject.prototype, "forumLink", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => CrowdfundingParticipation_1.CrowdfundingParticipation, participation => participation.project, { cascade: true }),
    __metadata("design:type", Array)
], CrowdfundingProject.prototype, "participations", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], CrowdfundingProject.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], CrowdfundingProject.prototype, "updatedAt", void 0);
exports.CrowdfundingProject = CrowdfundingProject = __decorate([
    (0, typeorm_1.Entity)('crowdfunding_projects')
], CrowdfundingProject);
//# sourceMappingURL=CrowdfundingProject.js.map