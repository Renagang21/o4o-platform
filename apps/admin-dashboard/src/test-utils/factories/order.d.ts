import { Order, OrderItem } from '@/types/ecommerce';
export declare const createMockOrder: (overrides?: Partial<Order>) => Order;
export declare const createMockOrderItem: (overrides?: Partial<OrderItem>) => OrderItem;
export declare const createMockOrders: {
    processing: () => Order;
    completed: () => Order;
    cancelled: () => Order;
    refunded: () => Order;
    bulk: () => Order;
};
//# sourceMappingURL=order.d.ts.map