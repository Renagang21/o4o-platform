import { Request, Response } from 'express';
import { AppDataSource } from '../../database/connection.js';
import { PaymentSettlement, SettlementStatus, RecipientType } from '../../entities/PaymentSettlement.js';
import { Partner } from '../../entities/Partner.js';
import { Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';

/**
 * Settlement Entity Controller
 * Handles payment settlement operations for Partners
 */
export class SettlementEntityController {

  /**
   * GET /api/v1/entity/settlements
   * List all settlements with filtering and pagination
   * Partners see only their own settlements, Admins see all
   */
  async list(req: Request, res: Response): Promise<void> {
    try {
      const {
        status,
        recipientType,
        startDate,
        endDate,
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'DESC'
      } = req.query;

      const settlementRepo = AppDataSource.getRepository(PaymentSettlement);
      const queryBuilder = settlementRepo.createQueryBuilder('settlement')
        .leftJoinAndSelect('settlement.payment', 'payment');

      // Apply filters
      if (status) {
        queryBuilder.andWhere('settlement.status = :status', { status });
      }

      if (recipientType) {
        queryBuilder.andWhere('settlement.recipientType = :recipientType', { recipientType });
      }

      // Date range filter
      if (startDate && endDate) {
        queryBuilder.andWhere('settlement.scheduledAt BETWEEN :startDate AND :endDate', {
          startDate,
          endDate
        });
      } else if (startDate) {
        queryBuilder.andWhere('settlement.scheduledAt >= :startDate', { startDate });
      } else if (endDate) {
        queryBuilder.andWhere('settlement.scheduledAt <= :endDate', { endDate });
      }

      // Authorization: Partners see only their settlements
      const userId = (req as any).user?.id;
      const userRole = (req as any).user?.role;

      if (userRole !== 'admin' && userRole !== 'super_admin') {
        // Find partner ID for this user
        const partnerRepo = AppDataSource.getRepository(Partner);
        const partner = await partnerRepo.findOne({
          where: { userId }
        });

        if (!partner) {
          res.status(403).json({
            success: false,
            error: 'Partner profile not found'
          });
          return;
        }

        // Filter to partner's settlements only
        queryBuilder.andWhere('settlement.recipientType = :type', { type: RecipientType.PARTNER });
        queryBuilder.andWhere('settlement.recipientId = :partnerId', { partnerId: partner.id });
      }

      // Pagination
      const pageNum = Math.max(1, Number(page));
      const limitNum = Math.min(100, Math.max(1, Number(limit)));
      const skip = (pageNum - 1) * limitNum;

      queryBuilder
        .orderBy(`settlement.${String(sortBy)}`, sortOrder as any)
        .skip(skip)
        .take(limitNum);

      const [settlements, total] = await queryBuilder.getManyAndCount();

      res.json({
        success: true,
        data: settlements,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum)
        }
      });
    } catch (error) {
      console.error('Error listing settlements:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to list settlements',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * GET /api/v1/entity/settlements/:id
   * Get a single settlement by ID with full details
   */
  async get(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const settlementRepo = AppDataSource.getRepository(PaymentSettlement);

      const settlement = await settlementRepo.findOne({
        where: { id },
        relations: ['payment']
      });

      if (!settlement) {
        res.status(404).json({
          success: false,
          error: 'Settlement not found'
        });
        return;
      }

      // Authorization check
      const userId = (req as any).user?.id;
      const userRole = (req as any).user?.role;

      if (userRole !== 'admin' && userRole !== 'super_admin') {
        // Verify this settlement belongs to the user's partner profile
        const partnerRepo = AppDataSource.getRepository(Partner);
        const partner = await partnerRepo.findOne({
          where: { userId }
        });

        if (!partner) {
          res.status(403).json({
            success: false,
            error: 'Partner profile not found'
          });
          return;
        }

        if (settlement.recipientType !== RecipientType.PARTNER || settlement.recipientId !== partner.id) {
          res.status(403).json({
            success: false,
            error: 'You do not have permission to view this settlement'
          });
          return;
        }
      }

      res.json({
        success: true,
        data: settlement
      });
    } catch (error) {
      console.error('Error fetching settlement:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch settlement',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * GET /api/v1/entity/settlements/summary
   * Get aggregated settlement summary for partner dashboard
   * Returns: total earnings, pending amount, completed amount, etc.
   */
  async getSummary(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const userRole = (req as any).user?.role;

      const settlementRepo = AppDataSource.getRepository(PaymentSettlement);

      // Get partner ID for non-admin users
      let partnerId: string | undefined;

      if (userRole !== 'admin' && userRole !== 'super_admin') {
        const partnerRepo = AppDataSource.getRepository(Partner);
        const partner = await partnerRepo.findOne({
          where: { userId }
        });

        if (!partner) {
          res.status(403).json({
            success: false,
            error: 'Partner profile not found'
          });
          return;
        }

        partnerId = partner.id;
      }

      // Build query for summary stats
      let queryBuilder = settlementRepo.createQueryBuilder('settlement');

      if (partnerId) {
        queryBuilder
          .where('settlement.recipientType = :type', { type: RecipientType.PARTNER })
          .andWhere('settlement.recipientId = :partnerId', { partnerId });
      }

      // Get all settlements for calculations
      const settlements = await queryBuilder.getMany();

      // Calculate summary statistics
      const totalEarnings = settlements
        .filter(s => s.status === SettlementStatus.COMPLETED)
        .reduce((sum, s) => sum + Number(s.netAmount), 0);

      const pendingAmount = settlements
        .filter(s => s.status === SettlementStatus.PENDING || s.status === SettlementStatus.SCHEDULED)
        .reduce((sum, s) => sum + Number(s.netAmount), 0);

      const processingAmount = settlements
        .filter(s => s.status === SettlementStatus.PROCESSING)
        .reduce((sum, s) => sum + Number(s.netAmount), 0);

      const failedAmount = settlements
        .filter(s => s.status === SettlementStatus.FAILED)
        .reduce((sum, s) => sum + Number(s.netAmount), 0);

      const totalCount = settlements.length;
      const completedCount = settlements.filter(s => s.status === SettlementStatus.COMPLETED).length;
      const pendingCount = settlements.filter(s => s.status === SettlementStatus.PENDING || s.status === SettlementStatus.SCHEDULED).length;
      const processingCount = settlements.filter(s => s.status === SettlementStatus.PROCESSING).length;

      // Get next scheduled settlement
      const nextSettlement = settlements
        .filter(s => s.status === SettlementStatus.SCHEDULED && new Date(s.scheduledAt) > new Date())
        .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())[0];

      res.json({
        success: true,
        data: {
          totalEarnings,
          pendingAmount,
          processingAmount,
          failedAmount,
          totalCount,
          completedCount,
          pendingCount,
          processingCount,
          currency: 'KRW',
          nextScheduledSettlement: nextSettlement ? {
            id: nextSettlement.id,
            amount: nextSettlement.netAmount,
            scheduledAt: nextSettlement.scheduledAt
          } : null
        }
      });
    } catch (error) {
      console.error('Error fetching settlement summary:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch settlement summary',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}
