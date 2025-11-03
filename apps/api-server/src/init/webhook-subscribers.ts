import { OperationsService } from '../services/OperationsService.js';
import { webhookService } from '../services/WebhookService.js';
import logger from '../utils/logger.js';

/**
 * Webhook Event Subscribers
 *
 * Connects OperationsService EventEmitter to BullMQ webhook queue.
 *
 * Events:
 * - commission.adjusted: Partner notified of commission amount change
 * - commission.paid: Partner notified of payment completion
 * - commission.cancelled: Partner notified of cancellation
 * - commission.refunded: Partner notified of refund processing
 * - commission.auto_confirmed: Partner notified of auto-confirmation
 *
 * @init Phase 2.2 - Stage 4
 */

/**
 * Initialize webhook event subscriptions
 *
 * @param operationsService - OperationsService instance
 */
export function initializeWebhookSubscribers(operationsService: OperationsService): void {
  const eventEmitter = operationsService.getEventEmitter();

  logger.info('[Webhook Subscribers] Initializing event subscriptions...');

  /**
   * Commission Adjusted Event
   *
   * Triggered when admin adjusts commission amount
   */
  eventEmitter.on('commission.adjusted', async (data: {
    commissionId: string;
    partnerId: string;
    oldAmount: number;
    newAmount: number;
    reason: string;
    adjustedBy: string;
  }) => {
    try {
      logger.info(`[Webhook] commission.adjusted event received for partner ${data.partnerId}`);

      await webhookService.enqueueWebhook(data.partnerId, 'commission.adjusted', {
        commissionId: data.commissionId,
        oldAmount: data.oldAmount,
        newAmount: data.newAmount,
        reason: data.reason,
        adjustedBy: data.adjustedBy,
        adjustedAt: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('[Webhook] Failed to handle commission.adjusted:', error);
    }
  });

  /**
   * Commission Paid Event
   *
   * Triggered when admin marks commission as paid
   */
  eventEmitter.on('commission.paid', async (data: {
    commissionId: string;
    partnerId: string;
    amount: number;
    paymentMethod: string;
    paymentReference: string;
    paidBy: string;
  }) => {
    try {
      logger.info(`[Webhook] commission.paid event received for partner ${data.partnerId}`);

      await webhookService.enqueueWebhook(data.partnerId, 'commission.paid', {
        commissionId: data.commissionId,
        amount: data.amount,
        paymentMethod: data.paymentMethod,
        paymentReference: data.paymentReference,
        paidBy: data.paidBy,
        paidAt: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('[Webhook] Failed to handle commission.paid:', error);
    }
  });

  /**
   * Commission Cancelled Event
   *
   * Triggered when admin manually cancels commission
   */
  eventEmitter.on('commission.cancelled', async (data: {
    commissionId: string;
    partnerId: string;
    reason: string;
    cancelledBy: string;
  }) => {
    try {
      logger.info(`[Webhook] commission.cancelled event received for partner ${data.partnerId}`);

      await webhookService.enqueueWebhook(data.partnerId, 'commission.cancelled', {
        commissionId: data.commissionId,
        reason: data.reason,
        cancelledBy: data.cancelledBy,
        cancelledAt: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('[Webhook] Failed to handle commission.cancelled:', error);
    }
  });

  /**
   * Commission Refunded Event
   *
   * Triggered when admin processes refund
   */
  eventEmitter.on('commission.refunded', async (data: {
    commissionId: string;
    conversionId: string;
    partnerId: string;
    refundAmount: number;
    reason: string;
    processedBy: string;
  }) => {
    try {
      logger.info(`[Webhook] commission.refunded event received for partner ${data.partnerId}`);

      await webhookService.enqueueWebhook(data.partnerId, 'commission.refunded', {
        commissionId: data.commissionId,
        conversionId: data.conversionId,
        refundAmount: data.refundAmount,
        reason: data.reason,
        processedBy: data.processedBy,
        refundedAt: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('[Webhook] Failed to handle commission.refunded:', error);
    }
  });

  /**
   * Commission Auto-Confirmed Event
   *
   * Triggered by batch job when commission is auto-confirmed after hold period
   */
  eventEmitter.on('commission.auto_confirmed', async (data: {
    commissionId: string;
    partnerId: string;
    amount: number;
    confirmedAt: string;
  }) => {
    try {
      logger.info(`[Webhook] commission.auto_confirmed event received for partner ${data.partnerId}`);

      await webhookService.enqueueWebhook(data.partnerId, 'commission.auto_confirmed', {
        commissionId: data.commissionId,
        amount: data.amount,
        confirmedAt: data.confirmedAt,
      });
    } catch (error) {
      logger.error('[Webhook] Failed to handle commission.auto_confirmed:', error);
    }
  });

  logger.info('[Webhook Subscribers] ✅ 5 event subscriptions initialized');
  logger.info('  - commission.adjusted');
  logger.info('  - commission.paid');
  logger.info('  - commission.cancelled');
  logger.info('  - commission.refunded');
  logger.info('  - commission.auto_confirmed');
}
