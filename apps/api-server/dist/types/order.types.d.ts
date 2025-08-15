import { Order } from '../entities/Order';
import { OrderItem } from '../entities/OrderItem';
export interface VendorOrder extends Order {
    customer?: {
        name: string;
        email: string;
    };
}
export interface VendorOrderItem extends OrderItem {
    price: number;
}
export interface OrderStats {
    totalOrders: number;
    pendingOrders: number;
    completedOrders: number;
    totalRevenue: number;
}
//# sourceMappingURL=order.types.d.ts.map