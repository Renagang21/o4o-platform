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
exports.PricePolicy = exports.UserRole = exports.DiscountType = exports.PricePolicyType = void 0;
const typeorm_1 = require("typeorm");
const Product_1 = require("./Product");
const User_1 = require("./User");
var PricePolicyType;
(function (PricePolicyType) {
    PricePolicyType["ROLE_BASED"] = "role_based";
    PricePolicyType["VOLUME_DISCOUNT"] = "volume_discount";
    PricePolicyType["SEASONAL"] = "seasonal";
    PricePolicyType["PROMOTION"] = "promotion";
    PricePolicyType["CUSTOMER_SPECIFIC"] = "customer_specific";
    PricePolicyType["REGION_BASED"] = "region_based"; // 지역별 가격
})(PricePolicyType || (exports.PricePolicyType = PricePolicyType = {}));
var DiscountType;
(function (DiscountType) {
    DiscountType["PERCENTAGE"] = "percentage";
    DiscountType["FIXED_AMOUNT"] = "fixed_amount";
    DiscountType["FIXED_PRICE"] = "fixed_price"; // 고정 가격
})(DiscountType || (exports.DiscountType = DiscountType = {}));
var UserRole;
(function (UserRole) {
    UserRole["CUSTOMER"] = "customer";
    UserRole["BUSINESS"] = "business";
    UserRole["AFFILIATE"] = "affiliate";
    UserRole["VIP"] = "vip";
    UserRole["WHOLESALE"] = "wholesale";
    UserRole["DISTRIBUTOR"] = "distributor";
})(UserRole || (exports.UserRole = UserRole = {}));
let PricePolicy = class PricePolicy {
    // 비즈니스 로직 메서드
    isValid(date = new Date()) {
        if (!this.isActive)
            return false;
        // 기간 확인
        if (this.startDate && date < this.startDate)
            return false;
        if (this.endDate && date > this.endDate)
            return false;
        // 요일 확인
        if (this.activeDays && this.activeDays.length > 0) {
            if (!this.activeDays.includes(date.getDay()))
                return false;
        }
        // 시간 확인
        if (this.startTime && this.endTime) {
            const currentTime = date.toTimeString().slice(0, 5);
            if (currentTime < this.startTime || currentTime > this.endTime)
                return false;
        }
        // 사용 횟수 확인
        if (this.maxUsageCount && this.currentUsageCount >= this.maxUsageCount) {
            return false;
        }
        return true;
    }
    canApplyToUser(userRole, userId) {
        if (this.targetRole && this.targetRole !== userRole)
            return false;
        if (this.targetUserId && this.targetUserId !== userId)
            return false;
        return true;
    }
    canApplyToProduct(productId, categories, tags) {
        // 특정 상품 지정된 경우
        if (this.productId && this.productId !== productId)
            return false;
        // 카테고리 확인
        if (this.productCategories && this.productCategories.length > 0) {
            if (!categories || !categories.some((cat) => this.productCategories.includes(cat))) {
                return false;
            }
        }
        // 태그 확인
        if (this.productTags && this.productTags.length > 0) {
            if (!tags || !tags.some((tag) => this.productTags.includes(tag))) {
                return false;
            }
        }
        return true;
    }
    canApplyToQuantity(quantity) {
        if (this.minQuantity && quantity < this.minQuantity)
            return false;
        if (this.maxQuantity && quantity > this.maxQuantity)
            return false;
        return true;
    }
    canApplyToOrderAmount(orderAmount) {
        if (this.minOrderAmount && orderAmount < this.minOrderAmount)
            return false;
        if (this.maxOrderAmount && orderAmount > this.maxOrderAmount)
            return false;
        return true;
    }
    calculateDiscountedPrice(originalPrice, quantity = 1) {
        let finalPrice = originalPrice;
        switch (this.discountType) {
            case DiscountType.PERCENTAGE:
                const discountAmount = originalPrice * (this.discountValue / 100);
                const cappedDiscount = this.maxDiscountAmount
                    ? Math.min(discountAmount, this.maxDiscountAmount)
                    : discountAmount;
                finalPrice = originalPrice - cappedDiscount;
                break;
            case DiscountType.FIXED_AMOUNT:
                finalPrice = originalPrice - this.discountValue;
                break;
            case DiscountType.FIXED_PRICE:
                finalPrice = this.discountValue;
                break;
        }
        // 최소 가격 확인
        if (this.minFinalPrice && finalPrice < this.minFinalPrice) {
            finalPrice = this.minFinalPrice;
        }
        return Math.max(0, finalPrice); // 음수 방지
    }
    getDiscountAmount(originalPrice, quantity = 1) {
        const discountedPrice = this.calculateDiscountedPrice(originalPrice, quantity);
        return originalPrice - discountedPrice;
    }
    incrementUsage() {
        this.currentUsageCount += 1;
    }
};
exports.PricePolicy = PricePolicy;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], PricePolicy.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], PricePolicy.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], PricePolicy.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: PricePolicyType
    }),
    __metadata("design:type", String)
], PricePolicy.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], PricePolicy.prototype, "productId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Product_1.Product, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'productId' }),
    __metadata("design:type", Product_1.Product)
], PricePolicy.prototype, "product", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Array)
], PricePolicy.prototype, "productCategories", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Array)
], PricePolicy.prototype, "productTags", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: UserRole,
        nullable: true
    }),
    __metadata("design:type", String)
], PricePolicy.prototype, "targetRole", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], PricePolicy.prototype, "targetUserId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_1.User, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'targetUserId' }),
    __metadata("design:type", User_1.User)
], PricePolicy.prototype, "targetUser", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Number)
], PricePolicy.prototype, "minQuantity", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Number)
], PricePolicy.prototype, "maxQuantity", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], PricePolicy.prototype, "minOrderAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], PricePolicy.prototype, "maxOrderAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: DiscountType
    }),
    __metadata("design:type", String)
], PricePolicy.prototype, "discountType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2 }),
    __metadata("design:type", Number)
], PricePolicy.prototype, "discountValue", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], PricePolicy.prototype, "maxDiscountAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], PricePolicy.prototype, "minFinalPrice", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Date)
], PricePolicy.prototype, "startDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Date)
], PricePolicy.prototype, "endDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Array)
], PricePolicy.prototype, "activeDays", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], PricePolicy.prototype, "startTime", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], PricePolicy.prototype, "endTime", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Array)
], PricePolicy.prototype, "targetRegions", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Array)
], PricePolicy.prototype, "targetCities", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 1 }),
    __metadata("design:type", Number)
], PricePolicy.prototype, "priority", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true }),
    __metadata("design:type", Boolean)
], PricePolicy.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], PricePolicy.prototype, "isExclusive", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Number)
], PricePolicy.prototype, "maxUsageCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Number)
], PricePolicy.prototype, "maxUsagePerUser", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 0 }),
    __metadata("design:type", Number)
], PricePolicy.prototype, "currentUsageCount", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], PricePolicy.prototype, "createdBy", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_1.User),
    (0, typeorm_1.JoinColumn)({ name: 'createdBy' }),
    __metadata("design:type", User_1.User)
], PricePolicy.prototype, "creator", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], PricePolicy.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], PricePolicy.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], PricePolicy.prototype, "updatedAt", void 0);
exports.PricePolicy = PricePolicy = __decorate([
    (0, typeorm_1.Entity)('price_policies')
], PricePolicy);
//# sourceMappingURL=PricePolicy.js.map