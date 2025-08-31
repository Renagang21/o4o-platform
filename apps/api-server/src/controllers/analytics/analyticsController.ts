import { Response } from 'express';
import { AuthRequest } from '../../types/auth';
import { AnalyticsService, AnalyticsFilter } from '../../services/analytics.service';
import { asyncHandler, createForbiddenError, createValidationError } from '../../middleware/errorHandler.middleware';
import { cacheService } from '../../services/cache.service';
import logger from '../../utils/logger';
import moment from 'moment';

export class AnalyticsController {
  private analyticsService: AnalyticsService;

  constructor() {
    this.analyticsService = new AnalyticsService();
  }

  // GET /api/analytics/dashboard - 통합 대시보드 데이터
  getDashboard = asyncHandler(async (req: AuthRequest, res: Response) => {
    const currentUser = req.user;
    const {
      startDate,
      endDate,
      vendorIds,
      supplierIds,
      categories,
      includeInsights = 'true',
    } = req.query;

    // Check permissions
    if (!['admin', 'manager', 'vendor', 'supplier'].includes(currentUser?.role || '')) {
      throw createForbiddenError('Analytics access required');
    }

    // Build filters based on user role and parameters
    const filters: AnalyticsFilter = {};
    
    if (startDate) {
      filters.startDate = moment(startDate as string).toDate();
    }
    
    if (endDate) {
      filters.endDate = moment(endDate as string).toDate();
    }

    // Role-based filtering
    if (currentUser?.role === 'vendor') {
      // Vendors can only see their own data
      const vendorData = await this.getVendorByUserId(currentUser.id);
      if (vendorData) {
        filters.vendorIds = [vendorData.id];
      }
    } else if (currentUser?.role === 'supplier') {
      // Suppliers can only see their own data
      const supplierData = await this.getSupplierByUserId(currentUser.id);
      if (supplierData) {
        filters.supplierIds = [supplierData.id];
      }
    } else {
      // Admin/Manager can filter by specific vendors/suppliers
      if (vendorIds) {
        filters.vendorIds = Array.isArray(vendorIds) ? (vendorIds as string[]) : [vendorIds as string];
      }
      if (supplierIds) {
        filters.supplierIds = Array.isArray(supplierIds) ? (supplierIds as string[]) : [supplierIds as string];
      }
    }

    if (categories) {
      filters.categories = Array.isArray(categories) ? (categories as string[]) : [categories as string];
    }

    try {
      const dashboard = await this.analyticsService.getDashboardAnalytics(filters);

      // Add cache metadata
      res.set('X-Cache-Key', `dashboard:${currentUser?.role}:${currentUser?.id}`);
      
      res.json({
        success: true,
        data: dashboard,
        message: 'Dashboard analytics retrieved successfully',
      });
    } catch (error) {
      logger.error('Error retrieving dashboard analytics:', {
        userId: currentUser?.id,
        role: currentUser?.role,
        filters,
        error: error.message,
      });
      throw error;
    }
  });

  // GET /api/analytics/inventory/overview - 재고 현황 분석
  getInventoryOverview = asyncHandler(async (req: AuthRequest, res: Response) => {
    const currentUser = req.user;
    const {
      categories,
      supplierIds,
      warehouseIds,
      includeAlerts = 'true',
      includeTrends = 'true',
    } = req.query;

    // Check permissions
    if (!['admin', 'manager', 'supplier'].includes(currentUser?.role || '')) {
      throw createForbiddenError('Inventory analytics access required');
    }

    const filters: AnalyticsFilter = {};
    
    if (categories) {
      filters.categories = Array.isArray(categories) ? (categories as string[]) : [categories as string];
    }

    // Role-based filtering
    if (currentUser?.role === 'supplier') {
      const supplierData = await this.getSupplierByUserId(currentUser.id);
      if (supplierData) {
        filters.supplierIds = [supplierData.id];
      }
    } else if (supplierIds) {
      filters.supplierIds = Array.isArray(supplierIds) ? (supplierIds as string[]) : [supplierIds as string];
    }

    if (warehouseIds) {
      filters.warehouseIds = Array.isArray(warehouseIds) ? (warehouseIds as string[]) : [warehouseIds as string];
    }

    try {
      const overview = await this.analyticsService.getInventoryOverview(filters);

      res.json({
        success: true,
        data: overview,
        message: 'Inventory overview retrieved successfully',
      });
    } catch (error) {
      logger.error('Error retrieving inventory overview:', {
        userId: currentUser?.id,
        role: currentUser?.role,
        filters,
        error: error.message,
      });
      throw error;
    }
  });

