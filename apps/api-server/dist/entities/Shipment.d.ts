import { Order } from './Order';
export declare class Shipment {
    id: string;
    orderId: string;
    order?: Order;
    trackingNumber: string;
    carrier: string;
    status: string;
    shippingAddress?: {
        name: string;
        phone: string;
        address1: string;
        address2?: string;
        city: string;
        state: string;
        postalCode: string;
        country: string;
    };
    items?: Array<{
        productId: string;
        productName: string;
        quantity: number;
        weight: number;
    }>;
    currentLocation?: string;
    labelUrl?: string;
    shippingCost: number;
    estimatedDelivery?: Date;
    actualDelivery?: Date;
    trackingEvents?: Array<{
        timestamp: Date;
        location: string;
        status: string;
        description: string;
    }>;
    lastUpdated?: Date;
    cancelledAt?: Date;
    cancelReason?: string;
    metadata?: Record<string, any>;
    createdAt: Date;
    updatedAt: Date;
}
//# sourceMappingURL=Shipment.d.ts.map