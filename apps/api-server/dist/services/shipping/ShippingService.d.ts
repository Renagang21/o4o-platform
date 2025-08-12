/**
 * Shipping Service
 * 배송사 통합 서비스
 */
import { Shipment } from '../../entities/Shipment';
import { ShippingCarrier } from '../../entities/ShippingCarrier';
export interface ShippingLabel {
    trackingNumber: string;
    carrier: string;
    labelUrl?: string;
    estimatedDelivery?: Date;
    shippingCost: number;
}
export interface TrackingInfo {
    trackingNumber: string;
    carrier: string;
    status: 'pending' | 'picked_up' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'failed';
    currentLocation?: string;
    estimatedDelivery?: Date;
    events: TrackingEvent[];
}
export interface TrackingEvent {
    timestamp: Date;
    location: string;
    status: string;
    description: string;
}
export interface ShippingRate {
    carrier: string;
    serviceName: string;
    estimatedDays: number;
    cost: number;
    available: boolean;
}
export declare class ShippingService {
    private orderRepository;
    private shipmentRepository;
    private carrierRepository;
    private connectors;
    constructor();
    /**
     * Calculate shipping rates for an order
     */
    calculateShippingRates(orderId: string): Promise<ShippingRate[]>;
    /**
     * Create shipping label and tracking number
     */
    createShippingLabel(orderId: string, carrierCode: string): Promise<ShippingLabel>;
    /**
     * Track shipment status
     */
    trackShipment(trackingNumber: string, carrier?: string): Promise<TrackingInfo>;
    /**
     * Update tracking for all active shipments
     */
    updateAllTracking(): Promise<void>;
    /**
     * Cancel shipment
     */
    cancelShipment(trackingNumber: string): Promise<boolean>;
    /**
     * Get shipping history for an order
     */
    getShippingHistory(orderId: string): Promise<Shipment[]>;
    /**
     * Webhook handler for carrier updates
     */
    handleCarrierWebhook(carrier: string, data: any): Promise<void>;
    /**
     * Helper: Calculate total weight of order items
     */
    private calculateTotalWeight;
    /**
     * Helper: Get default sender address
     */
    private getDefaultSenderAddress;
    /**
     * Get available carriers
     */
    getAvailableCarriers(): Promise<ShippingCarrier[]>;
    /**
     * Register new carrier
     */
    registerCarrier(carrierData: {
        code: string;
        name: string;
        apiUrl?: string;
        apiKey?: string;
        supportsCod?: boolean;
        supportsInsurance?: boolean;
    }): Promise<ShippingCarrier>;
}
export declare const shippingService: ShippingService;
//# sourceMappingURL=ShippingService.d.ts.map