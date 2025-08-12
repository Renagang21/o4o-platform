"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.webhookService = exports.WebhookService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const connection_1 = require("../database/connection");
const Payment_1 = require("../entities/Payment");
const Order_1 = require("../entities/Order");
const inventoryService_1 = require("./inventoryService");
class WebhookService {
    constructor() {
        this.paymentRepository = connection_1.AppDataSource.getRepository(Payment_1.Payment);
        this.orderRepository = connection_1.AppDataSource.getRepository(Order_1.Order);
    }
    /**
     * 웹훅 시그니처를 검증합니다.
     */
    verifyWebhookSignature(payload, signature, secret, provider) {
        try {
            let expectedSignature;
            switch (provider) {
                case Payment_1.PaymentProvider.IAMPORT:
                    // 아임포트 시그니처 검증
                    expectedSignature = crypto_1.default
                        .createHmac('sha256', secret)
                        .update(payload)
                        .digest('hex');
                    return signature === expectedSignature;
                case Payment_1.PaymentProvider.TOSS_PAYMENTS:
                    // 토스페이먼츠 시그니처 검증
                    expectedSignature = crypto_1.default
                        .createHmac('sha256', secret)
                        .update(payload)
                        .digest('base64');
                    return signature === expectedSignature;
                case Payment_1.PaymentProvider.KAKAO_PAY:
                    // 카카오페이 시그니처 검증
                    expectedSignature = crypto_1.default
                        .createHash('sha256')
                        .update(payload + secret)
                        .digest('hex');
                    return signature === expectedSignature;
                default:
                    console.warn(`Unknown payment provider for signature verification: ${provider}`);
                    return false;
            }
        }
        catch (error) {
            console.error('Webhook signature verification failed:', error);
            return false;
        }
    }
    /**
     * 아임포트 웹훅을 처리합니다.
     */
    async handleIamportWebhook(payload, signature) {
        const secret = process.env.IAMPORT_WEBHOOK_SECRET;
        if (!secret) {
            return { success: false, message: 'Webhook secret not configured' };
        }
        // 시그니처 검증
        if (!this.verifyWebhookSignature(JSON.stringify(payload), signature, secret, Payment_1.PaymentProvider.IAMPORT)) {
            return { success: false, message: 'Invalid webhook signature' };
        }
        const webhookData = {
            provider: Payment_1.PaymentProvider.IAMPORT,
            transactionId: payload.merchant_uid,
            gatewayTransactionId: payload.imp_uid,
            status: payload.status === 'paid' ? 'success' : 'failed',
            amount: payload.amount,
            currency: payload.currency || 'KRW',
            metadata: payload
        };
        return await this.processWebhook(webhookData);
    }
    /**
     * 토스페이먼츠 웹훅을 처리합니다.
     */
    async handleTossPaymentsWebhook(payload, signature) {
        const secret = process.env.TOSS_PAYMENTS_WEBHOOK_SECRET;
        if (!secret) {
            return { success: false, message: 'Webhook secret not configured' };
        }
        // 시그니처 검증
        if (!this.verifyWebhookSignature(JSON.stringify(payload), signature, secret, Payment_1.PaymentProvider.TOSS_PAYMENTS)) {
            return { success: false, message: 'Invalid webhook signature' };
        }
        const webhookData = {
            provider: Payment_1.PaymentProvider.TOSS_PAYMENTS,
            transactionId: payload.orderId,
            gatewayTransactionId: payload.paymentKey,
            status: payload.status === 'DONE' ? 'success' : 'failed',
            amount: payload.amount.total,
            currency: payload.amount.currency || 'KRW',
            metadata: payload
        };
        return await this.processWebhook(webhookData);
    }
    /**
     * 카카오페이 웹훅을 처리합니다.
     */
    async handleKakaoPayWebhook(payload, signature) {
        const secret = process.env.KAKAO_PAY_WEBHOOK_SECRET;
        if (!secret) {
            return { success: false, message: 'Webhook secret not configured' };
        }
        // 시그니처 검증
        if (!this.verifyWebhookSignature(JSON.stringify(payload), signature, secret, Payment_1.PaymentProvider.KAKAO_PAY)) {
            return { success: false, message: 'Invalid webhook signature' };
        }
        const webhookData = {
            provider: Payment_1.PaymentProvider.KAKAO_PAY,
            transactionId: payload.partner_order_id,
            gatewayTransactionId: payload.tid,
            status: payload.status === 'SUCCESS_PAYMENT' ? 'success' : 'failed',
            amount: payload.amount.total,
            currency: 'KRW',
            metadata: payload
        };
        return await this.processWebhook(webhookData);
    }
    /**
     * 네이버페이 웹훅을 처리합니다.
     */
    async handleNaverPayWebhook(payload, signature) {
        const secret = process.env.NAVER_PAY_WEBHOOK_SECRET;
        if (!secret) {
            return { success: false, message: 'Webhook secret not configured' };
        }
        // 시그니처 검증
        if (!this.verifyWebhookSignature(JSON.stringify(payload), signature, secret, Payment_1.PaymentProvider.NAVER_PAY)) {
            return { success: false, message: 'Invalid webhook signature' };
        }
        const webhookData = {
            provider: Payment_1.PaymentProvider.NAVER_PAY,
            transactionId: payload.merchantPayKey,
            gatewayTransactionId: payload.paymentId,
            status: payload.paymentStatus === 'SUCCESS' ? 'success' : 'failed',
            amount: payload.totalPayAmount,
            currency: 'KRW',
            metadata: payload
        };
        return await this.processWebhook(webhookData);
    }
    /**
     * 통합 웹훅 처리 로직입니다.
     */
    async processWebhook(webhookData) {
        var _a;
        const queryRunner = connection_1.AppDataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
            // 결제 정보 조회
            const payment = await queryRunner.manager.findOne(Payment_1.Payment, {
                where: { transactionId: webhookData.transactionId },
                relations: ['order', 'order.items', 'order.items.product']
            });
            if (!payment) {
                await queryRunner.rollbackTransaction();
                return { success: false, message: 'Payment not found' };
            }
            // 이미 처리된 웹훅인지 확인
            if (payment.status === Payment_1.PaymentGatewayStatus.COMPLETED ||
                payment.status === Payment_1.PaymentGatewayStatus.FAILED) {
                await queryRunner.rollbackTransaction();
                return { success: true, message: 'Webhook already processed' };
            }
            // 결제 상태 업데이트
            const newPaymentStatus = webhookData.status === 'success'
                ? Payment_1.PaymentGatewayStatus.COMPLETED
                : Payment_1.PaymentGatewayStatus.FAILED;
            await queryRunner.manager.update(Payment_1.Payment, payment.id, {
                status: newPaymentStatus,
                gatewayTransactionId: webhookData.gatewayTransactionId,
                webhookData: webhookData.metadata,
                ...(webhookData.status === 'failed' && {
                    failureReason: ((_a = webhookData.metadata) === null || _a === void 0 ? void 0 : _a.failureReason) || 'Payment failed'
                })
            });
            if (newPaymentStatus === Payment_1.PaymentGatewayStatus.COMPLETED) {
                // 결제 성공 처리
                await this.handleSuccessfulPayment(queryRunner, payment, webhookData);
            }
            else {
                // 결제 실패 처리
                await this.handleFailedPayment(queryRunner, payment, webhookData);
            }
            await queryRunner.commitTransaction();
            return {
                success: true,
                message: `Payment ${webhookData.status} processed successfully`
            };
        }
        catch (error) {
            await queryRunner.rollbackTransaction();
            console.error('Error processing webhook:', error);
            return {
                success: false,
                message: 'Failed to process webhook'
            };
        }
        finally {
            await queryRunner.release();
        }
    }
    /**
     * 결제 성공 시 처리 로직입니다.
     */
    async handleSuccessfulPayment(queryRunner, payment, webhookData) {
        // 주문 상태 업데이트
        await queryRunner.manager.update(Order_1.Order, payment.orderId, {
            paymentStatus: Order_1.PaymentStatus.PAID,
            status: Order_1.OrderStatus.CONFIRMED,
            paymentId: payment.id,
            paymentMethod: payment.method
        });
        // 재고 확정 (예약된 재고를 실제 차감)
        if (payment.order && payment.order.items) {
            const inventoryItems = payment.order.items.map((item) => ({
                productId: item.productId,
                quantity: item.quantity
            }));
            // 예약 확정은 별도 트랜잭션에서 처리
            // (현재 트랜잭션과 분리하여 재고 처리 실패가 결제 완료를 막지 않도록)
            setTimeout(async () => {
                try {
                    await inventoryService_1.inventoryService.confirmReservation(`order_${payment.orderId}`, inventoryItems);
                }
                catch (error) {
                    console.error('Failed to confirm inventory reservation:', error);
                    // 재고 확정 실패 시 알림 처리 (관리자 알림 등)
                }
            }, 0);
        }
        // 결제 완료 후처리 (이메일 발송, 알림 등)
        this.postPaymentSuccess(payment, webhookData);
    }
    /**
     * 결제 실패 시 처리 로직입니다.
     */
    async handleFailedPayment(queryRunner, payment, webhookData) {
        // 주문 상태 업데이트
        await queryRunner.manager.update(Order_1.Order, payment.orderId, {
            paymentStatus: Order_1.PaymentStatus.FAILED,
            status: Order_1.OrderStatus.CANCELLED
        });
        // 예약된 재고 해제
        if (payment.order && payment.order.items) {
            const inventoryItems = payment.order.items.map((item) => ({
                productId: item.productId,
                quantity: item.quantity
            }));
            // 재고 복구는 별도로 처리
            setTimeout(async () => {
                try {
                    await inventoryService_1.inventoryService.restoreInventory(inventoryItems);
                }
                catch (error) {
                    console.error('Failed to restore inventory after payment failure:', error);
                }
            }, 0);
        }
        // 결제 실패 후처리
        this.postPaymentFailure(payment, webhookData);
    }
    /**
     * 결제 성공 후처리입니다.
     */
    async postPaymentSuccess(payment, webhookData) {
        try {
            // 이메일 발송, 알림 등 비동기 처리
            // console.log(`Payment success notification for payment: ${payment.id}`);
            // 실제 구현에서는 이메일 서비스, 알림 서비스 등을 호출
            // await emailService.sendPaymentConfirmation(payment);
            // await notificationService.sendPushNotification(payment.userId, 'Payment successful');
        }
        catch (error) {
            console.error('Error in post-payment success processing:', error);
        }
    }
    /**
     * 결제 실패 후처리입니다.
     */
    async postPaymentFailure(payment, webhookData) {
        try {
            // 결제 실패 알림 등 비동기 처리
            // console.log(`Payment failure notification for payment: ${payment.id}`);
            // 실제 구현에서는 알림 서비스 등을 호출
            // await notificationService.sendPaymentFailureNotification(payment.userId, webhookData.metadata);
        }
        catch (error) {
            console.error('Error in post-payment failure processing:', error);
        }
    }
    /**
     * 웹훅 재시도 처리입니다.
     */
    async retryWebhook(paymentId, maxRetries = 3) {
        try {
            const payment = await this.paymentRepository.findOne({
                where: { id: paymentId },
                relations: ['order']
            });
            if (!payment) {
                return { success: false, message: 'Payment not found' };
            }
            // 실제 구현에서는 각 결제 게이트웨이의 API를 호출하여 상태를 확인
            // console.log(`Retrying webhook processing for payment: ${paymentId}`);
            return { success: true, message: 'Webhook retry completed' };
        }
        catch (error) {
            console.error('Error retrying webhook:', error);
            return { success: false, message: 'Webhook retry failed' };
        }
    }
    /**
     * 외부 URL에 웹훅을 전송합니다.
     */
    async sendWebhook(url, payload) {
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'O4O-Platform-Webhook/1.0'
                },
                body: JSON.stringify(payload)
            });
            if (!response.ok) {
                throw new Error(`Webhook failed with status ${response.status}: ${response.statusText}`);
            }
            // console.log(`Webhook sent successfully to ${url}`);
        }
        catch (error) {
            console.error(`Failed to send webhook to ${url}:`, error);
            throw error;
        }
    }
}
exports.WebhookService = WebhookService;
exports.webhookService = new WebhookService();
//# sourceMappingURL=webhookService.js.map