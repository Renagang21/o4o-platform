/**
 * Store Product Request ADMIN Controller — store_web 요청 관리자 검토·승인 (P2)
 *
 * WO-O4O-KPA-STORE-NEW-PRODUCT-REQUEST-AND-ADMIN-APPROVAL-V1 (Phase 2)
 *
 * 기존 candidate 콘솔 코어(/api/v1/operator/product-candidates)는 수정하지 않는다.
 * 본 컨트롤러는 store_web(sourceLabel='kpa-store-product-request') 요청 전용 별도 뷰/액션이다.
 * 마운트: /api/v1/operator/store-product-requests (operator/admin guard + service scope)
 *
 * GET  /                     — store_web 요청 목록(scope 적용, displayStatus 버킷 옵션 필터)
 * GET  /:id/duplicates       — 신규 승인 전 중복 후보(바코드/상품명+제조사)
 * POST /:id/link             — 기존 ProductMaster 연결 (body: masterId, note?)
 * POST /:id/approve-new      — 신규 ProductMaster 승인 (A안) (body: note?)
 * POST /:id/request-revision — 보완 요청 (body: note)
 * POST /:id/reject           — 등록 불가 (body: reason?)
 */

import { Router } from 'express';
import type { Request, Response, RequestHandler } from 'express';
import type { DataSource } from 'typeorm';
import { authenticate, requireRole } from '../../../middleware/auth.middleware.js';
import { injectServiceScope } from '../../../utils/serviceScope.js';
import type { ServiceScope } from '../../../utils/serviceScope.js';
import { resolveOperatorScope, PLATFORM_ADMIN_SCOPE_REQUIRED_RESPONSE } from '../../../utils/serviceScope.js';
import { StoreProductRequestAdminService, type StoreRequestDuplicate } from '../../../modules/neture/services/store-product-request-admin.service.js';
import { classificationLabel, type ProductClassification } from '../../../modules/neture/utils/product-type.util.js';
import logger from '../../../utils/logger.js';

const OPERATOR_ROLES = [
  'platform:admin', 'platform:super_admin',
  'neture:admin', 'neture:operator',
  'glycopharm:admin', 'glycopharm:operator',
  'cosmetics:admin', 'cosmetics:operator',
  'kpa-society:admin', 'kpa-society:operator',
];

const STORE_REQUEST_SOURCE_LABEL = 'kpa-store-product-request';

type DisplayStatus = 'reviewing' | 'revision_requested' | 'registered' | 'rejected';
const DISPLAY_STATUS_LABELS: Record<DisplayStatus, string> = {
  reviewing: '검토 중', revision_requested: '보완 요청', registered: '등록 완료', rejected: '등록 불가',
};
// displayStatus 버킷 → 원시 candidate_status 배열
const DISPLAY_TO_RAW: Record<DisplayStatus, string[]> = {
  reviewing: ['pending', 'reviewing'],
  revision_requested: ['revision_requested'],
  registered: ['matched', 'linked', 'approved_new_master'],
  rejected: ['rejected', 'merged', 'archived'],
};
function toDisplayStatus(raw: string): DisplayStatus {
  if (raw === 'revision_requested') return 'revision_requested';
  if (raw === 'pending' || raw === 'reviewing') return 'reviewing';
  if (raw === 'matched' || raw === 'linked' || raw === 'approved_new_master') return 'registered';
  return 'rejected';
}

function userId(req: Request): string | null {
  return (req as any).user?.id ?? null;
}

interface StoreRequestRow {
  id: string;
  candidate_name: string | null;
  candidate_category: string | null;
  candidate_manufacturer: string | null;
  candidate_spec: string | null;
  candidate_unit: string | null;
  candidate_image_url: string | null;
  identifier_value: string | null;
  raw_payload: Record<string, unknown> | null;
  candidate_status: string;
  review_note: string | null;
  matched_product_master_id: string | null;
  organization_id: string | null;
  service_key: string | null;
  submitted_by: string | null;
  created_at: string;
  updated_at: string;
  org_name: string | null;
}

