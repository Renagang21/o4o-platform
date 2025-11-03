import TrackingService from './TrackingService.js';
import AttributionService from './AttributionService.js';
import CommissionEngine from './CommissionEngine.js';
import logger from '../utils/logger.js';

/**
 * WebhookHandlers
 *
 * Handles order lifecycle events and automates the commission flow:
 * - Order Created → Create Conversion Event → Create Commission (pending)
 * - Order Confirmed → Confirm Commission (hold period starts)
 * - Order Cancelled → Cancel Conversion & Commission
 * - Order Refunded → Process Refund & Adjust Commission
 */

export interface OrderCreatedEvent {
  orderId: string;
  productId: string;
  orderAmount: number;
  productPrice: number;
  quantity: number;
  currency?: string;
  customerId?: string;
  isNewCustomer?: boolean;
  referralCode?: string;
  metadata?: Record<string, any>;
}

export interface OrderConfirmedEvent {
  orderId: string;
}

export interface OrderCancelledEvent {
  orderId: string;
  reason?: string;
}

export interface OrderRefundedEvent {
  orderId: string;
  refundAmount: number;
  refundQuantity?: number;
  isPartialRefund: boolean;
}

export class WebhookHandlers {
  private trackingService: TrackingService;
  private attributionService: AttributionService;
  private commissionEngine: CommissionEngine;

  constructor() {
    this.trackingService = new TrackingService();
    this.attributionService = new AttributionService();
    this.commissionEngine = new CommissionEngine();
  }

  /**
   * Handle order created event
   * Flow: Create conversion → Create commission (pending)
   */
  async handleOrderCreated(event: OrderCreatedEvent): Promise<void> {
    try {
      logger.info(`Processing order created event: ${event.orderId}`);

      // 1. Validate required fields
      if (!event.referralCode) {
        logger.warn(`Order ${event.orderId} has no referral code - skipping commission tracking`);
        return;
      }

      // 2. Create conversion event (with attribution)
      const conversion = await this.attributionService.createConversion({
        orderId: event.orderId,
        productId: event.productId,
        referralCode: event.referralCode,
        orderAmount: event.orderAmount,
        productPrice: event.productPrice,
        quantity: event.quantity,
        currency: event.currency,
        customerId: event.customerId,
        isNewCustomer: event.isNewCustomer,
        metadata: event.metadata
      });

      logger.info(`Conversion created: ${conversion.id} for order ${event.orderId}`);

      // 3. Create commission (in pending state)
      // Note: Commission will be created automatically when conversion is confirmed
      // This is done in handleOrderConfirmed to ensure order is actually fulfilled

      logger.info(`Order created event processed successfully: ${event.orderId}`);

    } catch (error) {
      logger.error(`Error processing order created event:`, error);
      // Don't throw - we don't want to fail order creation if commission tracking fails
      // TODO: Push to dead-letter queue for retry
    }
  }

  /**
   * Handle order confirmed event
   * Flow: Confirm conversion → Create commission (pending with hold period)
   */
  async handleOrderConfirmed(event: OrderConfirmedEvent): Promise<void> {
    try {
      logger.info(`Processing order confirmed event: ${event.orderId}`);

      // 1. Find conversion(s) for this order
      const conversions = await this.attributionService.getConversionByOrder(event.orderId);

      if (conversions.length === 0) {
        logger.warn(`No conversions found for order ${event.orderId}`);
        return;
      }

      // 2. Confirm each conversion
      for (const conversion of conversions) {
        if (conversion.status === 'pending') {
          const confirmed = await this.attributionService.confirmConversion(conversion.id);
          logger.info(`Conversion confirmed: ${confirmed.id}`);

          // 3. Create commission in pending state (hold period applies)
          const commission = await this.commissionEngine.createCommission({
            conversionId: confirmed.id
          });

          logger.info(
            `Commission created: ${commission.id} (amount: ${commission.commissionAmount}, hold until: ${commission.holdUntil})`
          );
        }
      }

      logger.info(`Order confirmed event processed successfully: ${event.orderId}`);

    } catch (error) {
      logger.error(`Error processing order confirmed event:`, error);
      // Don't throw - log and queue for retry
      // TODO: Push to dead-letter queue for retry
    }
  }

