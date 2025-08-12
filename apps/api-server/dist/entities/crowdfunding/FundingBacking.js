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
exports.FundingBacking = void 0;
const typeorm_1 = require("typeorm");
const User_1 = require("../User");
const FundingProject_1 = require("./FundingProject");
const BackerReward_1 = require("./BackerReward");
let FundingBacking = class FundingBacking {
};
exports.FundingBacking = FundingBacking;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], FundingBacking.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], FundingBacking.prototype, "projectId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => FundingProject_1.FundingProject, project => project.backings, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'projectId' }),
    __metadata("design:type", FundingProject_1.FundingProject)
], FundingBacking.prototype, "project", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], FundingBacking.prototype, "backerId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_1.User),
    (0, typeorm_1.JoinColumn)({ name: 'backerId' }),
    __metadata("design:type", User_1.User)
], FundingBacking.prototype, "backer", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2 }),
    __metadata("design:type", Number)
], FundingBacking.prototype, "amount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 3, default: 'KRW' }),
    __metadata("design:type", String)
], FundingBacking.prototype, "currency", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 20 }),
    __metadata("design:type", String)
], FundingBacking.prototype, "paymentMethod", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 20, default: 'pending' }),
    __metadata("design:type", String)
], FundingBacking.prototype, "paymentStatus", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", String)
], FundingBacking.prototype, "paymentId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], FundingBacking.prototype, "paidAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 20, default: 'active' }),
    __metadata("design:type", String)
], FundingBacking.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], FundingBacking.prototype, "isAnonymous", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, nullable: true }),
    __metadata("design:type", String)
], FundingBacking.prototype, "displayName", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], FundingBacking.prototype, "backerMessage", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], FundingBacking.prototype, "isMessagePublic", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], FundingBacking.prototype, "cancelledAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], FundingBacking.prototype, "cancellationReason", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], FundingBacking.prototype, "refundedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], FundingBacking.prototype, "refundAmount", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => BackerReward_1.BackerReward, backerReward => backerReward.backing),
    __metadata("design:type", Array)
], FundingBacking.prototype, "rewards", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], FundingBacking.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], FundingBacking.prototype, "updatedAt", void 0);
exports.FundingBacking = FundingBacking = __decorate([
    (0, typeorm_1.Entity)('funding_backings'),
    (0, typeorm_1.Index)(['projectId', 'backerId']),
    (0, typeorm_1.Index)(['status'])
], FundingBacking);
//# sourceMappingURL=FundingBacking.js.map