function toAdminDto(r: StoreRequestRow) {
  const displayStatus = toDisplayStatus(r.candidate_status);
  const classCode = (r.candidate_category || (r.raw_payload?.classification as string) || 'unknown') as ProductClassification;
  const reviewable = displayStatus === 'reviewing';
  return {
    id: r.id,
    productName: r.candidate_name,
    classification: { code: classCode, label: classificationLabel(classCode) },
    manufacturer: r.candidate_manufacturer,
    spec: r.candidate_spec,
    unit: r.candidate_unit,
    imageUrl: r.candidate_image_url,
    barcode: r.identifier_value,
    noBarcode: r.raw_payload?.noBarcode === true,
    candidateStatus: r.candidate_status,
    displayStatus,
    displayStatusLabel: DISPLAY_STATUS_LABELS[displayStatus],
    reviewNote: r.review_note,
    matchedProductMasterId: r.matched_product_master_id,
    organizationId: r.organization_id,
    organizationName: r.org_name,
    serviceKey: r.service_key,
    submittedBy: r.submitted_by,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    // 관리자 액션 가능 여부 (검토 중 상태에서만 승인/연결/보완 가능)
    reviewable,
  };
}

/** 표준 에러 → HTTP 매핑 */
function handleError(res: Response, error: unknown, ctx: string) {
  const msg = error instanceof Error ? error.message : 'INTERNAL_ERROR';
  const dupes = (error as { duplicates?: StoreRequestDuplicate[] })?.duplicates;
  const map: Record<string, number> = {
    STORE_REQUEST_NOT_FOUND: 404,
    PRODUCT_MASTER_NOT_FOUND: 404,
    STATUS_NOT_REVIEWABLE: 409,
    ALREADY_LINKED: 409,
    DUPLICATE_MASTER_EXISTS: 409,
    RX_LISTING_BLOCKED: 409,
    RX_NEW_MASTER_BLOCKED: 409,
    CANDIDATE_ORG_MISSING: 422,
    CANDIDATE_SERVICE_KEY_MISSING: 422,
    REVISION_NOTE_REQUIRED: 400,
    MASTER_ID_REQUIRED: 400,
  };
  const status = map[msg] ?? 500;
  if (status === 500) logger.error(`[StoreRequestAdmin] ${ctx} error:`, error);
  return res.status(status).json({ success: false, error: { code: msg }, ...(dupes ? { data: { duplicates: dupes } } : {}) });
}

