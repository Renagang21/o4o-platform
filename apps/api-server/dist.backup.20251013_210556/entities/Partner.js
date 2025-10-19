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
exports.Partner = exports.PartnerTier = exports.PartnerStatus = void 0;
const typeorm_1 = require("typeorm");
const User_1 = require("./User");
const Seller_1 = require("./Seller");
var PartnerStatus;
(function (PartnerStatus) {
    PartnerStatus["PENDING"] = "pending";
    PartnerStatus["ACTIVE"] = "active";
    PartnerStatus["SUSPENDED"] = "suspended";
    PartnerStatus["REJECTED"] = "rejected";
})(PartnerStatus || (exports.PartnerStatus = PartnerStatus = {}));
var PartnerTier;
(function (PartnerTier) {
    PartnerTier["BRONZE"] = "bronze";
    PartnerTier["SILVER"] = "silver";
    PartnerTier["GOLD"] = "gold";
    PartnerTier["PLATINUM"] = "platinum";
})(PartnerTier || (exports.PartnerTier = PartnerTier = {}));
let Partner = class Partner {
    // Helper Methods
    isApproved() {
        return this.status === PartnerStatus.ACTIVE && this.isActive;
    }
    canPromote() {
        return this.isApproved();
    }
    // 추적 링크 생성 (문서 #66)
    generateReferralLink(productId, sellerId) {
        const baseUrl = process.env.FRONTEND_URL || 'https://o4o.co.kr';
        let link = `${baseUrl}?ref=${this.referralCode}`;
        if (productId) {
            link += `&product=${productId}`;
        }
        if (sellerId) {
            link += `&seller=${sellerId}`;
        }
        return link;
    }
    // 파트너 등급별 혜택
    getCommissionBonus() {
        switch (this.tier) {
            case PartnerTier.BRONZE:
                return 0; // 추가 보너스 없음
            case PartnerTier.SILVER:
                return 0.5; // 0.5% 추가
            case PartnerTier.GOLD:
                return 1.0; // 1% 추가
            case PartnerTier.PLATINUM:
                return 2.0; // 2% 추가
            default:
                return 0;
        }
    }
    getPayoutFrequency() {
        switch (this.tier) {
            case PartnerTier.BRONZE:
                return 'monthly';
            case PartnerTier.SILVER:
                return 'bi-weekly';
            case PartnerTier.GOLD:
                return 'weekly';
            case PartnerTier.PLATINUM:
                return 'on-demand';
            default:
                return 'monthly';
        }
    }
    // 등급 업그레이드 조건 확인
    checkTierUpgradeEligibility() {
        if (!this.metrics)
            return null;
        const { totalOrders, totalRevenue, conversionRate } = this.metrics;
        // Platinum 조건
        if (totalOrders >= 1000 && totalRevenue >= 50000000 && conversionRate >= 5.0) {
            return PartnerTier.PLATINUM;
        }
        // Gold 조건
        if (totalOrders >= 500 && totalRevenue >= 20000000 && conversionRate >= 4.0) {
            return PartnerTier.GOLD;
        }
        // Silver 조건
        if (totalOrders >= 100 && totalRevenue >= 5000000 && conversionRate >= 2.0) {
            return PartnerTier.SILVER;
        }
        return null;
    }
    // 성과 추적 업데이트
    recordClick() {
        this.totalClicks += 1;
        this.monthlyClicks += 1;
        this.updateConversionRate();
    }
    recordOrder(orderValue, commission) {
        var _a, _b;
        this.totalOrders += 1;
        this.monthlyOrders += 1;
        this.totalEarnings += commission;
        this.monthlyEarnings += commission;
        this.pendingBalance += commission;
        // 평균 주문 금액 업데이트
        this.averageOrderValue = (this.averageOrderValue * (this.totalOrders - 1) + orderValue) / this.totalOrders;
        this.updateConversionRate();
        this.updateMetrics({
            totalOrders: this.totalOrders,
            totalRevenue: (_b = (_a = this.metrics) === null || _a === void 0 ? void 0 : _a.totalRevenue) !== null && _b !== void 0 ? _b : 0 + orderValue,
            totalCommission: this.totalEarnings,
            averageOrderValue: this.averageOrderValue
        });
    }
    updateConversionRate() {
        if (this.totalClicks > 0) {
            this.conversionRate = (this.totalOrders / this.totalClicks) * 100;
        }
    }
    // 메트릭 업데이트
    updateMetrics(metrics) {
        this.metrics = {
            ...this.metrics,
            ...metrics
        };
    }
    // 출금 처리
    processPayout(amount) {
        if (amount > this.availableBalance || amount < this.minimumPayout) {
            return false;
        }
        this.availableBalance -= amount;
        this.paidOut += amount;
        this.lastPayoutAt = new Date();
        return true;
    }
    // 보류 금액을 출금 가능 금액으로 이동
    confirmPendingBalance() {
        this.availableBalance += this.pendingBalance;
        this.pendingBalance = 0;
    }
    // 월간 성과 리셋
    resetMonthlyMetrics() {
        this.monthlyClicks = 0;
        this.monthlyOrders = 0;
        this.monthlyEarnings = 0;
    }
    // 파트너 상태 변경
    approve(approvedBy) {
        this.status = PartnerStatus.ACTIVE;
        this.approvedAt = new Date();
        this.approvedBy = approvedBy;
    }
    suspend() {
        this.status = PartnerStatus.SUSPENDED;
        this.isActive = false;
    }
    reject(reason) {
        this.status = PartnerStatus.REJECTED;
        this.rejectionReason = reason;
        this.isActive = false;
    }
    reactivate() {
        if (this.status === PartnerStatus.ACTIVE) {
            this.isActive = true;
        }
    }
    // 등급 업그레이드
    upgradeTier(newTier) {
        this.tier = newTier;
    }
    // 활동 상태 업데이트
    updateLastActive() {
        this.lastActiveAt = new Date();
    }
};
exports.Partner = Partner;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Partner.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', unique: true }),
    __metadata("design:type", String)
], Partner.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.OneToOne)(() => User_1.User, user => user.partner, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'userId' }),
    __metadata("design:type", User_1.User)
], Partner.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], Partner.prototype, "sellerId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Seller_1.Seller, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'sellerId' }),
    __metadata("design:type", Seller_1.Seller)
], Partner.prototype, "seller", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: PartnerStatus, default: PartnerStatus.PENDING }),
    __metadata("design:type", String)
], Partner.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: PartnerTier, default: PartnerTier.BRONZE }),
    __metadata("design:type", String)
], Partner.prototype, "tier", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], Partner.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 20, unique: true }),
    __metadata("design:type", String)
], Partner.prototype, "referralCode", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 500 }),
    __metadata("design:type", String)
], Partner.prototype, "referralLink", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], Partner.prototype, "profile", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], Partner.prototype, "metrics", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 12, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], Partner.prototype, "totalEarnings", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 12, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], Partner.prototype, "availableBalance", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 12, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], Partner.prototype, "pendingBalance", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 12, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], Partner.prototype, "paidOut", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], Partner.prototype, "payoutInfo", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, default: 50000 }),
    __metadata("design:type", Number)
], Partner.prototype, "minimumPayout", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer', default: 0 }),
    __metadata("design:type", Number)
], Partner.prototype, "totalClicks", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer', default: 0 }),
    __metadata("design:type", Number)
], Partner.prototype, "totalOrders", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 5, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], Partner.prototype, "conversionRate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], Partner.prototype, "averageOrderValue", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer', default: 0 }),
    __metadata("design:type", Number)
], Partner.prototype, "monthlyClicks", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer', default: 0 }),
    __metadata("design:type", Number)
], Partner.prototype, "monthlyOrders", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 12, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], Partner.prototype, "monthlyEarnings", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], Partner.prototype, "applicationMessage", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], Partner.prototype, "rejectionReason", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-array', nullable: true }),
    __metadata("design:type", Array)
], Partner.prototype, "allowedPromotionTypes", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], Partner.prototype, "canUseProductImages", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], Partner.prototype, "canCreateCoupons", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], Partner.prototype, "emailNotifications", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], Partner.prototype, "smsNotifications", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 10, nullable: true }),
    __metadata("design:type", String)
], Partner.prototype, "preferredLanguage", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], Partner.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Partner.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], Partner.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], Partner.prototype, "approvedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', nullable: true }),
    __metadata("design:type", String)
], Partner.prototype, "approvedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], Partner.prototype, "lastActiveAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], Partner.prototype, "lastPayoutAt", void 0);
exports.Partner = Partner = __decorate([
    (0, typeorm_1.Entity)('partners'),
    (0, typeorm_1.Index)(['userId'], { unique: true }),
    (0, typeorm_1.Index)(['sellerId', 'status']),
    (0, typeorm_1.Index)(['referralCode'], { unique: true }),
    (0, typeorm_1.Index)(['status', 'tier']),
    (0, typeorm_1.Index)(['isActive', 'status'])
], Partner);
//# sourceMappingURL=Partner.js.map