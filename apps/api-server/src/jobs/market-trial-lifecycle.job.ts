import { AppDataSource } from '../database/connection.js';
import { MarketTrialService, TrialStatus } from '@o4o/market-trial';
import { marketTrialNotification } from '../services/marketTrial.notification.js';
import logger from '../utils/logger.js';

/**
 * Market Trial Lifecycle Job
 *
 * WO-NETURE-MARKET-TRIAL-LIFECYCLE-AUTO-TRANSITION-V1
 *
 * Periodically scans RECRUITING trials whose fundingEndAt has elapsed and
 * advances them to DEVELOPMENT (target met) or CLOSED (target missed).
 * No new FAILED state — failure is recorded as CLOSED with closeReason
 * set on the row plus an entry appended to statusHistory.
 *
 * Idempotency:
 *   - Each transition uses an atomic UPDATE with status precondition,
 *     so concurrent runs (multiple instances or read-path evaluators)
 *     produce at most one transition per trial.
 *
 * Default interval: 5 minutes. Override via MARKET_TRIAL_LIFECYCLE_INTERVAL_MS.
 */
export class MarketTrialLifecycleJob {
  private intervalId: NodeJS.Timeout | null = null;
  private running = false;
  private readonly intervalMs: number;

  constructor() {
    const fromEnv = parseInt(process.env.MARKET_TRIAL_LIFECYCLE_INTERVAL_MS || '', 10);
    this.intervalMs = Number.isFinite(fromEnv) && fromEnv > 0 ? fromEnv : 5 * 60 * 1000;
  }

  private async tick(): Promise<void> {
    if (this.running) {
      // Skip overlapping ticks — guards against a slow run colliding with the next interval.
      logger.debug('[MarketTrialLifecycle] previous tick still running, skipping');
      return;
    }
    if (!AppDataSource.isInitialized) {
      logger.debug('[MarketTrialLifecycle] DataSource not initialized, skipping tick');
      return;
    }
    this.running = true;
    try {
      const service = new MarketTrialService(AppDataSource);
      const result = await service.processExpiredRecruitingTrials();

      if (result.scanned === 0) {
        logger.debug('[MarketTrialLifecycle] no expired RECRUITING trials');
      } else {
        logger.info(
          `[MarketTrialLifecycle] scanned=${result.scanned} transitioned=${result.transitioned.length}`,
        );
        for (const t of result.transitioned) {
          logger.info(
            `[MarketTrialLifecycle] trial=${t.trialId} ${t.fromStatus} → ${t.toStatus} reason=${t.reason} at=${t.transitionedAt.toISOString()}`,
          );
          // WO-NETURE-MARKET-TRIAL-NOTIFICATION-INTEGRATION-V1: dispatch supplier + participant notifications.
          // Idempotent — only fired here because transitionStatusIfRecruitingExpired returned non-null,
          // which only happens once per trial (atomic UPDATE with status='recruiting' precondition).
          void marketTrialNotification.onRecruitingResult(
            t.trialId,
            t.toStatus === TrialStatus.DEVELOPMENT,
          );
        }
      }
    } catch (error) {
      logger.error('[MarketTrialLifecycle] tick failed', error);
    } finally {
      this.running = false;
    }
  }

  start(): void {
    if (this.intervalId) {
      logger.warn('[MarketTrialLifecycle] already started — start() ignored');
      return;
    }
    logger.info(`[MarketTrialLifecycle] starting (intervalMs=${this.intervalMs})`);
    // Fire once on boot so a service that has been down past fundingEndAt catches up immediately.
    this.tick().catch((err) => logger.error('[MarketTrialLifecycle] initial tick failed', err));
    this.intervalId = setInterval(() => {
      this.tick().catch((err) => logger.error('[MarketTrialLifecycle] tick failed', err));
    }, this.intervalMs);
  }

  stop(): void {
    if (!this.intervalId) return;
    logger.info('[MarketTrialLifecycle] stopping');
    clearInterval(this.intervalId);
    this.intervalId = null;
  }

  /** For manual execution / tests. */
  async runNow(): Promise<void> {
    await this.tick();
  }
}

export const marketTrialLifecycleJob = new MarketTrialLifecycleJob();