export function createStoreProductRequestAdminController(dataSource: DataSource): Router {
  const router = Router();
  const service = new StoreProductRequestAdminService(dataSource);

  router.use(authenticate);
  router.use(requireRole(OPERATOR_ROLES));
  router.use(injectServiceScope);

  // GET / — 목록 (scope 적용)
  router.get('/', (async (req: Request, res: Response) => {
    try {
      const scope: ServiceScope = (req as any).serviceScope;
      const resolved = resolveOperatorScope(scope, req.query);
      if (!resolved) return res.status(400).json(PLATFORM_ADMIN_SCOPE_REQUIRED_RESPONSE);

      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
      const displayStatus = req.query.displayStatus as DisplayStatus | undefined;
      const rawStatuses = displayStatus && DISPLAY_TO_RAW[displayStatus] ? DISPLAY_TO_RAW[displayStatus] : null;

      const params: unknown[] = [STORE_REQUEST_SOURCE_LABEL];
      const conds: string[] = [`pc.source_type = 'store_web'`, `pc.source_label = $1`, `pc.deleted_at IS NULL`];

      // operator scope 제한 (platform admin = cross-service → 무제한)
      const keys = resolved.serviceKeys;
      if (keys != null && keys.length > 0) {
        params.push(keys);
        conds.push(`(pc.service_key = ANY($${params.length}) OR pc.service_key IS NULL)`);
      }
      if (rawStatuses) {
        params.push(rawStatuses);
        conds.push(`pc.candidate_status = ANY($${params.length})`);
      }
      const search = (req.query.search ?? req.query.q) as string | undefined;
      if (search && search.trim()) {
        const esc = search.trim().replace(/[%_\\]/g, (m) => `\\${m}`);
        params.push(`%${esc}%`);
        conds.push(`(pc.candidate_name ILIKE $${params.length} OR pc.candidate_manufacturer ILIKE $${params.length} OR pc.identifier_value ILIKE $${params.length})`);
      }

      const where = conds.join(' AND ');
      const countRows: Array<{ total: string }> = await dataSource.query(
        `SELECT COUNT(*)::int AS total FROM product_candidates pc WHERE ${where}`, params,
      );
      const total = Number(countRows[0]?.total ?? 0);

      const listParams = [...params, limit, (page - 1) * limit];
      const rows: StoreRequestRow[] = await dataSource.query(
        `SELECT pc.id, pc.candidate_name, pc.candidate_category, pc.candidate_manufacturer, pc.candidate_spec,
                pc.candidate_unit, pc.candidate_image_url, pc.identifier_value, pc.raw_payload, pc.candidate_status,
                pc.review_note, pc.matched_product_master_id, pc.organization_id, pc.service_key, pc.submitted_by,
                pc.created_at, pc.updated_at, o.name AS org_name
           FROM product_candidates pc
           LEFT JOIN organizations o ON o.id = pc.organization_id
          WHERE ${where}
          ORDER BY pc.created_at DESC
          LIMIT $${listParams.length - 1} OFFSET $${listParams.length}`,
        listParams,
      );

      return res.json({
        success: true,
        data: rows.map(toAdminDto),
        meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    } catch (error) {
      return handleError(res, error, 'list');
    }
  }) as RequestHandler);

  // GET /:id/duplicates — 신규 승인 전 중복 후보
  router.get('/:id/duplicates', (async (req: Request, res: Response) => {
    try {
      const dups = await service.findDuplicates(req.params.id);
      return res.json({ success: true, data: dups });
    } catch (error) {
      return handleError(res, error, 'duplicates');
    }
  }) as RequestHandler);

  // POST /:id/link — 기존 ProductMaster 연결
  router.post('/:id/link', (async (req: Request, res: Response) => {
    try {
      const masterId = req.body?.masterId;
      if (!masterId || typeof masterId !== 'string') throw new Error('MASTER_ID_REQUIRED');
      const result = await service.linkToExistingMaster(req.params.id, {
        masterId, reviewedBy: userId(req), note: typeof req.body?.note === 'string' ? req.body.note : null,
      });
      return res.json({ success: true, data: result });
    } catch (error) {
      return handleError(res, error, 'link');
    }
  }) as RequestHandler);

  // POST /:id/approve-new — 신규 ProductMaster 승인 (A안)
  router.post('/:id/approve-new', (async (req: Request, res: Response) => {
    try {
      const result = await service.approveAsNewMaster(req.params.id, {
        reviewedBy: userId(req), note: typeof req.body?.note === 'string' ? req.body.note : null,
      });
      return res.status(201).json({ success: true, data: result });
    } catch (error) {
      return handleError(res, error, 'approve-new');
    }
  }) as RequestHandler);

  // POST /:id/request-revision — 보완 요청
  router.post('/:id/request-revision', (async (req: Request, res: Response) => {
    try {
      const result = await service.requestRevision(req.params.id, {
        note: typeof req.body?.note === 'string' ? req.body.note : '', reviewedBy: userId(req),
      });
      return res.json({ success: true, data: result });
    } catch (error) {
      return handleError(res, error, 'request-revision');
    }
  }) as RequestHandler);

  // POST /:id/reject — 등록 불가
  router.post('/:id/reject', (async (req: Request, res: Response) => {
    try {
      const result = await service.reject(req.params.id, {
        reason: typeof req.body?.reason === 'string' ? req.body.reason : null, reviewedBy: userId(req),
      });
      return res.json({ success: true, data: result });
    } catch (error) {
      return handleError(res, error, 'reject');
    }
  }) as RequestHandler);

  return router;
}
