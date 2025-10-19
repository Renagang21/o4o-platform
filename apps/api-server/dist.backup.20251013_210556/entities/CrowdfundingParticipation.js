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
exports.CrowdfundingParticipation = void 0;
const typeorm_1 = require("typeorm");
const User_1 = require("./User");
const CrowdfundingProject_1 = require("./CrowdfundingProject");
let CrowdfundingParticipation = class CrowdfundingParticipation {
};
exports.CrowdfundingParticipation = CrowdfundingParticipation;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], CrowdfundingParticipation.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'project_id' }),
    __metadata("design:type", String)
], CrowdfundingParticipation.prototype, "projectId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => CrowdfundingProject_1.CrowdfundingProject, project => project.participations, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'project_id' }),
    __metadata("design:type", CrowdfundingProject_1.CrowdfundingProject)
], CrowdfundingParticipation.prototype, "project", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'vendor_id' }),
    __metadata("design:type", String)
], CrowdfundingParticipation.prototype, "vendorId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_1.User, { eager: true }),
    (0, typeorm_1.JoinColumn)({ name: 'vendor_id' }),
    __metadata("design:type", User_1.User)
], CrowdfundingParticipation.prototype, "vendor", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ['joined', 'cancelled'],
        default: 'joined'
    }),
    __metadata("design:type", String)
], CrowdfundingParticipation.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'joined_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }),
    __metadata("design:type", Date)
], CrowdfundingParticipation.prototype, "joinedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'cancelled_at', type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], CrowdfundingParticipation.prototype, "cancelledAt", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], CrowdfundingParticipation.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], CrowdfundingParticipation.prototype, "updatedAt", void 0);
exports.CrowdfundingParticipation = CrowdfundingParticipation = __decorate([
    (0, typeorm_1.Entity)('crowdfunding_participations'),
    (0, typeorm_1.Unique)(['projectId', 'vendorId']) // 한 프로젝트에 한 번만 참여 가능
], CrowdfundingParticipation);
//# sourceMappingURL=CrowdfundingParticipation.js.map