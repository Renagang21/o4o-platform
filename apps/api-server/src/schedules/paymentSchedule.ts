import * as cron from 'node-cron';
import { AppDataSource } from '../database/connection';
import { SubscriptionService } from '../services/subscription.service';
import { TossPaymentsAdvancedService } from '../services/toss-payments-advanced.service';
import { paymentSystemIntegration } from '../services/payment-system-integration.service';
import logger from '../utils/logger';

class PaymentScheduler {
  private subscriptionService: SubscriptionService;
  private tossPaymentsService: TossPaymentsAdvancedService;

  constructor() {
    this.subscriptionService = new SubscriptionService();
    this.tossPaymentsService = new TossPaymentsAdvancedService();
  }

  async processScheduledSubscriptionPayments() {
    try {
      logger.info('Starting scheduled subscription payment processing...');
      
      await this.subscriptionService.processScheduledPayments();
      
      logger.info('Scheduled subscription payment processing completed');
    } catch (error) {
      logger.error('Error processing scheduled subscription payments:', error);
    }
  }

  async retryFailedPayments() {
    try {
      logger.info('Starting failed payment retry processing...');
      
      const { AppDataSource } = await import('../database/connection');
      const paymentRepository = AppDataSource.getRepository('Payment');
      
      const failedPayments = await paymentRepository.find({
        where: { 
          status: 'failed',
          retryCount: { $lt: 3 }
        },
        order: { createdAt: 'ASC' }
      });

      for (const payment of failedPayments) {
        try {
          if (payment.billingKey) {
            const retryResult = await this.tossPaymentsService.retryPaymentWithBillingKey({
              paymentKey: payment.paymentKey,
              billingKey: payment.billingKey,
              amount: payment.amount,
              orderName: payment.orderName || `Payment retry for ${payment.paymentKey}`,
              customerKey: payment.customerKey,
            });

            payment.retryCount = (payment.retryCount || 0) + 1;
            payment.lastRetryAt = new Date();
            
            if (retryResult.success) {
              payment.status = 'completed';
              payment.completedAt = new Date();
              
              logger.info('Payment retry successful', {
                paymentKey: payment.paymentKey,
                retryCount: payment.retryCount
              });
            } else {
              payment.failureReason = retryResult.error || 'Retry failed';
              
              logger.warn('Payment retry failed', {
                paymentKey: payment.paymentKey,
                retryCount: payment.retryCount,
                reason: payment.failureReason
              });
            }
            
            await paymentRepository.save(payment);
          }
        } catch (error) {
          logger.error(`Error retrying payment ${payment.paymentKey}:`, error);
        }
      }
      
      logger.info(`Failed payment retry processing completed. Processed ${failedPayments.length} payments`);
    } catch (error) {
      logger.error('Error in failed payment retry processing:', error);
    }
  }

  async syncSettlementData() {
    try {
      logger.info('Starting settlement data synchronization...');
      
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const dateString = yesterday.toISOString().split('T')[0];
      
      await paymentSystemIntegration.syncSettlementData(dateString);
      
      logger.info(`Settlement data synchronization completed for date: ${dateString}`);
    } catch (error) {
      logger.error('Error synchronizing settlement data:', error);
    }
  }

  async cleanupExpiredBillingKeys() {
    try {
      logger.info('Starting expired billing key cleanup...');
      
      const { AppDataSource } = await import('../database/connection');
      const billingKeyRepository = AppDataSource.getRepository('BillingKey');
      
      const expiredKeys = await billingKeyRepository.find({
        where: {
          expiresAt: { $lt: new Date() },
          status: 'active'
        }
      });

      for (const billingKey of expiredKeys) {
        billingKey.status = 'expired';
        await billingKeyRepository.save(billingKey);
      }
      
      logger.info(`Expired billing key cleanup completed. Cleaned up ${expiredKeys.length} keys`);
    } catch (error) {
      logger.error('Error cleaning up expired billing keys:', error);
    }
  }

  async generatePaymentReports() {
    try {
      logger.info('Starting payment report generation...');
      
      const { PaymentAnalyticsService } = await import('../services/payment-analytics.service');
      const paymentAnalyticsService = new PaymentAnalyticsService();
      
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const overview = await paymentAnalyticsService.getPaymentOverview({
        startDate: yesterday,
        endDate: yesterday
      });
      
      logger.info('Daily payment report generated', {
        date: yesterday.toISOString().split('T')[0],
        totalPayments: overview.totalPayments,
        totalAmount: overview.totalAmount,
        successRate: overview.successRate
      });
      
      logger.info('Payment report generation completed');
    } catch (error) {
      logger.error('Error generating payment reports:', error);
    }
  }

