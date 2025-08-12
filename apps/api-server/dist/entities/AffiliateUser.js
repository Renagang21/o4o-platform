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
exports.AffiliateUser = void 0;
const typeorm_1 = require("typeorm");
const User_1 = require("./User");
const ReferralRelationship_1 = require("./ReferralRelationship");
const AffiliateCommission_1 = require("./AffiliateCommission");
let AffiliateUser = class AffiliateUser {
};
exports.AffiliateUser = AffiliateUser;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], AffiliateUser.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)('uuid', { unique: true }),
    __metadata("design:type", String)
], AffiliateUser.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.OneToOne)(() => User_1.User),
    (0, typeorm_1.JoinColumn)({ name: 'userId' }),
    __metadata("design:type", User_1.User)
], AffiliateUser.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true, length: 10 }),
    __metadata("design:type", String)
], AffiliateUser.prototype, "affiliateCode", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ['active', 'inactive', 'suspended'],
        default: 'active'
    }),
    __metadata("design:type", String)
], AffiliateUser.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp' }),
    __metadata("design:type", Date)
], AffiliateUser.prototype, "joinedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 0 }),
    __metadata("design:type", Number)
], AffiliateUser.prototype, "totalClicks", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 0 }),
    __metadata("design:type", Number)
], AffiliateUser.prototype, "totalSignups", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 0 }),
    __metadata("design:type", Number)
], AffiliateUser.prototype, "totalOrders", void 0);
__decorate([
    (0, typeorm_1.Column)('decimal', { precision: 12, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], AffiliateUser.prototype, "totalRevenue", void 0);
__decorate([
    (0, typeorm_1.Column)('decimal', { precision: 10, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], AffiliateUser.prototype, "totalCommission", void 0);
__decorate([
    (0, typeorm_1.Column)('decimal', { precision: 10, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], AffiliateUser.prototype, "paidCommission", void 0);
__decorate([
    (0, typeorm_1.Column)('decimal', { precision: 10, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], AffiliateUser.prototype, "pendingCommission", void 0);
__decorate([
    (0, typeorm_1.Column)('decimal', { precision: 5, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], AffiliateUser.prototype, "commissionRate", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ['bank', 'point'],
        default: 'bank'
    }),
    __metadata("design:type", String)
], AffiliateUser.prototype, "paymentMethod", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], AffiliateUser.prototype, "bankName", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], AffiliateUser.prototype, "accountNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], AffiliateUser.prototype, "accountHolder", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], AffiliateUser.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], AffiliateUser.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => ReferralRelationship_1.ReferralRelationship, relationship => relationship.referrer),
    __metadata("design:type", Array)
], AffiliateUser.prototype, "referrals", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => AffiliateCommission_1.AffiliateCommission, commission => commission.affiliateUser),
    __metadata("design:type", Array)
], AffiliateUser.prototype, "commissions", void 0);
exports.AffiliateUser = AffiliateUser = __decorate([
    (0, typeorm_1.Entity)('affiliate_users'),
    (0, typeorm_1.Index)(['userId'], { unique: true }),
    (0, typeorm_1.Index)(['affiliateCode'], { unique: true }),
    (0, typeorm_1.Index)(['status'])
], AffiliateUser);
//# sourceMappingURL=AffiliateUser.js.map