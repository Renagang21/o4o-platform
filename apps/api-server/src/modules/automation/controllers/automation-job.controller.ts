/**
 * Automation Job API — WO-O4O-AUTOMATION-VIDEO-JOB-P0-ADMIN-WORKSPACE-V1
 *
 * 플랫폼 관리자 파일럿. guard 는 Media V2 관리 API 와 같은 경계(requireMediaPlatformAdmin)를 쓴다 —
 * Job 접근 권한과 Media asset 관리 권한이 같은 관리자 집합이며, entityId 를 안다고 연결 권한이 생기지 않는다.
 *
 * GET  /automation-jobs                       목록 (?status=&type=)
 * POST /automation-jobs                       생성
 * GET  /automation-jobs/:id                   상세 (assets 포함)
 * PATCH /automation-jobs/:id                  기본 정보 / 상태 수정
 * POST /automation-jobs/:id/complete          완료 + cleanupDecision
 * POST /automation-jobs/:id/assets            asset 연결 {mediaAssetId, purpose}
 * DELETE /automation-jobs/:id/assets/:linkId  연결 해제
 * GET  /automation-jobs/:id/cleanup-preview   정리 대상 미리보기 (?decision=&keepLinkIds=a,b) — 상태 변경 없음
 * POST /automation-jobs/:id/cleanup           정리 실행 {decision, keepLinkIds?}
 *
 * 완성 영상 임시 output (WO-O4O-AUTOMATION-VIDEO-JOB-TEMP-OUTPUT-DOWNLOAD-AND-AUTO-CLEANUP-V1) —
 * Media Library 가 아닌 비공개 bucket · TTL · 자동 삭제. 같은 guard. object key / bucket 은 응답에 없다.
 * POST   /automation-jobs/:id/temp-output           완성본 등록·교체 (multipart field `file`, video/* 만)
 * GET    /automation-jobs/:id/temp-output           상태 {state, downloadable, expiresAt, ...}
 * GET    /automation-jobs/:id/temp-output/download  다운로드 (권한 검사 후 GCS 스트림. 만료 시 410)
 * DELETE /automation-jobs/:id/temp-output           만료 전 직접 제거
 */
import { Router, type Request, type Response } from 'express';
import type { DataSource } from 'typeorm';
import { authenticate } from '../../../middleware/auth.middleware.js';
import { uploadSingleMiddleware } from '../../../middleware/upload.middleware.js';
import logger from '../../../utils/logger.js';
import {
  requireMediaPlatformAdmin,
  runMediaCatalog,
} from '../../media/controllers/media-catalog.controller.js';
import { MediaCatalogError } from '../../media/services/media-catalog.service.js';
import { AutomationJobService } from '../services/automation-job.service.js';
import { VideoTempOutputService } from '../services/video-temp-output.service.js';

export function createAutomationJobRouter(ds: DataSource): Router {
  const router = Router();
  const service = new AutomationJobService(ds);
  const tempOutput = new VideoTempOutputService(ds);
  const guard = [authenticate, requireMediaPlatformAdmin];
  const run = runMediaCatalog;
  router.get('/automation-jobs', guard, run((req) => service.list(req.query as Record<string, unknown>)));
  router.post('/automation-jobs', guard, run((req) => service.create(req.body, req.user!.id), 201));
  router.get('/automation-jobs/:id', guard, run((req) => service.get(req.params.id)));
  router.patch('/automation-jobs/:id', guard, run((req) => service.update(req.params.id, req.body)));
  router.post('/automation-jobs/:id/complete', guard, run((req) => service.complete(req.params.id, req.body)));
  router.post('/automation-jobs/:id/assets', guard, run((req) => service.linkAsset(req.params.id, req.body), 201));
  router.delete(
    '/automation-jobs/:id/assets/:linkId',
    guard,
    run((req) => service.unlinkAsset(req.params.id, req.params.linkId)),
  );
  router.get(
    '/automation-jobs/:id/cleanup-preview',
    guard,
    run((req) => service.cleanupPreview(req.params.id, req.query as Record<string, unknown>)),
  );
  router.post('/automation-jobs/:id/cleanup', guard, run((req) => service.cleanupApply(req.params.id, req.body)));

  router.post(
    '/automation-jobs/:id/temp-output',
    guard,
    uploadSingleMiddleware('file'),
    run((req) => tempOutput.register(req.params.id, (req as Request & { file?: Express.Multer.File }).file), 201),
  );
  router.get('/automation-jobs/:id/temp-output', guard, run((req) => tempOutput.status(req.params.id)));
  router.delete('/automation-jobs/:id/temp-output', guard, run((req) => tempOutput.remove(req.params.id)));
  router.get('/automation-jobs/:id/temp-output/download', guard, async (req: Request, res: Response) => {
    try {
      const { stream, fileName, mimeType, size } = await tempOutput.openDownload(req.params.id);
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Cache-Control', 'private, no-store');
      if (size !== null) res.setHeader('Content-Length', String(size));
      // 항상 attachment — 브라우저 인라인 재생용 영구 주소가 아니라 "내려받아 보관" 이 계약이다.
      res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`);
      stream.on('error', (err) => {
        logger.error('[VideoTempOutput] download stream error:', err);
        if (!res.headersSent) res.status(502).json({ success: false, code: 'TEMP_OUTPUT_STREAM_FAILED' });
        else res.end();
      });
      stream.pipe(res);
    } catch (error) {
      if (error instanceof MediaCatalogError) {
        res.status(error.status).json({ success: false, error: error.message, code: error.code });
        return;
      }
      logger.error('[VideoTempOutput] download failed:', error);
      res.status(500).json({ success: false, code: 'MEDIA_CATALOG_ERROR' });
    }
  });
  return router;
}
