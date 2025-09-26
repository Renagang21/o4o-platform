import { AppDataSource } from '../database/connection';
import { cacheService } from './cache.service';
import logger from '../utils/logger';

export interface ForecastOptions {
  method?: 'linear' | 'exponential' | 'seasonal' | 'arima';
  periods: number; // Number of periods to forecast
  confidence?: number; // Confidence level (0.8, 0.9, 0.95)
  seasonality?: number; // Seasonal period (e.g., 12 for monthly data)
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
  period: string; // Date or period identifier
  value: number;
  upperBound?: number;
  lowerBound?: number;
  trend?: number;
  seasonal?: number;
}

export interface ForecastAccuracy {
  mae: number; // Mean Absolute Error
  mape: number; // Mean Absolute Percentage Error
  rmse: number; // Root Mean Square Error
  r2: number; // R-squared
}

export interface DemandForecastOptions extends ForecastOptions {
  includePromotion?: boolean;
  includeSeasonality?: boolean;
  includeEvents?: boolean;
}

export interface InventoryForecastOptions extends ForecastOptions {
  safetyStock?: number;
  leadTime?: number; // Days
  serviceLevel?: number; // 0.95 = 95%
}

export class ForecastingService {
  private generateForecastId(type: string): string {
    return `forecast_${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private hashFilters(filters: any): string {
    return Buffer.from(JSON.stringify(filters)).toString('base64');
  }

  // Sales Forecasting
  async forecastSales(options: ForecastOptions): Promise<ForecastResult> {
    const forecastId = this.generateForecastId('sales');
    const cacheKey = `sales_forecast:${this.hashFilters(options)}:${options.periods}:${options.method}`;
    
    // Check cache
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      return cached as any;
    }

    try {
      // Get historical sales data
      const historicalData = await this.getSalesHistoricalData(options.filters);
      
      if (historicalData.length < 3) {
        throw new Error('Insufficient historical data for forecasting (minimum 3 data points required)');
      }

      // Generate forecast based on selected method
      let forecasts: ForecastPoint[];
      switch (options.method || 'linear') {
        case 'exponential':
          forecasts = this.exponentialSmoothing(historicalData, options.periods);
          break;
        case 'seasonal':
          forecasts = this.seasonalForecasting(historicalData, options.periods, options.seasonality || 12);
          break;
        case 'arima':
          forecasts = this.arimaForecasting(historicalData, options.periods);
          break;
        default:
          forecasts = this.linearTrendForecasting(historicalData, options.periods);
      }

      // Calculate confidence intervals
      if (options.confidence && options.confidence > 0) {
        forecasts = this.addConfidenceIntervals(forecasts, historicalData, options.confidence);
      }

      // Calculate accuracy metrics
      const accuracy = this.calculateAccuracy(historicalData, options.method || 'linear');

      const result: ForecastResult = {
        id: forecastId,
        type: 'sales',
        method: options.method || 'linear',
        periods: options.periods,
        confidence: options.confidence || 0.95,
        forecasts,
        accuracy,
        metadata: {
          totalRecords: historicalData.length,
          trainingPeriod: {
            start: historicalData[0]?.date || '',
            end: historicalData[historicalData.length - 1]?.date || '',
          },
          generatedAt: new Date().toISOString(),
          filters: options.filters,
        },
      };

      // Cache for 1 hour
      await cacheService.set(cacheKey, result, { ttl: 3600 } as any);

      return result;
    } catch (error) {
      logger.error('Error in sales forecasting:', error);
      throw error;
    }
  }

  // Demand Forecasting
  async forecastDemand(options: DemandForecastOptions): Promise<ForecastResult> {
    const forecastId = this.generateForecastId('demand');
    const cacheKey = `demand_forecast:${this.hashFilters(options)}:${options.periods}:${options.method}`;
    
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      return cached as any;
    }

    try {
      // Get historical demand data (orders, inventory movements)
      const historicalData = await this.getDemandHistoricalData(options.filters);
      
      if (historicalData.length < 3) {
        throw new Error('Insufficient historical data for demand forecasting');
      }

      // Adjust data for promotions and events if requested
      let adjustedData = historicalData;
      if (options.includePromotion) {
        adjustedData = this.adjustForPromotions(adjustedData);
      }

      // Generate demand forecast
      let forecasts: ForecastPoint[];
      switch (options.method || 'seasonal') {
        case 'linear':
          forecasts = this.linearTrendForecasting(adjustedData, options.periods);
          break;
        case 'exponential':
          forecasts = this.exponentialSmoothing(adjustedData, options.periods);
          break;
        case 'arima':
          forecasts = this.arimaForecasting(adjustedData, options.periods);
          break;
        default:
          forecasts = this.seasonalForecasting(adjustedData, options.periods, options.seasonality || 12);
      }

      // Add seasonality adjustments if requested
      if (options.includeSeasonality) {
        forecasts = this.addSeasonalityAdjustment(forecasts, adjustedData);
      }

      const accuracy = this.calculateAccuracy(adjustedData, options.method || 'seasonal');

      const result: ForecastResult = {
        id: forecastId,
        type: 'demand',
        method: options.method || 'seasonal',
        periods: options.periods,
        confidence: options.confidence || 0.95,
        forecasts,
        accuracy,
        metadata: {
          totalRecords: adjustedData.length,
          trainingPeriod: {
            start: adjustedData[0]?.date || '',
            end: adjustedData[adjustedData.length - 1]?.date || '',
          },
          generatedAt: new Date().toISOString(),
          filters: options.filters,
        },
      };

      await cacheService.set(cacheKey, result, { ttl: 3600 } as any);
      return result;
    } catch (error) {
      logger.error('Error in demand forecasting:', error);
      throw error;
    }
  }

  // Inventory Level Forecasting
  async forecastInventory(options: InventoryForecastOptions): Promise<ForecastResult> {
    const forecastId = this.generateForecastId('inventory');
    const cacheKey = `inventory_forecast:${this.hashFilters(options)}:${options.periods}:${options.safetyStock}`;
    
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      return cached as any;
    }

    try {
      // Get historical inventory data
      const historicalData = await this.getInventoryHistoricalData(options.filters);
      const demandData = await this.getDemandHistoricalData(options.filters);
      
      if (historicalData.length < 3 || demandData.length < 3) {
        throw new Error('Insufficient historical data for inventory forecasting');
      }

      // Calculate optimal inventory levels based on demand forecast and safety stock
      const demandForecast = await this.forecastDemand({
        ...options,
        method: 'seasonal' // Use seasonal for demand
      });

      // Calculate inventory requirements
      let forecasts: ForecastPoint[] = [];
      const safetyStock = options.safetyStock || 0;
      const leadTime = options.leadTime || 7; // days
      const serviceLevel = options.serviceLevel || 0.95;

      for (let i = 0; i < options.periods; i++) {
        const demandPoint = demandForecast.forecasts[i];
        const leadTimeDemand = demandPoint.value * (leadTime / 30); // Assuming monthly periods
        const safetyStockCalculated = this.calculateSafetyStock(demandData, serviceLevel, leadTime);
        
        const optimalLevel = leadTimeDemand + safetyStockCalculated + safetyStock;
        
        forecasts.push({
          period: demandPoint.period,
          value: optimalLevel,
          upperBound: optimalLevel * 1.2,
          lowerBound: optimalLevel * 0.8,
          trend: demandPoint.trend,
        });
      }

      const accuracy = this.calculateAccuracy(historicalData, 'inventory_optimization');

      const result: ForecastResult = {
        id: forecastId,
        type: 'inventory',
        method: 'inventory_optimization',
        periods: options.periods,
        confidence: options.confidence || 0.95,
        forecasts,
        accuracy,
        metadata: {
          totalRecords: historicalData.length,
          trainingPeriod: {
            start: historicalData[0]?.date || '',
            end: historicalData[historicalData.length - 1]?.date || '',
          },
          generatedAt: new Date().toISOString(),
          filters: options.filters,
        },
      };

      await cacheService.set(cacheKey, result, { ttl: 3600 } as any);
      return result;
    } catch (error) {
      logger.error('Error in inventory forecasting:', error);
      throw error;
    }
  }

  // Revenue Forecasting
  async forecastRevenue(options: ForecastOptions): Promise<ForecastResult> {
    const forecastId = this.generateForecastId('revenue');
    const cacheKey = `revenue_forecast:${this.hashFilters(options)}:${options.periods}:${options.method}`;
    
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      return cached as any;
    }

    try {
      // Get historical revenue data
      const historicalData = await this.getRevenueHistoricalData(options.filters);
      
      if (historicalData.length < 3) {
        throw new Error('Insufficient historical data for revenue forecasting');
      }

      // Generate revenue forecast
      let forecasts: ForecastPoint[];
      switch (options.method || 'exponential') {
        case 'linear':
          forecasts = this.linearTrendForecasting(historicalData, options.periods);
          break;
        case 'seasonal':
          forecasts = this.seasonalForecasting(historicalData, options.periods, options.seasonality || 12);
          break;
        case 'arima':
          forecasts = this.arimaForecasting(historicalData, options.periods);
          break;
        default:
          forecasts = this.exponentialSmoothing(historicalData, options.periods);
      }

      // Add confidence intervals
      if (options.confidence && options.confidence > 0) {
        forecasts = this.addConfidenceIntervals(forecasts, historicalData, options.confidence);
      }

      const accuracy = this.calculateAccuracy(historicalData, options.method || 'exponential');

      const result: ForecastResult = {
        id: forecastId,
        type: 'revenue',
        method: options.method || 'exponential',
        periods: options.periods,
        confidence: options.confidence || 0.95,
        forecasts,
        accuracy,
        metadata: {
          totalRecords: historicalData.length,
          trainingPeriod: {
            start: historicalData[0]?.date || '',
            end: historicalData[historicalData.length - 1]?.date || '',
          },
          generatedAt: new Date().toISOString(),
          filters: options.filters,
        },
      };

      await cacheService.set(cacheKey, result, { ttl: 3600 } as any);
      return result;
    } catch (error) {
      logger.error('Error in revenue forecasting:', error);
      throw error;
    }
  }

  // Forecasting Algorithm Implementations

  private linearTrendForecasting(data: any[], periods: number): ForecastPoint[] {
    const n = data.length;
    if (n < 2) throw new Error('Insufficient data for linear trend');

    // Calculate trend using least squares regression
    const x = data.map((_, i) => i);
    const y = data.map(d => d.value);
    
    const xMean = x.reduce((a, b) => a + b) / n;
    const yMean = y.reduce((a, b) => a + b) / n;
    
    let numerator = 0;
    let denominator = 0;
    
    for (let i = 0; i < n; i++) {
      numerator += (x[i] - xMean) * (y[i] - yMean);
      denominator += (x[i] - xMean) ** 2;
    }
    
    const slope = denominator !== 0 ? numerator / denominator : 0;
    const intercept = yMean - slope * xMean;
    
    // Generate forecasts
    const forecasts: ForecastPoint[] = [];
    const lastDate = new Date(data[n - 1].date);
    
    for (let i = 1; i <= periods; i++) {
      const futureDate = new Date(lastDate);
      futureDate.setMonth(futureDate.getMonth() + i);
      
      const forecastValue = intercept + slope * (n + i - 1);
      
      forecasts.push({
        period: futureDate.toISOString().split('T')[0],
        value: Math.max(0, forecastValue),
        trend: slope
      });
    }
    
    return forecasts;
  }

  private exponentialSmoothing(data: any[], periods: number, alpha: number = 0.3): ForecastPoint[] {
    if (data.length < 1) throw new Error('Insufficient data for exponential smoothing');

    // Calculate smoothed values
    let smoothed = [data[0].value];
    for (let i = 1; i < data.length; i++) {
      smoothed[i] = alpha * data[i].value + (1 - alpha) * smoothed[i - 1];
    }

    // Generate forecasts
    const forecasts: ForecastPoint[] = [];
    const lastDate = new Date(data[data.length - 1].date);
    const lastSmoothed = smoothed[smoothed.length - 1];

    for (let i = 1; i <= periods; i++) {
      const futureDate = new Date(lastDate);
      futureDate.setMonth(futureDate.getMonth() + i);

      forecasts.push({
        period: futureDate.toISOString().split('T')[0],
        value: Math.max(0, lastSmoothed)
      });
    }

    return forecasts;
  }

  private seasonalForecasting(data: any[], periods: number, seasonality: number): ForecastPoint[] {
    if (data.length < seasonality * 2) {
      // Fall back to linear trend if insufficient seasonal data
      return this.linearTrendForecasting(data, periods);
    }

    // Calculate seasonal indices
    const seasonalIndices = this.calculateSeasonalIndices(data, seasonality);
    
    // Deseasonalize data
    const deseasonalized = data.map((d, i) => ({
      ...d,
      value: d.value / seasonalIndices[i % seasonality]
    }));

    // Apply trend forecasting to deseasonalized data
    const trendForecasts = this.linearTrendForecasting(deseasonalized, periods);

    // Reapply seasonality
    const forecasts = trendForecasts.map((f, i) => ({
      ...f,
      value: Math.max(0, f.value * seasonalIndices[i % seasonality]),
      seasonal: seasonalIndices[i % seasonality]
    }));

    return forecasts;
  }

  private arimaForecasting(data: any[], periods: number): ForecastPoint[] {
    // Simplified ARIMA implementation (AR(1) model)
    // In production, consider using a more sophisticated ARIMA library
    
    const values = data.map(d => d.value);
    if (values.length < 3) {
      return this.linearTrendForecasting(data, periods);
    }

    // Calculate AR(1) coefficient
    let numerator = 0;
    let denominator = 0;
    
    for (let i = 1; i < values.length; i++) {
      numerator += values[i] * values[i - 1];
      denominator += values[i - 1] ** 2;
    }
    
    const arCoeff = denominator !== 0 ? numerator / denominator : 0;
    
    // Generate forecasts
    const forecasts: ForecastPoint[] = [];
    const lastDate = new Date(data[data.length - 1].date);
    let lastValue = values[values.length - 1];

    for (let i = 1; i <= periods; i++) {
      const futureDate = new Date(lastDate);
      futureDate.setMonth(futureDate.getMonth() + i);
      
      const forecastValue = arCoeff * lastValue;
      
      forecasts.push({
        period: futureDate.toISOString().split('T')[0],
        value: Math.max(0, forecastValue)
      });
      
      lastValue = forecastValue;
    }

    return forecasts;
  }

  // Helper Methods

  private calculateSeasonalIndices(data: any[], seasonality: number): number[] {
    const seasonalSums = new Array(seasonality).fill(0);
    const seasonalCounts = new Array(seasonality).fill(0);

    data.forEach((d, i) => {
      const seasonIndex = i % seasonality;
      seasonalSums[seasonIndex] += d.value;
      seasonalCounts[seasonIndex]++;
    });

    const seasonalAverages = seasonalSums.map((sum, i) => 
      seasonalCounts[i] > 0 ? sum / seasonalCounts[i] : 1
    );

    const overallAverage = seasonalAverages.reduce((a, b) => a + b) / seasonality;
    
    return seasonalAverages.map(avg => avg / overallAverage);
  }

  private addConfidenceIntervals(forecasts: ForecastPoint[], historicalData: any[], confidence: number): ForecastPoint[] {
    // Calculate standard deviation of historical data
    const values = historicalData.map(d => d.value);
    const mean = values.reduce((a, b) => a + b) / values.length;
    const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
    const stdDev = Math.sqrt(variance);

    // Get z-score for confidence level
    const zScore = this.getZScore(confidence);
    const margin = zScore * stdDev;

    return forecasts.map(f => ({
      ...f,
      upperBound: f.value + margin,
      lowerBound: Math.max(0, f.value - margin)
    }));
  }

  private getZScore(confidence: number): number {
    // Common z-scores for confidence levels
    const zScores: { [key: number]: number } = {
      0.80: 1.282,
      0.90: 1.645,
      0.95: 1.960,
      0.99: 2.576
    };
    
    return zScores[confidence] || 1.960; // Default to 95%
  }

  private calculateSafetyStock(demandData: any[], serviceLevel: number, leadTime: number): number {
    const values = demandData.map(d => d.value);
    const mean = values.reduce((a, b) => a + b) / values.length;
    const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
    const stdDev = Math.sqrt(variance);

    const zScore = this.getZScore(serviceLevel);
    const leadTimeFactor = Math.sqrt(leadTime / 30); // Assuming monthly data

    return zScore * stdDev * leadTimeFactor;
  }

  private adjustForPromotions(data: any[]): any[] {
    // Simple promotion adjustment - in production, this would use actual promotion data
    return data.map(d => ({
      ...d,
      value: d.isPromotionPeriod ? d.value * 0.85 : d.value // Adjust down promotional spikes
    }));
  }

  private addSeasonalityAdjustment(forecasts: ForecastPoint[], historicalData: any[]): ForecastPoint[] {
    // Apply seasonal patterns from historical data
    return forecasts.map((f, i) => {
      const seasonalMultiplier = this.getSeasonalMultiplier(historicalData, i);
      return {
        ...f,
        value: f.value * seasonalMultiplier,
        seasonal: seasonalMultiplier
      };
    });
  }

  private getSeasonalMultiplier(data: any[], periodIndex: number): number {
    // Simple seasonal adjustment based on historical patterns
    const monthIndex = periodIndex % 12;
    const historicalMonthValues = data.filter((_, i) => i % 12 === monthIndex);
    
    if (historicalMonthValues.length === 0) return 1;
    
    const monthAverage = historicalMonthValues.reduce((sum, d) => sum + d.value, 0) / historicalMonthValues.length;
    const overallAverage = data.reduce((sum, d) => sum + d.value, 0) / data.length;
    
    return overallAverage > 0 ? monthAverage / overallAverage : 1;
  }

  private calculateAccuracy(data: any[], method: string): ForecastAccuracy {
    // For demonstration, calculate simple accuracy metrics
    // In production, this would use historical out-of-sample testing
    
    const values = data.map(d => d.value);
    const mean = values.reduce((a, b) => a + b) / values.length;
    
    // Calculate simple metrics based on variance from mean
    let mae = 0;
    let mse = 0;
    let totalAbsoluteValue = 0;
    let totalSquaresDiff = 0;
    
    for (const value of values) {
      const diff = Math.abs(value - mean);
      mae += diff;
      mse += diff ** 2;
      totalAbsoluteValue += Math.abs(value);
      totalSquaresDiff += (value - mean) ** 2;
    }
    
    mae = mae / values.length;
    const rmse = Math.sqrt(mse / values.length);
    const mape = totalAbsoluteValue > 0 ? (mae / (totalAbsoluteValue / values.length)) * 100 : 0;
    
    // Simple R-squared calculation
    const variance = totalSquaresDiff / values.length;
    const r2 = Math.max(0, 1 - (mse / values.length) / variance);
    
    return {
      mae: Number(mae.toFixed(2)),
      mape: Number(Math.min(100, mape).toFixed(2)),
      rmse: Number(rmse.toFixed(2)),
      r2: Number(Math.max(0, r2).toFixed(3))
    };
  }

  // Data Retrieval Methods

  private async getSalesHistoricalData(filters?: any): Promise<any[]> {
    try {
      // TODO: replace with actual database queries for sales historical data
      return [];
    } catch (error) {
      logger.error('Error fetching sales historical data:', error);
      return [];
    }
  }

  private async getDemandHistoricalData(filters?: any): Promise<any[]> {
    try {
      // TODO: replace with actual order/demand data from database
      return [];
    } catch (error) {
      logger.error('Error fetching demand historical data:', error);
      return [];
    }
  }

  private async getInventoryHistoricalData(filters?: any): Promise<any[]> {
    try {
      const { AppDataSource } = await import('../database/connection');
      const inventoryRepository = AppDataSource.getRepository('Inventory');
      const stockMovementRepository = AppDataSource.getRepository('StockMovement');
      
      // Get historical inventory levels from stock movements
      let query = stockMovementRepository.createQueryBuilder('movement')
        .leftJoinAndSelect('movement.inventory', 'inventory')
        .where('movement.createdAt >= :startDate', { 
          startDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) // Last 12 months
        })
        .orderBy('movement.createdAt', 'ASC');
        
      // Apply filters
      if (filters?.supplierIds) {
        query = query.andWhere('inventory.supplierId IN (:...supplierIds)', { supplierIds: filters.supplierIds });
      }
      
      if (filters?.categories) {
        query = query.andWhere('inventory.productCategory IN (:...categories)', { categories: filters.categories });
      }
      
      const movements = await query.getMany();
      
      if (movements.length === 0) {
        // Fallback to current inventory if no movements
        const inventoryItems = await inventoryRepository.find({
          where: filters?.supplierIds ? { supplierId: filters.supplierIds[0] } : {},
          take: 100
        });
        
        // Return empty data if no inventory movements available
        return [];
      }
      
      // Group movements by month and calculate average inventory levels
      const monthlyData = new Map();
      
      movements.forEach(movement => {
        const monthKey = movement.createdAt.toISOString().substring(0, 7); // YYYY-MM
        if (!monthlyData.has(monthKey)) {
          monthlyData.set(monthKey, { totalValue: 0, count: 0 });
        }
        const month = monthlyData.get(monthKey);
        month.totalValue += movement.afterQuantity * (movement.inventory?.unitCost || 0);
        month.count += 1;
      });
      
      // Convert to array format
      const historicalData = Array.from(monthlyData.entries())
        .map(([date, data]) => ({
          date: date + '-01',
          value: data.count > 0 ? data.totalValue / data.count : 0
        }))
        .sort((a, b) => a.date.localeCompare(b.date));
        
      return historicalData;
    } catch (error) {
      logger.error('Error fetching inventory historical data:', error);
      
      // Return empty data on error
      return [];
    }
  }

  private async getRevenueHistoricalData(filters?: any): Promise<any[]> {
    try {
      // TODO: replace with actual revenue data from database
      return [];
    } catch (error) {
      logger.error('Error fetching revenue historical data:', error);
      return [];
    }
  }
}