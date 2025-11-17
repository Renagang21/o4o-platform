/**
 * Phase PD-5: Supplier Settlement Controller
 *
 * Supplier endpoints for viewing their settlements
 */

import { Request, Response } from 'express';
import { SettlementManagementService } from '../services/SettlementManagementService.js';
import logger from '../utils/logger.js';

const settlementService = new SettlementManagementService();

/**
 * GET /api/v1/supplier/settlements
 * Get supplier's own settlements
 */
export const getSupplierSettlements = async (req: Request, res: Response) => {
  try {
    const supplierId = (req as any).user?.id;

    if (!supplierId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const {
      page = '1',
      limit = '20',
      status,
      periodStart,
      periodEnd,
    } = req.query;

    const filters: any = {
      page: parseInt(page as string, 10),
      limit: parseInt(limit as string, 10),
    };

    if (status) {
      filters.status = status;
    }

    if (periodStart) {
      filters.periodStart = new Date(periodStart as string);
    }

    if (periodEnd) {
      filters.periodEnd = new Date(periodEnd as string);
    }

    const result = await settlementService.getSettlements(
      'supplier',
      supplierId,
      filters
    );

    res.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    logger.error('[PD-5] Error getting supplier settlements', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch settlements',
      error: error.message,
    });
  }
};

/**
 * GET /api/v1/supplier/settlements/preview
 * Preview settlement calculation for current period
 */
export const previewSupplierSettlement = async (req: Request, res: Response) => {
  try {
    const supplierId = (req as any).user?.id;

    if (!supplierId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const { periodStart, periodEnd } = req.query;

    if (!periodStart || !periodEnd) {
      return res.status(400).json({
        success: false,
        message: 'periodStart and periodEnd are required',
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
      'supplier',
      supplierId,
      start,
      end
    );

    res.json({
      success: true,
      preview,
    });
  } catch (error: any) {
    logger.error('[PD-5] Error previewing supplier settlement', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to preview settlement',
      error: error.message,
    });
  }
};

/**
 * GET /api/v1/supplier/settlements/:id
 * Get settlement by ID (supplier can only view their own)
 */
export const getSupplierSettlementById = async (req: Request, res: Response) => {
  try {
    const supplierId = (req as any).user?.id;
    const { id } = req.params;

    if (!supplierId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const settlement = await settlementService.getSettlementById(id);

    if (!settlement) {
      return res.status(404).json({
        success: false,
        message: 'Settlement not found',
      });
    }

    // Check if settlement belongs to this supplier
    if (settlement.partyType !== 'supplier' || settlement.partyId !== supplierId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    res.json({
      success: true,
      settlement,
    });
  } catch (error: any) {
    logger.error('[PD-5] Error getting supplier settlement by ID', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch settlement',
      error: error.message,
    });
  }
};
