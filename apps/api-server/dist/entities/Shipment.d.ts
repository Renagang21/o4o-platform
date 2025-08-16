import { Order } from './Order';
export declare class Shipment {
    id: number;
    orderId: number;
    order?: Order;
    trackingNumber?: string;
    carrier: string;
    carrierCode?: string;
    status: string;
    shippedAt?: Date;
    deliveredAt?: Date;
    expectedDeliveryDate?: Date;
    senderName: string;
    senderPhone: string;
    senderAddress: string;
    senderPostalCode?: string;
    recipientName: string;
    recipientPhone: string;
    recipientAddress: string;
    recipientPostalCode?: string;
    shippingCost: number;
    insuranceAmount?: number;
    weight?: number;
    dimensions?: {
        length: number;
        width: number;
        height: number;
    };
    notes?: string;
    deliveryMessage?: string;
    signatureRequired: boolean;
    signatureImage?: string;
    failedReason?: string;
    returnReason?: string;
    metadata?: Record<string, any>;
    createdAt: Date;
    updatedAt: Date;
}
//# sourceMappingURL=Shipment.d.ts.map