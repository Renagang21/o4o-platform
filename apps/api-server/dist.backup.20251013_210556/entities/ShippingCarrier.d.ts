export declare class ShippingCarrier {
    id: string;
    code: string;
    name: string;
    apiUrl?: string;
    apiKey?: string;
    apiSecret?: string;
    webhookUrl?: string;
    isActive: boolean;
    supportsCod: boolean;
    supportsInsurance: boolean;
    supportsInternational: boolean;
    baseRate?: number;
    weightRate?: number;
    regionRates?: Record<string, number>;
    settings?: Record<string, any>;
    priority: number;
    trackingUrlTemplate?: string;
    workingHours?: {
        weekdays: {
            start: string;
            end: string;
        };
        saturday?: {
            start: string;
            end: string;
        };
        sunday?: {
            start: string;
            end: string;
        };
    };
    serviceAreas?: string[];
    customerServicePhone?: string;
    customerServiceEmail?: string;
    createdAt: Date;
    updatedAt: Date;
}
//# sourceMappingURL=ShippingCarrier.d.ts.map