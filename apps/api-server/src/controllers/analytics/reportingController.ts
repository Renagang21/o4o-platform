import { Response } from 'express';
import { AuthRequest } from '../../types/auth';
import { ReportingService, ReportOptions } from '../../services/reporting.service';

// Define CustomReportConfig locally if not exported
interface CustomReportConfig {
  metrics?: string[];
  dimensions?: string[];
  filters?: any;
  aggregations?: any;
}
import { asyncHandler, createForbiddenError, createValidationError, createNotFoundError } from '../../middleware/errorHandler.middleware';
import { cacheService } from '../../services/cache.service';
import logger from '../../utils/logger';
import moment from 'moment';
import * as fs from 'fs';
import * as path from 'path';

export class ReportingController {
  private reportingService: ReportingService;

  constructor() {
    this.reportingService = new ReportingService();
  }

  // POST /api/reports/inventory - 재고 보고서 생성
  generateInventoryReport = asyncHandler(async (req: AuthRequest, res: Response) => {
    const currentUser = req.user;
    const {
      format = 'json',
      startDate,
      endDate,
      includeImages = 'false',
      supplierIds,
      categories,
      warehouseIds,
      stockLevels,
      includeInactive = 'false',
    } = req.body;

    // Check permissions
    if (!['admin', 'manager', 'supplier'].includes(currentUser?.role || '')) {
      throw createForbiddenError('Inventory report access required');
    }

    // Validate format
    const validFormats = ['json', 'csv', 'excel', 'pdf'];
    if (!validFormats.includes(format)) {
      throw createValidationError(`Invalid format. Must be one of: ${validFormats.join(', ')}`);
    }

    // Parse dates
    const start = startDate 
      ? moment(startDate).toDate()
      : moment().subtract(30, 'days').toDate();
    const end = endDate 
      ? moment(endDate).toDate() 
      : new Date();

    // Build report options
    const options: ReportOptions = {
      format: format as 'json' | 'csv' | 'excel' | 'pdf',
      startDate: start,
      endDate: end,
      includeImages: includeImages === 'true',
      filters: {}
    };

    // Role-based filtering
    if (currentUser?.role === 'supplier') {
      const supplierData = await this.getSupplierByUserId(currentUser.id);
      if (supplierData) {
        options.filters.supplierIds = [supplierData.id];
      }
    } else if (supplierIds) {
      options.filters.supplierIds = Array.isArray(supplierIds) ? supplierIds : [supplierIds];
    }

    if (categories) {
      options.filters.categories = Array.isArray(categories) ? categories : [categories];
    }

    if (warehouseIds) {
      options.filters.warehouseIds = Array.isArray(warehouseIds) ? warehouseIds : [warehouseIds];
    }

    if (stockLevels) {
      options.filters.stockLevels = Array.isArray(stockLevels) ? stockLevels : [stockLevels];
    }

    options.filters.includeInactive = includeInactive === 'true';

    try {
      const report = await this.reportingService.generateInventoryReport(options);

      logger.info('Inventory report generated successfully', {
        userId: currentUser?.id,
        role: currentUser?.role,
        reportId: report.id,
        format,
        recordCount: report.metadata?.totalRecords || 0,
      });

      res.json({
        success: true,
        data: report,
        message: 'Inventory report generated successfully',
      });
    } catch (error) {
      logger.error('Error generating inventory report:', {
        userId: currentUser?.id,
        role: currentUser?.role,
        options,
        error: error.message,
      });
      throw error;
    }
  });

