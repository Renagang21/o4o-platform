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
 */
import { Router } from 'express';
import type { DataSource } from 'typeorm';
import { authenticate } from '../../../middleware/auth.middleware.js';
import {
  requireMediaPlatformAdmin,
  runMediaCatalog,
} from '../../media/controllers/media-catalog.controller.js';
import { AutomationJobService } from '../services/automation-job.service.js';

export function createAutomationJobRouter(ds: DataSource): Router {
  const router = Router();
  const service = new AutomationJobService(ds);
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
  return router;
}
