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
exports.SupplierInfo = void 0;
const typeorm_1 = require("typeorm");
const User_1 = require("./User");
let SupplierInfo = class SupplierInfo {
};
exports.SupplierInfo = SupplierInfo;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], SupplierInfo.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)('uuid', { unique: true }),
    __metadata("design:type", String)
], SupplierInfo.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.OneToOne)(() => User_1.User),
    (0, typeorm_1.JoinColumn)({ name: 'userId' }),
    __metadata("design:type", User_1.User)
], SupplierInfo.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], SupplierInfo.prototype, "businessName", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], SupplierInfo.prototype, "businessNumber", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], SupplierInfo.prototype, "contactName", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], SupplierInfo.prototype, "contactPhone", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], SupplierInfo.prototype, "contactEmail", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], SupplierInfo.prototype, "businessAddress", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], SupplierInfo.prototype, "businessType", void 0);
__decorate([
    (0, typeorm_1.Column)('simple-array', { nullable: true }),
    __metadata("design:type", Array)
], SupplierInfo.prototype, "mainProducts", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], SupplierInfo.prototype, "bankName", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], SupplierInfo.prototype, "bankAccount", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], SupplierInfo.prototype, "accountHolder", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ['pending', 'active', 'suspended'],
        default: 'pending'
    }),
    __metadata("design:type", String)
], SupplierInfo.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Date)
], SupplierInfo.prototype, "approvedAt", void 0);
__decorate([
    (0, typeorm_1.Column)('uuid', { nullable: true }),
    __metadata("design:type", String)
], SupplierInfo.prototype, "approvedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], SupplierInfo.prototype, "autoApproval", void 0);
__decorate([
    (0, typeorm_1.Column)('decimal', { precision: 5, scale: 2, nullable: true, default: 30 }),
    __metadata("design:type", Number)
], SupplierInfo.prototype, "preferredMarginRate", void 0);
__decorate([
    (0, typeorm_1.Column)('decimal', { precision: 5, scale: 2, nullable: true, default: 5 }),
    __metadata("design:type", Number)
], SupplierInfo.prototype, "preferredAffiliateRate", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], SupplierInfo.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], SupplierInfo.prototype, "updatedAt", void 0);
exports.SupplierInfo = SupplierInfo = __decorate([
    (0, typeorm_1.Entity)('supplier_info'),
    (0, typeorm_1.Index)(['userId'], { unique: true }),
    (0, typeorm_1.Index)(['status'])
], SupplierInfo);
//# sourceMappingURL=SupplierInfo.js.map