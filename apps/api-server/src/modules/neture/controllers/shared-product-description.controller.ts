/**
 * SharedProductDescription Controller — O4O 공용 상품설명 후보 풀 관리 (admin/operator)
 *
 * WO-O4O-PRODUCT-DESCRIPTION-SHARED-CANDIDATE-STORAGE-V1
 * 정책: docs/investigations/IR-O4O-PRODUCT-DESCRIPTION-SHARED-ASSET-AND-CANONICAL-DESCRIPTION-POLICY-V1.md
 *
 * mount: /api/v1/admin/shared-product-descriptions
 *
 *   GET    /by-master/:masterId            — master 후보 목록
 *   GET    /by-master/:masterId/canonical  — master canonical 대표
 *   POST   /by-master/:masterId            — 후보 생성
 *   PATCH  /:id/canonical                  — canonical 지정 (기존 강등)
 *   PATCH  /:id/status                     — 상태 변경 (hidden/needs_review/deprecated/candidate)
 *   DELETE /:id                            — soft delete
 *
 * 권한: O4O 전체 관리자 / 서비스 operator·admin. 매장 경영자 API 는 만들지 않는다.
 * 공개 상품 상세 노출 연결은 본 WO 범위 아님 (후속 CANONICAL-OUTPUT-LINK).
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import type { DataSource } from 'typeorm';
import { authenticate, requireRole } from '../../../middleware/auth.middleware.js';
import { SharedProductDescriptionService } from '../services/shared-product-description.service.js';
import { SHARED_PRODUCT_DESCRIPTION_SEED_SOURCES } from '../services/shared-product-description.service.js';
import type { SharedProductDescriptionSeedSource } from '../services/shared-product-description.service.js';
import {
  SHARED_PRODUCT_DESCRIPTION_SOURCE_TYPES,
  SHARED_PRODUCT_DESCRIPTION_STATUSES,
} from '../entities/SharedProductDescription.entity.js';
import type {
  SharedProductDescriptionSourceType,
  SharedProductDescriptionStatus,
} from '../entities/SharedProductDescription.entity.js';
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
  return (req as any).user?.id ?? null;
}

export function createSharedProductDescriptionController(dataSource: DataSource): Router {
  const router = Router();
  const service = new SharedProductDescriptionService(dataSource);

  router.use(authenticate);
  router.use(requireRole(ADMIN_ROLES));

  // GET /by-master/:masterId — 후보 목록
  router.get('/by-master/:masterId', async (req: Request, res: Response) => {
    try {
      const items = await service.listByMaster(req.params.masterId);
      res.json({ success: true, data: items });
    } catch (error) {
      logger.error('[SharedProductDescription] list error:', error);
      res.status(500).json({ success: false, error: 'Failed to list descriptions' });
    }
  });

  // GET /by-master/:masterId/canonical — 대표 설명
  router.get('/by-master/:masterId/canonical', async (req: Request, res: Response) => {
    try {
      const item = await service.getCanonical(req.params.masterId);
      res.json({ success: true, data: item });
    } catch (error) {
      logger.error('[SharedProductDescription] canonical error:', error);
      res.status(500).json({ success: false, error: 'Failed to get canonical description' });
    }
  });

  // POST /by-master/:masterId — 후보 생성
  router.post('/by-master/:masterId', async (req: Request, res: Response) => {
    try {
      const { content, summary, sourceType, sourceRefId, language, qualityScore } = req.body as {
        content?: string;
        summary?: string;
        sourceType?: string;
        sourceRefId?: string;
        language?: string;
        qualityScore?: number;
      };

      if (!content || typeof content !== 'string' || !content.trim()) {
        res.status(400).json({ success: false, error: 'content is required' });
        return;
      }
      if (!sourceType || !SHARED_PRODUCT_DESCRIPTION_SOURCE_TYPES.includes(sourceType as SharedProductDescriptionSourceType)) {
        res.status(400).json({
          success: false,
          error: `Invalid sourceType. Valid: ${SHARED_PRODUCT_DESCRIPTION_SOURCE_TYPES.join(', ')}`,
        });
        return;
      }

      const created = await service.createCandidate({
        masterId: req.params.masterId,
        content,
        summary: summary ?? null,
        sourceType: sourceType as SharedProductDescriptionSourceType,
        sourceRefId: sourceRefId ?? null,
        language: language ?? 'ko',
        qualityScore: qualityScore ?? null,
        createdBy: actorId(req),
      });
      res.status(201).json({ success: true, data: created });
    } catch (error) {
      // WO-O4O-...-SANITIZE-ON-WRITE-V2: sanitize 후 content 가 비면 검증 실패(400)로 응답.
      const msg = error instanceof Error ? error.message : '';
      if (msg.includes('empty after sanitization')) {
        res.status(400).json({ success: false, error: 'content is empty after sanitization' });
        return;
      }
      logger.error('[SharedProductDescription] create error:', error);
      res.status(500).json({ success: false, error: 'Failed to create candidate' });
    }
  });

  // POST /by-master/:masterId/seed — 기존 소스(supplier/ai/drug_extension)를 후보로 흡수
  // 후보 생성까지만 (canonical 자동 승격 없음). 중복은 (master,source,ref) 기준 skip.
  router.post('/by-master/:masterId/seed', async (req: Request, res: Response) => {
    try {
      const { sources } = req.body as { sources?: string[]; autoCanonical?: boolean };

      // autoCanonical 은 본 WO 에서 미지원 (항상 후보까지만 — ADMIN-CURATION 후속). 수신만.
      let seedSources: SharedProductDescriptionSeedSource[] = SHARED_PRODUCT_DESCRIPTION_SEED_SOURCES;
      if (Array.isArray(sources) && sources.length > 0) {
        const invalid = sources.filter(
          (s) => !SHARED_PRODUCT_DESCRIPTION_SEED_SOURCES.includes(s as SharedProductDescriptionSeedSource),
        );
        if (invalid.length > 0) {
          res.status(400).json({
            success: false,
            error: `Invalid sources: ${invalid.join(', ')}. Valid: ${SHARED_PRODUCT_DESCRIPTION_SEED_SOURCES.join(', ')}`,
          });
          return;
        }
        seedSources = sources as SharedProductDescriptionSeedSource[];
      }

      const result = await service.seedFromExistingSources(req.params.masterId, actorId(req), seedSources);
      res.json({ success: true, data: result });
    } catch (error) {
      logger.error('[SharedProductDescription] seed error:', error);
      res.status(500).json({ success: false, error: 'Failed to seed candidates' });
    }
  });

  // PATCH /:id/canonical — canonical 지정
  router.patch('/:id/canonical', async (req: Request, res: Response) => {
    try {
      const updated = await service.setCanonical(req.params.id, actorId(req));
      res.json({ success: true, data: updated });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to set canonical';
      const status = msg.includes('not found') ? 404 : 400;
      logger.error('[SharedProductDescription] setCanonical error:', error);
      res.status(status).json({ success: false, error: msg });
    }
  });

  // PATCH /:id/status — 상태 변경 (canonical 제외)
  router.patch('/:id/status', async (req: Request, res: Response) => {
    try {
      const { status } = req.body as { status?: string };
      if (
        !status ||
        !SHARED_PRODUCT_DESCRIPTION_STATUSES.includes(status as SharedProductDescriptionStatus) ||
        status === 'canonical'
      ) {
        res.status(400).json({
          success: false,
          error: `Invalid status. Use canonical via /:id/canonical. Valid: candidate, hidden, needs_review, deprecated`,
        });
        return;
      }
      const updated = await service.setStatus(
        req.params.id,
        status as Exclude<SharedProductDescriptionStatus, 'canonical'>,
        actorId(req),
      );
      res.json({ success: true, data: updated });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to set status';
      const status = msg.includes('not found') ? 404 : 400;
      logger.error('[SharedProductDescription] setStatus error:', error);
      res.status(status).json({ success: false, error: msg });
    }
  });

  // DELETE /:id — soft delete
  router.delete('/:id', async (req: Request, res: Response) => {
    try {
      await service.softDelete(req.params.id);
      res.json({ success: true });
    } catch (error) {
      logger.error('[SharedProductDescription] delete error:', error);
      res.status(500).json({ success: false, error: 'Failed to delete description' });
    }
  });

  return router;
}
