import { Request, Response } from 'express';
import { OperationsService } from '../services/OperationsService.js';
import { CommissionStatus } from '../entities/Commission.js';
import {
  BadRequestException,
  ValidationException
} from '../exceptions/HttpExceptions.js';

/**
 * OperationsController
 *
 * Handles HTTP requests for administrative commission operations.
 * All endpoints require admin authentication (enforced by middleware).
 *
 * Endpoints:
 * - POST /commissions/:id/adjust - Adjust commission amount
 * - POST /commissions/:id/cancel - Cancel commission
 * - POST /commissions/:id/pay - Mark commission as paid
 * - POST /refunds - Process refund
 * - GET /commissions - List commissions with filters
 * - GET /audit-trail/:entityType/:entityId - Get audit trail
 * - GET /activity/user/:userId - Get user activity log
 * - GET /activity/recent - Get recent activity
 *
 * @controller Phase 2.2
 */
export class OperationsController {
  private operationsService: OperationsService;

  constructor() {
    this.operationsService = new OperationsService();
  }

  /**
   * Adjust commission amount
   *
   * POST /api/v1/operations/commissions/:id/adjust
   *
   * Body:
   * {
   *   "newAmount": 15.50,
   *   "reason": "Partner tier upgraded to Silver"
   * }
   */
  adjustCommission = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { newAmount, reason } = req.body;
      const adminId = req.user?.id;
      const ipAddress = req.ip;

      // Validation
      if (!newAmount || typeof newAmount !== 'number') {
        throw new ValidationException('newAmount is required and must be a number');
      }

      if (!reason || typeof reason !== 'string' || reason.trim() === '') {
        throw new ValidationException('reason is required');
      }

      if (!adminId) {
        throw new BadRequestException('User not authenticated');
      }

      // Adjust commission
      const commission = await this.operationsService.adjustCommission(
        id,
        newAmount,
        reason,
        adminId,
        ipAddress
      );

