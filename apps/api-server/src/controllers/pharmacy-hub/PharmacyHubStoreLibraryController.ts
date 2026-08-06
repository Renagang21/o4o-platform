/**
 * Pharmacy-Hub Store Owner Library Controller — "자료함"
 *
 * WO-PHARMACY-HUB-STORE-CONTENT-LIBRARY-V1
 *
 *   GET    /api/v1/pharmacy-hub/store-owner/library        목록
 *   POST   /api/v1/pharmacy-hub/store-owner/library        등록
 *   PUT    /api/v1/pharmacy-hub/store-owner/library/:id    수정
 *   DELETE /api/v1/pharmacy-hub/store-owner/library/:id    비활성화(soft delete)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 이 컨트롤러가 하는 일은 **조직 결정 + 상태코드 매핑**뿐이다.
 * 검증·SQL 계약은 공통 services/store/store-library.service.ts 를 호출한다
 * (KPA·GlycoPharm·K-Cosmetics 가 쓰는 것과 같은 함수 — 로직 복제 0).
 *
 * 왜 공통 라우트를 그대로 마운트하지 않는가
 *   공통 /pharmacy/library 는 createRequireStoreOwner(=resolveStoreAccess) 가 주입한
 *   organizationId 를 쓴다. 그 해석기는 서비스 스코프 없이 organization_members 를
 *   정렬 없는 LIMIT 1 로 고른다 — Pharmacy-Hub enrollment 조직과 일치한다는 보장이 없다.
 *   공통 가드는 변경 금지이므로(WO 변경 금지), 여기서 조직만 다시 정한다.
 *
 * 조직 계약 (PharmacyHubLocalProductController 와 동일)
 *   0개      : GET 200 안내 / write 409 STORE_NOT_CONNECTED
 *   2개 이상 : GET 200 안내 / write 409 AMBIGUOUS_STORE_CONNECTION
 *   1개      : 해당 조직으로만 조회·수정
 *   클라이언트 organizationId 는 신뢰하지 않는다.
 *
 * 삭제는 **비활성화(soft delete)** 다 (is_active=false). 물리 삭제 경로를 만들지 않는다.
 */
import type { Request, Response } from 'express';
import { AppDataSource } from '../../database/connection.js';
import logger from '../../utils/logger.js';
import { resolvePharmacyHubStoreOrganization, type StoreOrgResolution } from './store-organization.resolver.js';
import {
  listLibraryAssets,
  createLibraryAsset,
  updateLibraryAsset,
  deactivateLibraryAsset,
  type LibraryResult,
  type LibraryFailure,
} from '../../services/store/store-library.service.js';

function storeConnectionView(resolution: StoreOrgResolution) {
  return {
    status: resolution.status,
    candidateCount: resolution.candidateCount,
    errorCode: resolution.status === 'ambiguous' ? resolution.errorCode : null,
  };
}

function sendWriteBlocked(res: Response, resolution: StoreOrgResolution): void {
  if (resolution.status === 'not_connected') {
    res.status(409).json({
      success: false,
      error: '매장이 연결되어 있지 않아 자료함을 관리할 수 없습니다.',
      code: 'STORE_NOT_CONNECTED',
    });
    return;
  }
  res.status(409).json({
    success: false,
    error: '연결된 매장이 여러 개입니다. 운영자에게 문의해 주세요.',
    code: 'AMBIGUOUS_STORE_CONNECTION',
  });
}

/**
 * 실패 결과를 그대로 상태코드로 매핑한다 (Pharmacy-Hub 는 flat envelope).
 *
 * api-server tsconfig 는 strictNullChecks 가 꺼져 있어 `if (!result.ok)` 로 union 이
 * 좁혀지지 않는다. 호출은 항상 실패 분기에서만 하므로 여기서 형만 확정한다.
 */
function sendFailure(res: Response, result: LibraryResult<unknown>): void {
  const failure = result as LibraryFailure;
  res.status(failure.status).json({
    success: false,
    error: failure.message,
    code: failure.code,
    ...(failure.details ?? {}),
  });
}

function getUserId(req: Request, res: Response): string | null {
  const userId = (req as any).user?.id;
  if (typeof userId !== 'string' || userId.length === 0) {
    res.status(401).json({ success: false, error: 'Unauthorized' });
    return null;
  }
  return userId;
}

