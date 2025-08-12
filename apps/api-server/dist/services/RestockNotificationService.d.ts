/**
 * 재입고 알림 서비스
 * 품절 상품 알림 신청, 재입고 시 자동 알림
 */
import { EventEmitter } from 'events';
interface RestockNotification {
    id: string;
    userId: string;
    productId: string;
    variationId?: string;
    email?: string;
    phone?: string;
    notificationType: 'email' | 'sms' | 'push' | 'all';
    status: 'active' | 'notified' | 'expired' | 'cancelled';
    createdAt: Date;
    notifiedAt?: Date;
    expiresAt: Date;
    metadata?: {
        productName?: string;
        sku?: string;
        attributes?: Record<string, any>;
        priceWhenRequested?: number;
    };
}
export declare class RestockNotificationService extends EventEmitter {
    private redis;
    private productRepository;
    private variationRepository;
    private userRepository;
    private notifications;
    private notificationQueues;
    constructor();
    /**
     * 이벤트 리스너 설정
     */
    private setupEventListeners;
    /**
     * 재입고 알림 신청
     */
    subscribeToRestock(productId: string, data: {
        userId?: string;
        email?: string;
        phone?: string;
        variationId?: string;
        notificationType?: RestockNotification['notificationType'];
    }): Promise<RestockNotification>;
    /**
     * 알림 취소
     */
    unsubscribeFromRestock(notificationId: string, userId?: string): Promise<void>;
    /**
     * 재고 업데이트 처리
     */
    private processStockUpdate;
    /**
     * 재입고 알림 발송
     */
    sendRestockNotifications(productId: string, variationId?: string): Promise<void>;
    /**
     * 개별 알림 발송
     */
    private sendNotification;
    /**
     * 이메일 알림 발송
     */
    private sendEmailNotification;
    /**
     * SMS 알림 발송
     */
    private sendSmsNotification;
    /**
     * 푸시 알림 발송
     */
    private sendPushNotification;
    /**
     * 큐에 추가
     */
    private addToQueue;
    /**
     * 큐에서 제거
     */
    private removeFromQueue;
    /**
     * 큐 정리
     */
    private cleanupQueue;
    /**
     * 알림 키 생성
     */
    private getNotificationKey;
    /**
     * ID 생성
     */
    private generateNotificationId;
    /**
     * 통계 업데이트
     */
    private updateStatistics;
    /**
     * 상품별 알림 신청 수 조회
     */
    getProductNotificationCount(productId: string): Promise<number>;
    /**
     * 사용자별 알림 신청 목록
     */
    getUserNotifications(userId: string): Promise<RestockNotification[]>;
    /**
     * 만료된 알림 정리 (크론)
     */
    cleanupExpiredNotifications(): Promise<void>;
    /**
     * 알림 통계
     */
    getNotificationStatistics(): Promise<{
        totalActive: number;
        totalNotified: number;
        topRequestedProducts: Array<{
            productId: string;
            count: number;
        }>;
        conversionRate: number;
    }>;
}
export declare const restockNotificationService: RestockNotificationService;
export {};
//# sourceMappingURL=RestockNotificationService.d.ts.map