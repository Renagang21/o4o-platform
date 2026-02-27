/**
 * Admin Dashboard Controller (P0)
 *
 * WO-ADMIN-API-IMPLEMENT-P0: Real database queries for Admin Dashboard
 * - No mock data
 * - No random values
 * - Empty/Error states for unavailable data
 *
 * Entities used:
 * - User (users table) - user growth
 * - NetureOrder (neture.neture_orders) - order/sales data
 * - GlycopharmOrder - REMOVED (Phase 4-A: Legacy Order System Deprecation)
 * - NeturePartner (neture.neture_partners) - partner data
 * - CosmeticsProduct - cosmetics metrics
 */

import { Response } from 'express';
import { AppDataSource, checkDatabaseHealth } from '../../database/connection.js';
import { User } from '../../modules/auth/entities/User.js';
import type { AuthRequest } from '../../types/auth.js';
import { NetureOrder } from '../../routes/neture/entities/neture-order.entity.js';
// GlycopharmOrder - REMOVED (Phase 4-A: Legacy Order System Deprecation)
import { NeturePartner } from '../../routes/neture/entities/neture-partner.entity.js';
import { CosmeticsProduct, CosmeticsBrand, CosmeticsProductStatus } from '../../routes/cosmetics/entities/index.js';

export class AdminDashboardController {
  /**
   * GET /api/v1/admin/dashboard/sales-summary
   *
   * Returns aggregated sales data from real orders
   * Period-based totals (no random data)
   */
  async getSalesSummary(req: AuthRequest, res: Response) {
    try {

      const { period = '30d' } = req.query;

      // Calculate date range
      const now = new Date();
      let startDate: Date;

      switch (period) {
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }

      // Query Neture orders (only PAID status)
      const netureRepo = AppDataSource.getRepository(NetureOrder);
      const netureResult = await netureRepo
        .createQueryBuilder('order')
        .select('COALESCE(SUM(order.finalAmount), 0)', 'totalAmount')
        .addSelect('COUNT(order.id)', 'orderCount')
        .where('order.status = :status', { status: 'paid' })
        .andWhere('order.createdAt >= :startDate', { startDate })
        .getRawOne();

      // Phase 4-A: GlycopharmOrder removed - returns 0 until E-commerce Core integration
      const glycopharmResult = { totalAmount: 0, orderCount: 0 };

      // Combine results
      const totalRevenue = Number(netureResult?.totalAmount || 0) + Number(glycopharmResult?.totalAmount || 0);
      const totalOrders = Number(netureResult?.orderCount || 0) + Number(glycopharmResult?.orderCount || 0);
      const averageOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

      res.json({
        success: true,
        data: {
          period,
          totalRevenue,
          totalOrders,
          averageOrderValue,
          breakdown: {
            neture: {
              revenue: Number(netureResult?.totalAmount || 0),
              orders: Number(netureResult?.orderCount || 0)
            },
            glycopharm: {
              revenue: Number(glycopharmResult?.totalAmount || 0),
              orders: Number(glycopharmResult?.orderCount || 0)
            }
          }
        }
      });
    } catch (error: any) {
      console.error('Error fetching sales summary:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch sales summary',
        error: error.message
      });
    }
  }

  /**
   * GET /api/v1/admin/dashboard/order-status
   *
   * Returns order status distribution (real counts)
   */
  async getOrderStatus(req: AuthRequest, res: Response) {
    try {

      // Query Neture order status distribution
      const netureRepo = AppDataSource.getRepository(NetureOrder);
      const netureStatusCounts = await netureRepo
        .createQueryBuilder('order')
        .select('order.status', 'status')
        .addSelect('COUNT(order.id)', 'count')
        .groupBy('order.status')
        .getRawMany();

      // Phase 4-A: GlycopharmOrder removed - returns empty array until E-commerce Core integration
      const glycopharmStatusCounts: any[] = [];

      // Map status to display names
      const statusMap: Record<string, { label: string; color: string }> = {
        'created': { label: '생성됨', color: '#6b7280' },
        'pending_payment': { label: '결제 대기', color: '#f59e0b' },
        'paid': { label: '결제 완료', color: '#10b981' },
        'PAID': { label: '결제 완료', color: '#10b981' },
        'preparing': { label: '준비중', color: '#3b82f6' },
        'shipped': { label: '배송중', color: '#8b5cf6' },
        'delivered': { label: '배송 완료', color: '#22c55e' },
        'cancelled': { label: '취소됨', color: '#ef4444' },
        'refunded': { label: '환불됨', color: '#f97316' },
        'CREATED': { label: '생성됨', color: '#6b7280' },
        'FAILED': { label: '실패', color: '#ef4444' }
      };

      // Aggregate counts
      const aggregatedCounts: Record<string, number> = {};

      netureStatusCounts.forEach((row: any) => {
        const status = row.status;
        aggregatedCounts[status] = (aggregatedCounts[status] || 0) + Number(row.count);
      });

      glycopharmStatusCounts.forEach((row: any) => {
        const status = row.status;
        aggregatedCounts[status] = (aggregatedCounts[status] || 0) + Number(row.count);
      });

      // Format response
      const statusData = Object.entries(aggregatedCounts).map(([status, count]) => ({
        status,
        label: statusMap[status]?.label || status,
        count,
        color: statusMap[status]?.color || '#6b7280'
      }));

      res.json({
        success: true,
        data: statusData
      });
    } catch (error: any) {
      console.error('Error fetching order status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch order status',
        error: error.message
      });
    }
  }

  /**
   * GET /api/v1/admin/dashboard/user-growth
   *
   * Returns user registration counts by day/week
   */
  async getUserGrowth(req: AuthRequest, res: Response) {
    try {

      const { period = '30d' } = req.query;

      // Calculate date range
      const now = new Date();
      let startDate: Date;
      let groupBy: 'day' | 'week' = 'day';

      switch (period) {
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          groupBy = 'day';
          break;
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          groupBy = 'day';
          break;
        case '90d':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          groupBy = 'week';
          break;
        default:
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          groupBy = 'day';
      }

      const userRepo = AppDataSource.getRepository(User);

      // Query user registrations grouped by date
      const userGrowthData = await userRepo
        .createQueryBuilder('user')
        .select(`DATE_TRUNC('${groupBy}', user.createdAt)`, 'date')
        .addSelect('COUNT(user.id)', 'newUsers')
        .where('user.createdAt >= :startDate', { startDate })
        .groupBy(`DATE_TRUNC('${groupBy}', user.createdAt)`)
        .orderBy('date', 'ASC')
        .getRawMany();

      // Get total user count
      const totalUsers = await userRepo.count();

      // Get active users (logged in within last 30 days)
      const activeUserCount = await userRepo
        .createQueryBuilder('user')
        .where('user.lastLoginAt >= :thirtyDaysAgo', {
          thirtyDaysAgo: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        })
        .getCount();

      res.json({
        success: true,
        data: {
          period,
          totalUsers,
          activeUsers: activeUserCount,
          growth: userGrowthData.map((row: any) => ({
            date: row.date,
            newUsers: Number(row.newUsers)
          }))
        }
      });
    } catch (error: any) {
      console.error('Error fetching user growth:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch user growth',
        error: error.message
      });
    }
  }

  /**
   * GET /api/v1/admin/system/health
   *
   * Returns system health status (real checks)
   */
  async getSystemHealth(req: AuthRequest, res: Response) {
    try {

      // Check database health
      const dbHealth = await checkDatabaseHealth();

      // Get memory usage
      const memoryUsage = process.memoryUsage();
      const heapUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
      const heapTotalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);
      const memoryPercent = Math.round((heapUsedMB / heapTotalMB) * 100);

      // Determine memory status
      let memoryStatus: 'healthy' | 'warning' | 'critical' = 'healthy';
      if (memoryPercent > 90) {
        memoryStatus = 'critical';
      } else if (memoryPercent > 70) {
        memoryStatus = 'warning';
      }

      // Get uptime
      const uptimeSeconds = process.uptime();
      const uptimeHours = Math.floor(uptimeSeconds / 3600);
      const uptimeMinutes = Math.floor((uptimeSeconds % 3600) / 60);

      res.json({
        success: true,
        data: {
          api: {
            status: 'healthy',
            uptime: `${uptimeHours}h ${uptimeMinutes}m`,
            lastCheck: new Date().toISOString()
          },
          database: {
            status: dbHealth.status === 'connected' ? 'healthy' : 'error',
            type: dbHealth.type || 'unknown',
            connectionCount: dbHealth.connectionCount || 0,
            maxConnections: dbHealth.maxConnections || 0,
            lastCheck: dbHealth.timestamp || new Date().toISOString()
          },
          memory: {
            status: memoryStatus,
            usedMB: heapUsedMB,
            totalMB: heapTotalMB,
            percent: memoryPercent
          }
        }
      });
    } catch (error: any) {
      console.error('Error fetching system health:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch system health',
        error: error.message
      });
    }
  }

  /**
   * GET /api/v1/admin/partners
   *
   * Returns partner list from NeturePartner
   */
  async getPartners(req: AuthRequest, res: Response) {
    try {

      const { page = 1, limit = 20 } = req.query;
      const skip = (Number(page) - 1) * Number(limit);

      const partnerRepo = AppDataSource.getRepository(NeturePartner);

      const [partners, total] = await partnerRepo.findAndCount({
        take: Number(limit),
        skip,
        order: { createdAt: 'DESC' }
      });

      res.json({
        success: true,
        data: partners,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit))
        }
      });
    } catch (error: any) {
      console.error('Error fetching partners:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch partners',
        error: error.message
      });
    }
  }

  /**
   * GET /api/v1/admin/partners/:id/summary
   *
   * Returns partner performance summary
   */
  async getPartnerSummary(req: AuthRequest, res: Response) {
    try {

      const { id } = req.params;

      // Get partner info
      const partnerRepo = AppDataSource.getRepository(NeturePartner);
      const partner = await partnerRepo.findOne({ where: { id } });

      if (!partner) {
        return res.status(404).json({
          success: false,
          message: 'Partner not found'
        });
      }

      // Partner sales summary would require order attribution
      // For now, return partner info with placeholder for metrics
      // (Real implementation requires partner_id on orders)

      res.json({
        success: true,
        data: {
          partner: {
            id: partner.id,
            name: partner.name,
            type: partner.type,
            userId: partner.userId,
            status: partner.status,
            createdAt: partner.createdAt
          },
          metrics: {
            // Empty until order attribution is implemented
            totalOrders: 0,
            totalRevenue: 0,
            totalCommission: 0,
            message: 'Partner attribution not yet implemented on orders'
          }
        }
      });
    } catch (error: any) {
      console.error('Error fetching partner summary:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch partner summary',
        error: error.message
      });
    }
  }

  /**
   * GET /api/v1/admin/cosmetics/partner-metrics
   *
   * Returns cosmetics partner metrics
   */
  async getCosmeticsPartnerMetrics(req: AuthRequest, res: Response) {
    try {

      // Get cosmetics product and brand counts
      const productRepo = AppDataSource.getRepository(CosmeticsProduct);
      const brandRepo = AppDataSource.getRepository(CosmeticsBrand);

      const [productCount, brandCount] = await Promise.all([
        productRepo.count(),
        brandRepo.count()
      ]);

      // Visible products (public)
      const activeProductCount = await productRepo.count({
        where: { status: CosmeticsProductStatus.VISIBLE }
      });

      // Note: Click/conversion tracking requires cosmetics_partner extension
      // which is not yet implemented. Return empty metrics.

      res.json({
        success: true,
        data: {
          catalog: {
            totalProducts: productCount,
            activeProducts: activeProductCount,
            totalBrands: brandCount
          },
          performance: {
            // Empty until cosmetics partner tracking is implemented
            clicks: 0,
            conversions: 0,
            revenue: 0,
            message: 'Cosmetics partner tracking not yet implemented'
          }
        }
      });
    } catch (error: any) {
      console.error('Error fetching cosmetics partner metrics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch cosmetics partner metrics',
        error: error.message
      });
    }
  }
}

export default new AdminDashboardController();
