import { Response } from 'express';
import { AppDataSource } from '../../database/connection';
import { VendorInfo } from '../../entities/VendorInfo';
import { Supplier } from '../../entities/Supplier';
import { AuthRequest } from '../../types/auth';
import { Between } from 'typeorm';
import logger from '../../utils/logger';
import { asyncHandler, createNotFoundError, createForbiddenError } from '../../middleware/errorHandler.middleware';
import { cacheService } from '../../services/cache.service';
import { CommissionService } from '../../services/commission.service';
import { getPerformanceStats } from '../../middleware/performance.middleware';
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

export class DashboardController {
  private vendorRepository = AppDataSource.getRepository(VendorInfo);
  private supplierRepository = AppDataSource.getRepository(Supplier);
  private commissionService: CommissionService;

  constructor() {
    this.commissionService = new CommissionService(
      AppDataSource.getRepository('VendorCommission'),
      AppDataSource.getRepository('CommissionSettlement'),
      AppDataSource.getRepository('VendorInfo'),
      AppDataSource.getRepository('Supplier'),
      AppDataSource.getRepository('Order'),
      AppDataSource.getRepository('SupplierProduct'),
      null
    );
  }

  // GET /api/vendors/suppliers/:vendorId/dashboard - Integrated vendor/supplier dashboard
  getIntegratedDashboard = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const { vendorId } = req.params;
    const currentUser = req.user;

    // Check permissions
    if (currentUser?.role === 'vendor') {
      const vendor = await this.vendorRepository.findOne({ where: { id: vendorId } });
      if (!vendor || vendor.userId !== currentUser.id) {
        throw createForbiddenError('You can only access your own dashboard');
      }
    } else if (!['admin', 'manager'].includes(currentUser?.role || '')) {
      throw createForbiddenError('Insufficient permissions to access dashboard');
    }

    // Check cache first
    const cachedData = await cacheService.getDashboardData(vendorId, 'integrated');
    if (cachedData) {
      res.set('X-Cache-Hit', 'true');
      return res.json({
        success: true,
        data: cachedData,
        message: 'Dashboard data retrieved successfully',
      });
    }

    // Get vendor details
    const vendor = await this.vendorRepository.findOne({
      where: { id: vendorId },
      relations: ['user']
    });

    if (!vendor) {
      throw createNotFoundError('Vendor');
    }

    // Get time ranges for analytics
    const now = new Date();
    const startOfMonth = dayjs().startOf('month').toDate();
    const startOfLastMonth = dayjs().subtract(1, 'month').startOf('month').toDate();
    const endOfLastMonth = dayjs().subtract(1, 'month').endOf('month').toDate();
    const startOfWeek = dayjs().startOf('week').toDate();
    const startOfYear = dayjs().startOf('year').toDate();

    // Parallel data fetching
    const [
      currentMonthCommission,
      lastMonthCommission,
      recentCommissions,
      supplierData,
      performanceMetrics
    ] = await Promise.all([
      // Current month commission
      this.commissionService.getCurrentVendorCommission(vendorId),
      
      // Last month commission
      this.commissionService.getVendorCommissionHistory(vendorId, 1),
      
      // Recent commissions (last 6 months)
      this.commissionService.getVendorCommissionHistory(vendorId, 6),
      
      // Supplier relationships (if vendor is also a supplier)
      this.getVendorSupplierData(vendorId),
      
      // Performance metrics
      this.getVendorPerformanceMetrics(vendorId, startOfMonth, now)
    ]);

    // Build dashboard data
    const dashboardData = {
      vendor: {
        id: vendor.id,
        name: vendor.vendorName,
        type: vendor.vendorType,
        status: vendor.status,
        rating: vendor.rating,
        joinedAt: vendor.created_at,
        affiliateCode: vendor.affiliateCode,
        affiliateRate: vendor.affiliateRate,
        totalSales: vendor.totalSales,
        totalRevenue: vendor.totalRevenue,
      },

      // Commission overview
      commission: {
        current: currentMonthCommission ? {
          period: currentMonthCommission.period,
          totalOrders: currentMonthCommission.totalOrders,
          completedOrders: currentMonthCommission.completedOrders,
          grossSales: currentMonthCommission.grossSales,
          netSales: currentMonthCommission.netSales,
          totalCommission: currentMonthCommission.totalCommission,
          netCommission: currentMonthCommission.netCommission,
          totalPayable: currentMonthCommission.totalPayable,
          status: currentMonthCommission.status,
        } : null,

        lastMonth: lastMonthCommission.length > 0 ? {
          period: lastMonthCommission[0].period,
          totalPayable: lastMonthCommission[0].totalPayable,
          status: lastMonthCommission[0].status,
          paidAt: lastMonthCommission[0].paidAt,
        } : null,

        trend: this.calculateCommissionTrend(recentCommissions),
        
        recentHistory: recentCommissions.slice(0, 3).map(comm => ({
          period: comm.period,
          totalOrders: comm.totalOrders,
          totalPayable: comm.totalPayable,
          status: comm.status,
          paidAt: comm.paidAt,
        }))
      },

      // Supplier information (if applicable)
      supplier: supplierData,

      // Performance metrics
      performance: performanceMetrics,

      // Quick stats
      stats: {
        totalCommissionEarned: recentCommissions.reduce((sum, c) => sum + Number(c.totalPayable || 0), 0),
        averageOrderValue: currentMonthCommission?.grossSales && currentMonthCommission?.totalOrders 
          ? Number(currentMonthCommission.grossSales) / currentMonthCommission.totalOrders 
          : 0,
        commissionRate: vendor.affiliateRate || 0,
        activeStatus: vendor.status === 'active',
        pendingPayments: recentCommissions
          .filter(c => c.status === 'approved')
          .reduce((sum, c) => sum + Number(c.totalPayable), 0),
      },

      // Recent activities (mocked for now - would come from activity logs)
      recentActivities: [
        {
          type: 'commission_calculated',
          description: `Commission calculated for ${dayjs().format('MMMM YYYY')}`,
          timestamp: now,
          amount: currentMonthCommission?.totalCommission || 0,
        }
      ],

      // Notifications and alerts
      alerts: await this.getVendorAlerts(vendorId),
      
      // Chart data for frontend
      chartData: {
        commissionTrend: this.getCommissionChartData(recentCommissions),
        ordersTrend: this.getOrdersChartData(recentCommissions),
      },

      // Cache timestamp
      generatedAt: new Date().toISOString(),
    };

