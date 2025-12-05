import { Response } from 'express';
import { BaseController } from '../../../common/base.controller.js';
import { SellerDashboardQueryDto, SupplierDashboardQueryDto, PartnerDashboardQueryDto } from '../dto/index.js';
import { SellerDashboardService } from '../services/SellerDashboardService.js';
import { SupplierDashboardService } from '../services/SupplierDashboardService.js';
import { PartnerDashboardService } from '../services/PartnerDashboardService.js';
import { SellerService } from '../services/SellerService.js';
import { SupplierService } from '../services/SupplierService.js';
import { PartnerService } from '../services/PartnerService.js';
import { dashboardRangeService } from '../services/DashboardRangeService.js';
import logger from '../../../utils/logger.js';
import type { AuthRequest } from '../../../common/middleware/auth.middleware.js';

/**
 * DashboardController
 * NextGen V2 - Dropshipping Module
 * Handles dashboard data for Seller, Supplier, and Partner
 * Returns data formatted for NextGen Function Components
 */
export class DashboardController extends BaseController {
  static async getSellerDashboard(req: AuthRequest, res: Response): Promise<any> {
    try {
      if (!req.user) {
        return BaseController.unauthorized(res, 'Not authenticated');
      }

      const query = req.query as unknown as SellerDashboardQueryDto;
      const sellerDashboardService = new SellerDashboardService();
      const sellerService = SellerService.getInstance();

      // Get seller profile
      const seller = await sellerService.getByUserId(req.user.id);
      if (!seller) {
        return BaseController.error(res, 'Seller profile not found', 404);
      }

      // Parse date range
      const dateRange = dashboardRangeService.parseDateRange({
        range: query.range,
        from: query.from,
        to: query.to
      });

      // Get summary metrics
      const summary = await sellerDashboardService.getSummaryForSeller(seller.id, dateRange);

      return BaseController.ok(res, {
        overview: {
          totalRevenue: summary.totalSalesAmount || 0,
          totalOrders: summary.totalOrders || 0,
          activeProducts: 0, // Can be enhanced later
          pendingOrders: 0,  // Can be enhanced later
          totalCommission: summary.totalCommissionAmount || 0,
          avgOrderAmount: summary.avgOrderAmount || 0
        },
        salesChart: [], // Can be enhanced later with time-series data
        recentOrders: [], // Can be enhanced later
        topProducts: [], // Can be enhanced later
        dateRange: {
          start: dateRange.startDate,
          end: dateRange.endDate,
          range: dateRange.range
        }
      });
    } catch (error: any) {
      logger.error('[DashboardController.getSellerDashboard] Error', {
        error: error.message,
        userId: req.user?.id,
      });
      return BaseController.error(res, error);
    }
  }

  static async getSupplierDashboard(req: AuthRequest, res: Response): Promise<any> {
    try {
      if (!req.user) {
        return BaseController.unauthorized(res, 'Not authenticated');
      }

      const query = req.query as unknown as SupplierDashboardQueryDto;
      const supplierDashboardService = new SupplierDashboardService();
      const supplierService = SupplierService.getInstance();

      // Get supplier profile
      const supplier = await supplierService.getByUserId(req.user.id);
      if (!supplier) {
        return BaseController.error(res, 'Supplier profile not found', 404);
      }

      // Parse date range
      const dateRange = dashboardRangeService.parseDateRange({
        range: query.range,
        from: query.from,
        to: query.to
      });

      // Get summary metrics
      const summary = await supplierDashboardService.getSummaryForSupplier(supplier.id, dateRange);

      return BaseController.ok(res, {
        overview: {
          totalProducts: 0, // Can be enhanced later
          totalOrders: summary.totalOrders || 0,
          totalRevenue: summary.totalRevenue || 0,
          activeSellers: 0, // Can be enhanced later
          avgOrderAmount: summary.avgOrderAmount || 0
        },
        ordersChart: [], // Can be enhanced later with time-series data
        recentOrders: [], // Can be enhanced later
        topProducts: [], // Can be enhanced later
        dateRange: {
          start: dateRange.startDate,
          end: dateRange.endDate,
          range: dateRange.range
        }
      });
    } catch (error: any) {
      logger.error('[DashboardController.getSupplierDashboard] Error', {
        error: error.message,
        userId: req.user?.id,
      });
      return BaseController.error(res, error);
    }
  }

  static async getPartnerDashboard(req: AuthRequest, res: Response): Promise<any> {
    try {
      if (!req.user) {
        return BaseController.unauthorized(res, 'Not authenticated');
      }

      const query = req.query as unknown as PartnerDashboardQueryDto;
      const partnerDashboardService = new PartnerDashboardService();
      const partnerService = PartnerService.getInstance();

      // Get partner profile
      const partner = await partnerService.getByUserId(req.user.id);
      if (!partner) {
        return BaseController.error(res, 'Partner profile not found', 404);
      }

      // Parse date range
      const dateRange = dashboardRangeService.parseDateRange({
        range: query.range,
        from: query.from,
        to: query.to
      });

      // Get summary metrics
      const summary = await partnerDashboardService.getSummaryForPartner(partner.id, dateRange);

      return BaseController.ok(res, {
        overview: {
          totalClicks: summary.totalClicks || 0,
          totalOrders: summary.totalOrders || 0,
          totalCommission: summary.totalCommission || 0,
          conversionRate: summary.conversionRate || 0,
          averageOrderValue: summary.averageOrderValue || 0
        },
        performanceChart: [], // Can be enhanced later with time-series data
        recentOrders: [], // Can be enhanced later
        earnings: {
          available: summary.earnings.available || 0,
          pending: summary.earnings.pending || 0,
          paid: summary.earnings.paid || 0,
        },
        dateRange: {
          start: dateRange.startDate,
          end: dateRange.endDate,
          range: dateRange.range
        }
      });
    } catch (error: any) {
      logger.error('[DashboardController.getPartnerDashboard] Error', {
        error: error.message,
        userId: req.user?.id,
      });
      return BaseController.error(res, error);
    }
  }
}
