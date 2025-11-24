/**
 * Phase PD-5: Admin Settlement Controller
 *
 * Admin endpoints for managing settlements
 */

import { Request, Response } from 'express';
import { SettlementManagementService } from '../../services/SettlementManagementService.js';
import { SettlementStatus } from '../../entities/Settlement.js';
import logger from '../../utils/logger.js';

const settlementService = new SettlementManagementService();

/**
 * GET /api/v1/admin/settlements
 * Get all settlements with filters
 */
export const getAllSettlements = async (req: Request, res: Response) => {
  try {
    const {
      page = '1',
      limit = '20',
      status,
      partyType,
      periodStart,
      periodEnd,
      search,
    } = req.query;

    const filters: any = {
      page: parseInt(page as string, 10),
      limit: parseInt(limit as string, 10),
    };

    if (status) {
      filters.status = status as SettlementStatus;
    }

    if (partyType) {
      filters.partyType = partyType as string;
    }

    if (periodStart) {
      filters.periodStart = new Date(periodStart as string);
    }

    if (periodEnd) {
      filters.periodEnd = new Date(periodEnd as string);
    }

    if (search) {
      filters.search = search as string;
    }

    const result = await settlementService.getAllSettlements(filters);

    res.json({
      success: true,
      data: {
        settlements: result.settlements,
        pagination: {
          total: result.total,
          page: filters.page,
          limit: filters.limit,
          total_pages: result.totalPages,
        },
      },
    });
  } catch (error: any) {
    logger.error('[PD-5] Error getting all settlements', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch settlements',
      error: error.message,
    });
  }
};

/**
 * GET /api/v1/admin/settlements/:id
 * Get settlement by ID with detailed items
 */
export const getSettlementById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const settlement = await settlementService.getSettlementById(id);

    if (!settlement) {
      return res.status(404).json({
        success: false,
        message: 'Settlement not found',
      });
    }

    res.json({
      success: true,
      data: settlement,
    });
  } catch (error: any) {
    logger.error('[PD-5] Error getting settlement by ID', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch settlement',
      error: error.message,
    });
  }
};

/**
 * POST /api/v1/admin/settlements/batch
 * [DEPRECATED] This endpoint is deprecated. Use the new daily settlement batch system.
 * Run batch settlement creation for a period
 */
export const createBatchSettlements = async (req: Request, res: Response) => {
  logger.warn('[PD-5] DEPRECATED: createBatchSettlements endpoint called');
  res.status(410).json({
    success: false,
    message: 'This endpoint is deprecated. Settlement generation is now automatic via SettlementEngine (R-8-8). Use the daily settlement batch CLI script instead: npm run batch:settlement:daily',
    deprecationNotice: {
      reason: 'Replaced by automatic settlement generation (SettlementEngine)',
      replacement: 'SettlementEngine handles settlement creation automatically when orders complete. Use the CLI script for batch processing: npm run batch:settlement:daily',
      migrationGuide: 'See R-8-8 documentation for the new settlement system'
    }
  });
};

/**
 * POST /api/v1/admin/settlements
 * [DEPRECATED] This endpoint is deprecated. Use the new automatic settlement system.
 * Create a single settlement for a specific party
 */
export const createSettlement = async (req: Request, res: Response) => {
  logger.warn('[PD-5] DEPRECATED: createSettlement endpoint called');
  res.status(410).json({
    success: false,
    message: 'This endpoint is deprecated. Settlements are now created automatically by SettlementEngine when orders complete (R-8-8).',
    deprecationNotice: {
      reason: 'Replaced by automatic settlement generation (SettlementEngine)',
      replacement: 'SettlementEngine automatically creates settlements when orders reach DELIVERED status',
      migrationGuide: 'See R-8-8 documentation for the new settlement system'
    }
  });
};

/**
 * PUT /api/v1/admin/settlements/:id/status
 * Update settlement status
 */
export const updateSettlementStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, paidAt } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'status is required',
      });
    }

    let settlement;

    switch (status) {
      case SettlementStatus.PROCESSING:
        settlement = await settlementService.markAsProcessing(id);
        break;

      case SettlementStatus.PAID:
        const paidDate = paidAt ? new Date(paidAt) : undefined;
        settlement = await settlementService.markAsPaid(id, paidDate);
        break;

      case SettlementStatus.CANCELLED:
        settlement = await settlementService.cancelSettlement(id);
        break;

      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid status value',
        });
    }

    logger.info('[PD-5] Settlement status updated', {
      settlementId: id,
      status,
      adminId: (req as any).user?.id,
    });

    res.json({
      success: true,
      settlement,
    });
  } catch (error: any) {
    logger.error('[PD-5] Error updating settlement status', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to update settlement status',
      error: error.message,
    });
  }
};

/**
 * GET /api/v1/admin/settlements/preview
 * [DEPRECATED] This endpoint is deprecated. Use the automatic settlement system.
 * Preview settlement calculation without creating record
 */
export const previewSettlement = async (req: Request, res: Response) => {
  logger.warn('[PD-5] DEPRECATED: previewSettlement endpoint called');
  res.status(410).json({
    success: false,
    message: 'This endpoint is deprecated. Settlements are now created automatically by SettlementEngine (R-8-8). View settlements in the dashboard or use getAllSettlements endpoint.',
    deprecationNotice: {
      reason: 'Replaced by automatic settlement generation (SettlementEngine)',
      replacement: 'SettlementEngine automatically creates settlement records when orders complete. Query existing settlements instead of previewing.',
      migrationGuide: 'See R-8-8 documentation for the new settlement system'
    }
  });
};

/**
 * PUT /api/v1/admin/settlements/:id/memo
 * Update settlement memo (Phase SETTLE-ADMIN)
 */
export const updateMemo = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { memo_internal } = req.body;

    if (memo_internal === undefined) {
      return res.status(400).json({
        success: false,
        message: 'memo_internal field is required',
      });
    }

    const settlement = await settlementService.updateSettlementMemo(
      id,
      memo_internal
    );

    logger.info('[SETTLE-ADMIN] Settlement memo updated', {
      settlementId: id,
      adminId: (req as any).user?.id,
    });

    res.json({
      success: true,
      data: settlement,
      message: 'Memo saved successfully',
    });
  } catch (error: any) {
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        message: 'Settlement not found',
      });
    }

    logger.error('[SETTLE-ADMIN] Error updating settlement memo', {
      error: error.message,
    });
    res.status(500).json({
      success: false,
      message: 'Failed to update memo',
      error: error.message,
    });
  }
};

/**
 * POST /api/v1/admin/settlements/:id/mark-paid
 * Mark settlement as paid (Phase SETTLE-ADMIN)
 */
export const markSettlementAsPaid = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { paidAt } = req.body;

    const paidDate = paidAt ? new Date(paidAt) : undefined;

    const settlement = await settlementService.markAsPaid(id, paidDate);

    logger.info('[SETTLE-ADMIN] Settlement marked as paid', {
      settlementId: id,
      paidAt: settlement.paidAt,
      adminId: (req as any).user?.id,
    });

    res.json({
      success: true,
      data: settlement,
      message: 'Settlement marked as paid successfully',
    });
  } catch (error: any) {
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        message: 'Settlement not found',
      });
    }

    logger.error('[SETTLE-ADMIN] Error marking settlement as paid', {
      error: error.message,
    });
    res.status(500).json({
      success: false,
      message: 'Failed to mark settlement as paid',
      error: error.message,
    });
  }
};