    // Cache the result for 5 minutes
    await cacheService.setDashboardData(vendorId, 'integrated', dashboardData, 300);

    res.json({
      success: true,
      data: dashboardData,
      message: 'Dashboard data retrieved successfully',
    });
  });

  private async getVendorSupplierData(vendorId: string) {
    try {
      // Check if vendor is also a supplier
      // TODO: Implement proper vendor email lookup
      const supplier = null; // Placeholder until vendor email lookup is implemented

      if (!supplier) {
        return null;
      }

      // Get supplier settlement data
      const recentSettlements = await this.commissionService.getSupplierSettlementHistory(supplier.id, 3);

      return {
        id: supplier.id,
        companyName: supplier.companyName,
        status: supplier.status,
        totalProducts: supplier.totalProducts,
        activeProducts: supplier.activeProducts,
        totalOrders: supplier.totalOrders,
        recentSettlements: recentSettlements.map(settlement => ({
          period: settlement.period,
          totalPayable: settlement.totalPayable,
          status: settlement.status,
          paymentDate: settlement.paymentDate,
        })),
      };
    } catch (error) {
      logger.error('Failed to get vendor supplier data:', error);
      return null;
    }
  }

  private async getVendorPerformanceMetrics(vendorId: string, startDate: Date, endDate: Date) {
    try {
      // Get orders in date range (mocked structure)
      const metrics = {
        conversionRate: 85.5,
        averageOrderValue: 156.78,
        totalCustomers: 1234,
        repeatCustomerRate: 45.2,
        topCategories: [
          { name: 'Electronics', orders: 145, revenue: 12450 },
          { name: 'Fashion', orders: 123, revenue: 9876 },
          { name: 'Home & Garden', orders: 98, revenue: 7532 },
        ],
        monthlyGrowth: 12.5,
        customerSatisfaction: 4.6,
      };

      return metrics;
    } catch (error) {
      logger.error('Failed to get performance metrics:', error);
      return null;
    }
  }

  private async getVendorAlerts(vendorId: string) {
    const alerts = [];

    try {
      // Check for pending commission approvals
      const pendingCommissions = await this.commissionService.getPendingVendorCommissions();
      const vendorPendingCommissions = pendingCommissions.filter(c => c.vendorId === vendorId);

      if (vendorPendingCommissions.length > 0) {
        alerts.push({
          type: 'info',
          title: 'Commission Pending',
          message: `You have ${vendorPendingCommissions.length} commission(s) pending approval`,
          actionUrl: '/commissions',
          priority: 'medium',
        });
      }

      // Check account status
      const vendor = await this.vendorRepository.findOne({ where: { id: vendorId } });
      if (vendor?.status === 'pending') {
        alerts.push({
          type: 'warning',
          title: 'Account Pending',
          message: 'Your vendor account is still pending approval',
          actionUrl: '/profile',
          priority: 'high',
        });
      }

      return alerts;
    } catch (error) {
      logger.error('Failed to get vendor alerts:', error);
      return [];
    }
  }

  private calculateCommissionTrend(commissions: any[]) {
    if (commissions.length < 2) {
      return { direction: 'stable', percentage: 0 };
    }

    const current = Number(commissions[0]?.totalPayable || 0);
    const previous = Number(commissions[1]?.totalPayable || 0);

    if (previous === 0) {
      return { direction: 'up', percentage: 100 };
    }

    const percentage = ((current - previous) / previous) * 100;
    const direction = percentage > 5 ? 'up' : percentage < -5 ? 'down' : 'stable';

    return { direction, percentage: Math.abs(percentage) };
  }

  private getCommissionChartData(commissions: any[]) {
    return commissions
      .reverse()
      .map(comm => ({
        period: comm.period,
        commission: Number(comm.totalCommission || 0),
        netCommission: Number(comm.netCommission || 0),
        totalPayable: Number(comm.totalPayable || 0),
      }));
  }

  private getOrdersChartData(commissions: any[]) {
    return commissions
      .reverse()
      .map(comm => ({
        period: comm.period,
        totalOrders: comm.totalOrders || 0,
        completedOrders: comm.completedOrders || 0,
        cancelledOrders: comm.cancelledOrders || 0,
      }));
  }
}