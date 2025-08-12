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
exports.Product = exports.ProductType = exports.ProductStatus = void 0;
const typeorm_1 = require("typeorm");
const User_1 = require("./User");
const ProductAttribute_1 = require("./ProductAttribute");
const ProductVariation_1 = require("./ProductVariation");
var ProductStatus;
(function (ProductStatus) {
    ProductStatus["DRAFT"] = "draft";
    ProductStatus["ACTIVE"] = "active";
    ProductStatus["INACTIVE"] = "inactive";
    ProductStatus["OUT_OF_STOCK"] = "out_of_stock";
})(ProductStatus || (exports.ProductStatus = ProductStatus = {}));
var ProductType;
(function (ProductType) {
    ProductType["PHYSICAL"] = "physical";
    ProductType["DIGITAL"] = "digital";
    ProductType["SERVICE"] = "service";
})(ProductType || (exports.ProductType = ProductType = {}));
let Product = class Product {
    // Compatibility fields
    get price() {
        return this.retailPrice;
    }
    set price(value) {
        this.retailPrice = value;
    }
    get stock() {
        return this.stockQuantity;
    }
    set stock(value) {
        this.stockQuantity = value;
    }
    get isActive() {
        return this.status === ProductStatus.ACTIVE;
    }
    get category() {
        return this.categoryId;
    }
    get vendor() {
        return this.vendorId;
    }
    // 비즈니스 로직 메서드
    getPriceForUser(userRole) {
        switch (userRole) {
            case 'business':
                return this.wholesalePrice || this.retailPrice;
            case 'affiliate':
                return this.affiliatePrice || this.retailPrice;
            default:
                return this.retailPrice;
        }
    }
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
};
exports.Product = Product;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Product.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Product.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Product.prototype, "slug", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], Product.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], Product.prototype, "shortDescription", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Product.prototype, "sku", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2 }),
    __metadata("design:type", Number)
], Product.prototype, "retailPrice", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], Product.prototype, "wholesalePrice", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], Product.prototype, "affiliatePrice", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], Product.prototype, "salePrice", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], Product.prototype, "cost", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 0 }),
    __metadata("design:type", Number)
], Product.prototype, "stockQuantity", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], Product.prototype, "manageStock", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Number)
], Product.prototype, "lowStockThreshold", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 8, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], Product.prototype, "weight", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], Product.prototype, "dimensions", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ProductStatus,
        default: ProductStatus.DRAFT
    }),
    __metadata("design:type", String)
], Product.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ProductType,
        default: ProductType.PHYSICAL
    }),
    __metadata("design:type", String)
], Product.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true }),
    __metadata("design:type", Boolean)
], Product.prototype, "featured", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], Product.prototype, "requiresShipping", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Array)
], Product.prototype, "images", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Product.prototype, "featuredImage", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Product.prototype, "categoryId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Array)
], Product.prototype, "tags", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Product.prototype, "metaTitle", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], Product.prototype, "metaDescription", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Product.prototype, "createdBy", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_1.User),
    (0, typeorm_1.JoinColumn)({ name: 'createdBy' }),
    __metadata("design:type", User_1.User)
], Product.prototype, "creator", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Product.prototype, "vendorId", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Product.prototype, "supplierId", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Product.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], Product.prototype, "hasVariations", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => ProductAttribute_1.ProductAttribute, (attribute) => attribute.product, { cascade: true }),
    __metadata("design:type", Array)
], Product.prototype, "attributes", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => ProductVariation_1.ProductVariation, variation => variation.product, { cascade: true }),
    __metadata("design:type", Array)
], Product.prototype, "variations", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Array)
], Product.prototype, "reviews", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], Product.prototype, "compareAtPrice", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 3, scale: 2, nullable: true, default: 0 }),
    __metadata("design:type", Number)
], Product.prototype, "rating", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', nullable: true, default: 0 }),
    __metadata("design:type", Number)
], Product.prototype, "reviewCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', nullable: true, default: 0 }),
    __metadata("design:type", Number)
], Product.prototype, "salesCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Product.prototype, "brand", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], Product.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, default: 'visible' }),
    __metadata("design:type", String)
], Product.prototype, "visibility", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], Product.prototype, "shipping", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Product.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], Product.prototype, "updatedAt", void 0);
exports.Product = Product = __decorate([
    (0, typeorm_1.Entity)('products')
], Product);
//# sourceMappingURL=Product.js.map