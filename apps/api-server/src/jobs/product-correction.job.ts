import { AppDataSource } from '../database/connection.js';
import { ProductCorrectionPeriodicService } from '../modules/neture/product-correction/periodic.service.js';
import logger from '../utils/logger.js';
/** Bounded, best-effort boot/minute worker. Durable DB rows coordinate multiple instances. */
export class ProductCorrectionJob {
  private timer: NodeJS.Timeout | null = null;
  private running = false;
  constructor(private task = () => new ProductCorrectionPeriodicService(AppDataSource).tick()) {}
  start() {
    if (this.timer) return;
    void this.runOnce();
    this.timer = setInterval(() => void this.runOnce(), 60000);
    this.timer.unref?.();
  }
  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
  async runOnce() {
    if (this.running) return;
    this.running = true;
    try {
      await this.task();
    } catch {
      logger.warn('[PRODUCT_CORRECTION_JOB] tick failed; durable jobs remain resumable');
    } finally {
      this.running = false;
    }
  }
}
export const productCorrectionJob = new ProductCorrectionJob();
