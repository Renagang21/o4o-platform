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
exports.ProductVariation = void 0;
const typeorm_1 = require("typeorm");
const Product_1 = require("./Product");
/**
 * 상품 변형 엔티티 (특정 속성 조합의 개별 SKU)
 * 예: "빨간색 + L 사이즈" 조합
 */
let ProductVariation = class ProductVariation {
    // Compatibility fields
    get price() {
        return this.retailPrice;
    }
    set price(value) {
        this.retailPrice = value;
    }
    get compareAtPrice() {
        return this.salePrice;
    }
    set compareAtPrice(value) {
        this.salePrice = value || 0;
    }
    get stock() {
        return this.stockQuantity;
    }
    set stock(value) {
        this.stockQuantity = value;
    }
    get isActive() {
        return this.status === 'active';
    }
    // Helper methods
    isInStock() {
        if (!this.manageStock)
            return true;
        return this.stockQuantity > 0;
    }
    isLowStock() {
        if (!this.manageStock || !this.lowStockThreshold)
            return false;
        return this.stockQuantity <= this.lowStockThreshold;
    }
    getPrice(role = 'customer') {
        switch (role) {
            case 'wholesale':
                return this.wholesalePrice || this.retailPrice;
            case 'affiliate':
                return this.affiliatePrice || this.retailPrice;
            default:
                return this.salePrice || this.retailPrice;
        }
    }
    getDisplayName() {
        var _a;
        return `${((_a = this.product) === null || _a === void 0 ? void 0 : _a.name) || ''} - ${this.attributeString}`;
    }
};
exports.ProductVariation = ProductVariation;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], ProductVariation.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], ProductVariation.prototype, "productId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Product_1.Product, product => product.variations, { onDelete: 'CASCADE' }),
    __metadata("design:type", Product_1.Product)
], ProductVariation.prototype, "product", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    __metadata("design:type", String)
], ProductVariation.prototype, "sku", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], ProductVariation.prototype, "barcode", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json' }),
    __metadata("design:type", Object)
], ProductVariation.prototype, "attributes", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 255 }),
    __metadata("design:type", String)
], ProductVariation.prototype, "attributeString", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], ProductVariation.prototype, "retailPrice", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], ProductVariation.prototype, "salePrice", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], ProductVariation.prototype, "wholesalePrice", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], ProductVariation.prototype, "affiliatePrice", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true }),
    __metadata("design:type", Boolean)
], ProductVariation.prototype, "manageStock", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 0 }),
    __metadata("design:type", Number)
], ProductVariation.prototype, "stockQuantity", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: ['in_stock', 'out_of_stock', 'on_backorder'], default: 'in_stock' }),
    __metadata("design:type", String)
], ProductVariation.prototype, "stockStatus", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Number)
], ProductVariation.prototype, "lowStockThreshold", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 8, scale: 3, nullable: true }),
    __metadata("design:type", Number)
], ProductVariation.prototype, "weight", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], ProductVariation.prototype, "dimensions", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Array)
], ProductVariation.prototype, "images", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], ProductVariation.prototype, "imageUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: ['active', 'inactive', 'discontinued'], default: 'active' }),
    __metadata("design:type", String)
], ProductVariation.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true }),
    __metadata("design:type", Boolean)
], ProductVariation.prototype, "enabled", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 0 }),
    __metadata("design:type", Number)
], ProductVariation.prototype, "position", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], ProductVariation.prototype, "lowStockAlert", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], ProductVariation.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], ProductVariation.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], ProductVariation.prototype, "updatedAt", void 0);
exports.ProductVariation = ProductVariation = __decorate([
    (0, typeorm_1.Entity)('product_variations'),
    (0, typeorm_1.Unique)(['productId', 'sku']),
    (0, typeorm_1.Index)(['productId', 'status'])
], ProductVariation);
//# sourceMappingURL=ProductVariation.js.map