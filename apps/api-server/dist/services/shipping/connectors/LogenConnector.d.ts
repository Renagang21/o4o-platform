/**
 * Logen (로젠택배) API Connector
 */
export declare class LogenConnector {
    private apiUrl;
    private apiKey;
    constructor();
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
    createLabel(params: any): Promise<{
        trackingNumber: string;
        labelUrl: string;
        estimatedDelivery: Date;
        cost: number;
    }>;
    track(trackingNumber: string): Promise<{
        status: "in_transit";
        currentLocation: string;
        estimatedDelivery: Date;
        events: {
            timestamp: Date;
            location: string;
            status: string;
            description: string;
        }[];
    }>;
    cancelLabel(trackingNumber: string): Promise<boolean>;
    parseWebhook(data: any): Promise<any>;
}
//# sourceMappingURL=LogenConnector.d.ts.map