  async processWebhookEventRetries() {
    try {
      logger.info('Starting webhook event retry processing...');
      
      const { AppDataSource } = await import('../database/connection');
      const webhookEventRepository = AppDataSource.getRepository('WebhookEvent');
      
      const failedEvents = await webhookEventRepository.find({
        where: {
          status: 'failed',
          retryCount: { $lt: 3 },
          nextRetryAt: { $lte: new Date() }
        },
        order: { createdAt: 'ASC' }
      });

      for (const event of failedEvents) {
        try {
          await paymentSystemIntegration.handlePaymentEvent(
            event.eventType,
            event.paymentKey,
            event.data
          );
          
          event.status = 'processed';
          event.processedAt = new Date();
          event.retryCount = (event.retryCount || 0) + 1;
          
          logger.info('Webhook event retry successful', {
            eventId: event.id,
            eventType: event.eventType,
            paymentKey: event.paymentKey
          });
        } catch (error) {
          event.retryCount = (event.retryCount || 0) + 1;
          event.lastError = error.message;
          
          if (event.retryCount >= 3) {
            event.status = 'failed_permanent';
          } else {
            const nextRetry = new Date();
            nextRetry.setMinutes(nextRetry.getMinutes() + (event.retryCount * 30));
            event.nextRetryAt = nextRetry;
          }
          
          logger.error(`Webhook event retry failed`, {
            eventId: event.id,
            eventType: event.eventType,
            paymentKey: event.paymentKey,
            retryCount: event.retryCount,
            error: error.message
          });
        }
        
        await webhookEventRepository.save(event);
      }
      
      logger.info(`Webhook event retry processing completed. Processed ${failedEvents.length} events`);
    } catch (error) {
      logger.error('Error processing webhook event retries:', error);
    }
  }
}

export function startPaymentSchedules() {
  const scheduler = new PaymentScheduler();

  // Process subscription billing daily at 2 AM (as specified in Phase 4 requirements)
  cron.schedule('0 2 * * *', async () => {
    await scheduler.processScheduledSubscriptionPayments();
  });

  // Retry failed payments hourly (as specified in Phase 4 requirements)
  cron.schedule('0 * * * *', async () => {
    await scheduler.retryFailedPayments();
  });

  // Sync settlement data daily at 6 AM (as specified in Phase 4 requirements)
  cron.schedule('0 6 * * *', async () => {
    await scheduler.syncSettlementData();
  });

  // Clean up expired billing keys daily at 3 AM
  cron.schedule('0 3 * * *', async () => {
    await scheduler.cleanupExpiredBillingKeys();
  });

  // Generate daily payment reports at 7 AM
  cron.schedule('0 7 * * *', async () => {
    await scheduler.generatePaymentReports();
  });

  // Process webhook event retries every 30 minutes
  cron.schedule('*/30 * * * *', async () => {
    await scheduler.processWebhookEventRetries();
  });

  logger.info('Payment schedules started successfully');
}

// Automation scheduler for Phase 4
export function startAutomationSchedules() {
  // Order status automation check (every hour - as specified in Phase 4)
  cron.schedule('0 * * * *', async () => {
    try {
      logger.info('Starting order status automation check...');
      
      const { orderAutomationService } = await import('../services/order-automation.service');
      
      // Process pending orders that might need status updates
      const { AppDataSource } = await import('../database/connection');
      const orderRepository = AppDataSource.getRepository('Order');
      
      const pendingOrders = await orderRepository.find({
        where: { status: { $in: ['pending', 'paid', 'confirmed', 'processing'] } },
        order: { updatedAt: 'ASC' },
        take: 100
      });

      for (const order of pendingOrders) {
        await orderAutomationService.triggerAutomation('order_status_check', order);
      }
      
      logger.info(`Order status automation check completed. Processed ${pendingOrders.length} orders`);
    } catch (error) {
      logger.error('Error in order status automation check:', error);
    }
  });

  // Inventory automation processing (every 2 hours - as specified in Phase 4)
  cron.schedule('0 */2 * * *', async () => {
    try {
      logger.info('Starting inventory automation processing...');
      
      const { orderAutomationService } = await import('../services/order-automation.service');
      const { inventoryService } = await import('../services/inventoryService');
      
      // Get low stock products and trigger automation
      const lowStockProducts = await inventoryService.getLowStockProducts(10);
      
      for (const product of lowStockProducts) {
        await orderAutomationService.triggerAutomation('inventory_low_stock', product);
      }
      
      logger.info(`Inventory automation processing completed. Processed ${lowStockProducts.length} low stock items`);
    } catch (error) {
      logger.error('Error in inventory automation processing:', error);
    }
  });

  // Commission automation processing (daily at 9 AM - as specified in Phase 4)
  cron.schedule('0 9 * * *', async () => {
    try {
      logger.info('Starting commission automation processing...');
      
      const { orderAutomationService } = await import('../services/order-automation.service');
      const { AppDataSource } = await import('../database/connection');
      const paymentCommissionRepository = AppDataSource.getRepository('PaymentCommission');
      
      // Get pending commissions for auto-approval
      const pendingCommissions = await paymentCommissionRepository.find({
        where: { 
          status: 'pending',
          amount: { $lt: 1000 } // Auto-approval threshold
        },
        order: { createdAt: 'ASC' },
        take: 100
      });

      for (const commission of pendingCommissions) {
        await orderAutomationService.triggerAutomation('commission_created', commission);
      }
      
      logger.info(`Commission automation processing completed. Processed ${pendingCommissions.length} commissions`);
    } catch (error) {
      logger.error('Error in commission automation processing:', error);
    }
  });

  logger.info('Automation schedules started successfully');
}