var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
export var ProductStatus;
(function (ProductStatus) {
    ProductStatus["DRAFT"] = "draft";
    ProductStatus["ACTIVE"] = "active";
    ProductStatus["INACTIVE"] = "inactive";
    ProductStatus["OUT_OF_STOCK"] = "out_of_stock";
    ProductStatus["DISCONTINUED"] = "discontinued";
})(ProductStatus || (ProductStatus = {}));
export var ProductType;
(function (ProductType) {
    ProductType["PHYSICAL"] = "physical";
    ProductType["DIGITAL"] = "digital";
    ProductType["SERVICE"] = "service";
    ProductType["SUBSCRIPTION"] = "subscription";
})(ProductType || (ProductType = {}));
let Product = class Product {
    id;
    // Supplier relationship
    supplierId;
    supplier;
    // Category relationship
    categoryId;
    category;
    // Basic Product Information
    name;
    description;
    shortDescription;
    sku;
    slug;
    // Product Type and Status
    type;
    status;
    isActive;
    // Pricing Information
    supplierPrice; // 공급가
    recommendedPrice; // 권장 판매가
    comparePrice; // 정가 (할인 비교용)
    currency;
    // Phase PD-2: Commission Policy (상품별 커미션 설정)
    // If not set, falls back to Seller's defaultCommissionRate, then global default (20%)
    commissionType;
    commissionValue; // For 'rate': 0-1 (e.g., 0.20 = 20%), For 'fixed': amount in KRW
    sellerCommissionRate; // Optional: Seller-specific override rate (0-100)
    platformCommissionRate; // Optional: Platform share (0-100) - for future use
    // Legacy: Kept for backward compatibility (문서 #66)
    partnerCommissionRate; // 파트너 커미션 비율 (%)
    partnerCommissionAmount; // 고정 커미션 금액
    // Inventory Management
    inventory;
    lowStockThreshold;
    trackInventory;
    allowBackorder;
    // Product Media
    images;
    tags;
    // Product Variants (사이즈, 색상 등)
    variants;
    hasVariants;
    // Physical Product Information
    dimensions;
    shipping;
    // SEO and Marketing
    seo;
    features;
    specifications;
    // Supplier Tier Pricing (문서 #66: 판매자 등급별 공급가)
    tierPricing;
    // Additional Information
    brand;
    model;
    warranty;
    metadata;
    // Timestamps
    createdAt;
    updatedAt;
    publishedAt;
    // Helper Methods
    getCurrentPrice(sellerTier) {
        if (sellerTier && this.tierPricing?.[sellerTier]) {
            return this.tierPricing[sellerTier];
        }
        return this.supplierPrice;
    }
    /**
     * Get commission policy for this product
     * Phase PD-2: Returns commission type and value if set
     * Returns null if not set (will fallback to seller/global defaults)
     */
    getCommissionPolicy() {
        if (this.commissionType && this.commissionValue !== undefined && this.commissionValue !== null) {
            return {
                type: this.commissionType,
                value: this.commissionValue
            };
        }
        return null;
    }
    /**
     * Legacy method: Calculate partner commission (backward compatibility)
     */
    calculatePartnerCommission(salePrice) {
        if (this.partnerCommissionAmount) {
            return this.partnerCommissionAmount;
        }
        return (salePrice * this.partnerCommissionRate) / 100;
    }
    isInStock() {
        if (!this.trackInventory)
            return true;
        return this.inventory > 0;
    }
    isLowStock() {
        if (!this.trackInventory || !this.lowStockThreshold)
            return false;
        return this.inventory <= this.lowStockThreshold;
    }
    getMainImage() {
        return this.images?.main || null;
    }
    getGalleryImages() {
        return this.images?.gallery || [];
    }
    isPublished() {
        return this.status === ProductStatus.ACTIVE && !!this.publishedAt;
    }
    getDiscountPercentage() {
        if (!this.comparePrice || this.comparePrice <= this.recommendedPrice) {
            return 0;
        }
        return Math.round(((this.comparePrice - this.recommendedPrice) / this.comparePrice) * 100);
    }
    // Inventory Management Methods
    reduceInventory(quantity) {
        if (this.trackInventory) {
            this.inventory = Math.max(0, this.inventory - quantity);
        }
    }
    increaseInventory(quantity) {
        if (this.trackInventory) {
            this.inventory += quantity;
        }
    }
    canOrder(quantity) {
        if (!this.trackInventory)
            return true;
        if (this.allowBackorder)
            return true;
        return this.inventory >= quantity;
    }
};
__decorate([
    PrimaryGeneratedColumn('uuid'),
    __metadata("design:type", String)
], Product.prototype, "id", void 0);
__decorate([
    Column({ type: 'uuid' }),
    __metadata("design:type", String)
], Product.prototype, "supplierId", void 0);
__decorate([
    ManyToOne('Supplier', { onDelete: 'CASCADE' }),
    JoinColumn({ name: 'supplierId' }),
    __metadata("design:type", Function)
], Product.prototype, "supplier", void 0);
__decorate([
    Column({ type: 'uuid', nullable: true }),
    __metadata("design:type", String)
], Product.prototype, "categoryId", void 0);
__decorate([
    ManyToOne('Category', { nullable: true }),
    JoinColumn({ name: 'categoryId' }),
    __metadata("design:type", Function)
], Product.prototype, "category", void 0);
__decorate([
    Column({ type: 'varchar', length: 255 }),
    __metadata("design:type", String)
], Product.prototype, "name", void 0);
__decorate([
    Column({ type: 'text' }),
    __metadata("design:type", String)
], Product.prototype, "description", void 0);
__decorate([
    Column({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], Product.prototype, "shortDescription", void 0);
__decorate([
    Column({ type: 'varchar', length: 100, unique: true }),
    __metadata("design:type", String)
], Product.prototype, "sku", void 0);
__decorate([
    Column({ type: 'varchar', length: 255, unique: true }),
    __metadata("design:type", String)
], Product.prototype, "slug", void 0);
__decorate([
    Column({ type: 'enum', enum: ProductType, default: ProductType.PHYSICAL }),
    __metadata("design:type", String)
], Product.prototype, "type", void 0);
__decorate([
    Column({ type: 'enum', enum: ProductStatus, default: ProductStatus.DRAFT }),
    __metadata("design:type", String)
], Product.prototype, "status", void 0);
__decorate([
    Column({ type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], Product.prototype, "isActive", void 0);
__decorate([
    Column({ type: 'decimal', precision: 10, scale: 2 }),
    __metadata("design:type", Number)
], Product.prototype, "supplierPrice", void 0);
__decorate([
    Column({ type: 'decimal', precision: 10, scale: 2 }),
    __metadata("design:type", Number)
], Product.prototype, "recommendedPrice", void 0);
__decorate([
    Column({ type: 'decimal', precision: 10, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], Product.prototype, "comparePrice", void 0);
__decorate([
    Column({ type: 'varchar', length: 3, default: 'KRW' }),
    __metadata("design:type", String)
], Product.prototype, "currency", void 0);
__decorate([
    Column({ type: 'enum', enum: ['rate', 'fixed'], nullable: true }),
    __metadata("design:type", String)
], Product.prototype, "commissionType", void 0);
__decorate([
    Column({ type: 'decimal', precision: 10, scale: 4, nullable: true }),
    __metadata("design:type", Number)
], Product.prototype, "commissionValue", void 0);
__decorate([
    Column({ type: 'decimal', precision: 5, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], Product.prototype, "sellerCommissionRate", void 0);
__decorate([
    Column({ type: 'decimal', precision: 5, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], Product.prototype, "platformCommissionRate", void 0);
__decorate([
    Column({ type: 'decimal', precision: 5, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], Product.prototype, "partnerCommissionRate", void 0);
__decorate([
    Column({ type: 'decimal', precision: 10, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], Product.prototype, "partnerCommissionAmount", void 0);
__decorate([
    Column({ type: 'integer', default: 0 }),
    __metadata("design:type", Number)
], Product.prototype, "inventory", void 0);
__decorate([
    Column({ type: 'integer', nullable: true }),
    __metadata("design:type", Number)
], Product.prototype, "lowStockThreshold", void 0);
__decorate([
    Column({ type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], Product.prototype, "trackInventory", void 0);
__decorate([
    Column({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], Product.prototype, "allowBackorder", void 0);
__decorate([
    Column({ type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], Product.prototype, "images", void 0);
__decorate([
    Column({ type: 'simple-array', nullable: true }),
    __metadata("design:type", Array)
], Product.prototype, "tags", void 0);
__decorate([
    Column({ type: 'jsonb', nullable: true }),
    __metadata("design:type", Array)
], Product.prototype, "variants", void 0);
__decorate([
    Column({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], Product.prototype, "hasVariants", void 0);
__decorate([
    Column({ type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], Product.prototype, "dimensions", void 0);
__decorate([
    Column({ type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], Product.prototype, "shipping", void 0);
__decorate([
    Column({ type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], Product.prototype, "seo", void 0);
__decorate([
    Column({ type: 'simple-array', nullable: true }),
    __metadata("design:type", Array)
], Product.prototype, "features", void 0);
__decorate([
    Column({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], Product.prototype, "specifications", void 0);
__decorate([
    Column({ type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], Product.prototype, "tierPricing", void 0);
__decorate([
    Column({ type: 'varchar', length: 100, nullable: true }),
    __metadata("design:type", String)
], Product.prototype, "brand", void 0);
__decorate([
    Column({ type: 'varchar', length: 100, nullable: true }),
    __metadata("design:type", String)
], Product.prototype, "model", void 0);
__decorate([
    Column({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], Product.prototype, "warranty", void 0);
__decorate([
    Column({ type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], Product.prototype, "metadata", void 0);
__decorate([
    CreateDateColumn(),
    __metadata("design:type", Date)
], Product.prototype, "createdAt", void 0);
__decorate([
    UpdateDateColumn(),
    __metadata("design:type", Date)
], Product.prototype, "updatedAt", void 0);
__decorate([
    Column({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], Product.prototype, "publishedAt", void 0);
Product = __decorate([
    Entity('products'),
    Index(['supplierId', 'status']),
    Index(['categoryId', 'status']),
    Index(['sku'], { unique: true }),
    Index(['slug'], { unique: true }),
    Index(['status', 'createdAt'])
], Product);
export { Product };
