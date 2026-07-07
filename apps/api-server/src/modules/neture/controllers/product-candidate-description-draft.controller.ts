/**
 * ProductCandidateDescriptionDraft Controller — admin read-only 검토 shell (GET only)
 *
 * WO-O4O-ADMIN-O4O-DRUG-DESCRIPTION-DRAFT-REVIEW-SHELL-V1
 *
 * mount: /api/v1/admin/product-candidate-description-drafts
 *
 *   GET /        — 검토 목록/검색 (sourceLabel/applyRunId/reviewStatus/verdict/q/page/limit) — preview only
 *   GET /:id     — 상세 (content_json/seed_json/guard_result 전체)
 *
 * 원칙: **read-only**. 승인/반려/수정/삭제 mutation 없음. SharedProductDescription/ProductMaster/
 * ProductCandidate 무변경. review_status 변경 없음. AI 호출 없음.
 * 권한: O4O 전체/서비스 admin·operator (shared-product-description 과 동일 롤셋).
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import type { DataSource } from 'typeorm';
import { authenticate, requireRole } from '../../../middleware/auth.middleware.js';
import { ProductCandidateDescriptionDraftService } from '../services/product-candidate-description-draft.service.js';
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

export function createProductCandidateDescriptionDraftController(dataSource: DataSource): Router {
  const router = Router();
  const service = new ProductCandidateDescriptionDraftService(dataSource);

  router.use(authenticate);
  router.use(requireRole(ADMIN_ROLES));

  // GET / — 목록 (preview only)
  router.get('/', async (req: Request, res: Response) => {
    try {
      const { sourceLabel, applyRunId, reviewStatus, draftType, language, verdict, q, page, limit } =
        req.query as Record<string, string>;
      const pageNum = Math.max(parseInt(page || '1', 10) || 1, 1);
      const limitNum = Math.min(Math.max(parseInt(limit || '20', 10) || 20, 1), 100);
      const { items, total } = await service.listForAdmin({
        sourceLabel: sourceLabel || undefined,
        applyRunId: applyRunId || undefined,
        reviewStatus: reviewStatus || undefined,
        draftType: draftType || undefined,
        language: language || undefined,
        verdict: verdict || undefined,
        q: q || undefined,
        page: pageNum,
        limit: limitNum,
      });
      res.json({
        success: true,
        data: items,
        meta: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
      });
    } catch (err) {
      logger.error('[product-candidate-description-draft] list failed:', err);
      res.status(500).json({ success: false, error: '설명 초안 목록 조회에 실패했습니다', code: 'DRAFT_LIST_FAILED' });
    }
  });

  // GET /:id — 상세
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const detail = await service.getByIdForAdmin(req.params.id);
      if (!detail) {
        res.status(404).json({ success: false, error: '설명 초안을 찾을 수 없습니다', code: 'DRAFT_NOT_FOUND' });
        return;
      }
      res.json({ success: true, data: detail });
    } catch (err) {
      logger.error('[product-candidate-description-draft] detail failed:', err);
      res.status(500).json({ success: false, error: '설명 초안 상세 조회에 실패했습니다', code: 'DRAFT_DETAIL_FAILED' });
    }
  });

  return router;
}