      res.status(200).json({
        success: true,
        data: commission,
        message: `Commission adjusted from $${commission.metadata?.adjustmentHistory?.[commission.metadata.adjustmentHistory.length - 2]?.oldAmount || 0} to $${newAmount}`
      });
    } catch (error) {
      this.handleError(res, error);
    }
  };

  /**
   * Cancel commission
   *
   * POST /api/v1/operations/commissions/:id/cancel
   *
   * Body:
   * {
   *   "reason": "Policy violation - fraudulent activity detected"
   * }
   */
  cancelCommission = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const adminId = req.user?.id;
      const ipAddress = req.ip;

      // Validation
      if (!reason || typeof reason !== 'string' || reason.trim() === '') {
        throw new ValidationException('reason is required');
      }

      if (!adminId) {
        throw new BadRequestException('User not authenticated');
      }

      // Cancel commission
      const commission = await this.operationsService.cancelCommission(
        id,
        reason,
        adminId,
        ipAddress
      );

      res.status(200).json({
        success: true,
        data: commission,
        message: `Commission cancelled: ${reason}`
      });
    } catch (error) {
      this.handleError(res, error);
    }
  };

  /**
   * Mark commission as paid
   *
   * POST /api/v1/operations/commissions/:id/pay
   *
   * Body:
   * {
   *   "paymentMethod": "bank_transfer",
   *   "paymentReference": "TXN-2025-001234"
   * }
   */
  markCommissionAsPaid = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { paymentMethod, paymentReference } = req.body;
      const adminId = req.user?.id;
      const ipAddress = req.ip;

      // Validation
      if (!paymentMethod || typeof paymentMethod !== 'string') {
        throw new ValidationException('paymentMethod is required');
      }

      if (!paymentReference || typeof paymentReference !== 'string') {
        throw new ValidationException('paymentReference is required');
      }

      if (!adminId) {
        throw new BadRequestException('User not authenticated');
      }

      // Mark as paid
      const commission = await this.operationsService.markCommissionAsPaid(
        id,
        paymentMethod,
        paymentReference,
        adminId,
        ipAddress
      );

      res.status(200).json({
        success: true,
        data: commission,
        message: `Commission marked as paid via ${paymentMethod}`
      });
    } catch (error) {
      this.handleError(res, error);
    }
  };

  /**
   * Process refund
   *
   * POST /api/v1/operations/refunds
   *
   * Body:
   * {
   *   "conversionId": "uuid",
   *   "refundAmount": 100.00,
   *   "reason": "Customer requested refund"
   * }
   */
  processRefund = async (req: Request, res: Response): Promise<void> => {
    try {
      const { conversionId, refundAmount, reason } = req.body;
      const adminId = req.user?.id;
      const ipAddress = req.ip;

      // Validation
      if (!conversionId || typeof conversionId !== 'string') {
        throw new ValidationException('conversionId is required');
      }

      if (!refundAmount || typeof refundAmount !== 'number' || refundAmount <= 0) {
        throw new ValidationException('refundAmount is required and must be positive');
      }

      if (!reason || typeof reason !== 'string' || reason.trim() === '') {
        throw new ValidationException('reason is required');
      }

      if (!adminId) {
        throw new BadRequestException('User not authenticated');
      }

      // Process refund
      const commission = await this.operationsService.processRefund(
        conversionId,
        refundAmount,
        reason,
        adminId,
        ipAddress
      );

      res.status(200).json({
        success: true,
        data: commission,
        message: `Refund processed for conversion ${conversionId}`
      });
    } catch (error) {
      this.handleError(res, error);
    }
  };

  /**
   * List commissions with filters
   *
   * GET /api/v1/operations/commissions?partnerId=xxx&status=pending&page=1&limit=20
   */
  listCommissions = async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        partnerId,
        status,
        dateFrom,
        dateTo,
        minAmount,
        maxAmount,
        search,
        page = '1',
        limit = '20'
      } = req.query;

      // Parse filters
      const filters: any = {};

      if (partnerId) filters.partnerId = String(partnerId);
      if (status) {
        if (!Object.values(CommissionStatus).includes(status as CommissionStatus)) {
          throw new ValidationException(`Invalid status: ${status}`);
        }
        filters.status = status as CommissionStatus;
      }
      if (dateFrom) filters.dateFrom = new Date(String(dateFrom));
      if (dateTo) filters.dateTo = new Date(String(dateTo));
      if (minAmount) filters.minAmount = parseFloat(String(minAmount));
      if (maxAmount) filters.maxAmount = parseFloat(String(maxAmount));
      if (search) filters.search = String(search);

      const pagination = {
        page: parseInt(String(page)) || 1,
        limit: Math.min(parseInt(String(limit)) || 20, 100) // Max 100 per page
      };

      // List commissions
      const result = await this.operationsService.listCommissions(filters, pagination);

      res.status(200).json({
        success: true,
        data: result.commissions,
        meta: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages
        }
      });
    } catch (error) {
      this.handleError(res, error);
    }
  };

  /**
   * Get audit trail for entity
   *
   * GET /api/v1/operations/audit-trail/:entityType/:entityId
   */
  getAuditTrail = async (req: Request, res: Response): Promise<void> => {
    try {
      const { entityType, entityId } = req.params;

      if (!entityType || !entityId) {
        throw new ValidationException('entityType and entityId are required');
      }

      const trail = await this.operationsService.getAuditTrail(entityType, entityId);

      res.status(200).json({
        success: true,
        data: trail,
        meta: {
          entityType,
          entityId,
          count: trail.length
        }
      });
    } catch (error) {
      this.handleError(res, error);
    }
  };

  /**
   * Get user activity log
   *
   * GET /api/v1/operations/activity/user/:userId?limit=50
   */
  getUserActivity = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;
      const { limit = '50' } = req.query;

      if (!userId) {
        throw new ValidationException('userId is required');
      }

      const activity = await this.operationsService.getUserActivity(
        userId,
        parseInt(String(limit))
      );

      res.status(200).json({
        success: true,
        data: activity,
        meta: {
          userId,
          count: activity.length
        }
      });
    } catch (error) {
      this.handleError(res, error);
    }
  };

  /**
   * Get recent activity across all entities
   *
   * GET /api/v1/operations/activity/recent?limit=100
   */
  getRecentActivity = async (req: Request, res: Response): Promise<void> => {
    try {
      const { limit = '100' } = req.query;

      const activity = await this.operationsService.getRecentActivity(
        parseInt(String(limit))
      );

      res.status(200).json({
        success: true,
        data: activity,
        meta: {
          count: activity.length
        }
      });
    } catch (error) {
      this.handleError(res, error);
    }
  };

  /**
   * Error handler
   */
  private handleError(res: Response, error: unknown): void {
    console.error('OperationsController error:', error);

    if (error instanceof ValidationException) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.message
        }
      });
    } else if (error instanceof BadRequestException) {
      res.status(400).json({
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: error.message
        }
      });
    } else if ((error as any).name === 'NotFoundException') {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: (error as Error).message
        }
      });
    } else if ((error as any).name === 'ConflictException') {
      res.status(409).json({
        success: false,
        error: {
          code: 'CONFLICT',
          message: (error as Error).message
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Internal server error'
        }
      });
    }
  }
}
