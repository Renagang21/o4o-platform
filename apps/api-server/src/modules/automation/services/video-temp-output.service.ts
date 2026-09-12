/**
 * VideoTempOutputService — WO-O4O-AUTOMATION-VIDEO-JOB-TEMP-OUTPUT-DOWNLOAD-AND-AUTO-CLEANUP-V1
 *
 * VIDEO Job 완성본의 "임시 다운로드 저장소". Media Library 와 분리된다:
 *  - media_assets 에 넣지 않는다 (catalog · 검색 · lineage · rights 대상 아님).
 *  - 비공개 bucket(VIDEO_TEMP_OUTPUT_CONFIG.bucket) 의 `video-jobs/<jobId>/<uuid>.<ext>` 에만 저장.
 *  - 다운로드는 Job 접근 권한을 검사한 API 가 GCS 스트림을 그대로 흘려준다. signed / public URL 을 만들지 않으므로
 *    object key 를 알아도 bucket 밖에서는 받을 수 없다.
 *  - TTL(설정 단일 지점) 이 지나면 다운로드를 거부하고, expiry job 이 object 를 지운 뒤 EXPIRED 로 기록한다.
 *    다운로드 여부와 무관하게 만료되며, 만료 전에는 재다운로드할 수 있다.
 * YouTube / Vimeo / Signage / 서비스 자료실 등 어디로도 배포하지 않는다 — 사용자가 내려받아 직접 등록한다.
 */
import { randomUUID } from 'crypto';
import path from 'path';
import type { Readable } from 'stream';
import { Storage } from '@google-cloud/storage';
import type { DataSource, EntityManager } from 'typeorm';
import { In, LessThanOrEqual } from 'typeorm';
import logger from '../../../utils/logger.js';
import { MediaCatalogError, mediaUuid } from '../../media/services/media-catalog.service.js';
import { decodeOriginalName } from '../../media/services/media-library.service.js';
import { AutomationJob } from '../entities/AutomationJob.entity.js';
import { VIDEO_TEMP_OUTPUT_CONFIG, videoTempOutputExpiresAt } from '../config/video-temp-output.config.js';

export type TempOutputState = 'NONE' | 'AVAILABLE' | 'EXPIRED';

/** 화면·API 가 보는 완성본 상태. object key · bucket 은 노출하지 않는다. */
export interface TempOutputView {
  state: TempOutputState;
  /** state=AVAILABLE 이고 만료 전일 때만 true. */
  downloadable: boolean;
  fileName: string | null;
  mimeType: string | null;
  size: number | null;
  uploadedAt: Date | null;
  expiresAt: Date | null;
  /** EXPIRED 인데 storage 삭제가 아직 안 끝난 경우(DELETE_FAILED). 다운로드는 이미 차단된다. */
  cleanupPending: boolean;
  ttlHours: number;
}

export interface TempOutputUpload {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

const EXT_BY_MIME: Record<string, string> = {
  'video/mp4': '.mp4',
  'video/mpeg': '.mpeg',
  'video/quicktime': '.mov',
  'video/webm': '.webm',
  'video/x-msvideo': '.avi',
};

const isGone = (err: unknown) => (err as { code?: unknown })?.code === 404;

export class VideoTempOutputService {
  private storage = new Storage();
  private cfg = VIDEO_TEMP_OUTPUT_CONFIG;

  constructor(private ds: DataSource) {}

  /** 저장 상태 + 현재 시각으로 계산한 view. expiry job 이 아직 안 돌았어도 만료 시각이 지나면 EXPIRED 로 본다. */
  static view(job: AutomationJob, now = new Date()): TempOutputView {
    const base: TempOutputView = {
      state: 'NONE',
      downloadable: false,
      fileName: job.tempOutputFileName,
      mimeType: job.tempOutputMimeType,
      size: job.tempOutputSize === null ? null : Number(job.tempOutputSize),
      uploadedAt: job.tempOutputUploadedAt,
      expiresAt: job.tempOutputExpiresAt,
      cleanupPending: false,
      ttlHours: VIDEO_TEMP_OUTPUT_CONFIG.ttlHours,
    };
    if (!job.tempOutputObjectKey || !job.tempOutputCleanupStatus || !job.tempOutputExpiresAt) return base;
    const live = job.tempOutputCleanupStatus === 'AVAILABLE' && job.tempOutputExpiresAt.getTime() > now.getTime();
    return {
      ...base,
      state: live ? 'AVAILABLE' : 'EXPIRED',
      downloadable: live,
      cleanupPending: !live && job.tempOutputCleanupStatus !== 'EXPIRED',
    };
  }

