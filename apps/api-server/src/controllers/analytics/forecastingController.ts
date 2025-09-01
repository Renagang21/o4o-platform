import { Response } from 'express';
import { AuthRequest } from '../../types/auth';
import { ForecastingService, ForecastOptions, DemandForecastOptions, InventoryForecastOptions } from '../../services/forecasting.service';
import { asyncHandler, createForbiddenError, createValidationError } from '../../middleware/errorHandler.middleware';
import logger from '../../utils/logger';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import isBetween from 'dayjs/plugin/isBetween';
import weekOfYear from 'dayjs/plugin/weekOfYear';
import duration from 'dayjs/plugin/duration';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isBetween);
dayjs.extend(weekOfYear);
dayjs.extend(duration);

export class ForecastingController {
  private forecastingService: ForecastingService;

  constructor() {
    this.forecastingService = new ForecastingService();
  }

  // POST /api/forecasting/sales - 판매 예측
  forecastSales = asyncHandler(async (req: AuthRequest, res: Response) => {
    const currentUser = req.user;
    const {
      method = 'linear',
      periods = 6,
      confidence = 0.95,
      seasonality = 12,
      vendorIds,
      categories,
      startDate,
      endDate,
    } = req.body;

    // Check permissions
    if (!['admin', 'manager', 'vendor'].includes(currentUser?.role || '')) {
      throw createForbiddenError('Sales forecasting access required');
    }

    // Validate parameters
    const validMethods = ['linear', 'exponential', 'seasonal', 'arima'];
    if (!validMethods.includes(method)) {
      throw createValidationError(`Invalid method. Must be one of: ${validMethods.join(', ')}`);
    }

    if (periods < 1 || periods > 24) {
      throw createValidationError('Periods must be between 1 and 24');
    }

    if (confidence < 0.5 || confidence > 0.99) {
      throw createValidationError('Confidence must be between 0.5 and 0.99');
    }

    // Build forecast options
    const options: ForecastOptions = {
      method: method as 'linear' | 'exponential' | 'seasonal' | 'arima',
      periods,
      confidence,
      seasonality,
      filters: {}
    };

    // Date range for historical data
    if (startDate) {
      options.filters!.startDate = dayjs(startDate).toDate();
    }
    if (endDate) {
      options.filters!.endDate = dayjs(endDate).toDate();
    }

    // Role-based filtering
    if (currentUser?.role === 'vendor') {
      const vendorData = await this.getVendorByUserId(currentUser.id);
      if (vendorData) {
        options.filters!.vendorIds = [vendorData.id];
      }
    } else if (vendorIds) {
      options.filters!.vendorIds = Array.isArray(vendorIds) ? vendorIds : [vendorIds];
    }

    if (categories) {
      options.filters!.categories = Array.isArray(categories) ? categories : [categories];
    }

    try {
      const forecast = await this.forecastingService.forecastSales(options);

      logger.info('Sales forecast generated successfully', {
        userId: currentUser?.id,
        role: currentUser?.role,
        forecastId: forecast.id,
        method,
        periods,
        confidence,
      });

      res.json({
        success: true,
        data: forecast,
        message: 'Sales forecast generated successfully',
      });
    } catch (error) {
      logger.error('Error generating sales forecast:', {
        userId: currentUser?.id,
        role: currentUser?.role,
        options,
        error: error.message,
      });
      throw error;
    }
  });

