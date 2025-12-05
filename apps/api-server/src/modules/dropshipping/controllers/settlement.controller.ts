import { Response } from 'express';
import { BaseController } from '../../../common/base.controller.js';
import { CreateSettlementDto, UpdateSettlementDto, SettlementQueryDto } from '../dto/index.js';
import { SettlementService } from '../services/SettlementService.js';
import logger from '../../../utils/logger.js';
import type { AuthRequest } from '../../../common/middleware/auth.middleware.js';

/**
 * SettlementController
 * NextGen V2 - Dropshipping Module
 * Handles settlement operations
 */
export class SettlementController extends BaseController {
  static async createSettlement(req: AuthRequest, res: Response): Promise<any> {
    try {
      if (!req.user) {
        return BaseController.unauthorized(res, 'Not authenticated');
      }

      const data = req.body as CreateSettlementDto;
      const settlementService = new SettlementService();

      // Convert DTO numbers to appropriate format for service
      const settlement = await settlementService.create({
        partyType: data.partyType,
        partyId: data.partyId,
        periodStart: data.periodStart,
        periodEnd: data.periodEnd,
        totalSaleAmount: data.totalSaleAmount as any,
        totalBaseAmount: data.totalBaseAmount as any,
        totalCommissionAmount: data.totalCommissionAmount as any,
        totalMarginAmount: data.totalMarginAmount as any,
        payableAmount: data.payableAmount as any,
        notes: data.notes,
        memo: data.memo
      });

      return BaseController.ok(res, {
        message: 'Settlement created',
        settlement
      });
    } catch (error: any) {
      logger.error('[SettlementController.createSettlement] Error', {
        error: error.message,
        userId: req.user?.id,
      });
      return BaseController.error(res, error);
    }
  }

  static async getSettlement(req: AuthRequest, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const settlementService = new SettlementService();

      const settlement = await settlementService.findById(id);

      if (!settlement) {
        return BaseController.notFound(res, 'Settlement not found');
      }

      return BaseController.ok(res, { settlement });
    } catch (error: any) {
      logger.error('[SettlementController.getSettlement] Error', {
        error: error.message,
        settlementId: req.params.id,
      });
      return BaseController.error(res, error);
    }
  }

  static async listSettlements(req: AuthRequest, res: Response): Promise<any> {
    try {
      const query = req.query as unknown as SettlementQueryDto;
      const settlementService = new SettlementService();

      const result = await settlementService.list({
        partyType: query.partyType,
        partyId: query.partyId,
        status: query.status,
        startDate: query.startDate,
        endDate: query.endDate,
        sortBy: query.sortBy || 'createdAt',
        sortOrder: query.sortOrder?.toLowerCase() as 'asc' | 'desc' || 'desc',
        page: query.page || 1,
        limit: query.limit || 20
      });

      return BaseController.okPaginated(res, result.settlements, {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      });
    } catch (error: any) {
      logger.error('[SettlementController.listSettlements] Error', {
        error: error.message,
      });
      return BaseController.error(res, error);
    }
  }

  static async updateSettlement(req: AuthRequest, res: Response): Promise<any> {
    try {
      if (!req.user) {
        return BaseController.unauthorized(res, 'Not authenticated');
      }

      const { id } = req.params;
      const data = req.body as UpdateSettlementDto;
      const settlementService = new SettlementService();

      const settlement = await settlementService.update(id, {
        status: data.status,
        payableAmount: data.payableAmount as any,
        notes: data.notes,
        memo: data.memo,
        paidAt: data.paidAt
      });

      return BaseController.ok(res, {
        message: 'Settlement updated',
        settlement
      });
    } catch (error: any) {
      logger.error('[SettlementController.updateSettlement] Error', {
        error: error.message,
        settlementId: req.params.id,
      });
      return BaseController.error(res, error);
    }
  }

  static async processSettlement(req: AuthRequest, res: Response): Promise<any> {
    try {
      if (!req.user) {
        return BaseController.unauthorized(res, 'Not authenticated');
      }

      const { id } = req.params;
      const { action } = req.body;
      const settlementService = new SettlementService();

      if (!action || !['pay', 'cancel', 'start_processing'].includes(action)) {
        return BaseController.error(res, 'Invalid action. Must be one of: pay, cancel, start_processing', 400);
      }

      const settlement = await settlementService.process(id, action);

      return BaseController.ok(res, {
        message: `Settlement ${action === 'pay' ? 'marked as paid' : action === 'cancel' ? 'cancelled' : 'processing started'}`,
        settlement
      });
    } catch (error: any) {
      logger.error('[SettlementController.processSettlement] Error', {
        error: error.message,
        settlementId: req.params.id,
      });
      return BaseController.error(res, error);
    }
  }
}
