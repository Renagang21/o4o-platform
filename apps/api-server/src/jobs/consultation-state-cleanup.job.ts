import type { DataSource } from 'typeorm';
import { AppDataSource } from '../database/connection.js';
import { cleanupConsultationState } from '../modules/neture-pharmacy/services/consultation-state-cleanup.js';
import logger from '../utils/logger.js';

/** Deployment owner explicitly selects apply; preparation and ordinary startup default to dry-run. */
export class ConsultationStateCleanupJob {
  private timer: NodeJS.Timeout | null = null;
  private busy = false;
  constructor(private readonly db: Pick<DataSource, 'query' | 'isInitialized'> = AppDataSource) {}
  async runOnce(env: NodeJS.ProcessEnv = process.env) {
    if (this.busy || !this.db.isInitialized || env.CONSULTATION_STATE_CLEANUP_ENABLED === 'false') return;
    this.busy = true;
    try {
      const apply = env.CONSULTATION_STATE_CLEANUP_MODE === 'apply';
      const count = await cleanupConsultationState(this.db, apply);
      logger.info('[consultation-state-cleanup]', { mode: apply ? 'apply' : 'dry-run', count });
    } catch {
      logger.warn('[consultation-state-cleanup] unavailable; no successful cleanup claimed');
    } finally { this.busy = false; }
  }
  start() {
    if (this.timer || process.env.CONSULTATION_STATE_CLEANUP_ENABLED === 'false') return;
    void this.runOnce();
    this.timer = setInterval(() => void this.runOnce(), 60_000);
    this.timer.unref();
  }
  stop() { if (this.timer) clearInterval(this.timer); this.timer = null; }
}
export const consultationStateCleanupJob = new ConsultationStateCleanupJob();