  private file(key: string) {
    return this.storage.bucket(this.cfg.bucket).file(key);
  }

  private async locked(manager: EntityManager, id: string): Promise<AutomationJob> {
    const job = await manager.getRepository(AutomationJob).findOne({
      where: { id: mediaUuid(id) },
      lock: { mode: 'pessimistic_write' },
    });
    if (!job) throw new MediaCatalogError('JOB_NOT_FOUND', 404);
    return job;
  }

  /** object 삭제. 이미 없으면 성공으로 본다(lifecycle 백스톱이 먼저 지웠을 수 있다). 그 외 오류는 throw. */
  private async deleteObject(key: string): Promise<void> {
    try {
      await this.file(key).delete();
    } catch (err) {
      if (!isGone(err)) throw err;
      logger.warn(`[VideoTempOutput] object already absent: ${key}`);
    }
  }

  async status(id: string): Promise<TempOutputView> {
    const job = await this.ds.getRepository(AutomationJob).findOneBy({ id: mediaUuid(id) });
    if (!job) throw new MediaCatalogError('JOB_NOT_FOUND', 404);
    return VideoTempOutputService.view(job);
  }

  /**
   * 완성본 등록(또는 교체). 영상 MIME 만. CANCELLED Job 은 거부하고, COMPLETED 는 허용한다 — "제작 완료" 뒤에
   * 완성본이 도착하는 흐름이 정상이며 완성본은 Media 연결(assertOpen)과 다른 생명주기다.
   * 교체 시 이전 object 는 새 object 저장 후 지운다(삭제 실패는 로그만 — lifecycle 백스톱).
   */
  async register(id: string, upload: TempOutputUpload | undefined): Promise<TempOutputView> {
    mediaUuid(id);
    if (!upload?.buffer?.length) throw new MediaCatalogError('TEMP_OUTPUT_FILE_REQUIRED');
    const mimeType = upload.mimetype;
    if (!(this.cfg.allowedMimeTypes as readonly string[]).includes(mimeType))
      throw new MediaCatalogError('TEMP_OUTPUT_VIDEO_ONLY');
    const originalName = decodeOriginalName(upload.originalname || 'video').slice(0, 255);
    const ext = EXT_BY_MIME[mimeType] ?? path.extname(originalName).toLowerCase();
    const key = `${this.cfg.objectPrefix}${id}/${randomUUID()}${ext}`;

    // 존재·상태 확인을 먼저 해 CANCELLED / 없는 Job 에 object 를 만들지 않는다.
    const before = await this.ds.getRepository(AutomationJob).findOneBy({ id });
    if (!before) throw new MediaCatalogError('JOB_NOT_FOUND', 404);
    if (before.status === 'CANCELLED') throw new MediaCatalogError('JOB_CANCELLED', 409);

    await this.file(key).save(upload.buffer, {
      resumable: false,
      metadata: { contentType: mimeType, cacheControl: 'private, no-store' },
    });

    let previousKey: string | null = null;
    const saved = await this.ds.transaction(async (manager) => {
      const job = await this.locked(manager, id);
      if (job.status === 'CANCELLED') throw new MediaCatalogError('JOB_CANCELLED', 409);
      previousKey = job.tempOutputObjectKey;
      const now = new Date();
      job.tempOutputObjectKey = key;
      job.tempOutputFileName = originalName;
      job.tempOutputMimeType = mimeType;
      job.tempOutputSize = String(upload.buffer.length);
      job.tempOutputUploadedAt = now;
      job.tempOutputExpiresAt = videoTempOutputExpiresAt(now);
      job.tempOutputCleanupStatus = 'AVAILABLE';
      return manager.getRepository(AutomationJob).save(job);
    }).catch(async (err) => {
      // DB 반영 실패 → 방금 올린 object 를 고아로 남기지 않는다.
      await this.deleteObject(key).catch((e) => logger.error(`[VideoTempOutput] orphan cleanup failed: ${key}`, e));
      throw err;
    });
    if (previousKey && previousKey !== key) {
      await this.deleteObject(previousKey).catch((e) =>
        logger.error(`[VideoTempOutput] previous object delete failed (lifecycle will reap): ${previousKey}`, e),
      );
    }
    logger.info(`[VideoTempOutput] registered job=${id} size=${upload.buffer.length} expiresAt=${saved.tempOutputExpiresAt?.toISOString()}`);
    return VideoTempOutputService.view(saved);
  }

