/**
 * ProductMasterDescription Controller — 관리자 직접 등록: 매장용(STORE) 상세설명서 저작 (admin)
 *
 * IR-O4O-PRODUCT-REGISTRATION-MODULE-UNIFIED-V1 §5 (관리자 직접 등록만 — 진입점 4)
 *
 * 배경: SPD 검토·큐레이션 워크플로우는 WO-O4O-ADMIN-O4O-PRODUCT-DESCRIPTION-REVIEW-REMOVE-V1 로
 *   컨트롤러/라우트가 제거됨(서비스 메서드·테이블은 유지). 본 컨트롤러는 그 검토 워크플로우를
 *   되살리는 것이 아니라, 등록 모듈의 일부로 **단건 STORE 설명서 upsert** 경로만 재수립한다.
 *
 * WO-O4O-ADMIN-PRODUCT-DESCRIPTION-TYPE-GENERIC-API-V1: STORE 전용 → **B2B/B2C/STORE/SUPPLIER_STORE × 다국어** 지원.
 *   descriptionType 미지정 시 STORE (하위호환). 경로명은 legacy(`store-descriptions`) 유지.
 *
 * mount: /api/v1/admin/o4o-product-db/masters
 *   GET  /:id/store-descriptions?descriptionType=STORE|B2B|B2C|SUPPLIER_STORE|all — 설명서 목록(기본 STORE)
 *   POST /:id/store-descriptions  {descriptionType?, language?, content, summary?} — 저장(=canonical upsert)
 *
 * 원칙: ProductMaster 본문/식별자/이미지 **무변경**. shared_product_descriptions 전용 write.
 *   content 는 서비스가 sanitize(jsdom+DOMPurify)한다. canonical 은 **(master_id, description_type, 언어) 당 1개**
 *   (WO-O4O-STORE-MULTILINGUAL-CANONICAL-DESCRIPTION-V1) — 타입·언어별로 각각 canonical 로 승격되며
 *   다른 타입/언어 canonical 을 강등하지 않는다(B2B-ko 저장이 STORE-ko·B2B-zh 무영향).
 * 권한: O4O 상품관리 콘솔과 동일 ADMIN 롤셋(메모/생성 컨트롤러와 동일).
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import type { DataSource } from 'typeorm';
import { authenticate, requireRole } from '../../../middleware/auth.middleware.js';
import { SharedProductDescriptionService, CosmeticDescriptionBlockedError } from '../services/shared-product-description.service.js';
import { ProductMaster } from '../entities/ProductMaster.entity.js';
import type { SharedProductDescriptionType } from '../entities/SharedProductDescription.entity.js';
import logger from '../../../utils/logger.js';

const ADMIN_ROLES = [
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

const MAX_CONTENT_LEN = 200_000;
const ALLOWED_LANG = new Set(['ko', 'zh', 'en', 'ja']);
// WO-O4O-ADMIN-PRODUCT-DESCRIPTION-TYPE-GENERIC-API-V1: B2B/B2C/STORE/SUPPLIER_STORE × 다국어 지원.
const ALLOWED_TYPE = new Set<SharedProductDescriptionType>(['STORE', 'B2B', 'B2C', 'SUPPLIER_STORE']);

/** descriptionType 정규화 — 허용값만, 그 외 기본 STORE */
function normalizeType(raw: unknown): SharedProductDescriptionType {
  const t = typeof raw === 'string' ? (raw.trim().toUpperCase() as SharedProductDescriptionType) : 'STORE';
  return ALLOWED_TYPE.has(t) ? t : 'STORE';
}

function actorId(req: Request): string | null {
  return (req as { user?: { id?: string } }).user?.id ?? null;
}

