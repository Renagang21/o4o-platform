"use strict";
/**
 * 토스페이먼츠 결제 서비스
 * https://docs.tosspayments.com/reference
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.tossPaymentsService = exports.TossPaymentsService = void 0;
const axios_1 = __importDefault(require("axios"));
const crypto_1 = __importDefault(require("crypto"));
const Order_1 = require("../entities/Order");
const Payment_1 = require("../entities/Payment");
const connection_1 = require("../database/connection");
const simpleLogger_1 = __importDefault(require("../utils/simpleLogger"));
class TossPaymentsService {
    constructor() {
        this.orderRepository = connection_1.AppDataSource.getRepository(Order_1.Order);
        this.paymentRepository = connection_1.AppDataSource.getRepository(Payment_1.Payment);
        // 환경변수에서 토스페이먼츠 설정 로드
        this.apiKey = process.env.TOSS_API_KEY || '';
        this.secretKey = process.env.TOSS_SECRET_KEY || '';
        this.clientKey = process.env.TOSS_CLIENT_KEY || '';
        this.webhookSecret = process.env.TOSS_WEBHOOK_SECRET || '';
        // 테스트/프로덕션 환경 구분
        this.baseUrl = process.env.NODE_ENV === 'production'
            ? 'https://api.tosspayments.com/v1'
            : 'https://api.tosspayments.com/v1';
        if (!this.secretKey) {
            simpleLogger_1.default.warn('TossPayments: Secret key not configured');
        }
    }
    /**
     * Basic Auth 헤더 생성
     */
    getAuthHeader() {
        const credentials = Buffer.from(`${this.secretKey}:`).toString('base64');
        return `Basic ${credentials}`;
    }
    /**
     * 결제 요청 생성
     */
    async createPayment(request) {
        try {
            // 주문 정보 저장
            const order = await this.orderRepository.findOne({
                where: { id: request.orderId }
            });
            if (!order) {
                throw new Error('주문을 찾을 수 없습니다');
            }
            // Payment 엔티티 생성
            const payment = this.paymentRepository.create({
                order: order,
                orderId: order.id,
                user: order.user,
                userId: order.userId,
                amount: request.amount,
                currency: 'KRW',
                status: Payment_1.PaymentGatewayStatus.PENDING,
                provider: Payment_1.PaymentProvider.TOSS_PAYMENTS,
                method: request.method || 'card',
                type: Payment_1.PaymentType.PAYMENT,
                transactionId: `toss_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                metadata: {
                    orderName: request.orderName,
                    customerName: request.customerName,
                    customerEmail: request.customerEmail
                }
            });
            await this.paymentRepository.save(payment);
            // 토스페이먼츠 결제 창 호출을 위한 정보 반환
            // 실제 결제창은 프론트엔드에서 SDK로 호출
            return {
                success: true,
                data: {
                    clientKey: this.clientKey,
                    orderId: request.orderId,
                    orderName: request.orderName,
                    amount: request.amount,
                    customerName: request.customerName,
                    customerEmail: request.customerEmail,
                    successUrl: request.successUrl,
                    failUrl: request.failUrl,
                    paymentId: payment.id
                }
            };
        }
        catch (error) {
            simpleLogger_1.default.error('TossPayments: Failed to create payment', error);
            throw error;
        }
    }
    /**
     * 결제 승인 (결제창에서 성공 후 호출)
     */
    async confirmPayment(confirm) {
        var _a, _b;
        try {
            const response = await axios_1.default.post(`${this.baseUrl}/payments/confirm`, {
                paymentKey: confirm.paymentKey,
                orderId: confirm.orderId,
                amount: confirm.amount
            }, {
                headers: {
                    'Authorization': this.getAuthHeader(),
                    'Content-Type': 'application/json'
                }
            });
            const paymentData = response.data;
            // Payment 정보 업데이트
            const payment = await this.paymentRepository.findOne({
                where: { orderId: confirm.orderId }
            });
            if (payment) {
                payment.transactionId = paymentData.paymentKey;
                payment.status = this.mapTossStatus(paymentData.status);
                payment.paidAt = new Date(paymentData.approvedAt);
                payment.metadata = {
                    ...payment.metadata,
                    tossData: paymentData
                };
                await this.paymentRepository.save(payment);
                // 주문 상태 업데이트
                await this.updateOrderStatus(confirm.orderId, 'paid');
            }
            simpleLogger_1.default.info(`Payment confirmed: ${confirm.orderId}`);
            return {
                success: true,
                data: paymentData
            };
        }
        catch (error) {
            simpleLogger_1.default.error('TossPayments: Payment confirmation failed', error);
            // 실패 정보 저장
            const payment = await this.paymentRepository.findOne({
                where: { orderId: confirm.orderId }
            });
            if (payment) {
                payment.status = Payment_1.PaymentGatewayStatus.FAILED;
                payment.failureReason = ((_b = (_a = error.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.message) || error.message;
                await this.paymentRepository.save(payment);
            }
            throw error;
        }
    }
    /**
     * 결제 취소
     */
    async cancelPayment(paymentKey, cancelReason, cancelAmount // 부분 취소 금액
    ) {
        try {
            const response = await axios_1.default.post(`${this.baseUrl}/payments/${paymentKey}/cancel`, {
                cancelReason,
                cancelAmount
            }, {
                headers: {
                    'Authorization': this.getAuthHeader(),
                    'Content-Type': 'application/json'
                }
            });
            const cancelData = response.data;
            // Payment 정보 업데이트
            const payment = await this.paymentRepository.findOne({
                where: { transactionId: paymentKey }
            });
            if (payment) {
                payment.status = cancelAmount && cancelAmount < payment.amount
                    ? Payment_1.PaymentGatewayStatus.PARTIALLY_REFUNDED
                    : Payment_1.PaymentGatewayStatus.REFUNDED;
                payment.refundedAmount = (payment.refundedAmount || 0) + (cancelAmount || payment.amount);
                payment.metadata = {
                    ...payment.metadata,
                    lastCancel: {
                        reason: cancelReason,
                        amount: cancelAmount,
                        canceledAt: new Date().toISOString()
                    }
                };
                await this.paymentRepository.save(payment);
                // 주문 상태 업데이트
                if (payment.status === 'refunded') {
                    await this.updateOrderStatus(payment.orderId, 'cancelled');
                }
            }
            simpleLogger_1.default.info(`Payment cancelled: ${paymentKey}`);
            return {
                success: true,
                data: cancelData
            };
        }
        catch (error) {
            simpleLogger_1.default.error('TossPayments: Payment cancellation failed', error);
            throw error;
        }
    }
    /**
     * 결제 조회
     */
    async getPayment(paymentKeyOrOrderId) {
        try {
            const response = await axios_1.default.get(`${this.baseUrl}/payments/${paymentKeyOrOrderId}`, {
                headers: {
                    'Authorization': this.getAuthHeader()
                }
            });
            return {
                success: true,
                data: response.data
            };
        }
        catch (error) {
            simpleLogger_1.default.error('TossPayments: Failed to get payment', error);
            throw error;
        }
    }
    /**
     * 웹훅 검증 및 처리
     */
    async handleWebhook(signature, timestamp, body) {
        try {
            // 서명 검증
            if (!this.verifyWebhookSignature(signature, timestamp, body)) {
                throw new Error('Invalid webhook signature');
            }
            const { eventType, data } = body;
            simpleLogger_1.default.info(`TossPayments webhook: ${eventType}`, { orderId: data.orderId });
            switch (eventType) {
                case 'PAYMENT_STATUS_CHANGED':
                    await this.handlePaymentStatusChange(data);
                    break;
                case 'PAYMENT_DONE':
                    await this.handlePaymentComplete(data);
                    break;
                case 'PAYMENT_FAILED':
                    await this.handlePaymentFailed(data);
                    break;
                case 'PAYMENT_CANCELED':
                    await this.handlePaymentCanceled(data);
                    break;
                case 'VIRTUAL_ACCOUNT_DEPOSIT':
                    await this.handleVirtualAccountDeposit(data);
                    break;
                default:
                    simpleLogger_1.default.warn(`Unhandled webhook event: ${eventType}`);
            }
        }
        catch (error) {
            simpleLogger_1.default.error('TossPayments: Webhook processing failed', error);
            throw error;
        }
    }
    /**
     * 웹훅 서명 검증
     */
    verifyWebhookSignature(signature, timestamp, body) {
        if (!this.webhookSecret) {
            simpleLogger_1.default.warn('Webhook secret not configured, skipping verification');
            return true; // 개발 환경에서는 스킵
        }
        const message = `${timestamp}.${JSON.stringify(body)}`;
        const expectedSignature = crypto_1.default
            .createHmac('sha256', this.webhookSecret)
            .update(message)
            .digest('base64');
        return signature === expectedSignature;
    }
    /**
     * 결제 상태 변경 처리
     */
    async handlePaymentStatusChange(data) {
        const payment = await this.paymentRepository.findOne({
            where: { transactionId: data.paymentKey }
        });
        if (!payment) {
            simpleLogger_1.default.warn(`Payment not found for key: ${data.paymentKey}`);
            return;
        }
        payment.status = this.mapTossStatus(data.status);
        payment.metadata = {
            ...payment.metadata,
            lastWebhook: {
                status: data.status,
                timestamp: new Date()
            }
        };
        await this.paymentRepository.save(payment);
        // 주문 상태 업데이트
        if (data.status === 'DONE') {
            await this.updateOrderStatus(payment.orderId, 'paid');
        }
        else if (data.status === 'CANCELED' || data.status === 'FAILED') {
            await this.updateOrderStatus(payment.orderId, 'failed');
        }
    }
    /**
     * 결제 완료 처리
     */
    async handlePaymentComplete(data) {
        var _a;
        const payment = await this.paymentRepository.findOne({
            where: { orderId: data.orderId }
        });
        if (!payment) {
            // 새 결제 정보 생성 (웹훅이 먼저 도착한 경우)
            const order = await this.orderRepository.findOne({
                where: { id: data.orderId },
                relations: ['user']
            });
            if (!order) {
                throw new Error('Order not found for payment webhook');
            }
            const newPayment = this.paymentRepository.create({
                order: order,
                orderId: data.orderId,
                user: order.user,
                userId: order.userId,
                transactionId: data.paymentKey,
                amount: data.amount,
                currency: 'KRW',
                status: Payment_1.PaymentGatewayStatus.COMPLETED,
                provider: Payment_1.PaymentProvider.TOSS_PAYMENTS,
                method: data.method,
                type: Payment_1.PaymentType.PAYMENT,
                paidAt: new Date(data.approvedAt),
                metadata: {
                    tossData: data
                }
            });
            await this.paymentRepository.save(newPayment);
        }
        else {
            payment.status = Payment_1.PaymentGatewayStatus.COMPLETED;
            payment.transactionId = data.paymentKey;
            payment.paidAt = new Date(data.approvedAt);
            payment.metadata = {
                ...payment.metadata,
                tossData: data
            };
            await this.paymentRepository.save(payment);
        }
        // 주문 상태를 'processing'으로 변경
        await this.updateOrderStatus(data.orderId, 'processing');
        // 재고 차감
        await this.deductInventory(data.orderId);
        // 영수증 URL 저장
        if ((_a = data.receipt) === null || _a === void 0 ? void 0 : _a.url) {
            await this.saveReceiptUrl(data.orderId, data.receipt.url);
        }
    }
    /**
     * 결제 실패 처리
     */
    async handlePaymentFailed(data) {
        var _a, _b;
        const payment = await this.paymentRepository.findOne({
            where: { orderId: data.orderId }
        });
        if (payment) {
            payment.status = Payment_1.PaymentGatewayStatus.FAILED;
            payment.failureReason = ((_a = data.failure) === null || _a === void 0 ? void 0 : _a.message) || 'Unknown error';
            payment.failureCode = (_b = data.failure) === null || _b === void 0 ? void 0 : _b.code;
            await this.paymentRepository.save(payment);
        }
        await this.updateOrderStatus(data.orderId, 'failed');
    }
    /**
     * 결제 취소 처리
     */
    async handlePaymentCanceled(data) {
        const payment = await this.paymentRepository.findOne({
            where: { transactionId: data.paymentKey }
        });
        if (payment) {
            payment.status = Payment_1.PaymentGatewayStatus.REFUNDED;
            payment.refundedAmount = data.amount;
            payment.metadata = {
                ...payment.metadata,
                canceledAt: new Date().toISOString()
            };
            await this.paymentRepository.save(payment);
        }
        await this.updateOrderStatus(data.orderId, 'cancelled');
        // 재고 복구
        await this.restoreInventory(data.orderId);
    }
    /**
     * 가상계좌 입금 처리
     */
    async handleVirtualAccountDeposit(data) {
        simpleLogger_1.default.info(`Virtual account deposit received for order: ${data.orderId}`);
        // 결제 완료 처리와 동일
        await this.handlePaymentComplete(data);
    }
    /**
     * 토스 상태를 내부 상태로 매핑
     */
    mapTossStatus(tossStatus) {
        const statusMap = {
            'READY': Payment_1.PaymentGatewayStatus.PENDING,
            'IN_PROGRESS': Payment_1.PaymentGatewayStatus.PROCESSING,
            'WAITING_FOR_DEPOSIT': Payment_1.PaymentGatewayStatus.PENDING,
            'DONE': Payment_1.PaymentGatewayStatus.COMPLETED,
            'CANCELED': Payment_1.PaymentGatewayStatus.REFUNDED,
            'PARTIAL_CANCELED': Payment_1.PaymentGatewayStatus.PARTIALLY_REFUNDED,
            'ABORTED': Payment_1.PaymentGatewayStatus.FAILED,
            'EXPIRED': Payment_1.PaymentGatewayStatus.FAILED
        };
        return statusMap[tossStatus] || Payment_1.PaymentGatewayStatus.PENDING;
    }
    /**
     * 주문 상태 업데이트
     */
    async updateOrderStatus(orderId, status) {
        const order = await this.orderRepository.findOne({
            where: { id: orderId }
        });
        if (order) {
            order.paymentStatus = status;
            // 주문 상태도 함께 업데이트
            if (status === 'paid' || status === 'processing') {
                order.status = Order_1.OrderStatus.PROCESSING;
            }
            else if (status === 'failed' || status === 'cancelled') {
                order.status = Order_1.OrderStatus.CANCELLED;
            }
            await this.orderRepository.save(order);
            simpleLogger_1.default.info(`Order ${orderId} status updated to ${status}`);
        }
    }
    /**
     * 재고 차감
     */
    async deductInventory(orderId) {
        // OrderItem에서 상품 정보를 가져와 재고 차감
        // 실제 구현은 OrderItem 엔티티 구조에 따라 조정 필요
        simpleLogger_1.default.info(`Deducting inventory for order: ${orderId}`);
    }
    /**
     * 재고 복구
     */
    async restoreInventory(orderId) {
        // 취소된 주문의 재고 복구
        simpleLogger_1.default.info(`Restoring inventory for order: ${orderId}`);
    }
    /**
     * 영수증 URL 저장
     */
    async saveReceiptUrl(orderId, receiptUrl) {
        const order = await this.orderRepository.findOne({
            where: { id: orderId }
        });
        if (order) {
            order.metadata = {
                ...order.metadata,
                receiptUrl
            };
            await this.orderRepository.save(order);
        }
    }
    /**
     * 정산 정보 조회
     */
    async getSettlements(date) {
        try {
            const response = await axios_1.default.get(`${this.baseUrl}/settlements?date=${date}`, {
                headers: {
                    'Authorization': this.getAuthHeader()
                }
            });
            return {
                success: true,
                data: response.data
            };
        }
        catch (error) {
            simpleLogger_1.default.error('TossPayments: Failed to get settlements', error);
            throw error;
        }
    }
}
exports.TossPaymentsService = TossPaymentsService;
// 싱글톤 인스턴스
exports.tossPaymentsService = new TossPaymentsService();
//# sourceMappingURL=TossPaymentsService.js.map