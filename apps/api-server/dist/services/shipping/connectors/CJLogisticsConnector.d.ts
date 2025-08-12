/**
 * CJ Logistics (CJ대한통운) API Connector
 */
export declare class CJLogisticsConnector {
    private apiUrl;
    private apiKey;
    private customerCode;
    constructor();
    /**
     * Get shipping rate
     */
    getRate(params: {
        weight: number;
        destination: any;
        items: any[];
    }): Promise<{
        serviceName: string;
        estimatedDays: number;
        cost: number;
        available: boolean;
    }>;
    /**
     * Create shipping label
     */
    createLabel(params: {
        order: any;
        sender: any;
        receiver: any;
        items: any[];
        cod?: boolean;
        insurance?: boolean;
    }): Promise<{
        trackingNumber: any;
        labelUrl: string;
        estimatedDelivery: Date;
        cost: number;
    }>;
    /**
     * Track shipment
     */
    track(trackingNumber: string): Promise<{
        status: "delivered" | "pending" | "failed" | "picked_up" | "in_transit" | "out_for_delivery";
        currentLocation: string;
        estimatedDelivery: Date;
        events: {
            timestamp: Date;
            location: string;
            status: string;
            description: string;
        }[];
    }>;
    /**
     * Cancel shipping label
     */
    cancelLabel(trackingNumber: string): Promise<boolean>;
    /**
     * Parse webhook data from CJ
     */
    parseWebhook(data: any): Promise<{
        trackingNumber: any;
        status: "delivered" | "pending" | "failed" | "picked_up" | "in_transit" | "out_for_delivery";
        location: any;
        timestamp: Date;
    }>;
    /**
     * Map CJ status to our standard status
     */
    private mapStatus;
    /**
     * Generate mock tracking number
     */
    private generateTrackingNumber;
    /**
     * Mock create label response
     */
    private mockCreateLabel;
    /**
     * Get mock tracking data
     */
    private getMockTrackingData;
}
//# sourceMappingURL=CJLogisticsConnector.d.ts.map