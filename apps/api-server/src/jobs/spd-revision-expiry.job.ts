import { AppDataSource } from '../database/connection.js';
import { SharedProductDescriptionService } from '../modules/neture/services/shared-product-description.service.js';
import logger from '../utils/logger.js';

/**
 * SpdRevisionExpiryJob — 공급자 STORE 설명서 수정 요청 만료 자동 삭제 스케줄러
 *
 * WO-O4O-SPD-REVISION-REQUEST-EXPIRY-SCHEDULER-V1
 *
 * 정책(WO-O4O-OPERATOR-SUPPLIER-STORE-DESCRIPTION-REVISION-REQUEST-AND-AUTO-DELETE-V1):
 *   운영자 수정 요청(revision_requested) 후 revision_due_at(=+30일) 경과 시 hard delete.
 *   알림 없음 · archived 없음. 삭제 조건/guard 는 service.expireRevisionRequested 단일 소스(재구현 금지).
 *
 * 실행 방식: 기존 프로젝트 표준(jobs/cleanupLoginAttempts.ts)과 동일한 in-app setInterval job.
 *   - 서버 부팅 시 1회 즉시 실행(Cloud Run 콜드스타트마다 = 실질 daily 트리거) + 이후 24h 간격.
 *   - 30일 만료 창이므로 일 단위 정밀도로 충분(Cloud Scheduler 등 신규 인프라 도입 없음).
 * 모드: 운영 자동 실행은 apply(hard delete). guard 는 service 조건 그대로.
 * kill-switch: env SPD_REVISION_EXPIRY_ENABLED='false' 로 비활성화(기본 활성).
 */
export class SpdRevisionExpiryJob {
  private intervalId: NodeJS.Timeout | null = null;
  private readonly INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

  private isEnabled(): boolean {
    // 기본 활성. 명시적으로 'false' 일 때만 비활성(안전 kill-switch).
    return (process.env.SPD_REVISION_EXPIRY_ENABLED ?? 'true').toLowerCase() !== 'false';
  }

  private async runExpiry(): Promise<void> {
    if (!this.isEnabled()) {
      logger.info('[spd-revision-expiry] disabled via SPD_REVISION_EXPIRY_ENABLED=false — skip');
      return;
    }
    const startedAt = new Date();
    try {
      if (!AppDataSource.isInitialized) {
        logger.warn('[spd-revision-expiry] DataSource not initialized — skip this run');
        return;
      }
      const service = new SharedProductDescriptionService(AppDataSource);
      const result = await service.expireRevisionRequested({ apply: true });
      const finishedAt = new Date();
      logger.info('[spd-revision-expiry] apply done', {
        jobName: 'spd-revision-expiry',
        mode: 'apply',
        startedAt: startedAt.toISOString(),
        finishedAt: finishedAt.toISOString(),
        durationMs: finishedAt.getTime() - startedAt.getTime(),
        targetCount: result.count,
        deletedCount: result.deleted,
        sampleIds: result.sampleIds,
      });
    } catch (error) {
      logger.error('[spd-revision-expiry] apply failed', {
        jobName: 'spd-revision-expiry',
        startedAt: startedAt.toISOString(),
        error,
      });
    }
  }

  start(): void {
    logger.info('[spd-revision-expiry] starting scheduled job (daily, apply)');
    // 부팅 시 1회 즉시 실행
    this.runExpiry().catch((err) => logger.error('[spd-revision-expiry] initial run error:', err));
    // 이후 24h 간격
    this.intervalId = setInterval(() => {
      this.runExpiry().catch((err) => logger.error('[spd-revision-expiry] interval run error:', err));
    }, this.INTERVAL_MS);
  }

  stop(): void {
    logger.info('[spd-revision-expiry] stopping scheduled job');
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /** 수동 실행(점검용) — 스케줄러와 동일 apply 경로 */
  async runNow(): Promise<void> {
    logger.info('[spd-revision-expiry] running manually');
    await this.runExpiry();
  }
}

export const spdRevisionExpiryJob = new SpdRevisionExpiryJob();
