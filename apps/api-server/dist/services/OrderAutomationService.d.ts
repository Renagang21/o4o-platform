/**
 * 주문 상태 자동화 서비스
 * 주문 처리 워크플로우 자동화 및 알림
 */
import { Order } from '../entities/Order';
import { EventEmitter } from 'events';
interface OrderStatusRule {
    fromStatus: string;
    toStatus: string;
    condition: (order: Order) => boolean;
    action?: (order: Order) => Promise<void>;
    delayMinutes?: number;
}
export declare class OrderAutomationService extends EventEmitter {
    private orderRepository;
    private statusRules;
    private notificationRules;
    private cronJobs;
    constructor();
    /**
     * 상태 전환 규칙 초기화
     */
    private initializeRules;
    /**
     * 알림 규칙 설정
     */
    private setNotificationRules;
    /**
     * 크론 작업 초기화
     */
    private initializeCronJobs;
    /**
     * 상태 전환 규칙 추가
     */
    addStatusRule(rule: OrderStatusRule): void;
    /**
     * 주문 상태 자동 업데이트 체크
     */
    checkAndUpdateOrderStatuses(): Promise<void>;
    /**
     * 주문 상태 규칙 처리
     */
    processOrderStatusRules(order: Order): Promise<void>;
    /**
     * 주문 상태 업데이트
     */
    updateOrderStatus(order: Order, newStatus: string): Promise<void>;
    /**
     * 상태 변경 알림 발송
     */
    sendStatusNotifications(order: Order, status: string): Promise<void>;
    /**
     * 이메일 알림 발송
     */
    private sendEmailNotification;
    /**
     * SMS 알림 발송 (구현 필요)
     */
    private sendSmsNotification;
    /**
     * 관리자 알림 발송
     */
    private sendAdminNotification;
    /**
     * 웹훅 알림 발송
     */
    private sendWebhookNotification;
    /**
     * 이메일 데이터 준비
     */
    private prepareEmailData;
    /**
     * 주문 확인 이메일 발송
     */
    sendOrderConfirmation(order: Order): Promise<void>;
    /**
     * 창고 알림
     */
    notifyWarehouse(order: Order): Promise<void>;
    /**
     * 배송 알림 발송
     */
    sendShippingNotification(order: Order): Promise<void>;
    /**
     * 배송 완료 확인
     */
    sendDeliveryConfirmation(order: Order): Promise<void>;
    /**
     * 리뷰 요청
     */
    requestReview(order: Order): Promise<void>;
    /**
     * 리뷰 리마인더 발송
     */
    sendReviewReminders(): Promise<void>;
    /**
     * 주문 통계 업데이트
     */
    updateOrderStatistics(): Promise<void>;
    /**
     * 재고 부족 체크
     */
    checkLowInventory(): Promise<void>;
    /**
     * 서비스 시작
     */
    start(): void;
    /**
     * 서비스 중지
     */
    stop(): void;
}
export declare const orderAutomationService: OrderAutomationService;
export {};
//# sourceMappingURL=OrderAutomationService.d.ts.map