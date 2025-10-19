import { Shipment } from './Shipment';
export declare class ShipmentTrackingHistory {
    id: number;
    shipmentId: number;
    shipment?: Shipment;
    status: string;
    location?: string;
    description?: string;
    trackingTime: Date;
    createdAt: Date;
}
//# sourceMappingURL=ShipmentTrackingHistory.d.ts.map