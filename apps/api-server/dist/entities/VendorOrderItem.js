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
exports.VendorOrderItem = void 0;
const typeorm_1 = require("typeorm");
const OrderItem_1 = require("./OrderItem");
const VendorProduct_1 = require("./VendorProduct");
let VendorOrderItem = class VendorOrderItem extends OrderItem_1.OrderItem {
    // Compatibility fields
    get cost() {
        return this.supplyPrice;
    }
    get vendorProfit() {
        return this.supplierProfit;
    }
    get platformCommission() {
        return this.adminCommission || 0;
    }
    get vendor() {
        return this.vendorId;
    }
};
exports.VendorOrderItem = VendorOrderItem;
__decorate([
    (0, typeorm_1.Column)('uuid'),
    __metadata("design:type", String)
], VendorOrderItem.prototype, "supplierId", void 0);
__decorate([
    (0, typeorm_1.Column)('decimal', { precision: 10, scale: 2 }),
    __metadata("design:type", Number)
], VendorOrderItem.prototype, "supplyPrice", void 0);
__decorate([
    (0, typeorm_1.Column)('decimal', { precision: 10, scale: 2 }),
    __metadata("design:type", Number)
], VendorOrderItem.prototype, "supplierProfit", void 0);
__decorate([
    (0, typeorm_1.Column)('decimal', { precision: 10, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], VendorOrderItem.prototype, "affiliateCommission", void 0);
__decorate([
    (0, typeorm_1.Column)('decimal', { precision: 10, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], VendorOrderItem.prototype, "adminCommission", void 0);
__decorate([
    (0, typeorm_1.Column)('uuid', { nullable: true }),
    __metadata("design:type", String)
], VendorOrderItem.prototype, "vendorId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => VendorProduct_1.VendorProduct),
    (0, typeorm_1.JoinColumn)({ name: 'productId' }),
    __metadata("design:type", VendorProduct_1.VendorProduct)
], VendorOrderItem.prototype, "vendorProduct", void 0);
exports.VendorOrderItem = VendorOrderItem = __decorate([
    (0, typeorm_1.Entity)('vendor_order_items')
], VendorOrderItem);
//# sourceMappingURL=VendorOrderItem.js.map