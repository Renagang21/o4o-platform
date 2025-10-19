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
exports.Seller = exports.SellerTier = exports.SellerStatus = void 0;
const typeorm_1 = require("typeorm");
const User_1 = require("./User");
const BusinessInfo_1 = require("./BusinessInfo");
var SellerStatus;
(function (SellerStatus) {
    SellerStatus["PENDING"] = "pending";
    SellerStatus["APPROVED"] = "approved";
    SellerStatus["SUSPENDED"] = "suspended";
    SellerStatus["REJECTED"] = "rejected";
})(SellerStatus || (exports.SellerStatus = SellerStatus = {}));
var SellerTier;
(function (SellerTier) {
    SellerTier["BRONZE"] = "bronze";
    SellerTier["SILVER"] = "silver";
    SellerTier["GOLD"] = "gold";
    SellerTier["PLATINUM"] = "platinum"; // 최우수 판매자
})(SellerTier || (exports.SellerTier = SellerTier = {}));
let Seller = class Seller {
    // Helper Methods
    isApproved() {
        return this.status === SellerStatus.APPROVED && this.isActive;
    }
    canSellProducts() {
        return this.isApproved();
    }
    // 판매자 등급별 혜택 (문서 #66: 공급자가 등급별 할인 제공)
    getSupplierDiscountEligibility() {
        switch (this.tier) {
            case SellerTier.BRONZE:
                return 0; // 할인 없음
            case SellerTier.SILVER:
                return 5; // 5% 할인 가능
            case SellerTier.GOLD:
                return 10; // 10% 할인 가능
            case SellerTier.PLATINUM:
                return 15; // 15% 할인 가능
            default:
                return 0;
        }
    }
    getMaxProducts() {
        switch (this.tier) {
            case SellerTier.BRONZE:
                return 50;
            case SellerTier.SILVER:
                return 200;
            case SellerTier.GOLD:
                return 500;
            case SellerTier.PLATINUM:
                return -1; // unlimited
            default:
                return 50;
        }
    }
    getPlatformCommissionRate() {
        switch (this.tier) {
            case SellerTier.BRONZE:
                return 5.0;
            case SellerTier.SILVER:
                return 4.0;
            case SellerTier.GOLD:
                return 3.0;
            case SellerTier.PLATINUM:
                return 2.0;
            default:
                return 5.0;
        }
    }
    // 판매자 등급 업그레이드 조건 확인
    checkTierUpgradeEligibility() {
        if (!this.metrics)
            return null;
        const { totalRevenue, totalOrders, averageOrderValue, customerSatisfaction, returnRate } = this.metrics;
        // Platinum 조건
        if (totalRevenue >= 100000000 && // 1억원
            totalOrders >= 1000 &&
            averageOrderValue >= 100000 && // 10만원
            customerSatisfaction >= 4.8 &&
            returnRate <= 2) {
            return SellerTier.PLATINUM;
        }
        // Gold 조건
        if (totalRevenue >= 50000000 && // 5천만원
            totalOrders >= 500 &&
            averageOrderValue >= 50000 && // 5만원
            customerSatisfaction >= 4.5 &&
            returnRate <= 5) {
            return SellerTier.GOLD;
        }
        // Silver 조건
        if (totalRevenue >= 10000000 && // 1천만원
            totalOrders >= 100 &&
            averageOrderValue >= 30000 && // 3만원
            customerSatisfaction >= 4.0 &&
            returnRate <= 10) {
            return SellerTier.SILVER;
        }
        return null;
    }
    // 메트릭 업데이트
    updateMetrics(metrics) {
        this.metrics = {
            ...this.metrics,
            ...metrics
        };
    }
    updateRating(newRating) {
        const totalRating = this.averageRating * this.totalReviews + newRating;
        this.totalReviews += 1;
        this.averageRating = totalRating / this.totalReviews;
    }
    // 수익 업데이트
    addRevenue(amount) {
        this.totalRevenue += amount;
        this.monthlyRevenue += amount;
    }
    // 상품 수 업데이트
    incrementProductCount() {
        this.productCount += 1;
        this.activeProductCount += 1;
    }
    decrementProductCount(isActive = true) {
        this.productCount = Math.max(0, this.productCount - 1);
        if (isActive) {
            this.activeProductCount = Math.max(0, this.activeProductCount - 1);
        }
    }
    // 판매자 상태 변경
    approve(approvedBy) {
        this.status = SellerStatus.APPROVED;
        this.approvedAt = new Date();
        this.approvedBy = approvedBy;
    }
    suspend() {
        this.status = SellerStatus.SUSPENDED;
        this.isActive = false;
    }
    reject() {
        this.status = SellerStatus.REJECTED;
        this.isActive = false;
    }
    reactivate() {
        if (this.status === SellerStatus.APPROVED) {
            this.isActive = true;
        }
    }
    // 등급 업그레이드
    upgradeTier(newTier) {
        this.tier = newTier;
        this.platformCommissionRate = this.getPlatformCommissionRate();
    }
    // 스토어 URL 생성
    getStoreUrl() {
        return `/store/${this.storeSlug}`;
    }
    // 활동 상태 업데이트
    updateLastActive() {
        this.lastActiveAt = new Date();
    }
};
exports.Seller = Seller;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Seller.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', unique: true }),
    __metadata("design:type", String)
], Seller.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.OneToOne)(() => User_1.User, user => user.seller, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'userId' }),
    __metadata("design:type", User_1.User)
], Seller.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.OneToOne)(() => BusinessInfo_1.BusinessInfo, { cascade: true }),
    (0, typeorm_1.JoinColumn)(),
    __metadata("design:type", BusinessInfo_1.BusinessInfo)
], Seller.prototype, "businessInfo", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: SellerStatus, default: SellerStatus.PENDING }),
    __metadata("design:type", String)
], Seller.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: SellerTier, default: SellerTier.BRONZE }),
    __metadata("design:type", String)
], Seller.prototype, "tier", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], Seller.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json' }),
    __metadata("design:type", Object)
], Seller.prototype, "branding", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, unique: true }),
    __metadata("design:type", String)
], Seller.prototype, "storeSlug", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], Seller.prototype, "policies", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], Seller.prototype, "metrics", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 3, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], Seller.prototype, "averageRating", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer', default: 0 }),
    __metadata("design:type", Number)
], Seller.prototype, "totalReviews", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 12, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], Seller.prototype, "totalRevenue", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 12, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], Seller.prototype, "monthlyRevenue", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 5, scale: 2, default: 2.5 }),
    __metadata("design:type", Number)
], Seller.prototype, "platformCommissionRate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer', default: 0 }),
    __metadata("design:type", Number)
], Seller.prototype, "productCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer', default: 0 }),
    __metadata("design:type", Number)
], Seller.prototype, "activeProductCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 4, scale: 1, nullable: true }),
    __metadata("design:type", Number)
], Seller.prototype, "responseTime", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 5, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], Seller.prototype, "customerSatisfactionRate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-array', nullable: true }),
    __metadata("design:type", Array)
], Seller.prototype, "operatingHours", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 10, nullable: true }),
    __metadata("design:type", String)
], Seller.prototype, "timezone", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-array', nullable: true }),
    __metadata("design:type", Array)
], Seller.prototype, "shippingMethods", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-array', nullable: true }),
    __metadata("design:type", Array)
], Seller.prototype, "paymentMethods", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], Seller.prototype, "featuredSeller", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], Seller.prototype, "featuredUntil", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-array', nullable: true }),
    __metadata("design:type", Array)
], Seller.prototype, "specialOffers", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], Seller.prototype, "socialMedia", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], Seller.prototype, "marketingDescription", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], Seller.prototype, "allowPartners", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], Seller.prototype, "partnerInviteMessage", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-array', nullable: true }),
    __metadata("design:type", Array)
], Seller.prototype, "partnerRequirements", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], Seller.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Seller.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], Seller.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], Seller.prototype, "approvedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', nullable: true }),
    __metadata("design:type", String)
], Seller.prototype, "approvedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], Seller.prototype, "lastActiveAt", void 0);
exports.Seller = Seller = __decorate([
    (0, typeorm_1.Entity)('sellers'),
    (0, typeorm_1.Index)(['userId'], { unique: true }),
    (0, typeorm_1.Index)(['status', 'tier']),
    (0, typeorm_1.Index)(['isActive', 'status']),
    (0, typeorm_1.Index)(['tier', 'averageRating'])
], Seller);
//# sourceMappingURL=Seller.js.map