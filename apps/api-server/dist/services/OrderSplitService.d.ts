/**
 * Order Split Service
 * Automatically splits orders by supplier and forwards to respective suppliers
 */
import { OrderItem } from '../entities/OrderItem';
interface SplitOrder {
    supplierId: string;
    vendorId: string;
    items: OrderItem[];
    totalAmount: number;
    totalCost: number;
    commission: number;
}
export declare class OrderSplitService {
    private orderRepository;
    private orderItemRepository;
    private productRepository;
    private vendorOrderItemRepository;
    private userRepository;
    private supplierManager;
    constructor();
    /**
     * Initialize supplier connectors
     */
    private initializeSuppliers;
    /**
     * Split order by supplier
     */
    splitOrderBySupplier(orderId: string): Promise<SplitOrder[]>;
    /**
     * Group order items by supplier and vendor
     */
    private groupItemsBySupplier;
    /**
     * Forward split orders to respective suppliers
     */
    private forwardToSuppliers;
    /**
     * Create vendor order items for commission tracking
     */
    private createVendorOrderItems;
    /**
     * Calculate commission for split order
     */
    private calculateCommission;
    /**
     * Calculate platform commission
     */
    private calculatePlatformCommission;
    /**
     * Calculate affiliate commission
     */
    private calculateAffiliateCommission;
    /**
     * Update order status from supplier
     */
    updateOrderStatusFromSupplier(supplierOrderId: string, status: string): Promise<void>;
    /**
     * Track shipment from supplier
     */
    trackShipmentFromSupplier(supplierOrderId: string): Promise<any>;
}
export {};
//# sourceMappingURL=OrderSplitService.d.ts.map