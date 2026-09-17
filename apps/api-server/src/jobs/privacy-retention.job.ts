import { AppDataSource } from '../database/connection.js';
import { PrivacyRetentionService } from '../services/privacy-retention.service.js';
import logger from '../utils/logger.js';

/**
 * PrivacyRetentionJob — 개인정보 보유기간 집행 job (6 테이블 · 단일 job)
 *
 * WO-O4O-PRIVACY-DATA-RETENTION-ENFORCEMENT-V1
 *
 * 대상·기간·anchor 규칙은 services/privacy-retention.service.ts (정본 = O4O-PRIVACY-DATA-RETENTION-POLICY-V1) 한 곳.
 * login_attempts 는 기존 jobs/cleanupLoginAttempts.ts(30일) 가 계속 담당한다 — 여기서 다루지 않는다.
 *
 * 실행 방식: 기존 프로덕션 job 표준(jobs/video-temp-output-expiry.job + services/startup.service.ts 등록)과 같은
 *   in-app setInterval. 부팅 시 1회 + 24h 간격.
 *
 * 안전 장치 (실삭제는 사용자 승인 후에만):
 *   - env PRIVACY_RETENTION_MODE : 'dry-run'(기본) | 'apply'. 값이 정확히 'apply' 일 때만 DELETE 가 실행된다.
 *     그 외 모든 값(미설정 · 오타 포함)은 dry-run 으로 동작하며 SELECT 만 수행한다.
 *   - env PRIVACY_RETENTION_ENABLED='false' : kill-switch (dry-run 조차 건너뜀).
 *   로그에는 테이블별 건수·기준일만 남긴다. row 내용(이메일·문의 본문·IP 등)은 남기지 않는다.
 */
export type PrivacyRetentionMode = 'dry-run' | 'apply';

export function resolvePrivacyRetentionMode(env: NodeJS.ProcessEnv = process.env): PrivacyRetentionMode {
  return env.PRIVACY_RETENTION_MODE === 'apply' ? 'apply' : 'dry-run';
}

export function isPrivacyRetentionEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.PRIVACY_RETENTION_ENABLED !== 'false';
}

export class PrivacyRetentionJob {
  private intervalId: NodeJS.Timeout | null = null;
  private readonly INTERVAL_MS = 24 * 60 * 60 * 1000;

  private async runOnce(): Promise<void> {
    if (!isPrivacyRetentionEnabled()) {
      logger.info('[privacy-retention] disabled via PRIVACY_RETENTION_ENABLED=false — skip');
      return;
    }
    const mode = resolvePrivacyRetentionMode();
    const startedAt = new Date();
    try {
      if (!AppDataSource.isInitialized) {
        logger.warn('[privacy-retention] DataSource not initialized — skip this run');
        return;
      }
      const service = new PrivacyRetentionService(AppDataSource);
      const result = mode === 'apply' ? await service.apply(startedAt) : await service.dryRun(startedAt);
      const finishedAt = new Date();
      logger.info(`[privacy-retention] ${mode} done`, {
        jobName: 'privacy-retention',
        mode,
        startedAt: startedAt.toISOString(),
        finishedAt: finishedAt.toISOString(),
        durationMs: finishedAt.getTime() - startedAt.getTime(),
        total_eligible: result.total_eligible,
        total_unresolved: result.total_unresolved,
        total_deleted: result.total_deleted,
        tables: result.tables.map((t) => ({
          table: t.table,
          total_rows: t.total_rows,
          retention_days: t.retention_days,
          cutoff_date: t.cutoff_date,
          eligible_for_deletion_count: t.eligible_for_deletion_count,
          oldest_eligible_date: t.oldest_eligible_date,
          newest_eligible_date: t.newest_eligible_date,
          unresolved_count: t.unresolved_count,
          open_count: t.open_count,
          deleted_count: t.deleted_count,
        })),
      });
    } catch (error) {
      logger.error(`[privacy-retention] ${mode} failed`, {
        jobName: 'privacy-retention',
        mode,
        startedAt: startedAt.toISOString(),
        error,
      });
    }
  }

  start(): void {
    logger.info(`[privacy-retention] starting scheduled job (every 24h, mode=${resolvePrivacyRetentionMode()})`);
    this.runOnce().catch((err) => logger.error('[privacy-retention] initial run error:', err));
    this.intervalId = setInterval(() => {
      this.runOnce().catch((err) => logger.error('[privacy-retention] interval run error:', err));
    }, this.INTERVAL_MS);
  }

  stop(): void {
    logger.info('[privacy-retention] stopping scheduled job');
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /** 수동 실행(점검용) — 스케줄러와 동일 경로 */
  async runNow(): Promise<void> {
    await this.runOnce();
  }
}

export const privacyRetentionJob = new PrivacyRetentionJob();
