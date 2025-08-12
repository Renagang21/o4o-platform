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
exports.AffiliateCommission = void 0;
const typeorm_1 = require("typeorm");
const AffiliateUser_1 = require("./AffiliateUser");
const Order_1 = require("./Order");
let AffiliateCommission = class AffiliateCommission {
};
exports.AffiliateCommission = AffiliateCommission;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], AffiliateCommission.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)('uuid'),
    __metadata("design:type", String)
], AffiliateCommission.prototype, "affiliateUserId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => AffiliateUser_1.AffiliateUser),
    (0, typeorm_1.JoinColumn)({ name: 'affiliateUserId' }),
    __metadata("design:type", AffiliateUser_1.AffiliateUser)
], AffiliateCommission.prototype, "affiliateUser", void 0);
__decorate([
    (0, typeorm_1.Column)('uuid'),
    __metadata("design:type", String)
], AffiliateCommission.prototype, "orderId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Order_1.Order),
    (0, typeorm_1.JoinColumn)({ name: 'orderId' }),
    __metadata("design:type", Order_1.Order)
], AffiliateCommission.prototype, "order", void 0);
__decorate([
    (0, typeorm_1.Column)('decimal', { precision: 12, scale: 2 }),
    __metadata("design:type", Number)
], AffiliateCommission.prototype, "orderAmount", void 0);
__decorate([
    (0, typeorm_1.Column)('decimal', { precision: 5, scale: 2 }),
    __metadata("design:type", Number)
], AffiliateCommission.prototype, "commissionRate", void 0);
__decorate([
    (0, typeorm_1.Column)('decimal', { precision: 10, scale: 2 }),
    __metadata("design:type", Number)
], AffiliateCommission.prototype, "commissionAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ['pending', 'approved', 'paid', 'cancelled'],
        default: 'pending'
    }),
    __metadata("design:type", String)
], AffiliateCommission.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], AffiliateCommission.prototype, "approvedAt", void 0);
__decorate([
    (0, typeorm_1.Column)('uuid', { nullable: true }),
    __metadata("design:type", String)
], AffiliateCommission.prototype, "approvedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], AffiliateCommission.prototype, "paidAt", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ['bank', 'point'],
        nullable: true
    }),
    __metadata("design:type", String)
], AffiliateCommission.prototype, "paymentMethod", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], AffiliateCommission.prototype, "paymentReference", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], AffiliateCommission.prototype, "cancelledAt", void 0);
__decorate([
    (0, typeorm_1.Column)('text', { nullable: true }),
    __metadata("design:type", String)
], AffiliateCommission.prototype, "cancelledReason", void 0);
__decorate([
    (0, typeorm_1.Column)('decimal', { precision: 10, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], AffiliateCommission.prototype, "adjustmentAmount", void 0);
__decorate([
    (0, typeorm_1.Column)('text', { nullable: true }),
    __metadata("design:type", String)
], AffiliateCommission.prototype, "adjustmentReason", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], AffiliateCommission.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], AffiliateCommission.prototype, "updatedAt", void 0);
exports.AffiliateCommission = AffiliateCommission = __decorate([
    (0, typeorm_1.Entity)('affiliate_commissions'),
    (0, typeorm_1.Index)(['affiliateUserId']),
    (0, typeorm_1.Index)(['status']),
    (0, typeorm_1.Index)(['createdAt'])
], AffiliateCommission);
//# sourceMappingURL=AffiliateCommission.js.map