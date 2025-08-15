/**
 * 반품/교환 처리 서비스
 * 반품 신청, 교환 처리, 환불 관리
 */
import { EventEmitter } from 'events';
interface ReturnRequest {
    id: string;
    orderId: string;
    userId: string;
    type: 'return' | 'exchange';
    status: 'requested' | 'approved' | 'rejected' | 'processing' | 'completed' | 'cancelled';
    items: ReturnItem[];
    reason: string;
    reasonCategory: 'defective' | 'wrong_item' | 'changed_mind' | 'size_issue' | 'damaged' | 'other';
    description: string;
    images?: string[];
    returnShipping?: {
        trackingNumber?: string;
        carrier?: string;
        shippedAt?: Date;
        receivedAt?: Date;
        cost: number;
        paidBy: 'customer' | 'merchant';
    };
    exchangeShipping?: {
        trackingNumber?: string;
        carrier?: string;
        shippedAt?: Date;
        deliveredAt?: Date;
    };
    refund?: {
        amount: number;
        method: 'original' | 'points' | 'store_credit';
        processedAt?: Date;
        transactionId?: string;
    };
    requestedAt: Date;
    approvedAt?: Date;
    completedAt?: Date;
    metadata?: Record<string, any>;
}
interface ReturnItem {
    orderItemId: string;
    productId: string;
    variationId?: string;
    quantity: number;
    reason?: string;
    condition: 'unopened' | 'opened' | 'used' | 'damaged';
    exchangeProductId?: string;
    exchangeVariationId?: string;
}
export declare class ReturnExchangeService extends EventEmitter {
    private orderRepository;
    private productRepository;
    private returnRequests;
    private readonly returnPolicy;
    /**
     * 반품/교환 신청
     */
    createReturnRequest(userId: string, orderId: string, data: {
        type: 'return' | 'exchange';
        items: ReturnItem[];
        reason: string;
        reasonCategory: ReturnRequest['reasonCategory'];
        description: string;
        images?: string[];
    }): Promise<ReturnRequest>;
    /**
     * 반품 요청 승인
     */
    approveReturn(returnId: string, adminNotes?: string): Promise<ReturnRequest>;
    /**
     * 반품 요청 거절
     */
    rejectReturn(returnId: string, reason: string): Promise<ReturnRequest>;
    /**
     * 반품 상품 수령 확인
     */
    confirmReturnReceived(returnId: string, condition: 'good' | 'damaged' | 'not_as_described'): Promise<ReturnRequest>;
    /**
     * 환불 처리
     */
    private processRefund;
    /**
     * 교환 처리
     */
    private processExchange;
    /**
     * 반품 가능 여부 확인
     */
    private validateReturnEligibility;
    /**
     * 상품별 반품 가능 여부 확인
     */
    private validateItemEligibility;
    /**
     * 반품 비용 계산
     */
    private calculateReturnCost;
    /**
     * 재고 복구
     */
    private restoreInventory;
    /**
     * 교환 주문 생성
     */
    private createExchangeOrder;
    /**
     * 반품 라벨 생성
     */
    private generateReturnLabel;
    /**
     * 반품 안내 이메일
     */
    private sendReturnInstructions;
    /**
     * ID 생성
     */
    private generateReturnId;
    private generateOrderNumber;
    private generateTrackingNumber;
    /**
     * 반품 요청 조회
     */
    getReturnRequest(returnId: string): Promise<ReturnRequest | null>;
    /**
     * 사용자별 반품 내역
     */
    getUserReturns(userId: string, page?: number, limit?: number): Promise<{
        returns: ReturnRequest[];
        total: number;
    }>;
    /**
     * 반품 통계
     */
    getReturnStatistics(startDate: Date, endDate: Date): Promise<{
        totalReturns: number;
        totalExchanges: number;
        reasonBreakdown: Record<string, number>;
        totalRefundAmount: number;
        averageProcessingTime: number;
    }>;
}
export declare const returnExchangeService: ReturnExchangeService;
export {};
//# sourceMappingURL=ReturnExchangeService.d.ts.map