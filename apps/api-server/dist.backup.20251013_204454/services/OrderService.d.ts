import { Order, OrderStatus, PaymentStatus, PaymentMethod, OrderItem, Address } from '../entities/Order';
import { PartnerCommission } from '../entities/PartnerCommission';
export interface CreateOrderRequest {
    items?: OrderItem[];
    billingAddress: Address;
    shippingAddress: Address;
    paymentMethod: PaymentMethod;
    notes?: string;
    customerNotes?: string;
    coupons?: string[];
    discountCodes?: string[];
    referralCode?: string;
}
export interface CreateOrderFromCartRequest {
    cartId: string;
    billingAddress: Address;
    shippingAddress: Address;
    paymentMethod: PaymentMethod;
    notes?: string;
    customerNotes?: string;
    referralCode?: string;
}
export interface OrderFilters {
    status?: OrderStatus;
    paymentStatus?: PaymentStatus;
    buyerType?: string;
    supplierId?: string;
    dateFrom?: string;
    dateTo?: string;
    minAmount?: number;
    maxAmount?: number;
    search?: string;
    sortBy?: 'orderDate' | 'totalAmount' | 'status' | 'buyerName';
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
}
export declare class OrderService {
    private orderRepository;
    private userRepository;
    private cartRepository;
    private cartItemRepository;
    private partnerRepository;
    private partnerCommissionRepository;
    private productRepository;
    constructor();
    /**
     * Create order from items directly
     */
    createOrder(buyerId: string, request: CreateOrderRequest): Promise<Order>;
    /**
     * Create order from cart
     */
    createOrderFromCart(buyerId: string, request: CreateOrderFromCartRequest): Promise<Order>;
    /**
     * Get orders with filters
     */
    getOrders(filters?: OrderFilters): Promise<{
        orders: Order[];
        total: number;
    }>;
    /**
     * Get single order by ID
     */
    getOrderById(orderId: string, buyerId?: string): Promise<Order>;
    /**
     * Update order status
     */
    updateOrderStatus(orderId: string, status: OrderStatus): Promise<Order>;
    /**
     * Update payment status
     */
    updatePaymentStatus(orderId: string, paymentStatus: PaymentStatus): Promise<Order>;
    /**
     * Cancel order
     */
    cancelOrder(orderId: string, reason?: string): Promise<Order>;
    /**
     * Request refund
     */
    requestRefund(orderId: string, reason: string, amount?: number): Promise<Order>;
    /**
     * Get order statistics
     */
    getOrderStats(buyerId?: string): Promise<{
        totalOrders: number;
        totalSpent: number;
        averageOrderValue: number;
        recentOrders: Order[];
    }>;
    private generateOrderNumber;
    private calculateOrderSummary;
    /**
     * Create partner commissions for order (문서 #66: 주문 완료 시 커미션 생성)
     */
    createPartnerCommissions(order: Order, referralCode?: string): Promise<PartnerCommission[]>;
    /**
     * Update partner performance metrics
     */
    private updatePartnerPerformance;
    /**
     * Confirm partner commissions (문서 #66: 반품 기간 경과 후 커미션 확정)
     */
    confirmPartnerCommissions(orderId: string): Promise<void>;
    /**
     * Cancel partner commissions (주문 취소/반품 시)
     */
    cancelPartnerCommissions(orderId: string, reason: string): Promise<void>;
    /**
     * Get partner commissions for order
     */
    getOrderCommissions(orderId: string): Promise<PartnerCommission[]>;
    /**
     * Track referral click (파트너 링크 클릭 시)
     */
    trackReferralClick(referralCode: string, metadata?: any): Promise<boolean>;
}
//# sourceMappingURL=OrderService.d.ts.map