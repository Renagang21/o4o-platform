import { Request, Response } from 'express';
import { AppDataSource } from '../../database/connection.js';
import { Partner } from '../../entities/Partner.js';
import { PartnerCommission } from '../../entities/PartnerCommission.js';
import {
  PartnerDashboardSummaryDto,
  createDashboardError,
  createDashboardMeta
} from '../../dto/dashboard.dto.js';
import { dashboardRangeService } from '../../services/DashboardRangeService.js';

/**
 * Partner Dashboard Controller
 * R-6-2: Updated with standard DTO and range service
 * Provides dashboard metrics and statistics for partners
 */
export class PartnerDashboardController {

  /**
   * GET /api/v1/partners/dashboard/summary
   * Get partner dashboard summary with earnings and performance metrics
   * R-6-2: Supports both legacy and new range parameters
   *
   * Query params:
   * - New format: ?range=7d (or 30d, 90d, 1y, custom)
   * - Custom range: ?range=custom&start=2025-01-01&end=2025-01-31
   * - Legacy format: ?from=2025-01-01T00:00:00Z&to=2025-01-31T23:59:59Z
   */
  async getSummary(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const userRole = (req as any).user?.role;

      if (!userId) {
        res.status(401).json(
          createDashboardError('UNAUTHORIZED', 'Authentication required')
        );
        return;
      }

      // Find partner by userId
      const partnerRepo = AppDataSource.getRepository(Partner);
      const partner = await partnerRepo.findOne({
        where: { userId }
      });

      if (!partner && userRole !== 'admin' && userRole !== 'super_admin') {
        res.status(404).json(
          createDashboardError('NOT_FOUND', 'Partner profile not found')
        );
        return;
      }

      // For admin: can query by partnerId param
      const targetPartnerId = (req.query.partnerId as string) || partner?.id;

      if (!targetPartnerId) {
        res.status(400).json(
          createDashboardError('INVALID_PARAMS', 'Partner ID is required')
        );
        return;
      }

      // Authorization check
      if (userRole !== 'admin' && userRole !== 'super_admin' && targetPartnerId !== partner?.id) {
        res.status(403).json(
          createDashboardError('UNAUTHORIZED', 'You do not have permission to view this partner\'s summary')
        );
        return;
      }

      // Get partner with latest data
      const targetPartner = await partnerRepo.findOne({
        where: { id: targetPartnerId }
      });

      if (!targetPartner) {
        res.status(404).json(
          createDashboardError('NOT_FOUND', 'Partner not found')
        );
        return;
      }

      // R-6-2: Parse date range using standard service
      const parsedRange = dashboardRangeService.parseDateRange(req.query);

      // Get commission statistics
      const commissionRepo = AppDataSource.getRepository(PartnerCommission);

      // Total confirmed commissions within date range (totalEarnings)
      const confirmedStats = await commissionRepo
        .createQueryBuilder('commission')
        .select('COALESCE(SUM(commission.commissionAmount), 0)', 'total')
        .addSelect('COUNT(*)', 'count')
        .where('commission.partnerId = :partnerId', { partnerId: targetPartnerId })
        .andWhere('commission.status IN (:...statuses)', { statuses: ['confirmed', 'paid'] })
        .andWhere('commission.convertedAt BETWEEN :startDate AND :endDate', {
          startDate: parsedRange.startDate,
          endDate: parsedRange.endDate
        })
        .getRawOne();

      const totalEarnings = parseFloat(confirmedStats?.total || '0');
      const totalOrders = parseInt(confirmedStats?.count || '0');

      // Monthly earnings (current month) - for backward compatibility
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const monthlyStats = await commissionRepo
        .createQueryBuilder('commission')
        .select('COALESCE(SUM(commission.commissionAmount), 0)', 'total')
        .where('commission.partnerId = :partnerId', { partnerId: targetPartnerId })
        .andWhere('commission.status IN (:...statuses)', { statuses: ['confirmed', 'paid'] })
        .andWhere('commission.convertedAt >= :startDate', { startDate: startOfMonth })
        .getRawOne();

      const monthlyEarnings = parseFloat(monthlyStats?.total || '0');

      // Pending commissions
      const pendingStats = await commissionRepo
        .createQueryBuilder('commission')
        .select('COALESCE(SUM(commission.commissionAmount), 0)', 'total')
        .where('commission.partnerId = :partnerId', { partnerId: targetPartnerId })
        .andWhere('commission.status = :status', { status: 'pending' })
        .getRawOne();

      const pendingCommissions = parseFloat(pendingStats?.total || '0');

      // Calculate conversion rate
      const conversionRate = targetPartner.totalClicks > 0
        ? (targetPartner.totalOrders / targetPartner.totalClicks) * 100
        : 0;

      // Count active referral links (for now, just 1 default link)
      const activeLinks = 1;

      // Calculate tier progress (simplified)
      const tierProgress = this.calculateTierProgress(targetPartner);

      // Calculate next payout date based on tier
      const nextPayout = this.calculateNextPayoutDate(targetPartner);

      // Calculate average order value
      const averageOrderValue = totalOrders > 0 ? totalEarnings / totalOrders : 0;

      // R-6-2: Create metadata
      const meta = createDashboardMeta(
        { range: parsedRange.range },
        parsedRange.startDate,
        parsedRange.endDate
      );

      // R-6-2: Return standard DTO with partner-specific fields
      const response: PartnerDashboardSummaryDto = {
        // Standard fields
        totalOrders,
        totalRevenue: totalEarnings,
        averageOrderValue: parseFloat(averageOrderValue.toFixed(2)),

        // Partner-specific fields
        totalEarnings,
        monthlyEarnings,
        pendingCommissions,
        conversionRate: parseFloat(conversionRate.toFixed(2)),
        totalClicks: targetPartner.totalClicks,
        totalConversions: targetPartner.totalOrders,
        activeLinks,
        tierLevel: targetPartner.tier,
        tierProgress,
        referralCode: targetPartner.referralCode,
        referralLink: targetPartner.referralLink,
        nextPayout: nextPayout.toISOString(),
        availableBalance: parseFloat(targetPartner.availableBalance.toString()),
        minimumPayout: parseFloat(targetPartner.minimumPayout.toString())
      };

      res.json({
        success: true,
        data: {
          ...response,
          meta
        }
      });
    } catch (error: any) {
      console.error('Error fetching partner summary:', error);

      // R-6-2: Standard error response
      if (error.success === false) {
        // Already formatted dashboard error
        res.status(400).json(error);
        return;
      }

      res.status(500).json(
        createDashboardError(
          'SERVER_ERROR',
          'Failed to fetch partner summary',
          error instanceof Error ? error.message : 'Unknown error'
        )
      );
    }
  }

  /**
   * GET /api/v1/partners/dashboard/commissions
   * Get partner's commission history
   * R-6-2: Updated with standard error responses
   */
  async getCommissions(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const {
        status,
        page = 1,
        limit = 20,
        sortBy = 'convertedAt',
        sortOrder = 'DESC'
      } = req.query;

      if (!userId) {
        res.status(401).json(
          createDashboardError('UNAUTHORIZED', 'Authentication required')
        );
        return;
      }

      const partnerRepo = AppDataSource.getRepository(Partner);
      const partner = await partnerRepo.findOne({
        where: { userId }
      });

      if (!partner) {
        res.status(404).json(
          createDashboardError('NOT_FOUND', 'Partner profile not found')
        );
        return;
      }

      const commissionRepo = AppDataSource.getRepository(PartnerCommission);
      const queryBuilder = commissionRepo.createQueryBuilder('commission')
        .leftJoinAndSelect('commission.order', 'order')
        .leftJoinAndSelect('commission.product', 'product')
        .where('commission.partnerId = :partnerId', { partnerId: partner.id });

      // Apply filters
      if (status) {
        queryBuilder.andWhere('commission.status = :status', { status });
      }

      // Pagination
      const pageNum = Math.max(1, Number(page));
      const limitNum = Math.min(100, Math.max(1, Number(limit)));
      const skip = (pageNum - 1) * limitNum;

      queryBuilder
        .orderBy(`commission.${String(sortBy)}`, sortOrder as any)
        .skip(skip)
        .take(limitNum);

      const [commissions, total] = await queryBuilder.getManyAndCount();

      res.json({
        success: true,
        data: commissions,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum)
        }
      });
    } catch (error: any) {
      console.error('Error fetching partner commissions:', error);

      // R-6-2: Standard error response
      if (error.success === false) {
        res.status(400).json(error);
        return;
      }

      res.status(500).json(
        createDashboardError('SERVER_ERROR', 'Failed to fetch commissions')
      );
    }
  }

  /**
   * Calculate tier progress (0-100%)
   */
  private calculateTierProgress(partner: Partner): number {
    const { totalOrders, totalEarnings } = partner;

    // Define tier thresholds (orders needed for next tier)
    const tierThresholds = {
      bronze: 100,   // to silver
      silver: 500,   // to gold
      gold: 1000,    // to platinum
      platinum: 1000 // already max
    };

    const nextTierOrders = tierThresholds[partner.tier] || 1000;

    if (partner.tier === 'platinum') {
      return 100; // Already at max tier
    }

    const progress = (totalOrders / nextTierOrders) * 100;
    return Math.min(100, Math.round(progress));
  }

  /**
   * Calculate next payout date based on partner tier
   */
  private calculateNextPayoutDate(partner: Partner): Date {
    const now = new Date();
    const payoutFrequency = partner.getPayoutFrequency();

    switch (payoutFrequency) {
      case 'weekly':
        // Next Monday
        const daysUntilMonday = (8 - now.getDay()) % 7;
        return new Date(now.getTime() + daysUntilMonday * 24 * 60 * 60 * 1000);

      case 'bi-weekly':
        // Next 1st or 15th of month
        const day = now.getDate();
        if (day < 15) {
          return new Date(now.getFullYear(), now.getMonth(), 15);
        } else {
          return new Date(now.getFullYear(), now.getMonth() + 1, 1);
        }

      case 'on-demand':
        // Can request anytime (return current date)
        return now;

      case 'monthly':
      default:
        // First day of next month
        return new Date(now.getFullYear(), now.getMonth() + 1, 1);
    }
  }
}
