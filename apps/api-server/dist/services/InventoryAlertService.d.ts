/**
 * 재고 알림 서비스
 * 재고 부족, 재입고, 재고 이상 감지 등 알림 처리
 */
import { EventEmitter } from 'events';
interface InventoryAlert {
    id: string;
    type: 'low_stock' | 'out_of_stock' | 'restock_needed' | 'oversupply' | 'expiring';
    severity: 'low' | 'medium' | 'high' | 'critical';
    productId: string;
    productName: string;
    variationId?: string;
    sku?: string;
    currentStock: number;
    threshold: number;
    recommendedAction?: string;
    createdAt: Date;
    acknowledged: boolean;
    acknowledgedBy?: string;
    acknowledgedAt?: Date;
}
interface RestockSuggestion {
    productId: string;
    productName: string;
    variationId?: string;
    sku?: string;
    currentStock: number;
    averageDailySales: number;
    daysUntilStockout: number;
    recommendedQuantity: number;
    estimatedCost: number;
    supplier?: string;
    leadTime?: number;
}
export declare class InventoryAlertService extends EventEmitter {
    private productRepository;
    private variationRepository;
    private alerts;
    private stockMovements;
    private cronJobs;
    private readonly thresholds;
    constructor();
    /**
     * 크론 작업 초기화
     */
    private initializeCronJobs;
    /**
     * 이벤트 리스너 설정
     */
    private setupEventListeners;
    /**
     * 전체 재고 체크
     */
    checkAllInventory(): Promise<void>;
    /**
     * 상품 변형 재고 체크
     */
    private checkVariationStock;
    /**
     * 단일 상품 재고 체크
     */
    private checkProductStock;
    /**
     * 알림 생성 또는 업데이트
     */
    private createOrUpdateAlert;
    /**
     * 알림 제거
     */
    private removeAlert;
    /**
     * 실시간 알림 전송
     */
    private sendRealtimeAlert;
    /**
     * 긴급 알림 전송
     */
    private sendCriticalAlert;
    /**
     * 일일 재고 리포트 생성
     */
    generateDailyReport(): Promise<void>;
    /**
     * 재입고 제안 생성
     */
    generateRestockSuggestions(): Promise<RestockSuggestion[]>;
    /**
     * 재고 이상 감지
     */
    detectInventoryAnomalies(): Promise<void>;
    /**
     * 주문 완료 처리
     */
    private handleOrderCompleted;
    /**
     * 주문 취소 처리
     */
    private handleOrderCancelled;
    /**
     * 재고 조정 처리
     */
    private handleStockAdjustment;
    /**
     * 재고 변동 기록
     */
    private recordStockMovement;
    /**
     * 최근 재고 변동 조회
     */
    private getRecentStockMovements;
    /**
     * 상품 판매 데이터 조회
     */
    private getProductSalesData;
    /**
     * 베스트셀러 상품 조회
     */
    private getTopSellingProducts;
    /**
     * 재고 회전이 느린 상품 조회
     */
    private getSlowMovingProducts;
    /**
     * 리포트 HTML 생성
     */
    private generateReportHtml;
    /**
     * 재입고 제안 이메일 발송
     */
    private sendRestockSuggestions;
    /**
     * 알림 확인 처리
     */
    acknowledgeAlert(alertId: string, userId: string): Promise<void>;
    /**
     * 현재 활성 알림 조회
     */
    getActiveAlerts(): InventoryAlert[];
    /**
     * 서비스 시작
     */
    start(): void;
    /**
     * 서비스 중지
     */
    stop(): void;
}
export declare const inventoryAlertService: InventoryAlertService;
export {};
//# sourceMappingURL=InventoryAlertService.d.ts.map