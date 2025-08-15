import { Order } from './Order';
import { Product } from './Product';
export declare class OrderItem {
    id: string;
    orderId: string;
    order: Order;
    productId: string;
    product: Product;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    productSnapshot: {
        name: string;
        sku: string;
        image: string;
        description?: string;
        weight?: number;
        category?: string;
    };
    supplierOrderId?: string;
    trackingNumber?: string;
    status?: string;
    createdAt: Date;
    updatedAt: Date;
    get price(): number;
}
//# sourceMappingURL=OrderItem.d.ts.map