export function createProductMasterDescriptionController(dataSource: DataSource): Router {
  const router = Router();
  const service = new SharedProductDescriptionService(dataSource);
  const masterRepo = dataSource.getRepository(ProductMaster);

  router.use(authenticate);
  router.use(requireRole(ADMIN_ROLES));

  // 해당 master 의 설명서 목록 (읽기).
  // ?descriptionType=STORE|B2B|B2C|SUPPLIER_STORE (기본 STORE, 하위호환) 또는 all(전체).
  router.get('/:id/store-descriptions', async (req: Request, res: Response) => {
    try {
      const rawType = typeof req.query.descriptionType === 'string' ? req.query.descriptionType.trim().toUpperCase() : 'STORE';
      const filterAll = rawType === 'ALL';
      const filterType = filterAll ? null : normalizeType(rawType);
      const all = await service.listByMaster(req.params.id);
      const items = all
        .filter((d) => !d.deletedAt && (filterAll || d.descriptionType === filterType))
        .map((d) => ({
          id: d.id,
          descriptionType: d.descriptionType,
          language: d.language,
          status: d.status,
          summary: d.summary,
          content: d.content,
          updatedAt: d.updatedAt,
        }));
      res.json({ success: true, data: { items } });
    } catch (err) {
      logger.error('[product-master-description] list failed:', err);
      res.status(500).json({ success: false, error: '설명서 조회에 실패했습니다', code: 'PROD_DESC_LIST_FAILED' });
    }
  });

  // 설명서 저장 (=canonical upsert). createCandidate → setCanonical.
  // body.descriptionType = STORE|B2B|B2C|SUPPLIER_STORE (기본 STORE). canonical 은 (master, type, language)당 1개.
  router.post('/:id/store-descriptions', async (req: Request, res: Response) => {
    try {
      const actor = actorId(req);
      if (!actor) {
        res.status(401).json({ success: false, error: '인증이 필요합니다', code: 'AUTH_REQUIRED' });
        return;
      }
      const masterId = req.params.id;
      const content = typeof req.body?.content === 'string' ? req.body.content.trim() : '';
      const summaryRaw = typeof req.body?.summary === 'string' ? req.body.summary.trim() : '';
      const language = typeof req.body?.language === 'string' ? req.body.language.trim().toLowerCase() : 'ko';
      const descriptionType = normalizeType(req.body?.descriptionType);

      if (!content) {
        res.status(400).json({ success: false, error: '설명서 본문을 입력하세요', code: 'CONTENT_EMPTY' });
        return;
      }
      if (content.length > MAX_CONTENT_LEN) {
        res.status(400).json({ success: false, error: '설명서 본문이 너무 깁니다', code: 'CONTENT_TOO_LONG' });
        return;
      }
      if (!ALLOWED_LANG.has(language)) {
        res.status(400).json({ success: false, error: '지원하지 않는 언어입니다', code: 'LANG_UNSUPPORTED' });
        return;
      }
      const master = await masterRepo.findOne({ where: { id: masterId } });
      if (!master) {
        res.status(404).json({ success: false, error: '기본상품을 찾을 수 없습니다', code: 'MASTER_NOT_FOUND' });
        return;
      }

      // 등록 모듈 코어: createCandidate(type, manual) → setCanonical
      const candidate = await service.createCandidate({
        masterId,
        content,
        summary: summaryRaw || null,
        sourceType: 'manual',
        language,
        descriptionType,
        createdBy: actor,
      });
      const canonical = await service.setCanonical(candidate.id, actor);

      res.status(201).json({
        success: true,
        data: {
          id: canonical.id,
          masterId: canonical.masterId,
          descriptionType: canonical.descriptionType,
          status: canonical.status,
          language: canonical.language,
        },
      });
    } catch (err) {
      // WO-O4O-STORE-DESCRIPTION-COSMETIC-WRITE-GUARD-AND-DOC-ALIGN-V1:
      //   화장품 O4O 공통 설명서 write 차단은 500 이 아니라 도메인 오류(403)로 응답한다.
      if (err instanceof CosmeticDescriptionBlockedError) {
        res.status(403).json({ success: false, error: err.message, code: err.code });
        return;
      }
      const msg = err instanceof Error ? err.message : String(err);
      // sanitize 후 빈 본문 등 서비스 검증 실패는 400 로 매핑
      if (/empty after sanitization/i.test(msg)) {
        res.status(400).json({ success: false, error: '유효한 설명 본문이 없습니다(정화 후 비어 있음)', code: 'CONTENT_EMPTY_AFTER_SANITIZE' });
        return;
      }
      logger.error('[product-master-description] save failed:', err);
      res.status(500).json({ success: false, error: '설명서 저장에 실패했습니다', code: 'PROD_DESC_SAVE_FAILED' });
    }
  });

  return router;
}
