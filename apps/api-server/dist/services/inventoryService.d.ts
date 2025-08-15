import { Product } from '../entities/Product';
export interface InventoryReservation {
    productId: string;
    quantity: number;
    reservationId: string;
    expiresAt: Date;
    orderId?: string;
    userId?: string;
}
export interface InventoryCheck {
    productId: string;
    available: number;
    reserved: number;
    total: number;
    inStock: boolean;
}
export declare class InventoryService {
    private productRepository;
    private orderRepository;
    private orderItemRepository;
    /**
     * 재고 상태를 확인합니다.
     */
    checkInventory(productId: string): Promise<InventoryCheck>;
    /**
     * 여러 상품의 재고를 일괄 확인합니다.
     */
    checkMultipleInventory(items: Array<{
        productId: string;
        quantity: number;
    }>): Promise<Array<InventoryCheck & {
        requestedQuantity: number;
        canFulfill: boolean;
    }>>;
    /**
     * 재고를 예약합니다.
     */
    reserveInventory(items: Array<{
        productId: string;
        quantity: number;
    }>, orderId?: string, userId?: string, reservationMinutes?: number): Promise<{
        success: boolean;
        reservationId?: string;
        errors?: string[];
    }>;
    /**
     * 예약을 해제합니다.
     */
    releaseReservation(reservationId: string): Promise<void>;
    /**
     * 예약을 확정하여 실제 재고를 차감합니다.
     */
    confirmReservation(reservationId: string, items: Array<{
        productId: string;
        quantity: number;
    }>): Promise<{
        success: boolean;
        errors?: string[];
    }>;
    /**
     * 재고를 복구합니다 (주문 취소, 환불 등).
     */
    restoreInventory(items: Array<{
        productId: string;
        quantity: number;
    }>): Promise<{
        success: boolean;
        errors?: string[];
    }>;
    /**
     * 저재고 알림이 필요한 상품들을 조회합니다.
     */
    getLowStockProducts(threshold?: number): Promise<Product[]>;
    /**
     * 품절 상품들을 조회합니다.
     */
    getOutOfStockProducts(): Promise<Product[]>;
    /**
     * 재고 이동 내역을 기록합니다.
     */
    recordInventoryMovement(productId: string, quantityChange: number, type: 'sale' | 'return' | 'adjustment' | 'restock', referenceId?: string, notes?: string): Promise<void>;
    /**
     * 자동 재고 조정을 수행합니다.
     */
    performInventoryAdjustment(adjustments: Array<{
        productId: string;
        newQuantity: number;
        reason: string;
    }>): Promise<{
        success: boolean;
        errors?: string[];
    }>;
    /**
     * 예약 ID를 생성합니다.
     */
    private generateReservationId;
    /**
     * 만료된 예약들을 정리합니다.
     */
    cleanupExpiredReservations(): Promise<void>;
}
export declare const inventoryService: InventoryService;
//# sourceMappingURL=inventoryService.d.ts.map