import { OperationsService } from '../services/OperationsService.js';
import { enqueueWebhook } from '../queues/webhook.queue.js';
import { AppDataSource } from '../database/connection.js';
import { Partner } from '../entities/Partner.js';

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
  const partnerRepo = AppDataSource.getRepository(Partner);

  console.log('[Webhook Subscribers] Initializing event subscriptions...');

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
      console.log(`[Webhook] commission.adjusted event received for partner ${data.partnerId}`);

      // Fetch partner
      const partner = await partnerRepo.findOne({
        where: { id: data.partnerId }
      });

      if (!partner) {
        console.log(`[Webhook] Partner ${data.partnerId} not found, skipping`);
        return;
      }

      // TODO: Partner entity needs webhookUrl and webhookSecret fields
      // Webhook delivery will be enabled once Partner entity is updated
      console.log(`[Webhook] ℹ️  Webhook delivery for commission.adjusted logged (pending Partner entity webhook fields)`);
    } catch (error) {
      console.error('[Webhook] ❌ Failed to handle commission.adjusted:', error);
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
      console.log(`[Webhook] commission.paid event received for partner ${data.partnerId}`);
      console.log(`[Webhook] ℹ️  Webhook delivery for commission.paid logged (pending Partner entity webhook fields)`);
    } catch (error) {
      console.error('[Webhook] ❌ Failed to handle commission.paid:', error);
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
      console.log(`[Webhook] commission.cancelled event received for partner ${data.partnerId}`);
      console.log(`[Webhook] ℹ️  Webhook delivery for commission.cancelled logged (pending Partner entity webhook fields)`);
    } catch (error) {
      console.error('[Webhook] ❌ Failed to handle commission.cancelled:', error);
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
      console.log(`[Webhook] commission.refunded event received for partner ${data.partnerId}`);
      console.log(`[Webhook] ℹ️  Webhook delivery for commission.refunded logged (pending Partner entity webhook fields)`);
    } catch (error) {
      console.error('[Webhook] ❌ Failed to handle commission.refunded:', error);
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
      console.log(`[Webhook] commission.auto_confirmed event received for partner ${data.partnerId}`);
      console.log(`[Webhook] ℹ️  Webhook delivery for commission.auto_confirmed logged (pending Partner entity webhook fields)`);
    } catch (error) {
      console.error('[Webhook] ❌ Failed to handle commission.auto_confirmed:', error);
    }
  });

  console.log('[Webhook Subscribers] ✅ 5 event subscriptions initialized:');
  console.log('  - commission.adjusted');
  console.log('  - commission.paid');
  console.log('  - commission.cancelled');
  console.log('  - commission.refunded');
  console.log('  - commission.auto_confirmed');
  console.log('  Note: Actual webhook delivery will be enabled once Partner entity has webhookUrl/webhookSecret fields');
}
