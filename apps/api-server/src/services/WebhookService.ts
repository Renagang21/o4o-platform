/**
 * Webhook Service
 * Enqueues webhooks for delivery via BullMQ
 */

import { Repository } from 'typeorm';
import { Partner } from '../entities/Partner.js';
import { AppDataSource } from '../database/data-source.js';
import { webhookQueue } from '../queues/webhook.queue.js';
import logger from '../utils/logger.js';

export interface WebhookPayload {
  event: string;
  timestamp: string;
  data: Record<string, any>;
}

class WebhookService {
  private partnerRepository: Repository<Partner>;

  constructor() {
    this.partnerRepository = AppDataSource.getRepository(Partner);
  }

  /**
   * Enqueue webhook for delivery
   * @param partnerId Partner UUID
   * @param event Event type (e.g., 'commission.adjusted')
   * @param payload Event data
   */
  async enqueueWebhook(
    partnerId: string,
    event: string,
    payload: Record<string, any>
  ): Promise<void> {
    try {
      // Fetch partner
      const partner = await this.partnerRepository.findOne({
        where: { id: partnerId },
        select: ['id', 'webhookUrl', 'webhookSecret', 'webhookEnabled', 'webhookEvents'],
      });

      if (!partner) {
        logger.warn(`Partner not found for webhook: ${partnerId}`);
        return;
      }

      // Check if webhooks are enabled
      if (!partner.webhookEnabled) {
        logger.debug(`Webhooks disabled for partner: ${partnerId}`);
        return;
      }

      // Check if webhook URL is configured
      if (!partner.webhookUrl) {
        logger.debug(`No webhook URL configured for partner: ${partnerId}`);
        return;
      }

      // Check if webhook secret is configured
      if (!partner.webhookSecret) {
        logger.warn(`No webhook secret configured for partner: ${partnerId}`);
        return;
      }

      // Check if partner is subscribed to this event
      if (partner.webhookEvents && !partner.webhookEvents.includes(event)) {
        logger.debug(`Partner ${partnerId} not subscribed to event: ${event}`);
        return;
      }

      // Build webhook payload
      const webhookPayload: WebhookPayload = {
        event,
        timestamp: new Date().toISOString(),
        data: payload,
      };

      // Enqueue for delivery
      await webhookQueue.add(
        'deliver',
        {
          partnerId: partner.id,
          url: partner.webhookUrl,
          secret: partner.webhookSecret,
          event,
          payload: webhookPayload,
        },
        {
          attempts: 5, // Retry up to 5 times
          backoff: {
            type: 'exponential',
            delay: 1000, // Start with 1s, double each time
          },
          removeOnComplete: 1000, // Keep last 1000 successful jobs
          removeOnFail: 1000, // Keep last 1000 failed jobs
        }
      );

      logger.info(`Webhook enqueued for partner ${partnerId}: ${event}`);
    } catch (error: any) {
      logger.error(`Failed to enqueue webhook for partner ${partnerId}:`, {
        event,
        error: error.message,
      });
    }
  }

  /**
   * Enqueue webhooks for multiple partners
   * @param partnerIds Array of partner UUIDs
   * @param event Event type
   * @param payload Event data
   */
  async enqueueWebhooksForPartners(
    partnerIds: string[],
    event: string,
    payload: Record<string, any>
  ): Promise<void> {
    await Promise.all(
      partnerIds.map((partnerId) => this.enqueueWebhook(partnerId, event, payload))
    );
  }

  /**
   * Update webhook last delivered timestamp
   * @param partnerId Partner UUID
   */
  async updateLastDeliveredAt(partnerId: string): Promise<void> {
    try {
      await this.partnerRepository.update(
        { id: partnerId },
        { webhookLastDeliveredAt: new Date() }
      );
    } catch (error: any) {
      logger.error(`Failed to update webhook last delivered timestamp:`, {
        partnerId,
        error: error.message,
      });
    }
  }

  /**
   * Retry webhook delivery (Phase 2.4)
   * @param jobId BullMQ job ID or webhook identifier
   * @param userId Admin/operator user ID for audit
   * @returns Promise<{ success: boolean; message: string; jobId?: string }>
   */
  async retryDelivery(jobId: string, userId: string): Promise<{ success: boolean; message: string; jobId?: string }> {
    try {
      // Try to get the failed job from the queue
      const job = await webhookQueue.getJob(jobId);

      if (!job) {
        logger.warn(`Webhook job not found for retry: ${jobId}`, { userId });
        return {
          success: false,
          message: 'Webhook job not found'
        };
      }

      // Get job data
      const { partnerId, url, secret, event, payload } = job.data;

      // Verify partner still has webhooks enabled
      const partner = await this.partnerRepository.findOne({
        where: { id: partnerId },
        select: ['id', 'webhookUrl', 'webhookEnabled'],
      });

      if (!partner || !partner.webhookEnabled) {
        logger.warn(`Partner webhooks disabled, cannot retry: ${partnerId}`, { userId });
        return {
          success: false,
          message: 'Partner webhooks are disabled'
        };
      }

      // Enqueue a new delivery job with manual retry flag
      const newJob = await webhookQueue.add(
        'deliver',
        {
          partnerId,
          url: url || partner.webhookUrl,
          secret,
          event,
          payload,
          isManualRetry: true,
          retriedBy: userId,
          originalJobId: jobId,
        },
        {
          attempts: 3, // Fewer retries for manual retry
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
          removeOnComplete: 1000,
          removeOnFail: 1000,
        }
      );

      logger.info(`Manual webhook retry triggered`, {
        originalJobId: jobId,
        newJobId: newJob.id,
        partnerId,
        event,
        userId
      });

      return {
        success: true,
        message: 'Webhook retry enqueued successfully',
        jobId: newJob.id?.toString()
      };
    } catch (error: any) {
      logger.error(`Failed to retry webhook delivery:`, {
        jobId,
        userId,
        error: error.message,
      });
      return {
        success: false,
        message: `Failed to retry webhook: ${error.message}`
      };
    }
  }

  /**
   * Get failed webhook jobs for monitoring
   * @param limit Maximum number of jobs to return
   * @returns Promise<Array<{ id: string; partnerId: string; event: string; failedReason: string }>>
   */
  async getFailedJobs(limit: number = 50): Promise<Array<{ id: string; partnerId: string; event: string; failedReason: string; attemptsMade: number }>> {
    try {
      const failedJobs = await webhookQueue.getFailed(0, limit - 1);

      return failedJobs.map(job => ({
        id: job.id?.toString() || '',
        partnerId: job.data?.partnerId || '',
        event: job.data?.event || '',
        failedReason: job.failedReason || 'Unknown',
        attemptsMade: job.attemptsMade || 0,
        timestamp: job.timestamp || 0
      }));
    } catch (error: any) {
      logger.error('Failed to get failed webhook jobs:', error);
      return [];
    }
  }
}

// Export singleton instance
export const webhookService = new WebhookService();
