import { AppDataSource } from '../database/connection.js';
import { VIDEO_TEMP_OUTPUT_CONFIG } from '../modules/automation/config/video-temp-output.config.js';
import { VideoTempOutputService } from '../modules/automation/services/video-temp-output.service.js';
import logger from '../utils/logger.js';

/**
 * VideoTempOutputExpiryJob — VIDEO Job 완성본 임시 output TTL 만료 자동 삭제
 *
 * WO-O4O-AUTOMATION-VIDEO-JOB-TEMP-OUTPUT-DOWNLOAD-AND-AUTO-CLEANUP-V1
 *
 * 정책: temp_output_expires_at(=등록 + TTL) 이 지난 완성본의 storage object 를 지우고 EXPIRED 로 기록한다.
 *   다운로드 여부와 무관. 알림 없음. 삭제 조건/guard 는 VideoTempOutputService.expireDue 단일 소스(재구현 금지).
 *   TTL 값은 VIDEO_TEMP_OUTPUT_CONFIG 한 곳에서만 읽는다.
 *
 * 실행 방식: 기존 프로덕션 job 표준(jobs/spd-revision-expiry.job + services/startup.service.ts 등록)과 같은
 *   in-app setInterval. 새 scheduler framework 없음.
 *   - 부팅 시 1회 즉시 실행 + 이후 expiryIntervalMinutes(기본 60분) 간격.
 *   - Cloud Run 이 idle 로 내려가 있는 동안은 돌지 않는다. 그 사이에도 다운로드 API 는 expires_at 으로 차단하고,
 *     bucket lifecycle rule(age 기준 Delete) 이 object 삭제의 백스톱이다.
 * kill-switch: env VIDEO_TEMP_OUTPUT_EXPIRY_ENABLED='false'.
 */
export class VideoTempOutputExpiryJob {
  private intervalId: NodeJS.Timeout | null = null;
  private readonly INTERVAL_MS = VIDEO_TEMP_OUTPUT_CONFIG.expiryIntervalMinutes * 60 * 1000;

  private async runExpiry(): Promise<void> {
    if (!VIDEO_TEMP_OUTPUT_CONFIG.expiryEnabled) {
      logger.info('[video-temp-output-expiry] disabled via VIDEO_TEMP_OUTPUT_EXPIRY_ENABLED=false — skip');
      return;
    }
    const startedAt = new Date();
    try {
      if (!AppDataSource.isInitialized) {
        logger.warn('[video-temp-output-expiry] DataSource not initialized — skip this run');
        return;
      }
      const result = await new VideoTempOutputService(AppDataSource).expireDue(startedAt);
      const finishedAt = new Date();
      logger.info('[video-temp-output-expiry] apply done', {
        jobName: 'video-temp-output-expiry',
        startedAt: startedAt.toISOString(),
        finishedAt: finishedAt.toISOString(),
        durationMs: finishedAt.getTime() - startedAt.getTime(),
        ttlHours: VIDEO_TEMP_OUTPUT_CONFIG.ttlHours,
        ...result,
      });
    } catch (error) {
      logger.error('[video-temp-output-expiry] apply failed', {
        jobName: 'video-temp-output-expiry',
        startedAt: startedAt.toISOString(),
        error,
      });
    }
  }

  start(): void {
    logger.info(`[video-temp-output-expiry] starting scheduled job (every ${VIDEO_TEMP_OUTPUT_CONFIG.expiryIntervalMinutes}m, ttl ${VIDEO_TEMP_OUTPUT_CONFIG.ttlHours}h)`);
    this.runExpiry().catch((err) => logger.error('[video-temp-output-expiry] initial run error:', err));
    this.intervalId = setInterval(() => {
      this.runExpiry().catch((err) => logger.error('[video-temp-output-expiry] interval run error:', err));
    }, this.INTERVAL_MS);
  }

  stop(): void {
    logger.info('[video-temp-output-expiry] stopping scheduled job');
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /** 수동 실행(점검용) — 스케줄러와 동일 경로 */
  async runNow(): Promise<void> {
    await this.runExpiry();
  }
}

export const videoTempOutputExpiryJob = new VideoTempOutputExpiryJob();