  // GET /api/analytics/sales/trends - 판매 트렌드 분석
  getSalesTrends = asyncHandler(async (req: AuthRequest, res: Response) => {
    const currentUser = req.user;
    const {
      startDate,
      endDate,
      groupBy = 'day',
      vendorIds,
      categories,
      compareWithPrevious = 'false',
    } = req.query;

    // Check permissions
    if (!['admin', 'manager', 'vendor'].includes(currentUser?.role || '')) {
      throw createForbiddenError('Sales analytics access required');
    }

    // Validate groupBy parameter
    if (!['day', 'week', 'month'].includes(groupBy as string)) {
      throw createValidationError('Invalid groupBy parameter. Must be day, week, or month');
    }

    const start = startDate 
      ? moment(startDate as string).toDate()
      : moment().subtract(30, 'days').toDate();
    const end = endDate 
      ? moment(endDate as string).toDate() 
      : new Date();

    // Role-based filtering
    const filters: AnalyticsFilter = { startDate: start, endDate: end };
    
    if (currentUser?.role === 'vendor') {
      const vendorData = await this.getVendorByUserId(currentUser.id);
      if (vendorData) {
        filters.vendorIds = [vendorData.id];
      }
    } else if (vendorIds) {
      filters.vendorIds = Array.isArray(vendorIds) ? vendorIds.map(id => String(id)) : [String(vendorIds)];
    }

    if (categories) {
      filters.categories = Array.isArray(categories) ? (categories as string[]) : [categories as string];
    }

    try {
      const trends = await this.analyticsService.getSalesTrends(
        start, 
        end, 
        groupBy as 'day' | 'week' | 'month'
      ) || [];

      let comparison = null;
      if (compareWithPrevious === 'true') {
        const periodLength = moment(end).diff(start);
        const previousStart = moment(start).subtract(periodLength).toDate();
        const previousEnd = start;
        
        comparison = await this.analyticsService.getSalesTrends(
          previousStart,
          previousEnd,
          groupBy as 'day' | 'week' | 'month'
        );
      }

      res.json({
        success: true,
        data: {
          current: trends,
          previous: comparison,
          summary: {
            totalRevenue: (trends as any[]).reduce((sum: number, t: any) => sum + t.totalRevenue, 0),
            totalOrders: (trends as any[]).reduce((sum: number, t: any) => sum + t.orderCount, 0),
            averageOrderValue: (trends as any[]).length > 0 
              ? (trends as any[]).reduce((sum: number, t: any) => sum + t.averageOrderValue, 0) / (trends as any[]).length 
              : 0,
            growthRate: (trends as any[]).length > 1 
              ? (((trends as any[])[(trends as any[]).length - 1].totalRevenue - (trends as any[])[0].totalRevenue) / (trends as any[])[0].totalRevenue) * 100 
              : 0,
          },
        },
        message: 'Sales trends retrieved successfully',
      });
    } catch (error) {
      logger.error('Error retrieving sales trends:', {
        userId: currentUser?.id,
        role: currentUser?.role,
        filters,
        error: error.message,
      });
      throw error;
    }
  });

  // GET /api/analytics/products/performance - 제품 성과 분석
  getProductPerformance = asyncHandler(async (req: AuthRequest, res: Response) => {
    const currentUser = req.user;
    const {
      startDate,
      endDate,
      categories,
      supplierIds,
      sortBy = 'revenue',
      sortOrder = 'desc',
      limit = '50',
    } = req.query;

    // Check permissions
    if (!['admin', 'manager', 'supplier'].includes(currentUser?.role || '')) {
      throw createForbiddenError('Product analytics access required');
    }

    // Validate parameters
    const validSortFields = ['revenue', 'totalSales', 'margin', 'turnoverRate'];
    if (!validSortFields.includes(sortBy as string)) {
      throw createValidationError(`Invalid sortBy parameter. Must be one of: ${validSortFields.join(', ')}`);
    }

    const limitNum = parseInt(limit as string);
    if (limitNum > 100) {
      throw createValidationError('Limit cannot exceed 100');
    }

    const filters: AnalyticsFilter = {};
    
    if (startDate) {
      filters.startDate = moment(startDate as string).toDate();
    }
    
    if (endDate) {
      filters.endDate = moment(endDate as string).toDate();
    }

    if (categories) {
      filters.categories = Array.isArray(categories) ? (categories as string[]) : [categories as string];
    }

    // Role-based filtering
    if (currentUser?.role === 'supplier') {
      const supplierData = await this.getSupplierByUserId(currentUser.id);
      if (supplierData) {
        filters.supplierIds = [supplierData.id];
      }
    } else if (supplierIds) {
      filters.supplierIds = Array.isArray(supplierIds) ? (supplierIds as string[]) : [supplierIds as string];
    }

    try {
      let performance = await this.analyticsService.getProductPerformance(filters, limitNum);

      // Sort results
      performance.sort((a, b) => {
        const aValue = a[sortBy as keyof typeof a] as number;
        const bValue = b[sortBy as keyof typeof b] as number;
        return sortOrder === 'desc' ? bValue - aValue : aValue - bValue;
      });

      // Calculate performance insights
      const insights = this.generateProductInsights(performance);

      res.json({
        success: true,
        data: {
          products: performance,
          insights,
          summary: {
            totalProducts: performance.length,
            totalRevenue: performance.reduce((sum, p) => sum + p.revenue, 0),
            totalSales: performance.reduce((sum, p) => sum + p.totalSales, 0),
            averageTurnover: performance.length > 0 
              ? performance.reduce((sum, p) => sum + p.turnoverRate, 0) / performance.length 
              : 0,
          },
        },
        message: 'Product performance retrieved successfully',
      });
    } catch (error) {
      logger.error('Error retrieving product performance:', {
        userId: currentUser?.id,
        role: currentUser?.role,
        filters,
        error: error.message,
      });
      throw error;
    }
  });

