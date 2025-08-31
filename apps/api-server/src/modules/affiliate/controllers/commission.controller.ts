import { Request, Response, NextFunction } from 'express';
import { CommissionService } from '../services/commission.service';
import { PayoutService } from '../services/payout.service';
import {
  getCommissionsSchema,
  calculateCommissionSchema,
  processCommissionsSchema,
  createPayoutSchema,
  getPayoutsSchema,
  updateAffiliateStatusSchema,
  getAffiliateUsersSchema,
  adminDashboardQuerySchema
} from '../validators/commission.validator';
import { ApiResponse } from '../dto/response.dto';

export class CommissionController {
  private commissionService: CommissionService;
  private payoutService: PayoutService;

  constructor() {
    this.commissionService = new CommissionService();
    this.payoutService = new PayoutService();
  }

  /**
   * GET /api/v1/affiliate/commissions
   * Get commission list with filtering
   */
  getCommissions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { error, value } = getCommissionsSchema.validate(req.query);
      if (error) {
        res.status(400).json({
          success: false,
          error: error.details[0].message,
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Check if user is admin or affiliate
      const user = (req as any).user;
      if (user.role !== 'admin' && value.affiliateUserId !== user.affiliateId) {
        res.status(403).json({
          success: false,
          error: 'You can only view your own commissions',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const result = await this.commissionService.getCommissions(value);

      const response: ApiResponse = {
        success: true,
        data: result,
        message: 'Commissions retrieved successfully',
        timestamp: new Date().toISOString()
      };

      res.json(response);
    } catch (error: any) {
      const response: ApiResponse = {
        success: false,
        error: error.message || 'Failed to get commissions',
        timestamp: new Date().toISOString()
      };
      res.status(500).json(response);
    }
  };

  /**
   * POST /api/v1/affiliate/commissions/calculate
   * Calculate commission for a conversion (internal API)
   */
  calculateCommission = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { error, value } = calculateCommissionSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          success: false,
          error: error.details[0].message,
          timestamp: new Date().toISOString()
        });
        return;
      }

      // This should be an internal API call, verify system token or admin role
      const user = (req as any).user;
      if (user.role !== 'admin' && user.role !== 'system') {
        res.status(403).json({
          success: false,
          error: 'Unauthorized to calculate commissions',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const commission = await this.commissionService.calculateCommission(value);

      const response: ApiResponse = {
        success: true,
        data: commission,
        message: 'Commission calculated successfully',
        timestamp: new Date().toISOString()
      };

      res.status(201).json(response);
    } catch (error: any) {
      const response: ApiResponse = {
        success: false,
        error: error.message || 'Failed to calculate commission',
        timestamp: new Date().toISOString()
      };
      res.status(error.message?.includes('already') ? 409 : 500).json(response);
    }
  };

  /**
   * POST /api/v1/affiliate/commissions/process
   * Process multiple commissions (admin only)
   */
  processCommissions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { error, value } = processCommissionsSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          success: false,
          error: error.details[0].message,
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Admin only
      const user = (req as any).user;
      if (user.role !== 'admin') {
        res.status(403).json({
          success: false,
          error: 'Admin access required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const result = await this.commissionService.processCommissions(value, user.id);

      const response: ApiResponse = {
        success: true,
        data: result,
        message: `Processed ${result.processed} commissions successfully`,
        timestamp: new Date().toISOString()
      };

      res.json(response);
    } catch (error: any) {
      const response: ApiResponse = {
        success: false,
        error: error.message || 'Failed to process commissions',
        timestamp: new Date().toISOString()
      };
      res.status(500).json(response);
    }
  };

  /**
   * GET /api/v1/affiliate/users
   * Get affiliate users list (admin only)
   */
  getAffiliateUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { error, value } = getAffiliateUsersSchema.validate(req.query);
      if (error) {
        res.status(400).json({
          success: false,
          error: error.details[0].message,
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Admin only
      const user = (req as any).user;
      if (user.role !== 'admin') {
        res.status(403).json({
          success: false,
          error: 'Admin access required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const result = await this.commissionService.getAffiliateUsers(value);

      const response: ApiResponse = {
        success: true,
        data: result,
        message: 'Affiliate users retrieved successfully',
        timestamp: new Date().toISOString()
      };

      res.json(response);
    } catch (error: any) {
      const response: ApiResponse = {
        success: false,
        error: error.message || 'Failed to get affiliate users',
        timestamp: new Date().toISOString()
      };
      res.status(500).json(response);
    }
  };

  /**
   * PATCH /api/v1/affiliate/users/:id/status
   * Update affiliate user status (admin only)
   */
  updateAffiliateStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { error, value } = updateAffiliateStatusSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          success: false,
          error: error.details[0].message,
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Admin only
      const user = (req as any).user;
      if (user.role !== 'admin') {
        res.status(403).json({
          success: false,
          error: 'Admin access required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      await this.commissionService.updateAffiliateStatus(id, value, user.id);

      const response: ApiResponse = {
        success: true,
        message: `Affiliate status updated to ${value.status}`,
        timestamp: new Date().toISOString()
      };

      res.json(response);
    } catch (error: any) {
      const response: ApiResponse = {
        success: false,
        error: error.message || 'Failed to update affiliate status',
        timestamp: new Date().toISOString()
      };
      res.status(error.message?.includes('not found') ? 404 : 500).json(response);
    }
  };

  /**
   * GET /api/v1/affiliate/payouts
   * Get payout list
   */
  getPayouts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { error, value } = getPayoutsSchema.validate(req.query);
      if (error) {
        res.status(400).json({
          success: false,
          error: error.details[0].message,
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Check permissions
      const user = (req as any).user;
      if (user.role !== 'admin' && value.affiliateUserId !== user.affiliateId) {
        res.status(403).json({
          success: false,
          error: 'You can only view your own payouts',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const result = await this.payoutService.getPayouts(value);

      const response: ApiResponse = {
        success: true,
        data: result,
        message: 'Payouts retrieved successfully',
        timestamp: new Date().toISOString()
      };

      res.json(response);
    } catch (error: any) {
      const response: ApiResponse = {
        success: false,
        error: error.message || 'Failed to get payouts',
        timestamp: new Date().toISOString()
      };
      res.status(500).json(response);
    }
  };

  /**
   * POST /api/v1/affiliate/payouts
   * Create a new payout (admin only)
   */
  createPayout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { error, value } = createPayoutSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          success: false,
          error: error.details[0].message,
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Admin only
      const user = (req as any).user;
      if (user.role !== 'admin') {
        res.status(403).json({
          success: false,
          error: 'Admin access required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const payout = await this.payoutService.createPayout(value, user.id);

      const response: ApiResponse = {
        success: true,
        data: payout,
        message: 'Payout created successfully',
        timestamp: new Date().toISOString()
      };

      res.status(201).json(response);
    } catch (error: any) {
      const response: ApiResponse = {
        success: false,
        error: error.message || 'Failed to create payout',
        timestamp: new Date().toISOString()
      };
      res.status(500).json(response);
    }
  };

  /**
   * GET /api/v1/affiliate/payouts/:id
   * Get payout details
   */
  getPayoutDetails = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const result = await this.payoutService.getPayoutDetails(id);

      // Check permissions
      const user = (req as any).user;
      if (user.role !== 'admin' && result.payout.affiliateUserId !== user.affiliateId) {
        res.status(403).json({
          success: false,
          error: 'You can only view your own payouts',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const response: ApiResponse = {
        success: true,
        data: result,
        message: 'Payout details retrieved successfully',
        timestamp: new Date().toISOString()
      };

      res.json(response);
    } catch (error: any) {
      const response: ApiResponse = {
        success: false,
        error: error.message || 'Failed to get payout details',
        timestamp: new Date().toISOString()
      };
      res.status(error.message?.includes('not found') ? 404 : 500).json(response);
    }
  };

  /**
   * PATCH /api/v1/affiliate/payouts/:id/process
   * Process a payout (admin only)
   */
  processPayout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { status, transactionId, failureReason } = req.body;

      // Validate status
      if (!['processing', 'completed', 'failed'].includes(status)) {
        res.status(400).json({
          success: false,
          error: 'Invalid status. Must be processing, completed, or failed',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Admin only
      const user = (req as any).user;
      if (user.role !== 'admin') {
        res.status(403).json({
          success: false,
          error: 'Admin access required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const payout = await this.payoutService.processPayout(
        id,
        status,
        transactionId,
        failureReason,
        user.id
      );

      const response: ApiResponse = {
        success: true,
        data: payout,
        message: `Payout marked as ${status}`,
        timestamp: new Date().toISOString()
      };

      res.json(response);
    } catch (error: any) {
      const response: ApiResponse = {
        success: false,
        error: error.message || 'Failed to process payout',
        timestamp: new Date().toISOString()
      };
      res.status(500).json(response);
    }
  };

  /**
   * DELETE /api/v1/affiliate/payouts/:id
   * Cancel a payout (admin only)
   */
  cancelPayout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      if (!reason) {
        res.status(400).json({
          success: false,
          error: 'Cancellation reason is required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Admin only
      const user = (req as any).user;
      if (user.role !== 'admin') {
        res.status(403).json({
          success: false,
          error: 'Admin access required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      await this.payoutService.cancelPayout(id, reason, user.id);

      const response: ApiResponse = {
        success: true,
        message: 'Payout cancelled successfully',
        timestamp: new Date().toISOString()
      };

      res.json(response);
    } catch (error: any) {
      const response: ApiResponse = {
        success: false,
        error: error.message || 'Failed to cancel payout',
        timestamp: new Date().toISOString()
      };
      res.status(500).json(response);
    }
  };

  /**
   * GET /api/v1/affiliate/payouts/calculate/:affiliateUserId
   * Calculate potential payout for an affiliate
   */
  calculatePayoutSummary = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { affiliateUserId } = req.params;

      // Check permissions
      const user = (req as any).user;
      if (user.role !== 'admin' && affiliateUserId !== user.affiliateId) {
        res.status(403).json({
          success: false,
          error: 'You can only view your own payout summary',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const result = await this.payoutService.calculatePayoutSummary(affiliateUserId);

      const response: ApiResponse = {
        success: true,
        data: result,
        message: 'Payout summary calculated successfully',
        timestamp: new Date().toISOString()
      };

      res.json(response);
    } catch (error: any) {
      const response: ApiResponse = {
        success: false,
        error: error.message || 'Failed to calculate payout summary',
        timestamp: new Date().toISOString()
      };
      res.status(500).json(response);
    }
  };

  /**
   * GET /api/v1/affiliate/admin/dashboard
   * Get admin dashboard data
   */
  getAdminDashboard = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { error, value } = adminDashboardQuerySchema.validate(req.query);
      if (error) {
        res.status(400).json({
          success: false,
          error: error.details[0].message,
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Admin only
      const user = (req as any).user;
      if (user.role !== 'admin') {
        res.status(403).json({
          success: false,
          error: 'Admin access required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const result = await this.commissionService.getAdminDashboard(value);

      const response: ApiResponse = {
        success: true,
        data: result,
        message: 'Dashboard data retrieved successfully',
        timestamp: new Date().toISOString()
      };

      res.json(response);
    } catch (error: any) {
      const response: ApiResponse = {
        success: false,
        error: error.message || 'Failed to get dashboard data',
        timestamp: new Date().toISOString()
      };
      res.status(500).json(response);
    }
  };
}