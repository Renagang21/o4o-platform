/**
 * 토스페이먼츠 결제 서비스
 * https://docs.tosspayments.com/reference
 */
interface TossPaymentRequest {
    amount: number;
    orderId: string;
    orderName: string;
    customerName?: string;
    customerEmail?: string;
    successUrl: string;
    failUrl: string;
    method?: 'card' | 'transfer' | 'virtual-account' | 'mobile' | 'easy-pay';
    easyPay?: {
        provider: 'tosspay' | 'naverpay' | 'kakaopay' | 'payco' | 'samsungpay';
    };
}
interface TossPaymentConfirm {
    paymentKey: string;
    orderId: string;
    amount: number;
}
interface TossWebhookPayload {
    eventType: string;
    timestamp: string;
    data: {
        paymentKey: string;
        orderId: string;
        status: string;
        amount: number;
        method?: string;
        approvedAt?: string;
        card?: {
            number: string;
            company: string;
        };
        virtualAccount?: {
            bank: string;
            accountNumber: string;
            dueDate: string;
        };
        transfer?: {
            bank: string;
            settlementStatus: string;
        };
        mobilePhone?: {
            carrier: string;
            settlementStatus: string;
        };
        receipt?: {
            url: string;
        };
        failure?: {
            code: string;
            message: string;
        };
    };
}
export declare class TossPaymentsService {
    private readonly apiKey;
    private readonly secretKey;
    private readonly baseUrl;
    private readonly clientKey;
    private readonly webhookSecret;
    private orderRepository;
    private paymentRepository;
    constructor();
    /**
     * Basic Auth 헤더 생성
     */
    private getAuthHeader;
    /**
     * 결제 요청 생성
     */
    createPayment(request: TossPaymentRequest): Promise<any>;
    /**
     * 결제 승인 (결제창에서 성공 후 호출)
     */
    confirmPayment(confirm: TossPaymentConfirm): Promise<any>;
    /**
     * 결제 취소
     */
    cancelPayment(paymentKey: string, cancelReason: string, cancelAmount?: number): Promise<any>;
    /**
     * 결제 조회
     */
    getPayment(paymentKeyOrOrderId: string): Promise<any>;
    /**
     * 웹훅 검증 및 처리
     */
    handleWebhook(signature: string, timestamp: string, body: TossWebhookPayload): Promise<void>;
    /**
     * 웹훅 서명 검증
     */
    private verifyWebhookSignature;
    /**
     * 결제 상태 변경 처리
     */
    private handlePaymentStatusChange;
    /**
     * 결제 완료 처리
     */
    private handlePaymentComplete;
    /**
     * 결제 실패 처리
     */
    private handlePaymentFailed;
    /**
     * 결제 취소 처리
     */
    private handlePaymentCanceled;
    /**
     * 가상계좌 입금 처리
     */
    private handleVirtualAccountDeposit;
    /**
     * 토스 상태를 내부 상태로 매핑
     */
    private mapTossStatus;
    /**
     * 주문 상태 업데이트
     */
    private updateOrderStatus;
    /**
     * 재고 차감
     */
    private deductInventory;
    /**
     * 재고 복구
     */
    private restoreInventory;
    /**
     * 영수증 URL 저장
     */
    private saveReceiptUrl;
    /**
     * 정산 정보 조회
     */
    getSettlements(date: string): Promise<any>;
}
export declare const tossPaymentsService: TossPaymentsService;
export {};
//# sourceMappingURL=TossPaymentsService.d.ts.map