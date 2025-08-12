/**
 * Hanjin Express (한진택배) API Connector
 */
export declare class HanjinConnector {
    private apiUrl;
    private apiKey;
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
     * Parse webhook data
     */
    parseWebhook(data: any): Promise<{
        trackingNumber: any;
        status: "delivered" | "pending" | "failed" | "picked_up" | "in_transit" | "out_for_delivery";
        location: any;
        timestamp: Date;
    }>;
    /**
     * Map Hanjin status to standard status
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
//# sourceMappingURL=HanjinConnector.d.ts.map