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
exports.Cart = void 0;
const typeorm_1 = require("typeorm");
const User_1 = require("./User");
const CartItem_1 = require("./CartItem");
let Cart = class Cart {
    // Methods
    calculateSummary() {
        if (!this.items || this.items.length === 0) {
            return {
                subtotal: 0,
                discount: 0,
                shipping: 0,
                tax: 0,
                total: 0
            };
        }
        const subtotal = this.items.reduce((sum, item) => {
            return sum + (item.unitPrice * item.quantity);
        }, 0);
        // TODO: Implement proper discount, shipping, and tax calculation
        const discount = 0;
        const shipping = subtotal > 50000 ? 0 : 3000; // Free shipping over 50,000 KRW
        const tax = Math.round(subtotal * 0.1); // 10% tax
        const total = subtotal + shipping + tax - discount;
        return {
            subtotal,
            discount,
            shipping,
            tax,
            total
        };
    }
    updateSummary() {
        this.summary = this.calculateSummary();
    }
    getTotalItems() {
        if (!this.items)
            return 0;
        return this.items.reduce((sum, item) => sum + item.quantity, 0);
    }
    isEmpty() {
        return !this.items || this.items.length === 0;
    }
};
exports.Cart = Cart;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Cart.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)('uuid'),
    __metadata("design:type", String)
], Cart.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_1.User, { nullable: false }),
    (0, typeorm_1.JoinColumn)({ name: 'userId' }),
    __metadata("design:type", User_1.User)
], Cart.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => CartItem_1.CartItem, cartItem => cartItem.cart, { cascade: true }),
    __metadata("design:type", Array)
], Cart.prototype, "items", void 0);
__decorate([
    (0, typeorm_1.Column)('jsonb', { nullable: true }),
    __metadata("design:type", Object)
], Cart.prototype, "summary", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-array', nullable: true }),
    __metadata("design:type", Array)
], Cart.prototype, "coupons", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-array', nullable: true }),
    __metadata("design:type", Array)
], Cart.prototype, "discountCodes", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Cart.prototype, "sessionId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], Cart.prototype, "expiresAt", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Cart.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], Cart.prototype, "updatedAt", void 0);
exports.Cart = Cart = __decorate([
    (0, typeorm_1.Entity)('carts'),
    (0, typeorm_1.Index)(['userId'], { unique: true })
], Cart);
//# sourceMappingURL=Cart.js.map