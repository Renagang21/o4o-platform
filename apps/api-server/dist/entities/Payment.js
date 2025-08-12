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
exports.Payment = exports.PaymentGatewayStatus = exports.PaymentProvider = exports.PaymentType = void 0;
const typeorm_1 = require("typeorm");
const Order_1 = require("./Order");
const User_1 = require("./User");
var PaymentType;
(function (PaymentType) {
    PaymentType["PAYMENT"] = "payment";
    PaymentType["REFUND"] = "refund";
    PaymentType["PARTIAL_REFUND"] = "partial_refund";
})(PaymentType || (exports.PaymentType = PaymentType = {}));
var PaymentProvider;
(function (PaymentProvider) {
    PaymentProvider["IAMPORT"] = "iamport";
    PaymentProvider["TOSS_PAYMENTS"] = "toss_payments";
    PaymentProvider["KAKAO_PAY"] = "kakao_pay";
    PaymentProvider["NAVER_PAY"] = "naver_pay";
    PaymentProvider["PAYPAL"] = "paypal";
    PaymentProvider["STRIPE"] = "stripe";
    PaymentProvider["MANUAL"] = "manual";
})(PaymentProvider || (exports.PaymentProvider = PaymentProvider = {}));
var PaymentGatewayStatus;
(function (PaymentGatewayStatus) {
    PaymentGatewayStatus["PENDING"] = "pending";
    PaymentGatewayStatus["PROCESSING"] = "processing";
    PaymentGatewayStatus["COMPLETED"] = "completed";
    PaymentGatewayStatus["FAILED"] = "failed";
    PaymentGatewayStatus["CANCELLED"] = "cancelled";
    PaymentGatewayStatus["EXPIRED"] = "expired";
    PaymentGatewayStatus["REFUNDED"] = "refunded";
    PaymentGatewayStatus["PARTIALLY_REFUNDED"] = "partially_refunded";
})(PaymentGatewayStatus || (exports.PaymentGatewayStatus = PaymentGatewayStatus = {}));
let Payment = class Payment {
    // 비즈니스 로직 메서드
    generateTransactionId() {
        const timestamp = Date.now().toString();
        const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        return `PAY${timestamp}${random}`;
    }
    isSuccessful() {
        return this.status === PaymentGatewayStatus.COMPLETED;
    }
    isFailed() {
        return [
            PaymentGatewayStatus.FAILED,
            PaymentGatewayStatus.CANCELLED,
            PaymentGatewayStatus.EXPIRED
        ].includes(this.status);
    }
    canRefund() {
        return this.type === PaymentType.PAYMENT &&
            this.status === PaymentGatewayStatus.COMPLETED;
    }
    getMaskedCardNumber() {
        var _a;
        if (!((_a = this.paymentDetails) === null || _a === void 0 ? void 0 : _a.cardNumber))
            return null;
        const card = this.paymentDetails.cardNumber;
        return card.replace(/(\d{4})\d{8}(\d{4})/, '$1********$2');
    }
    getMaskedAccountNumber() {
        var _a;
        if (!((_a = this.paymentDetails) === null || _a === void 0 ? void 0 : _a.accountNumber))
            return null;
        const account = this.paymentDetails.accountNumber;
        return account.replace(/(\d{3})\d+(\d{3})/, '$1***$2');
    }
};
exports.Payment = Payment;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Payment.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Payment.prototype, "orderId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Order_1.Order),
    (0, typeorm_1.JoinColumn)({ name: 'orderId' }),
    __metadata("design:type", Order_1.Order)
], Payment.prototype, "order", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Payment.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_1.User),
    (0, typeorm_1.JoinColumn)({ name: 'userId' }),
    __metadata("design:type", User_1.User)
], Payment.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: PaymentType,
        default: PaymentType.PAYMENT
    }),
    __metadata("design:type", String)
], Payment.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: PaymentProvider
    }),
    __metadata("design:type", String)
], Payment.prototype, "provider", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Payment.prototype, "method", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: PaymentGatewayStatus,
        default: PaymentGatewayStatus.PENDING
    }),
    __metadata("design:type", String)
], Payment.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2 }),
    __metadata("design:type", Number)
], Payment.prototype, "amount", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 3, default: 'KRW' }),
    __metadata("design:type", String)
], Payment.prototype, "currency", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    __metadata("design:type", String)
], Payment.prototype, "transactionId", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Payment.prototype, "gatewayTransactionId", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Payment.prototype, "gatewayPaymentId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], Payment.prototype, "paymentDetails", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], Payment.prototype, "gatewayResponse", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], Payment.prototype, "webhookData", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Payment.prototype, "failureReason", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Payment.prototype, "cancelReason", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Payment.prototype, "cancelledBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Date)
], Payment.prototype, "cancelledAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Payment.prototype, "originalPaymentId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], Payment.prototype, "refundReason", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Payment.prototype, "refundRequestedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Date)
], Payment.prototype, "refundRequestedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Date)
], Payment.prototype, "refundProcessedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], Payment.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Date)
], Payment.prototype, "paidAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, nullable: true, default: 0 }),
    __metadata("design:type", Number)
], Payment.prototype, "refundedAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Payment.prototype, "failureCode", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Payment.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], Payment.prototype, "updatedAt", void 0);
exports.Payment = Payment = __decorate([
    (0, typeorm_1.Entity)('payments')
], Payment);
//# sourceMappingURL=Payment.js.map