/**
 * OperatorSupplierStoreDescriptionReviewController — 운영자 최소 검수 큐 (공급자 STORE 설명서)
 *
 * WO-O4O-NETURE-SUPPLIER-STORE-DESCRIPTION-DRAFT-SAVE-AND-REVIEW-QUEUE-V1
 *
 * 배경: 통합 설명서 검토 큐(UNIFIED_CTE, OTC+SPD)는 WO-O4O-ADMIN-O4O-PRODUCT-DESCRIPTION-REVIEW-REMOVE-V1
 *   으로 제거되었다. 본 컨트롤러는 그 큐를 되살리는 것이 아니라, 공급자 매장용(STORE) 설명서
 *   (source_type='supplier' AND description_type='STORE') **전용 최소 검수 큐**만 신설한다.
 *
 * mount: /api/v1/admin/o4o-product-db/supplier-store-descriptions
 *   GET  /?status=needs_review|draft|canonical|all&q=&page=&limit=  — 목록
 *   GET  /:id                                                        — 상세(full content 미리보기)
 *   POST /:id/approve                                                — canonical 승격(setCanonical)
 *   POST /:id/reject { reason? }                                     — 반려/보류(status=hidden)
 *
 * 권한: O4O 상품관리 콘솔과 동일 ADMIN 롤셋. 공급자 write 경로와 분리(운영자만 canonical/hidden).
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import type { DataSource } from 'typeorm';
import { authenticate, requireRole } from '../../../middleware/auth.middleware.js';
import { SharedProductDescriptionService } from '../services/shared-product-description.service.js';
import logger from '../../../utils/logger.js';

const ADMIN_ROLES = [
  'platform:admin',
  'platform:super_admin',
  'neture:admin',
  'neture:operator',
  'glycopharm:admin',
  'glycopharm:operator',
  'cosmetics:admin',
  'cosmetics:operator',
  'kpa-society:admin',
  'kpa-society:operator',
];

function actorId(req: Request): string | null {
  return (req as { user?: { id?: string } }).user?.id ?? null;
}

export function createOperatorSupplierStoreDescriptionReviewController(dataSource: DataSource): Router {
  const router = Router();
  const service = new SharedProductDescriptionService(dataSource);

  router.use(authenticate);
  router.use(requireRole(ADMIN_ROLES));

  // 만료(수정 요청 후 기한 경과) 자동 삭제 — dry-run / apply.
  // 주의: '/:id' 라우트보다 먼저 등록(경로 충돌 방지).
  router.get('/expiry/dry-run', async (_req: Request, res: Response) => {
    try {
      const result = await service.expireRevisionRequested({ apply: false });
      res.json({ success: true, data: result });
    } catch (err) {
      logger.error('[supplier-store-review] expiry dry-run failed:', err);
      res.status(500).json({ success: false, error: '만료 dry-run에 실패했습니다', code: 'EXPIRY_DRYRUN_FAILED' });
    }
  });

  router.post('/expiry/apply', async (_req: Request, res: Response) => {
    try {
      const result = await service.expireRevisionRequested({ apply: true });
      res.json({ success: true, data: result });
    } catch (err) {
      logger.error('[supplier-store-review] expiry apply failed:', err);
      res.status(500).json({ success: false, error: '만료 삭제에 실패했습니다', code: 'EXPIRY_APPLY_FAILED' });
    }
  });

  // 목록
  router.get('/', async (req: Request, res: Response) => {
    try {
      const status = typeof req.query.status === 'string' ? req.query.status : undefined;
      const q = typeof req.query.q === 'string' ? req.query.q : undefined;
      const page = req.query.page ? Number(req.query.page) : undefined;
      const limit = req.query.limit ? Number(req.query.limit) : undefined;
      const result = await service.listSupplierStoreReview({ status, q, page, limit });
      res.json({ success: true, data: result });
    } catch (err) {
      logger.error('[supplier-store-review] list failed:', err);
      res.status(500).json({ success: false, error: '검수 큐 조회에 실패했습니다', code: 'REVIEW_LIST_FAILED' });
    }
  });

  // 상세
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const detail = await service.getSupplierStoreReviewDetail(req.params.id);
      if (!detail) {
        res.status(404).json({ success: false, error: '설명서를 찾을 수 없습니다', code: 'REVIEW_NOT_FOUND' });
        return;
      }
      res.json({ success: true, data: detail });
    } catch (err) {
      logger.error('[supplier-store-review] detail failed:', err);
      res.status(500).json({ success: false, error: '검수 상세 조회에 실패했습니다', code: 'REVIEW_DETAIL_FAILED' });
    }
  });

  // canonical 승격 (운영자만)
  router.post('/:id/approve', async (req: Request, res: Response) => {
    try {
      const actor = actorId(req);
      // supplier/STORE 대상만 승격 허용 — 다른 경로 SPD 오승격 방지.
      const detail = await service.getSupplierStoreReviewDetail(req.params.id);
      if (!detail) {
        res.status(404).json({ success: false, error: '설명서를 찾을 수 없습니다', code: 'REVIEW_NOT_FOUND' });
        return;
      }
      const canonical = await service.setCanonical(req.params.id, actor);
      res.json({ success: true, data: { id: canonical.id, status: canonical.status, curatedAt: canonical.curatedAt } });
    } catch (err) {
      logger.error('[supplier-store-review] approve failed:', err);
      res.status(500).json({ success: false, error: 'canonical 승격에 실패했습니다', code: 'REVIEW_APPROVE_FAILED' });
    }
  });

  // 수정 요청 (status=revision_requested, 사유 필수, revision_due_at = now + 30일)
  //   WO-O4O-OPERATOR-SUPPLIER-STORE-DESCRIPTION-REVISION-REQUEST-AND-AUTO-DELETE-V1.
  router.post('/:id/request-revision', async (req: Request, res: Response) => {
    try {
      const actor = actorId(req);
      const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : '';
      if (!reason) {
        res.status(400).json({ success: false, error: '수정 요청 사유를 입력하세요', code: 'REASON_REQUIRED' });
        return;
      }
      const detail = await service.getSupplierStoreReviewDetail(req.params.id);
      if (!detail) {
        res.status(404).json({ success: false, error: '설명서를 찾을 수 없습니다', code: 'REVIEW_NOT_FOUND' });
        return;
      }
      const updated = await service.requestRevision(req.params.id, reason, actor, 30);
      res.json({
        success: true,
        data: { id: updated.id, status: updated.status, revisionDueAt: updated.revisionDueAt, reviewNote: updated.reviewNote },
      });
    } catch (err) {
      logger.error('[supplier-store-review] request-revision failed:', err);
      res.status(500).json({ success: false, error: '수정 요청 처리에 실패했습니다', code: 'REVIEW_REVISION_FAILED' });
    }
  });

  // 관리자 숨김 (status=hidden) — 노출 중단 전용. 공급자 수정 요청 기본 경로 아님.
  router.post('/:id/reject', async (req: Request, res: Response) => {
    try {
      const actor = actorId(req);
      const detail = await service.getSupplierStoreReviewDetail(req.params.id);
      if (!detail) {
        res.status(404).json({ success: false, error: '설명서를 찾을 수 없습니다', code: 'REVIEW_NOT_FOUND' });
        return;
      }
      const updated = await service.setStatus(req.params.id, 'hidden', actor);
      res.json({ success: true, data: { id: updated.id, status: updated.status } });
    } catch (err) {
      logger.error('[supplier-store-review] reject failed:', err);
      res.status(500).json({ success: false, error: '숨김 처리에 실패했습니다', code: 'REVIEW_REJECT_FAILED' });
    }
  });

  return router;
}