  /**
   * Handle order cancelled event
   * Flow: Cancel conversion → Cancel commission
   */
  async handleOrderCancelled(event: OrderCancelledEvent): Promise<void> {
    try {
      logger.info(`Processing order cancelled event: ${event.orderId}`);

      // 1. Find conversion(s) for this order
      const conversions = await this.attributionService.getConversionByOrder(event.orderId);

      if (conversions.length === 0) {
        logger.warn(`No conversions found for order ${event.orderId}`);
        return;
      }

      // 2. Cancel each conversion
      for (const conversion of conversions) {
        if (conversion.status !== 'cancelled') {
          await this.attributionService.cancelConversion(conversion.id);
          logger.info(`Conversion cancelled: ${conversion.id}`);

          // 3. Find and cancel associated commission
          const commissions = await this.commissionEngine.getCommissions({
            partnerId: conversion.partnerId,
            limit: 100
          });

          const relatedCommission = commissions.commissions.find(
            c => c.conversionId === conversion.id
          );

          if (relatedCommission && relatedCommission.status !== 'cancelled' && relatedCommission.status !== 'paid') {
            await this.commissionEngine.cancelCommission(
              relatedCommission.id,
              event.reason || 'Order cancelled'
            );
            logger.info(`Commission cancelled: ${relatedCommission.id}`);
          }
        }
      }

      logger.info(`Order cancelled event processed successfully: ${event.orderId}`);

    } catch (error) {
      logger.error(`Error processing order cancelled event:`, error);
      // Don't throw - log and queue for retry
      // TODO: Push to dead-letter queue for retry
    }
  }

  /**
   * Handle order refunded event
   * Flow: Process refund on conversion → Adjust or cancel commission
   */
  async handleOrderRefunded(event: OrderRefundedEvent): Promise<void> {
    try {
      logger.info(`Processing order refunded event: ${event.orderId} (amount: ${event.refundAmount})`);

      // 1. Find conversion(s) for this order
      const conversions = await this.attributionService.getConversionByOrder(event.orderId);

      if (conversions.length === 0) {
        logger.warn(`No conversions found for order ${event.orderId}`);
        return;
      }

      // 2. Process refund for each conversion
      for (const conversion of conversions) {
        // Process refund on conversion
        const refunded = await this.attributionService.processRefund(
          conversion.id,
          event.refundAmount,
          event.refundQuantity
        );

        logger.info(
          `Refund processed on conversion: ${refunded.id} (status: ${refunded.status})`
        );

        // 3. Find associated commission
        const commissions = await this.commissionEngine.getCommissions({
          partnerId: conversion.partnerId,
          limit: 100
        });

        const relatedCommission = commissions.commissions.find(
          c => c.conversionId === conversion.id
        );

        if (relatedCommission) {
          if (event.isPartialRefund) {
            // Partial refund - adjust commission proportionally
            const refundRatio = event.refundAmount / conversion.orderAmount;
            const newCommissionAmount = relatedCommission.commissionAmount * (1 - refundRatio);

            await this.commissionEngine.adjustCommission(
              relatedCommission.id,
              newCommissionAmount,
              `Partial refund: ${event.refundAmount} refunded`
            );

            logger.info(
              `Commission adjusted for partial refund: ${relatedCommission.id} (new amount: ${newCommissionAmount})`
            );

          } else {
            // Full refund - cancel commission
            await this.commissionEngine.cancelCommission(
              relatedCommission.id,
              'Full refund processed'
            );

            logger.info(`Commission cancelled due to full refund: ${relatedCommission.id}`);
          }
        }
      }

      logger.info(`Order refunded event processed successfully: ${event.orderId}`);

    } catch (error) {
      logger.error(`Error processing order refunded event:`, error);
      // Don't throw - log and queue for retry
      // TODO: Push to dead-letter queue for retry
    }
  }

  /**
   * Scheduled job: Auto-confirm commissions that have passed hold period
   * Run this daily via cron job
   */
  async autoConfirmCommissions(): Promise<void> {
    try {
      logger.info('Running auto-confirm commissions job');

      const count = await this.commissionEngine.autoConfirmCommissions();

      logger.info(`Auto-confirm job completed: ${count} commissions confirmed`);

    } catch (error) {
      logger.error('Error in auto-confirm commissions job:', error);
    }
  }

  /**
   * Scheduled job: Anonymize old click data for GDPR compliance
   * Run this daily via cron job
   */
  async anonymizeOldClicks(retentionDays: number = 90): Promise<void> {
    try {
      logger.info(`Running anonymize old clicks job (retention: ${retentionDays} days)`);

      const count = await this.trackingService.anonymizeOldClicks(retentionDays);

      logger.info(`Anonymization job completed: ${count} clicks anonymized`);

    } catch (error) {
      logger.error('Error in anonymize old clicks job:', error);
    }
  }
}

export default WebhookHandlers;
