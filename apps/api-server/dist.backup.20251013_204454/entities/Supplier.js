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
exports.Supplier = exports.SupplierTier = exports.SupplierStatus = void 0;
const typeorm_1 = require("typeorm");
const User_1 = require("./User");
const BusinessInfo_1 = require("./BusinessInfo");
const Product_1 = require("./Product");
var SupplierStatus;
(function (SupplierStatus) {
    SupplierStatus["PENDING"] = "pending";
    SupplierStatus["APPROVED"] = "approved";
    SupplierStatus["SUSPENDED"] = "suspended";
    SupplierStatus["REJECTED"] = "rejected";
})(SupplierStatus || (exports.SupplierStatus = SupplierStatus = {}));
var SupplierTier;
(function (SupplierTier) {
    SupplierTier["BASIC"] = "basic";
    SupplierTier["PREMIUM"] = "premium";
    SupplierTier["ENTERPRISE"] = "enterprise";
})(SupplierTier || (exports.SupplierTier = SupplierTier = {}));
let Supplier = class Supplier {
    // Helper Methods
    isApproved() {
        return this.status === SupplierStatus.APPROVED && this.isActive;
    }
    canCreateProducts() {
        return this.isApproved();
    }
    // 판매자 등급별 할인가 계산 (문서 #66)
    getDiscountedPrice(originalPrice, sellerTier) {
        if (!this.sellerTierDiscounts)
            return originalPrice;
        const discountRate = this.sellerTierDiscounts[sellerTier] || 0;
        return originalPrice * (1 - discountRate / 100);
    }
    // 파트너 커미션 계산
    calculatePartnerCommission(salePrice, productCommissionRate) {
        const commissionRate = productCommissionRate || this.defaultPartnerCommissionRate;
        if (this.defaultPartnerCommissionAmount) {
            return this.defaultPartnerCommissionAmount;
        }
        return (salePrice * commissionRate) / 100;
    }
    // 공급업체 등급별 혜택
    getMaxProducts() {
        switch (this.tier) {
            case SupplierTier.BASIC:
                return 100;
            case SupplierTier.PREMIUM:
                return 1000;
            case SupplierTier.ENTERPRISE:
                return -1; // unlimited
            default:
                return 100;
        }
    }
    getCommissionRate() {
        switch (this.tier) {
            case SupplierTier.BASIC:
                return 3.0; // 플랫폼 수수료 3%
            case SupplierTier.PREMIUM:
                return 2.0; // 플랫폼 수수료 2%
            case SupplierTier.ENTERPRISE:
                return 1.0; // 플랫폼 수수료 1%
            default:
                return 3.0;
        }
    }
    updateMetrics(metrics) {
        this.metrics = {
            ...this.metrics,
            ...metrics
        };
    }
    updateRating(newRating) {
        const totalRating = this.averageRating * this.totalReviews + newRating;
        this.totalReviews += 1;
        this.averageRating = totalRating / this.totalReviews;
    }
    // 공급업체 상태 변경 메서드
    approve(approvedBy) {
        this.status = SupplierStatus.APPROVED;
        this.approvedAt = new Date();
        this.approvedBy = approvedBy;
    }
    suspend() {
        this.status = SupplierStatus.SUSPENDED;
        this.isActive = false;
    }
    reject() {
        this.status = SupplierStatus.REJECTED;
        this.isActive = false;
    }
    reactivate() {
        if (this.status === SupplierStatus.APPROVED) {
            this.isActive = true;
        }
    }
};
exports.Supplier = Supplier;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Supplier.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', unique: true }),
    __metadata("design:type", String)
], Supplier.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.OneToOne)(() => User_1.User, user => user.supplier, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'userId' }),
    __metadata("design:type", User_1.User)
], Supplier.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.OneToOne)(() => BusinessInfo_1.BusinessInfo, { cascade: true }),
    (0, typeorm_1.JoinColumn)(),
    __metadata("design:type", BusinessInfo_1.BusinessInfo)
], Supplier.prototype, "businessInfo", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => Product_1.Product, product => product.supplier),
    __metadata("design:type", Array)
], Supplier.prototype, "products", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: SupplierStatus, default: SupplierStatus.PENDING }),
    __metadata("design:type", String)
], Supplier.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: SupplierTier, default: SupplierTier.BASIC }),
    __metadata("design:type", String)
], Supplier.prototype, "tier", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], Supplier.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], Supplier.prototype, "companyDescription", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-array', nullable: true }),
    __metadata("design:type", Array)
], Supplier.prototype, "specialties", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-array', nullable: true }),
    __metadata("design:type", Array)
], Supplier.prototype, "certifications", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", String)
], Supplier.prototype, "website", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], Supplier.prototype, "sellerTierDiscounts", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], Supplier.prototype, "supplierPolicy", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 5, scale: 2, default: 5.0 }),
    __metadata("design:type", Number)
], Supplier.prototype, "defaultPartnerCommissionRate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], Supplier.prototype, "defaultPartnerCommissionAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 50, nullable: true }),
    __metadata("design:type", String)
], Supplier.prototype, "taxId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, nullable: true }),
    __metadata("design:type", String)
], Supplier.prototype, "bankName", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 50, nullable: true }),
    __metadata("design:type", String)
], Supplier.prototype, "bankAccount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, nullable: true }),
    __metadata("design:type", String)
], Supplier.prototype, "accountHolder", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], Supplier.prototype, "metrics", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 3, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], Supplier.prototype, "averageRating", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer', default: 0 }),
    __metadata("design:type", Number)
], Supplier.prototype, "totalReviews", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, nullable: true }),
    __metadata("design:type", String)
], Supplier.prototype, "contactPerson", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 20, nullable: true }),
    __metadata("design:type", String)
], Supplier.prototype, "contactPhone", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", String)
], Supplier.prototype, "contactEmail", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-array', nullable: true }),
    __metadata("design:type", Array)
], Supplier.prototype, "operatingHours", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 10, nullable: true }),
    __metadata("design:type", String)
], Supplier.prototype, "timezone", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-array', nullable: true }),
    __metadata("design:type", Array)
], Supplier.prototype, "shippingMethods", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-array', nullable: true }),
    __metadata("design:type", Array)
], Supplier.prototype, "paymentMethods", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer', nullable: true }),
    __metadata("design:type", Number)
], Supplier.prototype, "foundedYear", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer', nullable: true }),
    __metadata("design:type", Number)
], Supplier.prototype, "employeeCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], Supplier.prototype, "socialMedia", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], Supplier.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Supplier.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], Supplier.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], Supplier.prototype, "approvedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', nullable: true }),
    __metadata("design:type", String)
], Supplier.prototype, "approvedBy", void 0);
exports.Supplier = Supplier = __decorate([
    (0, typeorm_1.Entity)('suppliers'),
    (0, typeorm_1.Index)(['userId'], { unique: true }),
    (0, typeorm_1.Index)(['status', 'tier']),
    (0, typeorm_1.Index)(['isActive', 'status'])
], Supplier);
//# sourceMappingURL=Supplier.js.map