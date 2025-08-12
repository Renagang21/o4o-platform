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
exports.VendorProduct = void 0;
const typeorm_1 = require("typeorm");
const User_1 = require("./User");
let VendorProduct = class VendorProduct {
    // 가상 필드들
    get supplierProfit() {
        const sellPrice = Number(this.sellPrice);
        const supplyPrice = Number(this.supplyPrice);
        const affiliateCommission = sellPrice * (Number(this.affiliateRate) / 100);
        const adminCommission = sellPrice * (Number(this.adminFeeRate) / 100);
        return sellPrice - supplyPrice - affiliateCommission - adminCommission;
    }
    get isLowStock() {
        return this.stock > 0 && this.stock <= this.lowStockThreshold;
    }
    get isOutOfStock() {
        return this.stock === 0;
    }
};
exports.VendorProduct = VendorProduct;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], VendorProduct.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], VendorProduct.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)('text', { nullable: true }),
    __metadata("design:type", String)
], VendorProduct.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], VendorProduct.prototype, "sku", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], VendorProduct.prototype, "categoryId", void 0);
__decorate([
    (0, typeorm_1.Column)('uuid'),
    __metadata("design:type", String)
], VendorProduct.prototype, "supplierId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_1.User),
    (0, typeorm_1.JoinColumn)({ name: 'supplierId' }),
    __metadata("design:type", User_1.User)
], VendorProduct.prototype, "supplier", void 0);
__decorate([
    (0, typeorm_1.Column)('decimal', { precision: 10, scale: 2 }),
    __metadata("design:type", Number)
], VendorProduct.prototype, "supplyPrice", void 0);
__decorate([
    (0, typeorm_1.Column)('decimal', { precision: 10, scale: 2 }),
    __metadata("design:type", Number)
], VendorProduct.prototype, "sellPrice", void 0);
__decorate([
    (0, typeorm_1.Column)('decimal', { precision: 5, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], VendorProduct.prototype, "marginRate", void 0);
__decorate([
    (0, typeorm_1.Column)('decimal', { precision: 5, scale: 2, default: 5 }),
    __metadata("design:type", Number)
], VendorProduct.prototype, "affiliateRate", void 0);
__decorate([
    (0, typeorm_1.Column)('decimal', { precision: 5, scale: 2, default: 3 }),
    __metadata("design:type", Number)
], VendorProduct.prototype, "adminFeeRate", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    }),
    __metadata("design:type", String)
], VendorProduct.prototype, "approvalStatus", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true }),
    __metadata("design:type", Boolean)
], VendorProduct.prototype, "approvalRequired", void 0);
__decorate([
    (0, typeorm_1.Column)('uuid', { nullable: true }),
    __metadata("design:type", String)
], VendorProduct.prototype, "approvedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Date)
], VendorProduct.prototype, "approvedAt", void 0);
__decorate([
    (0, typeorm_1.Column)('text', { nullable: true }),
    __metadata("design:type", String)
], VendorProduct.prototype, "rejectionReason", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 0 }),
    __metadata("design:type", Number)
], VendorProduct.prototype, "stock", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 10 }),
    __metadata("design:type", Number)
], VendorProduct.prototype, "lowStockThreshold", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ['draft', 'active', 'inactive', 'soldout'],
        default: 'draft'
    }),
    __metadata("design:type", String)
], VendorProduct.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)('json', { nullable: true }),
    __metadata("design:type", Array)
], VendorProduct.prototype, "images", void 0);
__decorate([
    (0, typeorm_1.Column)('json', { nullable: true }),
    __metadata("design:type", Object)
], VendorProduct.prototype, "options", void 0);
__decorate([
    (0, typeorm_1.Column)('simple-array', { nullable: true }),
    __metadata("design:type", Array)
], VendorProduct.prototype, "tags", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 0 }),
    __metadata("design:type", Number)
], VendorProduct.prototype, "totalSales", void 0);
__decorate([
    (0, typeorm_1.Column)('decimal', { precision: 12, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], VendorProduct.prototype, "totalRevenue", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], VendorProduct.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], VendorProduct.prototype, "updatedAt", void 0);
exports.VendorProduct = VendorProduct = __decorate([
    (0, typeorm_1.Entity)('vendor_products'),
    (0, typeorm_1.Index)(['supplierId']),
    (0, typeorm_1.Index)(['approvalStatus']),
    (0, typeorm_1.Index)(['status'])
], VendorProduct);
//# sourceMappingURL=VendorProduct.js.map