  // GET /api/analytics/vendors/ranking - 판매자 순위
  getVendorRanking = asyncHandler(async (req: AuthRequest, res: Response) => {
    const currentUser = req.user;
    const {
      startDate,
      endDate,
      limit = '20',
      metric = 'commission',
    } = req.query;

    // Check permissions
    if (!['admin', 'manager'].includes(currentUser?.role || '')) {
      throw createForbiddenError('Admin access required for vendor rankings');
    }

    // Validate parameters
    const validMetrics = ['commission', 'revenue', 'orders'];
    if (!validMetrics.includes(metric as string)) {
      throw createValidationError(`Invalid metric parameter. Must be one of: ${validMetrics.join(', ')}`);
    }

    const limitNum = parseInt(limit as string);
    if (limitNum > 50) {
      throw createValidationError('Limit cannot exceed 50');
    }

    const filters: AnalyticsFilter = {};
    
    if (startDate) {
      filters.startDate = moment(startDate as string).toDate();
    }
    
    if (endDate) {
      filters.endDate = moment(endDate as string).toDate();
    }

    try {
      const rankings = await this.analyticsService.getVendorRankings(filters, limitNum);

      // Sort by requested metric
      rankings.sort((a, b) => {
        switch (metric) {
          case 'revenue':
            return b.totalRevenue - a.totalRevenue;
          case 'orders':
            return b.totalOrders - a.totalOrders;
          default:
            return b.totalCommission - a.totalCommission;
        }
      });

      res.json({
        success: true,
        data: {
          rankings,
          summary: {
            totalVendors: rankings.length,
            totalCommission: rankings.reduce((sum, v) => sum + v.totalCommission, 0),
            totalRevenue: rankings.reduce((sum, v) => sum + v.totalRevenue, 0),
            totalOrders: rankings.reduce((sum, v) => sum + v.totalOrders, 0),
            averageRating: rankings.length > 0 
              ? rankings.reduce((sum, v) => sum + v.rating, 0) / rankings.length 
              : 0,
          },
          period: {
            startDate: filters.startDate?.toISOString(),
            endDate: filters.endDate?.toISOString(),
          },
        },
        message: 'Vendor rankings retrieved successfully',
      });
    } catch (error) {
      logger.error('Error retrieving vendor rankings:', {
        userId: currentUser?.id,
        role: currentUser?.role,
        filters,
        error: error.message,
      });
      throw error;
    }
  });

  // GET /api/analytics/realtime - 실시간 지표
  getRealTimeMetrics = asyncHandler(async (req: AuthRequest, res: Response) => {
    const currentUser = req.user;

    // Check permissions
    if (!['admin', 'manager'].includes(currentUser?.role || '')) {
      throw createForbiddenError('Admin access required for real-time metrics');
    }

    try {
      const metrics = await this.analyticsService.getRealTimeMetrics();

      res.json({
        success: true,
        data: metrics,
        message: 'Real-time metrics retrieved successfully',
      });
    } catch (error) {
      logger.error('Error retrieving real-time metrics:', {
        userId: currentUser?.id,
        role: currentUser?.role,
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
      // Assuming there's a userId field or relation
      return await supplierRepository.findOne({ 
        where: { contactEmail: userId } // This would need proper relation
      });
    } catch (error) {
      logger.error('Error getting supplier by user ID:', error);
      return null;
    }
  }

  private generateProductInsights(products: any[]) {
    const insights = [];

    // Top performers
    const topPerformer = products[0];
    if (topPerformer) {
      insights.push({
        type: 'info',
        title: 'Top Performer',
        message: `${topPerformer.name} generated $${topPerformer.revenue.toLocaleString()} in revenue`,
        productId: topPerformer.productId,
      });
    }

    // Low stock alerts
    const lowStockProducts = products.filter(p => p.alertLevel === 'high' || p.alertLevel === 'critical');
    if (lowStockProducts.length > 0) {
      insights.push({
        type: 'warning',
        title: 'Low Stock Alert',
        message: `${lowStockProducts.length} high-performing products are running low on stock`,
        count: lowStockProducts.length,
      });
    }

    // Slow movers
    const slowMovers = products.filter(p => p.turnoverRate < 1);
    if (slowMovers.length > 0) {
      insights.push({
        type: 'alert',
        title: 'Slow Moving Products',
        message: `${slowMovers.length} products have low turnover rates`,
        recommendation: 'Consider promotional campaigns or inventory reduction',
        count: slowMovers.length,
      });
    }

    return insights;
  }
}