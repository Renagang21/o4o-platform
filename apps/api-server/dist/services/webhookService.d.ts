import { PaymentProvider } from '../entities/Payment';
export interface WebhookPayload {
    provider: PaymentProvider;
    transactionId: string;
    gatewayTransactionId: string;
    status: 'success' | 'failed' | 'cancelled';
    amount: number;
    currency: string;
    metadata?: Record<string, unknown>;
    signature?: string;
    timestamp?: number;
}
export interface IamportWebhookPayload {
    imp_uid: string;
    merchant_uid: string;
    status: string;
    amount: number;
    currency?: string;
    pay_method?: string;
    pg_provider?: string;
    paid_at?: number;
    failed_at?: number;
    cancelled_at?: number;
    receipt_url?: string;
}
export interface TossPaymentsWebhookPayload {
    paymentKey: string;
    orderId: string;
    status: string;
    amount: {
        total: number;
        currency: string;
    };
    method?: string;
    requestedAt?: string;
    approvedAt?: string;
    failedAt?: string;
    cancelledAt?: string;
}
export interface KakaoPayWebhookPayload {
    tid: string;
    partner_order_id: string;
    partner_user_id: string;
    payment_method_type: string;
    amount: {
        total: number;
        tax_free: number;
        vat: number;
    };
    status: string;
    created_at: string;
    approved_at?: string;
    canceled_at?: string;
}
export interface NaverPayWebhookPayload {
    paymentId: string;
    merchantPayKey: string;
    merchantUserKey: string;
    primaryMethod: string;
    totalPayAmount: number;
    paymentStatus: string;
    paymentDate?: string;
    detail?: {
        productItems: Array<{
            categoryType: string;
            categoryId: string;
            uid: string;
            name: string;
            count: number;
        }>;
    };
}
export declare class WebhookService {
    private paymentRepository;
    private orderRepository;
    /**
     * 웹훅 시그니처를 검증합니다.
     */
    private verifyWebhookSignature;
    /**
     * 아임포트 웹훅을 처리합니다.
     */
    handleIamportWebhook(payload: IamportWebhookPayload, signature: string): Promise<{
        success: boolean;
        message: string;
    }>;
    /**
     * 토스페이먼츠 웹훅을 처리합니다.
     */
    handleTossPaymentsWebhook(payload: TossPaymentsWebhookPayload, signature: string): Promise<{
        success: boolean;
        message: string;
    }>;
    /**
     * 카카오페이 웹훅을 처리합니다.
     */
    handleKakaoPayWebhook(payload: KakaoPayWebhookPayload, signature: string): Promise<{
        success: boolean;
        message: string;
    }>;
    /**
     * 네이버페이 웹훅을 처리합니다.
     */
    handleNaverPayWebhook(payload: NaverPayWebhookPayload, signature: string): Promise<{
        success: boolean;
        message: string;
    }>;
    /**
     * 통합 웹훅 처리 로직입니다.
     */
    private processWebhook;
    /**
     * 결제 성공 시 처리 로직입니다.
     */
    private handleSuccessfulPayment;
    /**
     * 결제 실패 시 처리 로직입니다.
     */
    private handleFailedPayment;
    /**
     * 결제 성공 후처리입니다.
     */
    private postPaymentSuccess;
    /**
     * 결제 실패 후처리입니다.
     */
    private postPaymentFailure;
    /**
     * 웹훅 재시도 처리입니다.
     */
    retryWebhook(paymentId: string, maxRetries?: number): Promise<{
        success: boolean;
        message: string;
    }>;
    /**
     * 외부 URL에 웹훅을 전송합니다.
     */
    sendWebhook(url: string, payload: Record<string, unknown>): Promise<void>;
}
export declare const webhookService: WebhookService;
//# sourceMappingURL=webhookService.d.ts.map