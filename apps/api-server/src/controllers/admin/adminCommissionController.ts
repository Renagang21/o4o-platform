import { Response } from 'express';
import { AppDataSource } from '../../database/connection';
import { AuthRequest } from '../../types/auth';
import logger from '../../utils/logger';
import { asyncHandler, createForbiddenError } from '../../middleware/errorHandler.middleware';
import { cacheService } from '../../services/cache.service';
import { CommissionService } from '../../services/commission.service';
import { getPerformanceStats, getErrorAnalytics } from '../../middleware/performance.middleware';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import isBetween from 'dayjs/plugin/isBetween';
import weekOfYear from 'dayjs/plugin/weekOfYear';
import duration from 'dayjs/plugin/duration';
import quarterOfYear from 'dayjs/plugin/quarterOfYear';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(quarterOfYear);
dayjs.extend(isBetween);
dayjs.extend(weekOfYear);
dayjs.extend(duration);

export class AdminCommissionController {
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

  // GET /api/admin/commission-overview - Complete admin commission overview
  getCommissionOverview = asyncHandler(async (req: AuthRequest, res: Response) => {
    const currentUser = req.user;
    const { timeRange = 'month', includeStats = 'true' } = req.query;

    // Check admin permissions
    if (!['admin', 'manager'].includes(currentUser?.role || '')) {
      throw createForbiddenError('Admin access required');
    }

    // Check cache first
    const cacheKey = `commission_overview:${timeRange}:${includeStats}`;
    const cachedData = await cacheService.get(cacheKey);
    if (cachedData) {
      res.set('X-Cache-Hit', 'true');
      return res.json({
        success: true,
        data: cachedData,
        message: 'Commission overview retrieved successfully',
      });
    }

    // Get time ranges
    const now = new Date();
    const ranges = this.getTimeRanges(timeRange as string);

    // Parallel data fetching
    const [
      commissionStats,
      settlementStats,
      pendingVendorCommissions,
      pendingSupplierSettlements,
      topVendors,
      topSuppliers,
      recentActivities,
      systemPerformance,
      errorAnalytics,
      financialSummary
    ] = await Promise.all([
      // Commission statistics
      this.commissionService.getCommissionStatistics(),
      
      // Settlement statistics (would be similar)
      this.getSettlementStatistics(ranges),
      
      // Pending items
      this.commissionService.getPendingVendorCommissions(),
      this.commissionService.getPendingSupplierSettlements(),
      
      // Top performers
      this.getTopVendorsByCommission(ranges.current.start, ranges.current.end),
      this.getTopSuppliersByRevenue(ranges.current.start, ranges.current.end),
      
      // Recent activities
      this.getRecentCommissionActivities(),
      
      // System performance
      includeStats === 'true' ? getPerformanceStats(timeRange as any) : null,
      
      // Error analytics  
      includeStats === 'true' ? getErrorAnalytics(timeRange as any) : null,
      
      // Financial summary
      this.getFinancialSummary(ranges)
    ]);

    // Build comprehensive overview
    const overview = {
      // Summary statistics
      summary: {
        totalVendors: await this.getTotalVendorsCount(),
        totalSuppliers: await this.getTotalSuppliersCount(),
        activeVendors: await this.getActiveVendorsCount(),
        activeSuppliers: await this.getActiveSuppliersCount(),
        
        // Current period metrics
        currentPeriod: {
          totalCommissions: commissionStats.vendorCommissions.current,
          totalSettlements: commissionStats.supplierSettlements.current,
          pendingPayments: commissionStats.totalPending,
          commissionsChange: commissionStats.vendorCommissions.change,
          settlementsChange: commissionStats.supplierSettlements.change,
        },
        
        // Previous period comparison
        previousPeriod: {
          totalCommissions: commissionStats.vendorCommissions.previous,
          totalSettlements: commissionStats.supplierSettlements.previous,
        }
      },

      // Pending approvals and payments
      pending: {
        vendorCommissions: {
          count: pendingVendorCommissions.length,
          totalAmount: pendingVendorCommissions.reduce((sum, c) => sum + Number(c.totalPayable), 0),
          items: pendingVendorCommissions.slice(0, 10).map(c => ({
            id: c.id,
            vendorId: c.vendorId,
            vendorName: c.vendor?.vendorName || 'Unknown',
            period: c.period,
            amount: c.totalPayable,
            status: c.status,
            createdAt: c.created_at,
          }))
        },
        
        supplierSettlements: {
          count: pendingSupplierSettlements.length,
          totalAmount: pendingSupplierSettlements.reduce((sum, s) => sum + Number(s.totalPayable), 0),
          items: pendingSupplierSettlements.slice(0, 10).map(s => ({
            id: s.id,
            supplierId: s.supplierId,
            supplierName: s.supplier?.companyName || 'Unknown',
            period: s.period,
            amount: s.totalPayable,
            status: s.status,
            createdAt: s.created_at,
          }))
        }
      },

      // Top performers
      topPerformers: {
        vendors: topVendors.map(v => ({
          id: v.vendorId,
          name: v.vendorName,
          totalCommission: v.totalCommission,
          orderCount: v.orderCount,
          averageOrderValue: v.averageOrderValue,
          commissionRate: v.commissionRate,
        })),
        
        suppliers: topSuppliers.map(s => ({
          id: s.supplierId,
          name: s.supplierName,
          totalRevenue: s.totalRevenue,
          orderCount: s.orderCount,
          productCount: s.productCount,
          marginRate: s.marginRate,
        }))
      },

      // Financial summary
      financial: financialSummary,

      // System health (if requested)
      systemHealth: includeStats === 'true' ? {
        performance: {
          totalRequests: systemPerformance?.summary?.total_requests || 0,
          averageResponseTime: systemPerformance?.summary?.avg_response_time || 0,
          errorRate: systemPerformance?.summary?.error_count / (systemPerformance?.summary?.total_requests || 1) * 100,
          slowRequestCount: systemPerformance?.summary?.slow_requests || 0,
          cacheHitRate: systemPerformance?.summary?.cache_hits / (systemPerformance?.summary?.total_requests || 1) * 100,
        },
        
        errors: {
          totalErrors: errorAnalytics?.errorsByType?.length || 0,
          criticalErrors: errorAnalytics?.errorsByType?.filter(e => e.statusCode >= 500)?.length || 0,
          recentErrors: errorAnalytics?.errorsByType?.slice(0, 5) || [],
        }
      } : null,

      // Recent activities
      recentActivities: recentActivities.slice(0, 20),

      // Alerts and notifications
      alerts: await this.getSystemAlerts(),

      // Charts data for dashboard
      chartData: {
        commissionTrend: await this.getCommissionTrendData(ranges),
        settlementTrend: await this.getSettlementTrendData(ranges),
        vendorGrowth: await this.getVendorGrowthData(ranges),
        supplierGrowth: await this.getSupplierGrowthData(ranges),
        paymentStatus: await this.getPaymentStatusData(),
      },

      // Cache metadata
      generatedAt: new Date().toISOString(),
      timeRange: timeRange,
      nextUpdate: dayjs().add(10, 'minutes').toISOString(),
    };

    // Cache for 10 minutes (admin data updates less frequently)
    await cacheService.set(cacheKey, overview, { ttl: 600, tags: ['admin', 'commissions'] });

    res.json({
      success: true,
      data: overview,
      message: 'Commission overview retrieved successfully',
    });
  });

