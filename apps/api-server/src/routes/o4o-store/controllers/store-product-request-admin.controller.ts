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
import { requireProductDbWrite } from '../../../modules/neture/controllers/product-db-write-authority.js';
import type { ServiceScope } from '../../../utils/serviceScope.js';
import { StoreProductRequestAdminService, type StoreRequestDuplicate, type StoreRequestActionResult } from '../../../modules/neture/services/store-product-request-admin.service.js';
import { notifySubmitterOfStoreProductRequestDecision } from '../../../modules/neture/services/store-product-request-notify.js';
import { classificationLabel, type ProductClassification } from '../../../modules/neture/utils/product-type.util.js';
import logger from '../../../utils/logger.js';

const OPERATOR_ROLES = [
  'platform:super_admin',
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

/**
 * 운영자 스코프(role-prefix 형식: 'kpa'/'glycopharm'/'neture'/'cosmetics') → candidate.serviceKey 검증용.
 * platform admin = null(무제한). candidate.serviceKey 는 role-prefix 형식으로 저장되므로 rolePrefixes 로 비교한다
 * (scope.serviceKeys 는 canonical 'kpa-society' 라 candidate 와 불일치 — P3 hardening).
 */
function allowedScope(req: Request): string[] | null {
  const scope: ServiceScope = (req as any).serviceScope;
  return scope?.isPlatformAdmin ? null : (scope?.rolePrefixes ?? []);
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
    OUT_OF_SCOPE: 403,
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

/** 커밋 후 제출자 알림 발화(fire-and-forget). notify 헬퍼는 내부 try/catch 라 절대 throw 하지 않는다. */
function fireSubmitterNotify(
  req: Request,
  result: StoreRequestActionResult,
  decision: 'revision_requested' | 'approved' | 'rejected',
  note?: string | null,
): void {
  void notifySubmitterOfStoreProductRequestDecision({
    submittedBy: result.submittedBy,
    serviceKey: result.serviceKey,
    organizationId: result.organizationId,
    requestId: req.params.id,
    productName: result.productName,
    decision,
    note: note ?? null,
    actorId: userId(req),
  });
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
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
      const displayStatus = req.query.displayStatus as DisplayStatus | undefined;
      const rawStatuses = displayStatus && DISPLAY_TO_RAW[displayStatus] ? DISPLAY_TO_RAW[displayStatus] : null;

      const params: unknown[] = [STORE_REQUEST_SOURCE_LABEL];
      const conds: string[] = [`pc.source_type = 'store_web'`, `pc.source_label = $1`, `pc.deleted_at IS NULL`];

      // operator scope 제한: platform admin = 무제한. 그 외는 role-prefix 스코프로 제한.
      // candidate.service_key 는 role-prefix 형식('kpa')이므로 scope.rolePrefixes 와 비교(canonical 아님).
      if (!scope?.isPlatformAdmin) {
        const keys = scope?.rolePrefixes ?? [];
        if (keys.length === 0) {
          return res.json({ success: true, data: [], meta: { page, limit, total: 0, totalPages: 0 } });
        }
        params.push(keys);
        conds.push(`pc.service_key = ANY($${params.length})`);
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
      const dups = await service.findDuplicates(req.params.id, allowedScope(req));
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
      const note = typeof req.body?.note === 'string' ? req.body.note : null;
      const result = await service.linkToExistingMaster(req.params.id, {
        masterId, reviewedBy: userId(req), note, allowedServiceKeys: allowedScope(req),
      });
      fireSubmitterNotify(req, result, 'approved', note); // 커밋 후 비동기(best-effort)
      return res.json({ success: true, data: result });
    } catch (error) {
      return handleError(res, error, 'link');
    }
  }) as RequestHandler);

  // POST /:id/approve-new — 신규 ProductMaster 승인 (A안)
  //   WO-O4O-PRODUCT-DB-WRITE-AUTHORITY-BOUNDARY-ALIGNMENT-V1 §4
  //   이 액션만 공통 product_masters/product_identifiers 에 INSERT 한다.
  //   link/request-revision/reject 는 요청 레코드만 바꾸므로 서비스 운영자에게 유지한다.
  router.post('/:id/approve-new', requireProductDbWrite, (async (req: Request, res: Response) => {
    try {
      const note = typeof req.body?.note === 'string' ? req.body.note : null;
      const result = await service.approveAsNewMaster(req.params.id, {
        reviewedBy: userId(req), note, allowedServiceKeys: allowedScope(req),
      });
      fireSubmitterNotify(req, result, 'approved', note); // 커밋 후 비동기(best-effort)
      return res.status(201).json({ success: true, data: result });
    } catch (error) {
      return handleError(res, error, 'approve-new');
    }
  }) as RequestHandler);

  // POST /:id/request-revision — 보완 요청
  router.post('/:id/request-revision', (async (req: Request, res: Response) => {
    try {
      const note = typeof req.body?.note === 'string' ? req.body.note : '';
      const result = await service.requestRevision(req.params.id, {
        note, reviewedBy: userId(req), allowedServiceKeys: allowedScope(req),
      });
      fireSubmitterNotify(req, result, 'revision_requested', note); // 커밋 후 비동기(best-effort)
      return res.json({ success: true, data: result });
    } catch (error) {
      return handleError(res, error, 'request-revision');
    }
  }) as RequestHandler);

  // POST /:id/reject — 등록 불가
  router.post('/:id/reject', (async (req: Request, res: Response) => {
    try {
      const reason = typeof req.body?.reason === 'string' ? req.body.reason : null;
      const result = await service.reject(req.params.id, {
        reason, reviewedBy: userId(req), allowedServiceKeys: allowedScope(req),
      });
      fireSubmitterNotify(req, result, 'rejected', reason); // 커밋 후 비동기(best-effort)
      return res.json({ success: true, data: result });
    } catch (error) {
      return handleError(res, error, 'reject');
    }
  }) as RequestHandler);

  return router;
}
