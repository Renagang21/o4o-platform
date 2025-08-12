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
exports.CartItem = void 0;
const typeorm_1 = require("typeorm");
const Cart_1 = require("./Cart");
const Product_1 = require("./Product");
let CartItem = class CartItem {
    // 비즈니스 로직 메서드
    getTotalPrice() {
        return this.price * this.quantity;
    }
};
exports.CartItem = CartItem;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], CartItem.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], CartItem.prototype, "cartId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Cart_1.Cart, cart => cart.items, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'cartId' }),
    __metadata("design:type", Cart_1.Cart)
], CartItem.prototype, "cart", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], CartItem.prototype, "productId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Product_1.Product),
    (0, typeorm_1.JoinColumn)({ name: 'productId' }),
    __metadata("design:type", Product_1.Product)
], CartItem.prototype, "product", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 1 }),
    __metadata("design:type", Number)
], CartItem.prototype, "quantity", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2 }),
    __metadata("design:type", Number)
], CartItem.prototype, "price", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], CartItem.prototype, "productSnapshot", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], CartItem.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], CartItem.prototype, "updatedAt", void 0);
exports.CartItem = CartItem = __decorate([
    (0, typeorm_1.Entity)('cart_items')
], CartItem);
//# sourceMappingURL=CartItem.js.map