  // Bulk commission operations
  bulkApproveCommissions = asyncHandler(async (req: AuthRequest, res: Response) => {
    const currentUser = req.user;
    const { commissionIds, notes } = req.body;

    if (!['admin', 'manager'].includes(currentUser?.role || '')) {
      throw createForbiddenError('Admin access required');
    }

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    for (const id of commissionIds) {
      try {
        await this.commissionService.approveVendorCommission(id, currentUser.id);
        results.push({ id, status: 'approved' });
        successCount++;
      } catch (error) {
        results.push({ id, status: 'error', message: error.message });
        errorCount++;
      }
    }

    // Invalidate related caches
    await cacheService.invalidateByTag('commissions');
    await cacheService.invalidateByTag('admin');

    res.json({
      success: true,
      data: {
        results,
        summary: {
          total: commissionIds.length,
          approved: successCount,
          failed: errorCount,
        }
      },
      message: `Bulk approval completed: ${successCount} approved, ${errorCount} failed`,
    });
  });

  bulkApproveSettlements = asyncHandler(async (req: AuthRequest, res: Response) => {
    const currentUser = req.user;
    const { settlementIds, notes } = req.body;

    if (!['admin', 'manager'].includes(currentUser?.role || '')) {
      throw createForbiddenError('Admin access required');
    }

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    for (const id of settlementIds) {
      try {
        await this.commissionService.approveSupplierSettlement(id, currentUser.id);
        results.push({ id, status: 'approved' });
        successCount++;
      } catch (error) {
        results.push({ id, status: 'error', message: error.message });
        errorCount++;
      }
    }

    // Invalidate related caches
    await cacheService.invalidateByTag('settlements');
    await cacheService.invalidateByTag('admin');

    res.json({
      success: true,
      data: {
        results,
        summary: {
          total: settlementIds.length,
          approved: successCount,
          failed: errorCount,
        }
      },
      message: `Bulk approval completed: ${successCount} approved, ${errorCount} failed`,
    });
  });

