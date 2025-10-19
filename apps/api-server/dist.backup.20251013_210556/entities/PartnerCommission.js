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
exports.PartnerCommission = exports.CommissionType = exports.CommissionStatus = void 0;
const typeorm_1 = require("typeorm");
const Partner_1 = require("./Partner");
const Product_1 = require("./Product");
const Seller_1 = require("./Seller");
const Order_1 = require("./Order");
var CommissionStatus;
(function (CommissionStatus) {
    CommissionStatus["PENDING"] = "pending";
    CommissionStatus["CONFIRMED"] = "confirmed";
    CommissionStatus["PAID"] = "paid";
    CommissionStatus["CANCELLED"] = "cancelled";
    CommissionStatus["DISPUTED"] = "disputed"; // 분쟁 상태
})(CommissionStatus || (exports.CommissionStatus = CommissionStatus = {}));
var CommissionType;
(function (CommissionType) {
    CommissionType["SALE"] = "sale";
    CommissionType["BONUS"] = "bonus";
    CommissionType["REFERRAL"] = "referral";
    CommissionType["TIER_BONUS"] = "tier_bonus"; // 등급 보너스
})(CommissionType || (exports.CommissionType = CommissionType = {}));
let PartnerCommission = class PartnerCommission {
    // Helper Methods
    // 커미션 계산 (문서 #66: 공급자가 설정한 단일 비율)
    static calculateCommission(productPrice, quantity, commissionRate) {
        const orderAmount = productPrice * quantity;
        const commission = (orderAmount * commissionRate) / 100;
        return {
            orderAmount: Math.round(orderAmount * 100) / 100,
            commission: Math.round(commission * 100) / 100
        };
    }
    // 커미션 상태 확인
    isPending() {
        return this.status === CommissionStatus.PENDING;
    }
    isConfirmed() {
        return this.status === CommissionStatus.CONFIRMED;
    }
    isPaid() {
        return this.status === CommissionStatus.PAID;
    }
    isCancelled() {
        return this.status === CommissionStatus.CANCELLED;
    }
    canConfirm() {
        return this.status === CommissionStatus.PENDING;
    }
    canPay() {
        return this.status === CommissionStatus.CONFIRMED;
    }
    canCancel() {
        return [CommissionStatus.PENDING, CommissionStatus.CONFIRMED].includes(this.status);
    }
    // 전환 시간 계산
    calculateConversionTime() {
        if (this.clickedAt && this.convertedAt) {
            const diffMs = this.convertedAt.getTime() - this.clickedAt.getTime();
            this.conversionTimeMinutes = Math.round(diffMs / (1000 * 60));
        }
    }
    // 커미션 확정 (반품 기간 경과 후)
    confirm() {
        if (this.canConfirm()) {
            this.status = CommissionStatus.CONFIRMED;
            this.confirmedAt = new Date();
        }
    }
    // 커미션 지급
    pay(payoutBatchId, paymentReference) {
        if (this.canPay()) {
            this.status = CommissionStatus.PAID;
            this.paidAt = new Date();
            this.payoutBatchId = payoutBatchId;
            this.paymentReference = paymentReference;
        }
    }
    // 커미션 취소
    cancel(reason) {
        if (this.canCancel()) {
            this.status = CommissionStatus.CANCELLED;
            this.cancellationReason = reason;
        }
    }
    // 분쟁 상태로 변경
    dispute(reason) {
        this.status = CommissionStatus.DISPUTED;
        this.notes = reason;
    }
    // 분쟁 해결
    resolveDispute(newStatus) {
        if (this.status === CommissionStatus.DISPUTED) {
            this.status = newStatus;
        }
    }
    // 커미션 요약 정보
    getSummary() {
        var _a;
        return {
            orderId: this.orderId,
            productName: ((_a = this.product) === null || _a === void 0 ? void 0 : _a.name) || 'Unknown Product',
            orderAmount: this.orderAmount,
            commissionRate: this.commissionRate,
            totalCommission: this.commissionAmount,
            status: this.status,
            createdAt: this.createdAt
        };
    }
    // 성과 지표 계산
    getPerformanceMetrics() {
        return {
            conversionTime: this.conversionTimeMinutes,
            commissionPercentage: (this.commissionAmount / this.orderAmount) * 100,
            effectiveRate: this.commissionRate
        };
    }
    // 월별 집계를 위한 메서드
    getMonthKey() {
        return `${this.createdAt.getFullYear()}-${String(this.createdAt.getMonth() + 1).padStart(2, '0')}`;
    }
    // 주간 집계를 위한 메서드
    getWeekKey() {
        const startOfYear = new Date(this.createdAt.getFullYear(), 0, 1);
        const weekNumber = Math.ceil(((this.createdAt.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);
        return `${this.createdAt.getFullYear()}-W${String(weekNumber).padStart(2, '0')}`;
    }
    // 커미션 내역 검증
    validate() {
        const errors = [];
        if (this.orderAmount <= 0) {
            errors.push('Order amount must be positive');
        }
        if (this.productPrice <= 0) {
            errors.push('Product price must be positive');
        }
        if (this.quantity <= 0) {
            errors.push('Quantity must be positive');
        }
        if (this.commissionRate < 0 || this.commissionRate > 100) {
            errors.push('Commission rate must be between 0 and 100');
        }
        if (this.commissionAmount < 0) {
            errors.push('Commission amount cannot be negative');
        }
        if (this.productPrice * this.quantity !== this.orderAmount) {
            errors.push('Order amount does not match product price * quantity');
        }
        return {
            isValid: errors.length === 0,
            errors
        };
    }
};
exports.PartnerCommission = PartnerCommission;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], PartnerCommission.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], PartnerCommission.prototype, "partnerId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Partner_1.Partner, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'partnerId' }),
    __metadata("design:type", Partner_1.Partner)
], PartnerCommission.prototype, "partner", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], PartnerCommission.prototype, "orderId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Order_1.Order, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'orderId' }),
    __metadata("design:type", Order_1.Order)
], PartnerCommission.prototype, "order", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], PartnerCommission.prototype, "productId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Product_1.Product, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'productId' }),
    __metadata("design:type", Product_1.Product)
], PartnerCommission.prototype, "product", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], PartnerCommission.prototype, "sellerId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Seller_1.Seller, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'sellerId' }),
    __metadata("design:type", Seller_1.Seller)
], PartnerCommission.prototype, "seller", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: CommissionType, default: CommissionType.SALE }),
    __metadata("design:type", String)
], PartnerCommission.prototype, "commissionType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: CommissionStatus, default: CommissionStatus.PENDING }),
    __metadata("design:type", String)
], PartnerCommission.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2 }),
    __metadata("design:type", Number)
], PartnerCommission.prototype, "orderAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2 }),
    __metadata("design:type", Number)
], PartnerCommission.prototype, "productPrice", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer' }),
    __metadata("design:type", Number)
], PartnerCommission.prototype, "quantity", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 5, scale: 2 }),
    __metadata("design:type", Number)
], PartnerCommission.prototype, "commissionRate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2 }),
    __metadata("design:type", Number)
], PartnerCommission.prototype, "commissionAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 3, default: 'KRW' }),
    __metadata("design:type", String)
], PartnerCommission.prototype, "currency", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 20 }),
    __metadata("design:type", String)
], PartnerCommission.prototype, "referralCode", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], PartnerCommission.prototype, "referralSource", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, nullable: true }),
    __metadata("design:type", String)
], PartnerCommission.prototype, "campaign", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], PartnerCommission.prototype, "trackingData", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], PartnerCommission.prototype, "clickedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], PartnerCommission.prototype, "convertedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer', nullable: true }),
    __metadata("design:type", Number)
], PartnerCommission.prototype, "conversionTimeMinutes", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], PartnerCommission.prototype, "confirmedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], PartnerCommission.prototype, "paidAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', nullable: true }),
    __metadata("design:type", String)
], PartnerCommission.prototype, "payoutBatchId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], PartnerCommission.prototype, "paymentReference", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], PartnerCommission.prototype, "notes", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], PartnerCommission.prototype, "cancellationReason", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], PartnerCommission.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], PartnerCommission.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], PartnerCommission.prototype, "updatedAt", void 0);
exports.PartnerCommission = PartnerCommission = __decorate([
    (0, typeorm_1.Entity)('partner_commissions'),
    (0, typeorm_1.Index)(['partnerId', 'status']),
    (0, typeorm_1.Index)(['orderId']),
    (0, typeorm_1.Index)(['sellerId', 'status']),
    (0, typeorm_1.Index)(['status', 'createdAt']),
    (0, typeorm_1.Index)(['commissionType', 'status'])
], PartnerCommission);
//# sourceMappingURL=PartnerCommission.js.map