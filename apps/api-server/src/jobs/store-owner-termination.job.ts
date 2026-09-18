import logger from '../utils/logger.js';
import { storeOwnerTerminationService } from '../services/store-owner-termination.service.js';

const INTERVAL_MS = 60 * 60 * 1000;

class StoreOwnerTerminationJob {
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  start(): void {
    if (this.timer) return;
    void this.runOnce();
    this.timer = setInterval(() => void this.runOnce(), INTERVAL_MS);
    this.timer.unref?.();
    logger.info('[store-owner-termination] scheduler started (hourly)');
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  async runOnce(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const result = await storeOwnerTerminationService.runDueCases();
      logger.info('[store-owner-termination] scheduled run done', result);
    } catch (error) {
      logger.error('[store-owner-termination] scheduled run failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      this.running = false;
    }
  }
}

export const storeOwnerTerminationJob = new StoreOwnerTerminationJob();
