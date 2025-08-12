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
exports.ProductAttributeValue = void 0;
const typeorm_1 = require("typeorm");
const ProductAttribute_1 = require("./ProductAttribute");
/**
 * 상품 속성 값 엔티티 (예: Red, Large, Cotton 등)
 */
let ProductAttributeValue = class ProductAttributeValue {
};
exports.ProductAttributeValue = ProductAttributeValue;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], ProductAttributeValue.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], ProductAttributeValue.prototype, "attributeId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => ProductAttribute_1.ProductAttribute, attribute => attribute.values, { onDelete: 'CASCADE' }),
    __metadata("design:type", ProductAttribute_1.ProductAttribute)
], ProductAttributeValue.prototype, "attribute", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 100 }),
    __metadata("design:type", String)
], ProductAttributeValue.prototype, "value", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 100 }),
    __metadata("design:type", String)
], ProductAttributeValue.prototype, "slug", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], ProductAttributeValue.prototype, "label", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], ProductAttributeValue.prototype, "colorCode", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], ProductAttributeValue.prototype, "imageUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], ProductAttributeValue.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 0 }),
    __metadata("design:type", Number)
], ProductAttributeValue.prototype, "position", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], ProductAttributeValue.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], ProductAttributeValue.prototype, "updatedAt", void 0);
exports.ProductAttributeValue = ProductAttributeValue = __decorate([
    (0, typeorm_1.Entity)('product_attribute_values'),
    (0, typeorm_1.Index)(['attributeId', 'value'], { unique: true })
], ProductAttributeValue);
//# sourceMappingURL=ProductAttributeValue.js.map