  // Private helper methods
  private getTimeRanges(timeRange: string) {
    const now = dayjs();
    
    switch (timeRange) {
      case 'week':
        return {
          current: {
            start: now.startOf('week').toDate(),
            end: now.endOf('week').toDate(),
          },
          previous: {
            start: now.subtract(1, 'week').startOf('week').toDate(),
            end: now.subtract(1, 'week').endOf('week').toDate(),
          }
        };
      case 'month':
        return {
          current: {
            start: now.startOf('month').toDate(),
            end: now.endOf('month').toDate(),
          },
          previous: {
            start: now.subtract(1, 'month').startOf('month').toDate(),
            end: now.subtract(1, 'month').endOf('month').toDate(),
          }
        };
      case 'quarter':
        return {
          current: {
            start: now.startOf('quarter').toDate(),
            end: now.endOf('quarter').toDate(),
          },
          previous: {
            start: now.subtract(3, 'month').startOf('quarter').toDate(),
            end: now.subtract(3, 'month').endOf('quarter').toDate(),
          }
        };
      default:
        return {
          current: {
            start: now.startOf('month').toDate(),
            end: now.endOf('month').toDate(),
          },
          previous: {
            start: now.subtract(1, 'month').startOf('month').toDate(),
            end: now.subtract(1, 'month').endOf('month').toDate(),
          }
        };
    }
  }

  private async getSettlementStatistics(ranges: any) {
    // Mock implementation - would calculate actual settlement stats
    return {
      current: 125000,
      previous: 118000,
      change: 5.9,
      pending: 15000,
    };
  }

  private async getTotalVendorsCount(): Promise<number> {
    return AppDataSource.getRepository('VendorInfo').count();
  }

  private async getTotalSuppliersCount(): Promise<number> {
    return AppDataSource.getRepository('Supplier').count();
  }

  private async getActiveVendorsCount(): Promise<number> {
    return AppDataSource.getRepository('VendorInfo').count({ where: { status: 'active' } });
  }

  private async getActiveSuppliersCount(): Promise<number> {
    return AppDataSource.getRepository('Supplier').count({ where: { status: 'active' } });
  }

  private async getTopVendorsByCommission(startDate: Date, endDate: Date) {
    // Mock implementation - would query actual top vendors
    return [
      { vendorId: '1', vendorName: 'Tech Vendor A', totalCommission: 15000, orderCount: 125, averageOrderValue: 200, commissionRate: 12 },
      { vendorId: '2', vendorName: 'Fashion Vendor B', totalCommission: 12500, orderCount: 98, averageOrderValue: 180, commissionRate: 10 },
    ];
  }

  private async getTopSuppliersByRevenue(startDate: Date, endDate: Date) {
    // Mock implementation - would query actual top suppliers
    return [
      { supplierId: '1', supplierName: 'Supplier A', totalRevenue: 85000, orderCount: 245, productCount: 150, marginRate: 15 },
      { supplierId: '2', supplierName: 'Supplier B', totalRevenue: 72000, orderCount: 198, productCount: 120, marginRate: 18 },
    ];
  }

  private async getRecentCommissionActivities() {
    // Mock implementation - would query actual activities
    return [
      { type: 'commission_approved', description: 'Commission approved for Tech Vendor A', timestamp: new Date(), amount: 1500 },
      { type: 'settlement_paid', description: 'Settlement paid to Supplier B', timestamp: new Date(), amount: 8500 },
    ];
  }

  private async getFinancialSummary(ranges: any) {
    return {
      totalRevenue: 1250000,
      totalCommissionsPaid: 125000,
      totalSettlementsPaid: 850000,
      platformProfit: 275000,
      outstandingPayments: 45000,
      averageCommissionRate: 11.5,
      averageMarginRate: 16.2,
    };
  }

  private async getSystemAlerts() {
    const alerts = [];
    
    // Check for high pending amounts
    const pendingCommissions = await this.commissionService.getPendingVendorCommissions();
    const pendingAmount = pendingCommissions.reduce((sum, c) => sum + Number(c.totalPayable), 0);
    
    if (pendingAmount > 50000) {
      alerts.push({
        type: 'warning',
        title: 'High Pending Commissions',
        message: `$${pendingAmount.toLocaleString()} in pending commission payments`,
        priority: 'high',
      });
    }

    return alerts;
  }

  private async getCommissionTrendData(ranges: any) {
    // Mock implementation - would return actual trend data
    return [
      { period: '2024-01', commissions: 95000, settlements: 65000 },
      { period: '2024-02', commissions: 105000, settlements: 72000 },
      { period: '2024-03', commissions: 125000, settlements: 85000 },
    ];
  }

  private async getSettlementTrendData(ranges: any) {
    // Similar to commission trend
    return [];
  }

  private async getVendorGrowthData(ranges: any) {
    return [];
  }

  private async getSupplierGrowthData(ranges: any) {
    return [];
  }

  private async getPaymentStatusData() {
    return {
      paid: 85,
      pending: 12,
      approved: 3,
    };
  }
}