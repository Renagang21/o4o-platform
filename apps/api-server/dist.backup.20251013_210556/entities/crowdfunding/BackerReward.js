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
exports.BackerReward = void 0;
const typeorm_1 = require("typeorm");
const FundingBacking_1 = require("./FundingBacking");
const FundingReward_1 = require("./FundingReward");
let BackerReward = class BackerReward {
};
exports.BackerReward = BackerReward;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], BackerReward.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], BackerReward.prototype, "backingId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => FundingBacking_1.FundingBacking, backing => backing.rewards, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'backingId' }),
    __metadata("design:type", FundingBacking_1.FundingBacking)
], BackerReward.prototype, "backing", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], BackerReward.prototype, "rewardId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => FundingReward_1.FundingReward, reward => reward.backerRewards),
    (0, typeorm_1.JoinColumn)({ name: 'rewardId' }),
    __metadata("design:type", FundingReward_1.FundingReward)
], BackerReward.prototype, "reward", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 1 }),
    __metadata("design:type", Number)
], BackerReward.prototype, "quantity", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-json', nullable: true }),
    __metadata("design:type", Object)
], BackerReward.prototype, "selectedOptions", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-json', nullable: true }),
    __metadata("design:type", Object)
], BackerReward.prototype, "shippingAddress", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, nullable: true }),
    __metadata("design:type", String)
], BackerReward.prototype, "shippingRegion", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], BackerReward.prototype, "totalPrice", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 20, default: 'pending' }),
    __metadata("design:type", String)
], BackerReward.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", String)
], BackerReward.prototype, "trackingNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], BackerReward.prototype, "shippedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], BackerReward.prototype, "deliveredAt", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], BackerReward.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], BackerReward.prototype, "updatedAt", void 0);
exports.BackerReward = BackerReward = __decorate([
    (0, typeorm_1.Entity)('backer_rewards'),
    (0, typeorm_1.Index)(['backingId'])
], BackerReward);
//# sourceMappingURL=BackerReward.js.map