  /**
   * 다운로드 스트림. AVAILABLE + 만료 전에만. 만료 후에는 object 가 아직 있어도 410 으로 거부한다
   * (expiry job / lifecycle 이 지우기 전이라도 TTL 이 계약이다).
   */
  async openDownload(id: string): Promise<{ stream: Readable; fileName: string; mimeType: string; size: number | null }> {
    const job = await this.ds.getRepository(AutomationJob).findOneBy({ id: mediaUuid(id) });
    if (!job) throw new MediaCatalogError('JOB_NOT_FOUND', 404);
    const view = VideoTempOutputService.view(job);
    if (view.state === 'NONE') throw new MediaCatalogError('TEMP_OUTPUT_NOT_FOUND', 404);
    if (!view.downloadable) throw new MediaCatalogError('TEMP_OUTPUT_EXPIRED', 410);
    return {
      stream: this.file(job.tempOutputObjectKey!).createReadStream(),
      fileName: view.fileName || `video-${id}`,
      mimeType: view.mimeType || 'application/octet-stream',
      size: view.size,
    };
  }

  /** 관리자가 만료 전에 직접 제거. object 삭제가 성공해야 DB 도 비운다. */
  async remove(id: string): Promise<TempOutputView> {
    mediaUuid(id);
    const job = await this.ds.transaction(async (manager) => {
      const job = await this.locked(manager, id);
      if (!job.tempOutputObjectKey) throw new MediaCatalogError('TEMP_OUTPUT_NOT_FOUND', 404);
      try {
        await this.deleteObject(job.tempOutputObjectKey);
      } catch (err) {
        logger.error(`[VideoTempOutput] delete failed (kept): ${job.tempOutputObjectKey}`, err);
        throw new MediaCatalogError('TEMP_OUTPUT_STORAGE_DELETE_FAILED', 502);
      }
      job.tempOutputObjectKey = null;
      job.tempOutputFileName = null;
      job.tempOutputMimeType = null;
      job.tempOutputSize = null;
      job.tempOutputUploadedAt = null;
      job.tempOutputExpiresAt = null;
      job.tempOutputCleanupStatus = null;
      return manager.getRepository(AutomationJob).save(job);
    });
    return VideoTempOutputService.view(job);
  }

  /**
   * 만료 처리. expires_at <= now 인 AVAILABLE / DELETE_FAILED 를 Job 단위로 독립 처리한다 —
   * 한 Job 의 storage 실패가 다른 Job 을 막지 않는다. 결과는 원장용 요약.
   */
  async expireDue(now = new Date()): Promise<{ due: number; expired: number; failed: number; jobIds: string[] }> {
    const repo = this.ds.getRepository(AutomationJob);
    const due = await repo.find({
      where: { tempOutputCleanupStatus: In(['AVAILABLE', 'DELETE_FAILED']), tempOutputExpiresAt: LessThanOrEqual(now) },
      select: ['id'],
      order: { tempOutputExpiresAt: 'ASC' },
      take: 500,
    });
    const result = { due: due.length, expired: 0, failed: 0, jobIds: [] as string[] };
    for (const { id } of due) {
      try {
        await this.ds.transaction(async (manager) => {
          const job = await this.locked(manager, id);
          // 잠금 사이에 교체됐거나 이미 처리된 경우는 건너뛴다.
          if (!job.tempOutputObjectKey || !job.tempOutputExpiresAt || job.tempOutputExpiresAt.getTime() > now.getTime()) return;
          if (job.tempOutputCleanupStatus === 'EXPIRED') return;
          try {
            await this.deleteObject(job.tempOutputObjectKey);
            job.tempOutputCleanupStatus = 'EXPIRED';
            result.expired += 1;
          } catch (err) {
            logger.error(`[VideoTempOutput] expiry delete failed job=${id} key=${job.tempOutputObjectKey}`, err);
            job.tempOutputCleanupStatus = 'DELETE_FAILED';
            result.failed += 1;
          }
          await manager.getRepository(AutomationJob).save(job);
          result.jobIds.push(id);
        });
      } catch (err) {
        result.failed += 1;
        logger.error(`[VideoTempOutput] expiry transaction failed job=${id}`, err);
      }
    }
    return result;
  }
}
