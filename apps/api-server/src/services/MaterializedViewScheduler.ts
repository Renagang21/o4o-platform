import * as cron from 'node-cron';
import { AppDataSource } from '../database/connection';

/**
 * Materialized View Refresh Scheduler
 *
 * Refreshes the mv_product_listings materialized view every 5 minutes
 * to ensure product listing queries have fresh data.
 *
 * Performance Impact:
 * - Refresh takes ~1-2 seconds for 100k products
 * - Uses CONCURRENTLY to avoid locking the view during refresh
 */
export class MaterializedViewScheduler {
  private static refreshTask: cron.ScheduledTask | null = null;
  private static isRefreshing = false;
  private static lastRefreshTime: Date | null = null;
  private static refreshCount = 0;
  private static errorCount = 0;

  /**
   * Start the materialized view refresh scheduler
   * @param cronExpression - Cron expression (default: every 5 minutes)
   */
  static start(cronExpression: string = '*/5 * * * *'): void {
    if (this.refreshTask) {
      console.log('⚠️ Materialized view scheduler is already running');
      return;
    }

    console.log(`🔄 Starting materialized view refresh scheduler (${cronExpression})`);

    this.refreshTask = cron.schedule(cronExpression, async () => {
      await this.refreshMaterializedViews();
    });

    // Run immediately on startup
    setTimeout(() => {
      this.refreshMaterializedViews();
    }, 5000); // Wait 5 seconds for database to be ready

    console.log('✅ Materialized view scheduler started');
  }

  /**
   * Stop the materialized view refresh scheduler
   */
  static stop(): void {
    if (this.refreshTask) {
      this.refreshTask.stop();
      this.refreshTask = null;
      console.log('🛑 Materialized view scheduler stopped');
    }
  }

  /**
   * Manually refresh materialized views
   */
  static async refreshMaterializedViews(): Promise<void> {
    if (this.isRefreshing) {
      console.log('⏩ Skipping refresh - already in progress');
      return;
    }

    if (!AppDataSource.isInitialized) {
      console.log('⚠️ Database not initialized, skipping materialized view refresh');
      return;
    }

    this.isRefreshing = true;
    const startTime = Date.now();

    try {
      console.log('🔄 Refreshing materialized view: mv_product_listings...');

      // Use the refresh function created by migration
      await AppDataSource.query('SELECT refresh_product_listings()');

      const duration = Date.now() - startTime;
      this.lastRefreshTime = new Date();
      this.refreshCount++;

      console.log(`✅ Materialized view refreshed successfully in ${duration}ms`);
      console.log(`📊 Stats: ${this.refreshCount} successful refreshes, ${this.errorCount} errors`);
    } catch (error: any) {
      this.errorCount++;
      const duration = Date.now() - startTime;
      console.error(`❌ Failed to refresh materialized view after ${duration}ms:`, error.message);

      // If CONCURRENTLY refresh fails, try regular refresh as fallback
      if (error.message?.includes('CONCURRENTLY')) {
        try {
          console.log('🔄 Attempting non-concurrent refresh...');
          await AppDataSource.query('REFRESH MATERIALIZED VIEW mv_product_listings');
          console.log('✅ Non-concurrent refresh succeeded');
        } catch (fallbackError: any) {
          console.error('❌ Fallback refresh also failed:', fallbackError.message);
        }
      }
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * Get scheduler statistics
   */
  static getStats() {
    return {
      isRunning: !!this.refreshTask,
      isRefreshing: this.isRefreshing,
      lastRefreshTime: this.lastRefreshTime,
      refreshCount: this.refreshCount,
      errorCount: this.errorCount,
      uptime: this.lastRefreshTime
        ? Math.floor((Date.now() - this.lastRefreshTime.getTime()) / 1000)
        : null
    };
  }
}
