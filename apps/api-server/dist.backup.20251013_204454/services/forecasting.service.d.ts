export interface ForecastOptions {
    method?: 'linear' | 'exponential' | 'seasonal' | 'arima';
    periods: number;
    confidence?: number;
    seasonality?: number;
    filters?: {
        vendorIds?: string[];
        supplierIds?: string[];
        categories?: string[];
        productIds?: string[];
        warehouseIds?: string[];
        startDate?: Date;
        endDate?: Date;
    };
}
export interface ForecastResult {
    id: string;
    type: 'sales' | 'inventory' | 'demand' | 'revenue';
    method: string;
    periods: number;
    confidence: number;
    forecasts: ForecastPoint[];
    accuracy: ForecastAccuracy;
    metadata: {
        totalRecords: number;
        trainingPeriod: {
            start: string;
            end: string;
        };
        generatedAt: string;
        filters?: any;
    };
}
export interface ForecastPoint {
    period: string;
    value: number;
    upperBound?: number;
    lowerBound?: number;
    trend?: number;
    seasonal?: number;
}
export interface ForecastAccuracy {
    mae: number;
    mape: number;
    rmse: number;
    r2: number;
}
export interface DemandForecastOptions extends ForecastOptions {
    includePromotion?: boolean;
    includeSeasonality?: boolean;
    includeEvents?: boolean;
}
export interface InventoryForecastOptions extends ForecastOptions {
    safetyStock?: number;
    leadTime?: number;
    serviceLevel?: number;
}
export declare class ForecastingService {
    private generateForecastId;
    private hashFilters;
    forecastSales(options: ForecastOptions): Promise<ForecastResult>;
    forecastDemand(options: DemandForecastOptions): Promise<ForecastResult>;
    forecastInventory(options: InventoryForecastOptions): Promise<ForecastResult>;
    forecastRevenue(options: ForecastOptions): Promise<ForecastResult>;
    private linearTrendForecasting;
    private exponentialSmoothing;
    private seasonalForecasting;
    private arimaForecasting;
    private calculateSeasonalIndices;
    private addConfidenceIntervals;
    private getZScore;
    private calculateSafetyStock;
    private adjustForPromotions;
    private addSeasonalityAdjustment;
    private getSeasonalMultiplier;
    private calculateAccuracy;
    private getSalesHistoricalData;
    private getDemandHistoricalData;
    private getInventoryHistoricalData;
    private getRevenueHistoricalData;
}
//# sourceMappingURL=forecasting.service.d.ts.map