  // POST /api/forecasting/demand - 수요 예측
  forecastDemand = asyncHandler(async (req: AuthRequest, res: Response) => {
    const currentUser = req.user;
    const {
      method = 'seasonal',
      periods = 6,
      confidence = 0.95,
      seasonality = 12,
      includePromotion = false,
      includeSeasonality = true,
      includeEvents = false,
      supplierIds,
      categories,
      productIds,
      startDate,
      endDate,
    } = req.body;

    // Check permissions
    if (!['admin', 'manager', 'supplier'].includes(currentUser?.role || '')) {
      throw createForbiddenError('Demand forecasting access required');
    }

    // Validate parameters
    const validMethods = ['linear', 'exponential', 'seasonal', 'arima'];
    if (!validMethods.includes(method)) {
      throw createValidationError(`Invalid method. Must be one of: ${validMethods.join(', ')}`);
    }

    if (periods < 1 || periods > 24) {
      throw createValidationError('Periods must be between 1 and 24');
    }

    // Build forecast options
    const options: DemandForecastOptions = {
      method: method as 'linear' | 'exponential' | 'seasonal' | 'arima',
      periods,
      confidence,
      seasonality,
      includePromotion,
      includeSeasonality,
      includeEvents,
      filters: {}
    };

    // Date range for historical data
    if (startDate) {
      options.filters!.startDate = dayjs(startDate).toDate();
    }
    if (endDate) {
      options.filters!.endDate = dayjs(endDate).toDate();
    }

    // Role-based filtering
    if (currentUser?.role === 'supplier') {
      const supplierData = await this.getSupplierByUserId(currentUser.id);
      if (supplierData) {
        options.filters!.supplierIds = [supplierData.id];
      }
    } else if (supplierIds) {
      options.filters!.supplierIds = Array.isArray(supplierIds) ? supplierIds : [supplierIds];
    }

    if (categories) {
      options.filters!.categories = Array.isArray(categories) ? categories : [categories];
    }

    if (productIds) {
      options.filters!.productIds = Array.isArray(productIds) ? productIds : [productIds];
    }

    try {
      const forecast = await this.forecastingService.forecastDemand(options);

      logger.info('Demand forecast generated successfully', {
        userId: currentUser?.id,
        role: currentUser?.role,
        forecastId: forecast.id,
        method,
        periods,
        includePromotion,
        includeSeasonality,
      });

      res.json({
        success: true,
        data: forecast,
        message: 'Demand forecast generated successfully',
      });
    } catch (error) {
      logger.error('Error generating demand forecast:', {
        userId: currentUser?.id,
        role: currentUser?.role,
        options,
        error: error.message,
      });
      throw error;
    }
  });

  // POST /api/forecasting/inventory - 재고 수준 예측
  forecastInventory = asyncHandler(async (req: AuthRequest, res: Response) => {
    const currentUser = req.user;
    const {
      method = 'seasonal',
      periods = 6,
      confidence = 0.95,
      safetyStock = 0,
      leadTime = 7,
      serviceLevel = 0.95,
      supplierIds,
      categories,
      productIds,
      warehouseIds,
      startDate,
      endDate,
    } = req.body;

    // Check permissions
    if (!['admin', 'manager', 'supplier'].includes(currentUser?.role || '')) {
      throw createForbiddenError('Inventory forecasting access required');
    }

    // Validate parameters
    const validMethods = ['linear', 'exponential', 'seasonal', 'arima'];
    if (!validMethods.includes(method)) {
      throw createValidationError(`Invalid method. Must be one of: ${validMethods.join(', ')}`);
    }

    if (periods < 1 || periods > 12) {
      throw createValidationError('Periods must be between 1 and 12 for inventory forecasting');
    }

    if (serviceLevel < 0.5 || serviceLevel > 0.99) {
      throw createValidationError('Service level must be between 0.5 and 0.99');
    }

    if (leadTime < 1 || leadTime > 90) {
      throw createValidationError('Lead time must be between 1 and 90 days');
    }

    // Build forecast options
    const options: InventoryForecastOptions = {
      method: method as 'linear' | 'exponential' | 'seasonal' | 'arima',
      periods,
      confidence,
      safetyStock,
      leadTime,
      serviceLevel,
      filters: {}
    };

    // Date range for historical data
    if (startDate) {
      options.filters!.startDate = dayjs(startDate).toDate();
    }
    if (endDate) {
      options.filters!.endDate = dayjs(endDate).toDate();
    }

    // Role-based filtering
    if (currentUser?.role === 'supplier') {
      const supplierData = await this.getSupplierByUserId(currentUser.id);
      if (supplierData) {
        options.filters!.supplierIds = [supplierData.id];
      }
    } else if (supplierIds) {
      options.filters!.supplierIds = Array.isArray(supplierIds) ? supplierIds : [supplierIds];
    }

    if (categories) {
      options.filters!.categories = Array.isArray(categories) ? categories : [categories];
    }

    if (productIds) {
      options.filters!.productIds = Array.isArray(productIds) ? productIds : [productIds];
    }

    if (warehouseIds) {
      options.filters!.warehouseIds = Array.isArray(warehouseIds) ? warehouseIds : [warehouseIds];
    }

    try {
      const forecast = await this.forecastingService.forecastInventory(options);

      logger.info('Inventory forecast generated successfully', {
        userId: currentUser?.id,
        role: currentUser?.role,
        forecastId: forecast.id,
        method,
        periods,
        safetyStock,
        leadTime,
        serviceLevel,
      });

      res.json({
        success: true,
        data: forecast,
        message: 'Inventory forecast generated successfully',
      });
    } catch (error) {
      logger.error('Error generating inventory forecast:', {
        userId: currentUser?.id,
        role: currentUser?.role,
        options,
        error: error.message,
      });
      throw error;
    }
  });