  // POST /api/reports/sales - 판매 보고서 생성
  generateSalesReport = asyncHandler(async (req: AuthRequest, res: Response) => {
    const currentUser = req.user;
    const {
      format = 'json',
      startDate,
      endDate,
      vendorIds,
      supplierIds,
      categories,
      groupBy = 'day',
      includeCharts = 'true',
    } = req.body;

    // Check permissions
    if (!['admin', 'manager', 'vendor'].includes(currentUser?.role || '')) {
      throw createForbiddenError('Sales report access required');
    }

    // Validate format
    const validFormats = ['json', 'csv', 'excel', 'pdf'];
    if (!validFormats.includes(format)) {
      throw createValidationError(`Invalid format. Must be one of: ${validFormats.join(', ')}`);
    }

    // Validate groupBy parameter
    if (!['day', 'week', 'month'].includes(groupBy)) {
      throw createValidationError('Invalid groupBy parameter. Must be day, week, or month');
    }

    // Default date range (last 30 days)
    const start = startDate 
      ? moment(startDate).toDate()
      : moment().subtract(30, 'days').toDate();
    const end = endDate 
      ? moment(endDate).toDate() 
      : new Date();

    // Build report options
    const options: ReportOptions & { period: string } = {
      format: format as 'json' | 'csv' | 'excel' | 'pdf',
      startDate: start,
      endDate: end,
      includeCharts: includeCharts === 'true',
      filters: {},
      groupBy: groupBy as 'day' | 'week' | 'month',
      period: groupBy || 'day'
    };

    // Role-based filtering
    if (currentUser?.role === 'vendor') {
      const vendorData = await this.getVendorByUserId(currentUser.id);
      if (vendorData) {
        options.filters!.vendorIds = [vendorData.id];
      }
    } else if (vendorIds) {
      options.filters!.vendorIds = Array.isArray(vendorIds) ? vendorIds : [vendorIds];
    }

    if (supplierIds) {
      options.filters!.supplierIds = Array.isArray(supplierIds) ? supplierIds : [supplierIds];
    }

    if (categories) {
      options.filters!.categories = Array.isArray(categories) ? categories : [categories];
    }

    try {
      const report = await this.reportingService.generateSalesReport(options);

      logger.info('Sales report generated successfully', {
        userId: currentUser?.id,
        role: currentUser?.role,
        reportId: report.id,
        format,
        period: `${start.toISOString().split('T')[0]} to ${end.toISOString().split('T')[0]}`,
        recordCount: report.metadata?.totalRecords || 0,
      });

      res.json({
        success: true,
        data: report,
        message: 'Sales report generated successfully',
      });
    } catch (error) {
      logger.error('Error generating sales report:', {
        userId: currentUser?.id,
        role: currentUser?.role,
        options,
        error: error.message,
      });
      throw error;
    }
  });

  // POST /api/reports/commission - 수수료/정산 보고서 생성
  generateCommissionReport = asyncHandler(async (req: AuthRequest, res: Response) => {
    const currentUser = req.user;
    const {
      format = 'json',
      startDate,
      endDate,
      reportType = 'all', // 'vendor', 'supplier', 'all'
      vendorIds,
      supplierIds,
      status, // 'pending', 'approved', 'paid'
      includeDetails = 'true',
    } = req.body;

    // Check permissions
    if (!['admin', 'manager', 'vendor', 'supplier'].includes(currentUser?.role || '')) {
      throw createForbiddenError('Commission report access required');
    }

    // Validate format
    const validFormats = ['json', 'csv', 'excel', 'pdf'];
    if (!validFormats.includes(format)) {
      throw createValidationError(`Invalid format. Must be one of: ${validFormats.join(', ')}`);
    }

    // Validate report type
    const validReportTypes = ['vendor', 'supplier', 'all'];
    if (!validReportTypes.includes(reportType)) {
      throw createValidationError(`Invalid reportType. Must be one of: ${validReportTypes.join(', ')}`);
    }

    // Default date range (current month)
    const start = startDate 
      ? moment(startDate).toDate()
      : moment().startOf('month').toDate();
    const end = endDate 
      ? moment(endDate).toDate() 
      : moment().endOf('month').toDate();

    // Build report options
    const options: ReportOptions = {
      format: format as 'json' | 'csv' | 'excel' | 'pdf',
      startDate: start,
      endDate: end,
      includeDetails: includeDetails === 'true',
      filters: {},
      reportType
    };

    // Role-based filtering
    if (currentUser?.role === 'vendor') {
      const vendorData = await this.getVendorByUserId(currentUser.id);
      if (vendorData) {
        options.filters.vendorIds = [vendorData.id];
        options.reportType = 'vendor';
      }
    } else if (currentUser?.role === 'supplier') {
      const supplierData = await this.getSupplierByUserId(currentUser.id);
      if (supplierData) {
        options.filters.supplierIds = [supplierData.id];
        options.reportType = 'supplier';
      }
    } else {
      // Admin/Manager can filter by specific vendors/suppliers
      if (vendorIds) {
        options.filters.vendorIds = Array.isArray(vendorIds) ? vendorIds : [vendorIds];
      }
      if (supplierIds) {
        options.filters.supplierIds = Array.isArray(supplierIds) ? supplierIds : [supplierIds];
      }
    }

    if (status) {
      options.filters.status = Array.isArray(status) ? status : [status];
    }

    try {
      const report = await this.reportingService.generateCommissionReport(options);

      logger.info('Commission report generated successfully', {
        userId: currentUser?.id,
        role: currentUser?.role,
        reportId: report.id,
        format,
        reportType,
        period: `${start.toISOString().split('T')[0]} to ${end.toISOString().split('T')[0]}`,
        recordCount: report.metadata?.totalRecords || 0,
      });

      res.json({
        success: true,
        data: report,
        message: 'Commission report generated successfully',
      });
    } catch (error) {
      logger.error('Error generating commission report:', {
        userId: currentUser?.id,
        role: currentUser?.role,
        options,
        error: error.message,
      });
      throw error;
    }
  });

