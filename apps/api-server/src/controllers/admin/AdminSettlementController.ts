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
 * Run batch settlement creation for a period
 */
export const createBatchSettlements = async (req: Request, res: Response) => {
  try {
    const { periodStart, periodEnd } = req.body;

    if (!periodStart || !periodEnd) {
      return res.status(400).json({
        success: false,
        message: 'periodStart and periodEnd are required',
      });
    }

    const start = new Date(periodStart);
    const end = new Date(periodEnd);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format',
      });
    }

    if (start >= end) {
      return res.status(400).json({
        success: false,
        message: 'periodStart must be before periodEnd',
      });
    }

    logger.info('[PD-5] Batch settlement creation requested', {
      periodStart: start,
      periodEnd: end,
      adminId: (req as any).user?.id,
    });

    const result = await settlementService.batchCreateSettlements(start, end);

    res.json({
      success: true,
      created: result.created.length,
      errors: result.errors.length,
      settlements: result.created,
      errorDetails: result.errors,
    });
  } catch (error: any) {
    logger.error('[PD-5] Error creating batch settlements', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to create batch settlements',
      error: error.message,
    });
  }
};

/**
 * POST /api/v1/admin/settlements
 * Create a single settlement for a specific party
 */
export const createSettlement = async (req: Request, res: Response) => {
  try {
    const { partyType, partyId, periodStart, periodEnd, notes } = req.body;

    if (!partyType || !partyId || !periodStart || !periodEnd) {
      return res.status(400).json({
        success: false,
        message: 'partyType, partyId, periodStart, and periodEnd are required',
      });
    }

    const start = new Date(periodStart);
    const end = new Date(periodEnd);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format',
      });
    }

    const settlement = await settlementService.createSettlement({
      partyType,
      partyId,
      periodStart: start,
      periodEnd: end,
      notes,
    });

    res.status(201).json({
      success: true,
      settlement,
    });
  } catch (error: any) {
    logger.error('[PD-5] Error creating settlement', { error: error.message });

    if (error.message.includes('already exists')) {
      return res.status(409).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create settlement',
      error: error.message,
    });
  }
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
 * Preview settlement calculation without creating record
 */
export const previewSettlement = async (req: Request, res: Response) => {
  try {
    const { partyType, partyId, periodStart, periodEnd } = req.query;

    if (!partyType || !partyId || !periodStart || !periodEnd) {
      return res.status(400).json({
        success: false,
        message: 'partyType, partyId, periodStart, and periodEnd are required',
      });
    }

    const start = new Date(periodStart as string);
    const end = new Date(periodEnd as string);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format',
      });
    }

    const preview = await settlementService.calculateSettlementPreview(
      partyType as any,
      partyId as string,
      start,
      end
    );

    res.json({
      success: true,
      preview,
    });
  } catch (error: any) {
    logger.error('[PD-5] Error previewing settlement', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to preview settlement',
      error: error.message,
    });
  }
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
