import { Partner } from './Partner';
import { Product } from './Product';
import { Seller } from './Seller';
import { Order } from './Order';
export declare enum CommissionStatus {
    PENDING = "pending",// 주문 완료, 커미션 대기
    CONFIRMED = "confirmed",// 반품 기간 경과, 커미션 확정
    PAID = "paid",// 커미션 지급 완료
    CANCELLED = "cancelled",// 주문 취소/반품으로 커미션 취소
    DISPUTED = "disputed"
}
export declare enum CommissionType {
    SALE = "sale",// 판매 커미션
    BONUS = "bonus",// 성과 보너스
    REFERRAL = "referral",// 추천 커미션
    TIER_BONUS = "tier_bonus"
}
export declare class PartnerCommission {
    id: string;
    partnerId: string;
    partner: Partner;
    orderId: string;
    order?: Order;
    productId: string;
    product: Product;
    sellerId: string;
    seller: Seller;
    commissionType: CommissionType;
    status: CommissionStatus;
    orderAmount: number;
    productPrice: number;
    quantity: number;
    commissionRate: number;
    commissionAmount: number;
    currency: string;
    referralCode: string;
    referralSource?: string;
    campaign?: string;
    trackingData?: {
        ip?: string;
        userAgent?: string;
        utm_source?: string;
        utm_medium?: string;
        utm_campaign?: string;
        utm_content?: string;
    };
    clickedAt?: Date;
    convertedAt?: Date;
    conversionTimeMinutes?: number;
    confirmedAt?: Date;
    paidAt?: Date;
    payoutBatchId?: string;
    paymentReference?: string;
    notes?: string;
    cancellationReason?: string;
    metadata?: Record<string, any>;
    createdAt: Date;
    updatedAt: Date;
    static calculateCommission(productPrice: number, quantity: number, commissionRate: number): {
        orderAmount: number;
        commission: number;
    };
    isPending(): boolean;
    isConfirmed(): boolean;
    isPaid(): boolean;
    isCancelled(): boolean;
    canConfirm(): boolean;
    canPay(): boolean;
    canCancel(): boolean;
    calculateConversionTime(): void;
    confirm(): void;
    pay(payoutBatchId: string, paymentReference?: string): void;
    cancel(reason: string): void;
    dispute(reason: string): void;
    resolveDispute(newStatus: CommissionStatus.CONFIRMED | CommissionStatus.CANCELLED): void;
    getSummary(): {
        orderId: string;
        productName: string;
        orderAmount: number;
        commissionRate: number;
        totalCommission: number;
        status: string;
        createdAt: Date;
    };
    getPerformanceMetrics(): {
        conversionTime: number | null;
        commissionPercentage: number;
        effectiveRate: number;
    };
    getMonthKey(): string;
    getWeekKey(): string;
    validate(): {
        isValid: boolean;
        errors: string[];
    };
}
//# sourceMappingURL=PartnerCommission.d.ts.map