  // POST /api/reports/custom - 사용자 정의 보고서 생성
  generateCustomReport = asyncHandler(async (req: AuthRequest, res: Response) => {
    const currentUser = req.user;
    const {
      format = 'json',
      config,
    } = req.body;

    // Check permissions
    if (!['admin', 'manager'].includes(currentUser?.role || '')) {
      throw createForbiddenError('Custom report access required');
    }

    // Validate format
    const validFormats = ['json', 'csv', 'excel', 'pdf'];
    if (!validFormats.includes(format)) {
      throw createValidationError(`Invalid format. Must be one of: ${validFormats.join(', ')}`);
    }

    // Validate config
    if (!config || typeof config !== 'object') {
      throw createValidationError('Report configuration is required');
    }

    if (!config.title || !config.dataSources || !Array.isArray(config.dataSources)) {
      throw createValidationError('Report config must include title and dataSources array');
    }

    // Validate data sources
    const validDataSources = ['inventory', 'sales', 'commissions', 'vendors', 'suppliers', 'products'];
    const invalidSources = config.dataSources.filter((source: string) => !validDataSources.includes(source));
    if (invalidSources.length > 0) {
      throw createValidationError(`Invalid data sources: ${invalidSources.join(', ')}. Valid sources: ${validDataSources.join(', ')}`);
    }

    // Build report options
    const options: ReportOptions = {
      format: format as 'json' | 'csv' | 'excel' | 'pdf',
      startDate: config.startDate ? new Date(config.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate: config.endDate ? new Date(config.endDate) : new Date(),
      customConfig: config as CustomReportConfig,
      filters: config.filters || {}
    };

    try {
      const report = await this.reportingService.generateCustomReport('custom', options);

      logger.info('Custom report generated successfully', {
        userId: currentUser?.id,
        role: currentUser?.role,
        reportId: report.id,
        format,
        title: config.title,
        dataSources: config.dataSources,
        recordCount: report.metadata?.totalRecords || 0,
      });

      res.json({
        success: true,
        data: report,
        message: 'Custom report generated successfully',
      });
    } catch (error) {
      logger.error('Error generating custom report:', {
        userId: currentUser?.id,
        role: currentUser?.role,
        config,
        error: error.message,
      });
      throw error;
    }
  });

  // GET /api/reports/:reportId/download - 보고서 파일 다운로드
  downloadReport = asyncHandler(async (req: AuthRequest, res: Response) => {
    const currentUser = req.user;
    const { reportId } = req.params;

    // Check permissions
    if (!['admin', 'manager', 'vendor', 'supplier'].includes(currentUser?.role || '')) {
      throw createForbiddenError('Report download access required');
    }

    try {
      const reportData = await this.reportingService.getReport(reportId);
      
      if (!reportData) {
        throw createNotFoundError('Report not found');
      }

      // Check if user has permission to access this report
      if (!this.canUserAccessReport(currentUser, reportData)) {
        throw createForbiddenError('Access denied to this report');
      }

      if (!reportData.filePath) {
        throw createNotFoundError('Report file not found');
      }

      const filePath = path.resolve(reportData.filePath);
      
      // Verify file exists
      if (!fs.existsSync(filePath)) {
        throw createNotFoundError('Report file does not exist');
      }

      // Get file stats for headers
      const stats = fs.statSync(filePath);
      const filename = path.basename(filePath);

      // Set download headers
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Type', this.getContentType(reportData.format));
      res.setHeader('Content-Length', stats.size);

      // Log download
      logger.info('Report downloaded', {
        userId: currentUser?.id,
        role: currentUser?.role,
        reportId,
        filename,
        size: stats.size,
      });

      // Stream file
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    } catch (error) {
      logger.error('Error downloading report:', {
        userId: currentUser?.id,
        role: currentUser?.role,
        reportId,
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

  private canUserAccessReport(user: any, reportData: any): boolean {
    // Admin and managers can access all reports
    if (['admin', 'manager'].includes(user?.role)) {
      return true;
    }

    // For vendor/supplier, check if report belongs to them
    // This would need to be implemented based on how reports store ownership
    // For now, allow access (in real implementation, check report metadata)
    return true;
  }

  private getContentType(format: string): string {
    switch (format) {
      case 'csv':
        return 'text/csv';
      case 'excel':
        return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      case 'pdf':
        return 'application/pdf';
      default:
        return 'application/json';
    }
  }
}