/** body 로 조직을 지목할 수 없다 — 조용히 무시하지 않고 명시적으로 거부한다. */
function rejectsOrganizationId(req: Request, res: Response): boolean {
  if (req.body && typeof req.body === 'object' && 'organizationId' in req.body) {
    res.status(400).json({
      success: false,
      error: '매장은 서버가 결정합니다. organizationId 는 보낼 수 없습니다.',
      code: 'FIELD_NOT_ACCEPTED',
    });
    return true;
  }
  return false;
}

/**
 * uuid 형식 가드 — Pharmacy-Hub 라우트에만 둔다.
 * store_execution_assets.id 는 uuid 컬럼이라 비-uuid 를 그대로 넘기면 캐스팅 500 이 난다.
 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function rejectsMalformedId(req: Request, res: Response): boolean {
  if (UUID_RE.test(String(req.params.id ?? ''))) return false;
  res.status(404).json({ success: false, error: 'Library item not found', code: 'LIBRARY_ITEM_NOT_FOUND' });
  return true;
}

function fail(res: Response, userId: string, op: string, error: unknown, message: string, code: string) {
  logger.error(`[PharmacyHubStoreLibrary] ${op} failed`, {
    userId,
    error: error instanceof Error ? error.message : String(error),
  });
  return res.status(500).json({ success: false, error: message, code });
}

export class PharmacyHubStoreLibraryController {
  /** GET /store-owner/library — query: page, limit, search, category */
  static async list(req: Request, res: Response): Promise<any> {
    const userId = getUserId(req, res);
    if (!userId) return;

    try {
      const resolution = await resolvePharmacyHubStoreOrganization(userId);
      const storeConnection = storeConnectionView(resolution);
      if (resolution.status !== 'connected') {
        return res.json({
          success: true,
          data: { storeConnection, items: [], total: 0, page: 1, limit: 20 },
        });
      }

      const data = await listLibraryAssets(AppDataSource, resolution.organizationId, {
        page: req.query.page,
        limit: req.query.limit,
        search: req.query.search,
        category: req.query.category,
      });
      return res.json({ success: true, data: { storeConnection, ...data } });
    } catch (error) {
      return fail(res, userId, 'list', error, '자료함을 불러오지 못했습니다.', 'LIBRARY_LOAD_FAILED');
    }
  }

  /** POST /store-owner/library */
  static async create(req: Request, res: Response): Promise<any> {
    const userId = getUserId(req, res);
    if (!userId) return;
    if (rejectsOrganizationId(req, res)) return;

    try {
      const resolution = await resolvePharmacyHubStoreOrganization(userId);
      if (resolution.status !== 'connected') return sendWriteBlocked(res, resolution);

      const result = await createLibraryAsset(AppDataSource, resolution.organizationId, req.body);
      if (!result.ok) return sendFailure(res, result);
      return res.status(201).json({ success: true, data: result.data });
    } catch (error) {
      return fail(res, userId, 'create', error, '자료를 등록하지 못했습니다.', 'LIBRARY_CREATE_FAILED');
    }
  }

  /** PUT /store-owner/library/:id */
  static async update(req: Request, res: Response): Promise<any> {
    const userId = getUserId(req, res);
    if (!userId) return;
    if (rejectsOrganizationId(req, res)) return;
    if (rejectsMalformedId(req, res)) return;

    try {
      const resolution = await resolvePharmacyHubStoreOrganization(userId);
      if (resolution.status !== 'connected') return sendWriteBlocked(res, resolution);

      const result = await updateLibraryAsset(
        AppDataSource,
        resolution.organizationId,
        req.params.id,
        req.body,
      );
      if (!result.ok) return sendFailure(res, result);
      return res.json({ success: true, data: result.data });
    } catch (error) {
      return fail(res, userId, 'update', error, '자료를 수정하지 못했습니다.', 'LIBRARY_UPDATE_FAILED');
    }
  }

  /** DELETE /store-owner/library/:id — 비활성화(soft delete) */
  static async deactivate(req: Request, res: Response): Promise<any> {
    const userId = getUserId(req, res);
    if (!userId) return;
    if (rejectsMalformedId(req, res)) return;

    try {
      const resolution = await resolvePharmacyHubStoreOrganization(userId);
      if (resolution.status !== 'connected') return sendWriteBlocked(res, resolution);

      const result = await deactivateLibraryAsset(
        AppDataSource,
        resolution.organizationId,
        req.params.id,
      );
      if (!result.ok) return sendFailure(res, result);
      return res.json({ success: true, data: result.data });
    } catch (error) {
      return fail(res, userId, 'deactivate', error, '자료를 삭제하지 못했습니다.', 'LIBRARY_DELETE_FAILED');
    }
  }
}
