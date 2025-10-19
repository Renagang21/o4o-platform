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
exports.SellerProduct = exports.SellerProductStatus = void 0;
const typeorm_1 = require("typeorm");
const Seller_1 = require("./Seller");
const Product_1 = require("./Product");
var SellerProductStatus;
(function (SellerProductStatus) {
    SellerProductStatus["ACTIVE"] = "active";
    SellerProductStatus["INACTIVE"] = "inactive";
    SellerProductStatus["OUT_OF_STOCK"] = "out_of_stock";
    SellerProductStatus["DISCONTINUED"] = "discontinued";
})(SellerProductStatus || (exports.SellerProductStatus = SellerProductStatus = {}));
let SellerProduct = class SellerProduct {
    // Helper Methods
    calculateProfit() {
        // 실제 이익 = 판매가 - 공급가 - 플랫폼 수수료 - 기타 비용
        const platformCommission = this.sellerPrice * 0.025; // 2.5% 플랫폼 수수료
        return this.sellerPrice - this.costPrice - platformCommission;
    }
    calculateProfitMargin() {
        if (this.sellerPrice === 0)
            return 0;
        return (this.calculateProfit() / this.sellerPrice) * 100;
    }
    updatePricing() {
        this.profit = this.calculateProfit();
        this.profitMargin = this.calculateProfitMargin();
    }
    getDiscountedPrice() {
        if (!this.discountRate || !this.isOnSale()) {
            return this.sellerPrice;
        }
        return this.sellerPrice * (1 - this.discountRate / 100);
    }
    isOnSale() {
        const now = new Date();
        return !!(this.discountRate &&
            this.discountRate > 0 &&
            this.saleStartDate &&
            this.saleEndDate &&
            now >= this.saleStartDate &&
            now <= this.saleEndDate);
    }
    getAvailableInventory() {
        var _a, _b, _c, _d;
        // 판매자별 재고가 있으면 그것을 사용, 없으면 상품 재고 사용
        const baseInventory = (_c = (_a = this.sellerInventory) !== null && _a !== void 0 ? _a : (_b = this.product) === null || _b === void 0 ? void 0 : _b.inventory) !== null && _c !== void 0 ? _c : 0;
        const reserved = (_d = this.reservedInventory) !== null && _d !== void 0 ? _d : 0;
        return Math.max(0, baseInventory - reserved);
    }
    canOrder(quantity) {
        if (!this.isActive || this.status !== SellerProductStatus.ACTIVE) {
            return false;
        }
        return this.getAvailableInventory() >= quantity;
    }
    recordSale(quantity, amount) {
        this.totalSold += quantity;
        this.totalRevenue += amount;
        this.lastSoldAt = new Date();
        // 재고 차감
        if (this.sellerInventory !== null) {
            this.sellerInventory = Math.max(0, this.sellerInventory - quantity);
        }
    }
    recordView() {
        this.viewCount += 1;
    }
    recordCartAdd() {
        this.cartAddCount += 1;
    }
    updateConversionRate() {
        if (this.viewCount > 0) {
            this.conversionRate = (this.totalSold / this.viewCount) * 100;
        }
    }
    updateRating(newRating) {
        const totalRating = this.averageRating * this.reviewCount + newRating;
        this.reviewCount += 1;
        this.averageRating = totalRating / this.reviewCount;
    }
    // 상태 변경 메서드
    activate() {
        this.status = SellerProductStatus.ACTIVE;
        this.isActive = true;
        if (!this.publishedAt) {
            this.publishedAt = new Date();
        }
    }
    deactivate() {
        this.status = SellerProductStatus.INACTIVE;
        this.isActive = false;
    }
    markOutOfStock() {
        this.status = SellerProductStatus.OUT_OF_STOCK;
    }
    discontinue() {
        this.status = SellerProductStatus.DISCONTINUED;
        this.isActive = false;
    }
    // 할인 설정
    setDiscount(rate, startDate, endDate) {
        this.discountRate = rate;
        this.saleStartDate = startDate;
        this.saleEndDate = endDate;
    }
    clearDiscount() {
        this.discountRate = null;
        this.saleStartDate = null;
        this.saleEndDate = null;
    }
    // 피처드 상품 설정
    setFeatured(until) {
        this.isFeatured = true;
        this.featuredUntil = until;
    }
    clearFeatured() {
        this.isFeatured = false;
        this.featuredUntil = null;
    }
    isFeaturedActive() {
        if (!this.isFeatured || !this.featuredUntil)
            return false;
        return new Date() <= this.featuredUntil;
    }
};
exports.SellerProduct = SellerProduct;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], SellerProduct.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], SellerProduct.prototype, "sellerId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Seller_1.Seller, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'sellerId' }),
    __metadata("design:type", Seller_1.Seller)
], SellerProduct.prototype, "seller", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], SellerProduct.prototype, "productId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Product_1.Product, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'productId' }),
    __metadata("design:type", Product_1.Product)
], SellerProduct.prototype, "product", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2 }),
    __metadata("design:type", Number)
], SellerProduct.prototype, "sellerPrice", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], SellerProduct.prototype, "comparePrice", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2 }),
    __metadata("design:type", Number)
], SellerProduct.prototype, "costPrice", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2 }),
    __metadata("design:type", Number)
], SellerProduct.prototype, "profit", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 5, scale: 2 }),
    __metadata("design:type", Number)
], SellerProduct.prototype, "profitMargin", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: SellerProductStatus, default: SellerProductStatus.ACTIVE }),
    __metadata("design:type", String)
], SellerProduct.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], SellerProduct.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], SellerProduct.prototype, "isVisible", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer', nullable: true }),
    __metadata("design:type", Number)
], SellerProduct.prototype, "sellerInventory", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer', nullable: true }),
    __metadata("design:type", Number)
], SellerProduct.prototype, "reservedInventory", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer', default: 0 }),
    __metadata("design:type", Number)
], SellerProduct.prototype, "totalSold", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 12, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], SellerProduct.prototype, "totalRevenue", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer', default: 0 }),
    __metadata("design:type", Number)
], SellerProduct.prototype, "viewCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer', default: 0 }),
    __metadata("design:type", Number)
], SellerProduct.prototype, "cartAddCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", String)
], SellerProduct.prototype, "sellerSku", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], SellerProduct.prototype, "sellerDescription", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-array', nullable: true }),
    __metadata("design:type", Array)
], SellerProduct.prototype, "sellerTags", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Array)
], SellerProduct.prototype, "sellerImages", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], SellerProduct.prototype, "isFeatured", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], SellerProduct.prototype, "featuredUntil", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 5, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], SellerProduct.prototype, "discountRate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], SellerProduct.prototype, "saleStartDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], SellerProduct.prototype, "saleEndDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", String)
], SellerProduct.prototype, "sellerSlug", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], SellerProduct.prototype, "seoMetadata", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 5, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], SellerProduct.prototype, "conversionRate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], SellerProduct.prototype, "averageOrderValue", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 3, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], SellerProduct.prototype, "averageRating", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer', default: 0 }),
    __metadata("design:type", Number)
], SellerProduct.prototype, "reviewCount", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], SellerProduct.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], SellerProduct.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], SellerProduct.prototype, "publishedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], SellerProduct.prototype, "lastSoldAt", void 0);
exports.SellerProduct = SellerProduct = __decorate([
    (0, typeorm_1.Entity)('seller_products'),
    (0, typeorm_1.Unique)(['sellerId', 'productId']),
    (0, typeorm_1.Index)(['sellerId', 'status']),
    (0, typeorm_1.Index)(['productId', 'status']),
    (0, typeorm_1.Index)(['status', 'isActive']),
    (0, typeorm_1.Index)(['sellerPrice', 'status'])
], SellerProduct);
//# sourceMappingURL=SellerProduct.js.map