  // POST /api/forecasting/revenue - 수익 예측
  forecastRevenue = asyncHandler(async (req: AuthRequest, res: Response) => {
    const currentUser = req.user;
    const {
      method = 'exponential',
      periods = 6,
      confidence = 0.95,
      seasonality = 12,
      vendorIds,
      supplierIds,
      categories,
      startDate,
      endDate,
    } = req.body;

    // Check permissions
    if (!['admin', 'manager', 'vendor', 'supplier'].includes(currentUser?.role || '')) {
      throw createForbiddenError('Revenue forecasting access required');
    }

    // Validate parameters
    const validMethods = ['linear', 'exponential', 'seasonal', 'arima'];
    if (!validMethods.includes(method)) {
      throw createValidationError(`Invalid method. Must be one of: ${validMethods.join(', ')}`);
    }

    if (periods < 1 || periods > 24) {
      throw createValidationError('Periods must be between 1 and 24');
    }

    // Build forecast options
    const options: ForecastOptions = {
      method: method as 'linear' | 'exponential' | 'seasonal' | 'arima',
      periods,
      confidence,
      seasonality,
      filters: {}
    };

    // Date range for historical data
    if (startDate) {
      options.filters!.startDate = dayjs(startDate).toDate();
    }
    if (endDate) {
      options.filters!.endDate = dayjs(endDate).toDate();
    }

    // Role-based filtering
    if (currentUser?.role === 'vendor') {
      const vendorData = await this.getVendorByUserId(currentUser.id);
      if (vendorData) {
        options.filters!.vendorIds = [vendorData.id];
      }
    } else if (currentUser?.role === 'supplier') {
      const supplierData = await this.getSupplierByUserId(currentUser.id);
      if (supplierData) {
        options.filters!.supplierIds = [supplierData.id];
      }
    } else {
      // Admin/Manager can filter by specific entities
      if (vendorIds) {
        options.filters!.vendorIds = Array.isArray(vendorIds) ? vendorIds : [vendorIds];
      }
      if (supplierIds) {
        options.filters!.supplierIds = Array.isArray(supplierIds) ? supplierIds : [supplierIds];
      }
    }

    if (categories) {
      options.filters!.categories = Array.isArray(categories) ? categories : [categories];
    }

    try {
      const forecast = await this.forecastingService.forecastRevenue(options);

      logger.info('Revenue forecast generated successfully', {
        userId: currentUser?.id,
        role: currentUser?.role,
        forecastId: forecast.id,
        method,
        periods,
        confidence,
      });

      res.json({
        success: true,
        data: forecast,
        message: 'Revenue forecast generated successfully',
      });
    } catch (error) {
      logger.error('Error generating revenue forecast:', {
        userId: currentUser?.id,
        role: currentUser?.role,
        options,
        error: error.message,
      });
      throw error;
    }
  });

  // Helper methods
  private async getVendorByUserId(userId: string) {
    try {
      const { AppDataSource } = await import('../../database/connection');
      const vendorRepository = AppDataSource.getRepository('VendorInfo');
      return await vendorRepository.findOne({ where: { userId } });
    } catch (error) {
      logger.error('Error getting vendor by user ID:', error);
      return null;
    }
  }

  private async getSupplierByUserId(userId: string) {
    try {
      const { AppDataSource } = await import('../../database/connection');
      const supplierRepository = AppDataSource.getRepository('Supplier');
      return await supplierRepository.findOne({ 
        where: { contactEmail: userId }
      });
    } catch (error) {
      logger.error('Error getting supplier by user ID:', error);
      return null;
    }
  }
}