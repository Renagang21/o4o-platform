/**
 * 회원 등급 및 포인트 서비스
 * VIP 등급, 포인트 적립/사용, 혜택 관리
 */
import { EventEmitter } from 'events';
interface MembershipTier {
    id: string;
    name: string;
    level: number;
    requiredAmount: number;
    requiredOrders: number;
    benefits: {
        pointRate: number;
        discountRate: number;
        freeShipping: boolean;
        birthdayBonus: number;
        monthlyBonus: number;
        prioritySupport: boolean;
        earlyAccess: boolean;
        exclusiveEvents: boolean;
    };
    color: string;
    icon: string;
}
interface PointTransaction {
    id: string;
    userId: string;
    type: 'earn' | 'use' | 'expire' | 'cancel';
    amount: number;
    balance: number;
    source: 'purchase' | 'review' | 'referral' | 'event' | 'birthday' | 'tier_bonus' | 'manual';
    orderId?: string;
    description: string;
    expiresAt?: Date;
    createdAt: Date;
}
interface UserMembership {
    userId: string;
    currentTier: MembershipTier;
    nextTier?: MembershipTier;
    progressToNext: number;
    totalSpent: number;
    totalOrders: number;
    pointBalance: number;
    lifetimePoints: number;
    memberSince: Date;
    benefits: string[];
}
export declare class MembershipService extends EventEmitter {
    private userRepository;
    private orderRepository;
    private readonly tiers;
    private pointTransactions;
    /**
     * 사용자 멤버십 정보 조회
     */
    getUserMembership(userId: string): Promise<UserMembership>;
    /**
     * 포인트 적립
     */
    earnPoints(userId: string, amount: number, source: PointTransaction['source'], orderId?: string, description?: string): Promise<PointTransaction>;
    /**
     * 포인트 사용
     */
    usePoints(userId: string, amount: number, orderId: string, description?: string): Promise<PointTransaction>;
    /**
     * 구매 완료 시 포인트 적립
     */
    processOrderPoints(orderId: string): Promise<void>;
    /**
     * 리뷰 작성 포인트
     */
    processReviewPoints(userId: string, productId: string, hasPhoto: boolean): Promise<void>;
    /**
     * 추천인 포인트
     */
    processReferralPoints(referrerId: string, referredId: string): Promise<void>;
    /**
     * 생일 포인트
     */
    processBirthdayPoints(userId: string): Promise<void>;
    /**
     * 월간 보너스 포인트
     */
    processMonthlyBonus(): Promise<void>;
    /**
     * 포인트 만료 처리
     */
    expirePoints(): Promise<void>;
    /**
     * 등급 업그레이드 체크
     */
    private checkTierUpgrade;
    /**
     * 등급 업그레이드
     */
    private upgradeTier;
    /**
     * 연간 구매 통계
     */
    private getYearlyPurchaseStats;
    /**
     * 등급 계산
     */
    private calculateTier;
    /**
     * 다음 등급 조회
     */
    private getNextTier;
    /**
     * 진행률 계산
     */
    private calculateProgress;
    /**
     * 포인트 잔액 조회
     */
    private getPointBalance;
    /**
     * 평생 적립 포인트
     */
    private getLifetimePoints;
    /**
     * 혜택 목록 생성
     */
    private getTierBenefitsList;
    /**
     * 거래 ID 생성
     */
    private generateTransactionId;
    /**
     * 기본 설명 생성
     */
    private getDefaultDescription;
    /**
     * 만료일 계산
     */
    private calculateExpiryDate;
    /**
     * 거래 내역 저장
     */
    private saveTransaction;
    /**
     * 사용자 포인트 업데이트
     */
    private updateUserPoints;
    /**
     * 포인트 거래 내역 조회
     */
    getPointHistory(userId: string, page?: number, limit?: number): Promise<{
        transactions: PointTransaction[];
        total: number;
    }>;
}
export declare const membershipService: MembershipService;
export {};
//# sourceMappingURL=MembershipService.d.ts.map