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
exports.CouponUsage = exports.Coupon = exports.CouponStatus = exports.CouponDiscountType = void 0;
const typeorm_1 = require("typeorm");
var CouponDiscountType;
(function (CouponDiscountType) {
    CouponDiscountType["PERCENT"] = "percent";
    CouponDiscountType["PERCENTAGE"] = "percentage";
    CouponDiscountType["FIXED_CART"] = "fixed_cart";
    CouponDiscountType["FIXED_PRODUCT"] = "fixed_product";
})(CouponDiscountType || (exports.CouponDiscountType = CouponDiscountType = {}));
var CouponStatus;
(function (CouponStatus) {
    CouponStatus["ACTIVE"] = "active";
    CouponStatus["INACTIVE"] = "inactive";
    CouponStatus["EXPIRED"] = "expired";
})(CouponStatus || (exports.CouponStatus = CouponStatus = {}));
let Coupon = class Coupon {
    // Compatibility properties for legacy code
    get isActive() {
        return this.status === CouponStatus.ACTIVE;
    }
    get usageLimit() {
        return this.usageLimitPerCoupon;
    }
    get usageCount() {
        return this.usedCount;
    }
    get minimumAmount() {
        return this.minOrderAmount || 0;
    }
    get maximumDiscount() {
        return this.maxDiscountAmount || 0;
    }
    // Validation methods
    isValid() {
        const now = new Date();
        if (this.status !== CouponStatus.ACTIVE) {
            return false;
        }
        if (this.validFrom && now < this.validFrom) {
            return false;
        }
        if (this.validUntil && now > this.validUntil) {
            return false;
        }
        if (this.usageLimitPerCoupon > 0 && this.usedCount >= this.usageLimitPerCoupon) {
            return false;
        }
        return true;
    }
    canBeUsedByCustomer(customerId, usageCount = 0) {
        if (!this.isValid()) {
            return false;
        }
        // Check customer restrictions
        if (this.customerIds && this.customerIds.length > 0) {
            if (!this.customerIds.includes(customerId)) {
                return false;
            }
        }
        // Check usage limit per customer
        if (this.usageLimitPerCustomer > 0 && usageCount >= this.usageLimitPerCustomer) {
            return false;
        }
        return true;
    }
    calculateDiscount(subtotal, productTotal) {
        let discount = 0;
        switch (this.discountType) {
            case CouponDiscountType.PERCENT:
                discount = (subtotal * this.discountValue) / 100;
                break;
            case CouponDiscountType.FIXED_CART:
                discount = this.discountValue;
                break;
            case CouponDiscountType.FIXED_PRODUCT:
                discount = productTotal ? this.discountValue : 0;
                break;
        }
        // Apply max discount limit
        if (this.maxDiscountAmount && discount > this.maxDiscountAmount) {
            discount = this.maxDiscountAmount;
        }
        // Ensure discount doesn't exceed subtotal
        if (discount > subtotal) {
            discount = subtotal;
        }
        return discount;
    }
};
exports.Coupon = Coupon;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Coupon.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    __metadata("design:type", String)
], Coupon.prototype, "code", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Coupon.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: CouponDiscountType,
        default: CouponDiscountType.PERCENT
    }),
    __metadata("design:type", String)
], Coupon.prototype, "discountType", void 0);
__decorate([
    (0, typeorm_1.Column)('decimal', { precision: 10, scale: 2 }),
    __metadata("design:type", Number)
], Coupon.prototype, "discountValue", void 0);
__decorate([
    (0, typeorm_1.Column)('decimal', { precision: 10, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], Coupon.prototype, "minOrderAmount", void 0);
__decorate([
    (0, typeorm_1.Column)('decimal', { precision: 10, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], Coupon.prototype, "maxDiscountAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], Coupon.prototype, "validFrom", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], Coupon.prototype, "validUntil", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 0 }),
    __metadata("design:type", Number)
], Coupon.prototype, "usageLimitPerCoupon", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 1 }),
    __metadata("design:type", Number)
], Coupon.prototype, "usageLimitPerCustomer", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 0 }),
    __metadata("design:type", Number)
], Coupon.prototype, "usedCount", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: CouponStatus,
        default: CouponStatus.ACTIVE
    }),
    __metadata("design:type", String)
], Coupon.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)('simple-array', { nullable: true }),
    __metadata("design:type", Array)
], Coupon.prototype, "productIds", void 0);
__decorate([
    (0, typeorm_1.Column)('simple-array', { nullable: true }),
    __metadata("design:type", Array)
], Coupon.prototype, "categoryIds", void 0);
__decorate([
    (0, typeorm_1.Column)('simple-array', { nullable: true }),
    __metadata("design:type", Array)
], Coupon.prototype, "excludeProductIds", void 0);
__decorate([
    (0, typeorm_1.Column)('simple-array', { nullable: true }),
    __metadata("design:type", Array)
], Coupon.prototype, "customerIds", void 0);
__decorate([
    (0, typeorm_1.Column)('simple-array', { nullable: true }),
    __metadata("design:type", Array)
], Coupon.prototype, "customerGroups", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], Coupon.prototype, "freeShipping", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], Coupon.prototype, "excludeSaleItems", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true }),
    __metadata("design:type", Boolean)
], Coupon.prototype, "individualUseOnly", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Coupon.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], Coupon.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => CouponUsage, usage => usage.coupon),
    __metadata("design:type", Array)
], Coupon.prototype, "usages", void 0);
exports.Coupon = Coupon = __decorate([
    (0, typeorm_1.Entity)('coupons'),
    (0, typeorm_1.Index)(['code'], { unique: true }),
    (0, typeorm_1.Index)(['status', 'validFrom', 'validUntil'])
], Coupon);
let CouponUsage = class CouponUsage {
};
exports.CouponUsage = CouponUsage;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], CouponUsage.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], CouponUsage.prototype, "couponId", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], CouponUsage.prototype, "customerId", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], CouponUsage.prototype, "orderId", void 0);
__decorate([
    (0, typeorm_1.Column)('decimal', { precision: 10, scale: 2 }),
    __metadata("design:type", Number)
], CouponUsage.prototype, "discountAmount", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], CouponUsage.prototype, "usedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], CouponUsage.prototype, "customerEmail", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], CouponUsage.prototype, "customerName", void 0);
exports.CouponUsage = CouponUsage = __decorate([
    (0, typeorm_1.Entity)('coupon_usage'),
    (0, typeorm_1.Index)(['couponId', 'customerId']),
    (0, typeorm_1.Index)(['orderId'])
], CouponUsage);
//# sourceMappingURL=Coupon.js.map