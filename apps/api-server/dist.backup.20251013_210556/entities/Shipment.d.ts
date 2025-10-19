export declare class Shipment {
    id: number;
    orderId: number;
    trackingNumber?: string;
    carrier: string;
    carrierCode?: string;
    status: string;
    shippedAt?: Date;
    deliveredAt?: Date;
    expectedDeliveryDate?: Date;
    shippingAddress?: {
        senderName?: string;
        senderPhone?: string;
        senderAddress?: string;
        senderPostalCode?: string;
        recipientName?: string;
        recipientPhone?: string;
        recipientAddress?: string;
        recipientPostalCode?: string;
    };
    shippingCost: number;
    items?: any[];
    currentLocation?: string;
    labelUrl?: string;
    trackingEvents?: any[];
    lastUpdated?: Date;
    cancelledAt?: Date;
    cancelReason?: string;
    metadata?: Record<string, any>;
    createdAt: Date;
    updatedAt: Date;
}
//# sourceMappingURL=Shipment.d.ts.map