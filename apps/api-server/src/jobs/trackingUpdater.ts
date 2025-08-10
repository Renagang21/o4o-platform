/**
 * Tracking Updater Job
 * 배송 추적 정보를 주기적으로 업데이트
 */

import * as cron from 'node-cron';
import { shippingService } from '../services/shipping/ShippingService';
import logger from '../utils/simpleLogger';

class TrackingUpdaterJob {
  private job: cron.ScheduledTask | null = null;

  /**
   * Start the tracking updater job
   * Runs every 30 minutes
   */
  start() {
    // Run every 30 minutes
    this.job = cron.schedule('*/30 * * * *', async () => {
      logger.info('🚚 Starting tracking update job...');
      
      try {
        await shippingService.updateAllTracking();
        logger.info('✅ Tracking update completed successfully');
      } catch (error) {
        logger.error('❌ Tracking update failed:', error);
      }
    });

    logger.info('📦 Tracking updater job scheduled (every 30 minutes)');
  }

  /**
   * Stop the job
   */
  stop() {
    if (this.job) {
      this.job.stop();
      this.job = null;
      logger.info('🛑 Tracking updater job stopped');
    }
  }

  /**
   * Run the job immediately (for testing)
   */
  async runNow() {
    logger.info('🚚 Running tracking update job manually...');
    
    try {
      await shippingService.updateAllTracking();
      logger.info('✅ Manual tracking update completed');
    } catch (error) {
      logger.error('❌ Manual tracking update failed:', error);
      throw error;
    }
  }
}

export const trackingUpdaterJob = new TrackingUpdaterJob();