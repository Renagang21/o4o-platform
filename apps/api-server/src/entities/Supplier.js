var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToOne, OneToMany, JoinColumn, Index } from 'typeorm';
import { BusinessInfo } from './BusinessInfo.js';
export var SupplierStatus;
(function (SupplierStatus) {
    SupplierStatus["PENDING"] = "pending";
    SupplierStatus["APPROVED"] = "approved";
    SupplierStatus["SUSPENDED"] = "suspended";
    SupplierStatus["REJECTED"] = "rejected";
})(SupplierStatus || (SupplierStatus = {}));
export var SupplierTier;
(function (SupplierTier) {
    SupplierTier["BASIC"] = "basic";
    SupplierTier["PREMIUM"] = "premium";
    SupplierTier["ENTERPRISE"] = "enterprise";
})(SupplierTier || (SupplierTier = {}));
let Supplier = class Supplier {
    id;
    // User relationship (One-to-One)
    userId;
    user;
    // BusinessInfo relationship (One-to-One)
    businessInfo;
    // Products relationship (One-to-Many)
    products;
    // Supplier Status and Tier
    status;
    tier;
    isActive;
    // Supplier Specific Information
    companyDescription;
    specialties; // 전문 분야
    certifications; // 인증서
    website;
    // Pricing and Policies (문서 #66: 공급자가 판매자 등급별 할인율 설정)
    sellerTierDiscounts; // 판매자 등급별 할인율
    supplierPolicy;
    // Default Commission Settings (문서 #66: 공급자가 파트너 커미션 설정)
    defaultPartnerCommissionRate; // 기본 파트너 커미션 비율
    defaultPartnerCommissionAmount; // 기본 고정 커미션
    // Financial Information
    taxId;
    bankName;
    bankAccount;
    accountHolder;
    // Performance Metrics
    metrics;
    // Rating and Reviews
    averageRating;
    totalReviews;
    // Contact Information
    contactPerson;
    contactPhone;
    contactEmail;
    // Operational Information
    operatingHours; // ["09:00-18:00", "Monday-Friday"]
    timezone;
    shippingMethods;
    paymentMethods;
    // Additional Information
    foundedYear;
    employeeCount;
    socialMedia;
    metadata;
    // Timestamps
    createdAt;
    updatedAt;
    approvedAt;
    approvedBy;
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
__decorate([
    PrimaryGeneratedColumn('uuid'),
    __metadata("design:type", String)
], Supplier.prototype, "id", void 0);
__decorate([
    Column({ type: 'uuid', unique: true }),
    __metadata("design:type", String)
], Supplier.prototype, "userId", void 0);
__decorate([
    OneToOne('User', 'supplier', { onDelete: 'CASCADE' }),
    JoinColumn({ name: 'userId' }),
    __metadata("design:type", Function)
], Supplier.prototype, "user", void 0);
__decorate([
    OneToOne('BusinessInfo', { cascade: true }),
    JoinColumn(),
    __metadata("design:type", BusinessInfo)
], Supplier.prototype, "businessInfo", void 0);
__decorate([
    OneToMany('Product', 'supplier'),
    __metadata("design:type", Array)
], Supplier.prototype, "products", void 0);
__decorate([
    Column({ type: 'enum', enum: SupplierStatus, default: SupplierStatus.PENDING }),
    __metadata("design:type", String)
], Supplier.prototype, "status", void 0);
__decorate([
    Column({ type: 'enum', enum: SupplierTier, default: SupplierTier.BASIC }),
    __metadata("design:type", String)
], Supplier.prototype, "tier", void 0);
__decorate([
    Column({ type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], Supplier.prototype, "isActive", void 0);
__decorate([
    Column({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], Supplier.prototype, "companyDescription", void 0);
__decorate([
    Column({ type: 'simple-array', nullable: true }),
    __metadata("design:type", Array)
], Supplier.prototype, "specialties", void 0);
__decorate([
    Column({ type: 'simple-array', nullable: true }),
    __metadata("design:type", Array)
], Supplier.prototype, "certifications", void 0);
__decorate([
    Column({ type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", String)
], Supplier.prototype, "website", void 0);
__decorate([
    Column({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], Supplier.prototype, "sellerTierDiscounts", void 0);
__decorate([
    Column({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], Supplier.prototype, "supplierPolicy", void 0);
__decorate([
    Column({ type: 'decimal', precision: 5, scale: 2, default: 5.0 }),
    __metadata("design:type", Number)
], Supplier.prototype, "defaultPartnerCommissionRate", void 0);
__decorate([
    Column({ type: 'decimal', precision: 10, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], Supplier.prototype, "defaultPartnerCommissionAmount", void 0);
__decorate([
    Column({ type: 'varchar', length: 50, nullable: true }),
    __metadata("design:type", String)
], Supplier.prototype, "taxId", void 0);
__decorate([
    Column({ type: 'varchar', length: 100, nullable: true }),
    __metadata("design:type", String)
], Supplier.prototype, "bankName", void 0);
__decorate([
    Column({ type: 'varchar', length: 50, nullable: true }),
    __metadata("design:type", String)
], Supplier.prototype, "bankAccount", void 0);
__decorate([
    Column({ type: 'varchar', length: 100, nullable: true }),
    __metadata("design:type", String)
], Supplier.prototype, "accountHolder", void 0);
__decorate([
    Column({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], Supplier.prototype, "metrics", void 0);
__decorate([
    Column({ type: 'decimal', precision: 3, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], Supplier.prototype, "averageRating", void 0);
__decorate([
    Column({ type: 'integer', default: 0 }),
    __metadata("design:type", Number)
], Supplier.prototype, "totalReviews", void 0);
__decorate([
    Column({ type: 'varchar', length: 100, nullable: true }),
    __metadata("design:type", String)
], Supplier.prototype, "contactPerson", void 0);
__decorate([
    Column({ type: 'varchar', length: 20, nullable: true }),
    __metadata("design:type", String)
], Supplier.prototype, "contactPhone", void 0);
__decorate([
    Column({ type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", String)
], Supplier.prototype, "contactEmail", void 0);
__decorate([
    Column({ type: 'simple-array', nullable: true }),
    __metadata("design:type", Array)
], Supplier.prototype, "operatingHours", void 0);
__decorate([
    Column({ type: 'varchar', length: 10, nullable: true }),
    __metadata("design:type", String)
], Supplier.prototype, "timezone", void 0);
__decorate([
    Column({ type: 'simple-array', nullable: true }),
    __metadata("design:type", Array)
], Supplier.prototype, "shippingMethods", void 0);
__decorate([
    Column({ type: 'simple-array', nullable: true }),
    __metadata("design:type", Array)
], Supplier.prototype, "paymentMethods", void 0);
__decorate([
    Column({ type: 'integer', nullable: true }),
    __metadata("design:type", Number)
], Supplier.prototype, "foundedYear", void 0);
__decorate([
    Column({ type: 'integer', nullable: true }),
    __metadata("design:type", Number)
], Supplier.prototype, "employeeCount", void 0);
__decorate([
    Column({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], Supplier.prototype, "socialMedia", void 0);
__decorate([
    Column({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], Supplier.prototype, "metadata", void 0);
__decorate([
    CreateDateColumn(),
    __metadata("design:type", Date)
], Supplier.prototype, "createdAt", void 0);
__decorate([
    UpdateDateColumn(),
    __metadata("design:type", Date)
], Supplier.prototype, "updatedAt", void 0);
__decorate([
    Column({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], Supplier.prototype, "approvedAt", void 0);
__decorate([
    Column({ type: 'uuid', nullable: true }),
    __metadata("design:type", String)
], Supplier.prototype, "approvedBy", void 0);
Supplier = __decorate([
    Entity('suppliers'),
    Index(['userId'], { unique: true }),
    Index(['status', 'tier']),
    Index(['isActive', 'status'])
], Supplier);
export { Supplier };
