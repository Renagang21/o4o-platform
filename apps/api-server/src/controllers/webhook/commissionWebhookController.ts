import { Request, Response } from 'express';
import crypto from 'crypto';
import { AppDataSource } from '../../database/connection';
import logger from '../../utils/logger';
import { asyncHandler, AppError, ErrorCode } from '../../middleware/errorHandler.middleware';
import { CommissionService } from '../../services/commission.service';
import { cacheService } from '../../services/cache.service';

export interface WebhookPayload {
  event: string;
  data: {
    commissionId?: string;
    settlementId?: string;
    paymentId: string;
    amount: number;
    currency: string;
    status: 'success' | 'failed' | 'pending' | 'cancelled';
    paymentMethod: string;
    transactionId: string;
    failureReason?: string;
    metadata?: Record<string, any>;
  };
  timestamp: string;
  signature?: string;
}

export interface PaymentUpdateData {
  paymentId: string;
  status: 'success' | 'failed' | 'pending' | 'cancelled';
  amount: number;
  currency: string;
  paymentMethod: string;
  transactionId: string;
  paidAt?: Date;
  failureReason?: string;
  metadata?: Record<string, any>;
}

export class CommissionWebhookController {
  private commissionService: CommissionService;
  private webhookSecret: string;

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
    
    this.webhookSecret = process.env.WEBHOOK_SECRET || 'default-webhook-secret';
  }

  // POST /api/webhooks/commission-status - Handle payment status updates
  handlePaymentWebhook = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const payload: WebhookPayload = req.body;
    const signature = req.headers['x-webhook-signature'] as string;

    // Verify webhook signature
    if (!this.verifyWebhookSignature(JSON.stringify(payload), signature)) {
      logger.warn('Invalid webhook signature received', {
        signature,
        payload: payload.event,
        timestamp: payload.timestamp,
        ip: req.ip,
      });
      
      throw new AppError(
        'Invalid webhook signature',
        401,
        ErrorCode.UNAUTHORIZED
      );
    }

    // Log webhook received
    logger.info('Webhook received', {
      event: payload.event,
      paymentId: payload.data.paymentId,
      status: payload.data.status,
      amount: payload.data.amount,
      timestamp: payload.timestamp,
    });

    try {
      switch (payload.event) {
        case 'commission.payment.success':
          await this.handleCommissionPaymentSuccess(payload.data);
          break;
          
        case 'commission.payment.failed':
          await this.handleCommissionPaymentFailed(payload.data);
          break;
          
        case 'settlement.payment.success':
          await this.handleSettlementPaymentSuccess(payload.data);
          break;
          
        case 'settlement.payment.failed':
          await this.handleSettlementPaymentFailed(payload.data);
          break;
          
        case 'commission.dispute.created':
          await this.handleCommissionDispute(payload.data);
          break;
          
        case 'settlement.dispute.created':
          await this.handleSettlementDispute(payload.data);
          break;

        case 'payment.refund.processed':
          await this.handlePaymentRefund(payload.data);
          break;
          
        default:
          logger.warn('Unknown webhook event received', {
            event: payload.event,
            paymentId: payload.data.paymentId,
          });
          
          // Don't throw error for unknown events - just log and continue
          break;
      }

      // Save webhook log
      await this.saveWebhookLog(payload, 'success', req.ip);

      res.json({
        success: true,
        message: 'Webhook processed successfully',
        event: payload.event,
        paymentId: payload.data.paymentId,
      });

    } catch (error) {
      // Save webhook log with error
      await this.saveWebhookLog(payload, 'error', req.ip, error.message);
      
      logger.error('Webhook processing error', {
        event: payload.event,
        paymentId: payload.data.paymentId,
        error: error.message,
        stack: error.stack,
      });

      throw error;
    }
  });

  // Manual payment status update endpoint
  updatePaymentStatus = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { type, id, paymentData } = req.body; // type: 'commission' | 'settlement'
    const user = (req as any).user;

    // Verify admin permissions
    if (!['admin', 'manager'].includes(user?.role)) {
      throw new AppError(
        'Admin access required',
        403,
        ErrorCode.INSUFFICIENT_PERMISSIONS
      );
    }

    logger.info('Manual payment status update', {
      type,
      id,
      paymentData,
      updatedBy: user.id,
    });

    try {
      if (type === 'commission') {
        await this.commissionService.markVendorCommissionPaid(id, paymentData);
      } else if (type === 'settlement') {
        await this.commissionService.markSupplierSettlementPaid(id, paymentData);
      } else {
        throw new AppError(
          'Invalid payment type',
          400,
          ErrorCode.VALIDATION_ERROR
        );
      }

      // Invalidate related caches
      await cacheService.invalidateByTag('commissions');
      await cacheService.invalidateByTag('settlements');
      await cacheService.invalidateByTag('admin');

      res.json({
        success: true,
        message: 'Payment status updated successfully',
        data: { type, id, status: 'paid' },
      });

    } catch (error) {
      logger.error('Manual payment update error', {
        type,
        id,
        error: error.message,
        updatedBy: user.id,
      });
      throw error;
    }
  });

  // Get webhook logs for debugging
  getWebhookLogs = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { page = 1, limit = 50, event, status } = req.query;
    const user = (req as any).user;

    if (!['admin', 'manager'].includes(user?.role)) {
      throw new AppError(
        'Admin access required',
        403,
        ErrorCode.INSUFFICIENT_PERMISSIONS
      );
    }

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    let whereClause = '';
    const params: any[] = [limitNum, offset];

    if (event) {
      whereClause += ' WHERE event = $3';
      params.push(event);
    }

    if (status) {
      whereClause += whereClause ? ' AND status = $4' : ' WHERE status = $3';
      params.push(status);
    }

    const logs = await AppDataSource.query(`
      SELECT * FROM webhook_logs 
      ${whereClause}
      ORDER BY created_at DESC 
      LIMIT $1 OFFSET $2
    `, params);

    const totalQuery = `SELECT COUNT(*) as count FROM webhook_logs ${whereClause}`;
    const totalParams = whereClause ? params.slice(2) : [];
    const [{ count: total }] = await AppDataSource.query(totalQuery, totalParams);

    res.json({
      success: true,
      data: {
        logs,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: parseInt(total),
          totalPages: Math.ceil(total / limitNum),
        }
      },
      message: 'Webhook logs retrieved successfully',
    });
  });

  // Private methods for handling different webhook events
  private async handleCommissionPaymentSuccess(data: any) {
    const { commissionId, paymentId, amount, paymentMethod, transactionId } = data;

    if (!commissionId) {
      throw new AppError(
        'Commission ID required for commission payment webhook',
        400,
        ErrorCode.VALIDATION_ERROR
      );
    }

    await this.commissionService.markVendorCommissionPaid(commissionId, {
      paymentMethod,
      paymentReference: transactionId,
      paidAmount: amount,
    });

    // Invalidate caches
    await cacheService.invalidateByTag('commissions');
    await cacheService.invalidateByTag(`vendor:${commissionId.split('-')[0]}`);

    logger.info('Commission payment marked as successful', {
      commissionId,
      paymentId,
      amount,
    });
  }

  private async handleCommissionPaymentFailed(data: any) {
    const { commissionId, paymentId, failureReason } = data;

    if (!commissionId) {
      throw new AppError(
        'Commission ID required for commission payment webhook',
        400,
        ErrorCode.VALIDATION_ERROR
      );
    }

    // Update commission status to failed
    // Note: This would require additional method in CommissionService
    logger.error('Commission payment failed', {
      commissionId,
      paymentId,
      failureReason,
    });

    // Could trigger retry logic or admin notification here
  }

  private async handleSettlementPaymentSuccess(data: any) {
    const { settlementId, paymentId, amount, paymentMethod, transactionId } = data;

    if (!settlementId) {
      throw new AppError(
        'Settlement ID required for settlement payment webhook',
        400,
        ErrorCode.VALIDATION_ERROR
      );
    }

    await this.commissionService.markSupplierSettlementPaid(settlementId, {
      paymentMethod,
      paymentReference: transactionId,
      paidAmount: amount,
    });

    // Invalidate caches
    await cacheService.invalidateByTag('settlements');
    await cacheService.invalidateByTag(`supplier:${settlementId.split('-')[0]}`);

    logger.info('Settlement payment marked as successful', {
      settlementId,
      paymentId,
      amount,
    });
  }

  private async handleSettlementPaymentFailed(data: any) {
    const { settlementId, paymentId, failureReason } = data;

    logger.error('Settlement payment failed', {
      settlementId,
      paymentId,
      failureReason,
    });
  }

  private async handleCommissionDispute(data: any) {
    const { commissionId, paymentId, metadata } = data;
    const disputeReason = metadata?.disputeReason || 'Payment dispute raised';

    if (commissionId) {
      await this.commissionService.raiseVendorCommissionDispute(commissionId, disputeReason);
      
      logger.warn('Commission dispute created', {
        commissionId,
        paymentId,
        disputeReason,
      });
    }
  }

  private async handleSettlementDispute(data: any) {
    const { settlementId, paymentId, metadata } = data;
    const disputeReason = metadata?.disputeReason || 'Payment dispute raised';

    if (settlementId) {
      await this.commissionService.raiseSupplierSettlementDispute(settlementId, disputeReason);
      
      logger.warn('Settlement dispute created', {
        settlementId,
        paymentId,
        disputeReason,
      });
    }
  }

  private async handlePaymentRefund(data: any) {
    const { paymentId, amount, metadata } = data;
    
    logger.info('Payment refund processed', {
      paymentId,
      amount,
      reason: metadata?.refundReason,
    });

    // Handle refund logic - adjust commissions/settlements as needed
  }

  private verifyWebhookSignature(payload: string, signature: string): boolean {
    if (!signature) {
      return false;
    }

    const expectedSignature = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(payload)
      .digest('hex');

    const providedSignature = signature.startsWith('sha256=') 
      ? signature.substring(7) 
      : signature;

    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(providedSignature, 'hex')
    );
  }

  private async saveWebhookLog(
    payload: WebhookPayload, 
    status: 'success' | 'error',
    ip: string,
    errorMessage?: string
  ) {
    try {
      await AppDataSource.query(`
        INSERT INTO webhook_logs 
        (event, payment_id, status, amount, error_message, ip_address, payload, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      `, [
        payload.event,
        payload.data.paymentId,
        status,
        payload.data.amount,
        errorMessage,
        ip,
        JSON.stringify(payload),
      ]);
    } catch (error) {
      logger.error('Failed to save webhook log:', error);
    }
  }
}