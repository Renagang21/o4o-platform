import { LoginSecurityService } from '../services/LoginSecurityService';
import logger from '../utils/logger';

export class CleanupLoginAttemptsJob {
  private intervalId: NodeJS.Timeout | null = null;
  private readonly CLEANUP_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours

  constructor() {
    // Initialize without starting
  }

  private async cleanup(): Promise<void> {
    try {
      logger.info('Starting login attempts cleanup job');
      
      // Keep login attempts for 30 days
      const daysToKeep = parseInt(process.env.LOGIN_ATTEMPTS_RETENTION_DAYS || '30');
      const deletedCount = await LoginSecurityService.clearOldLoginAttempts(daysToKeep);
      
      logger.info(`Login attempts cleanup completed. Deleted ${deletedCount} old records`);
    } catch (error) {
      logger.error('Error in login attempts cleanup job:', error);
    }
  }

  start(): void {
    logger.info('Starting login attempts cleanup scheduled job');
    // Run immediately on start
    this.cleanup().catch(err => logger.error('Cleanup job error:', err));
    
    // Then run every 24 hours
    this.intervalId = setInterval(() => {
      this.cleanup().catch(err => logger.error('Cleanup job error:', err));
    }, this.CLEANUP_INTERVAL);
  }

  stop(): void {
    logger.info('Stopping login attempts cleanup scheduled job');
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  // For manual execution
  async runNow(): Promise<void> {
    logger.info('Running login attempts cleanup job manually');
    await this.cleanup();
  }
}

// Create and export singleton instance
export const cleanupLoginAttemptsJob = new CleanupLoginAttemptsJob();