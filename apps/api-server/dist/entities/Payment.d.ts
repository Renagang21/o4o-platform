import { Order } from './Order';
import { User } from './User';
import { GatewayResponse, PaymentWebhookData, PaymentDetailsData, PaymentMetadata } from '../types/payment';
export declare enum PaymentType {
    PAYMENT = "payment",
    REFUND = "refund",
    PARTIAL_REFUND = "partial_refund"
}
export declare enum PaymentProvider {
    IAMPORT = "iamport",
    TOSS_PAYMENTS = "toss_payments",
    KAKAO_PAY = "kakao_pay",
    NAVER_PAY = "naver_pay",
    PAYPAL = "paypal",
    STRIPE = "stripe",
    MANUAL = "manual"
}
export declare enum PaymentGatewayStatus {
    PENDING = "pending",
    PROCESSING = "processing",
    COMPLETED = "completed",
    FAILED = "failed",
    CANCELLED = "cancelled",
    EXPIRED = "expired",
    REFUNDED = "refunded",
    PARTIALLY_REFUNDED = "partially_refunded"
}
export type PaymentGatewayStatusString = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'expired' | 'refunded' | 'partially_refunded';
export declare class Payment {
    id: string;
    orderId: string;
    order: Order;
    userId: string;
    user: User;
    type: PaymentType;
    provider: PaymentProvider;
    method: string;
    status: PaymentGatewayStatus;
    amount: number;
    currency: string;
    transactionId: string;
    gatewayTransactionId?: string;
    gatewayPaymentId?: string;
    paymentDetails?: PaymentDetailsData;
    gatewayResponse?: GatewayResponse;
    webhookData?: PaymentWebhookData;
    failureReason?: string;
    cancelReason?: string;
    cancelledBy?: string;
    cancelledAt?: Date;
    originalPaymentId?: string;
    refundReason?: string;
    refundRequestedBy?: string;
    refundRequestedAt?: Date;
    refundProcessedAt?: Date;
    metadata?: PaymentMetadata;
    paidAt?: Date;
    refundedAmount?: number;
    failureCode?: string;
    createdAt: Date;
    updatedAt: Date;
    generateTransactionId(): string;
    isSuccessful(): boolean;
    isFailed(): boolean;
    canRefund(): boolean;
    getMaskedCardNumber(): string | null;
    getMaskedAccountNumber(): string | null;
}
//# sourceMappingURL=Payment.d.ts.map