/**
 * Pharmacy-Hub Store Owner Local Product Controller — "매장 자체 상품"
 *
 * WO-PHARMACY-HUB-STORE-HANDLED-PRODUCTS-V1 (B안)
 *
 *   GET    /api/v1/pharmacy-hub/store-owner/local-products        목록
 *   GET    /api/v1/pharmacy-hub/store-owner/local-products/:id    단건
 *   POST   /api/v1/pharmacy-hub/store-owner/local-products        등록
 *   PUT    /api/v1/pharmacy-hub/store-owner/local-products/:id    수정
 *   DELETE /api/v1/pharmacy-hub/store-owner/local-products/:id    비활성화(soft delete)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 이 컨트롤러가 하는 일은 **조직 결정 + 상태코드 매핑**뿐이다.
 * 검증·SQL 계약은 공통 services/store/store-local-products.service.ts 를 호출한다
 * (KPA·GlycoPharm·K-Cosmetics 가 쓰는 것과 같은 함수 — 로직 복제 0).
 *
 * 조직 계약 (PharmacyHubStoreInfoController 와 동일)
 *   0개      : GET 200 안내 / write 409 STORE_NOT_CONNECTED
 *   2개 이상 : GET 200 안내 / write 409 AMBIGUOUS_STORE_CONNECTION
 *   1개      : 해당 조직으로만 조회·수정
 *   클라이언트 organizationId 는 신뢰하지 않는다.
 *
 * 삭제는 **비활성화(soft delete)** 다 — 공통 구조에 물리 삭제 경로가 없고,
 * 본 WO 에서 새로 만들지도 않는다 (WO §결과물).
 *
 * StoreLocalProduct 는 Display Domain 이다 — Checkout/Order/Cart 와 연결하지 않는다.
 */
import type { Request, Response } from 'express';
import { AppDataSource } from '../../database/connection.js';
import logger from '../../utils/logger.js';
import { resolvePharmacyHubStoreOrganization, type StoreOrgResolution } from './store-organization.resolver.js';
import {
  listLocalProducts,
  getLocalProduct,
  createLocalProduct,
  updateLocalProduct,
  deactivateLocalProduct,
  type ServiceResult,
  type ServiceFailure,
} from '../../services/store/store-local-products.service.js';

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
      error: '매장이 연결되어 있지 않아 매장 자체 상품을 관리할 수 없습니다.',
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
 * 실패 결과를 그대로 상태코드로 매핑한다.
 *
 * api-server tsconfig 는 strictNullChecks 가 꺼져 있어 `if (!result.ok)` 로 union 이
 * 좁혀지지 않는다. 호출은 항상 실패 분기에서만 하므로 여기서 형만 확정한다.
 */
function sendFailure(res: Response, result: ServiceResult<unknown>): void {
  const failure = result as ServiceFailure;
  res.status(failure.status).json({ success: false, error: failure.error, code: failure.code });
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

/** 공통 500 처리 — 원인 메시지는 로그에만 남긴다. */
function fail(res: Response, userId: string, op: string, error: unknown, message: string, code: string) {
  logger.error(`[PharmacyHubLocalProduct] ${op} failed`, {
    userId,
    error: error instanceof Error ? error.message : String(error),
  });
  return res.status(500).json({ success: false, error: message, code });
}

export class PharmacyHubLocalProductController {
  /** GET /store-owner/local-products — query: page, limit, category, activeOnly, highlightOnly */
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

      const data = await listLocalProducts(AppDataSource, resolution.organizationId, {
        page: req.query.page,
        limit: req.query.limit,
        category: req.query.category as string | undefined,
        // 관리 화면이므로 비활성 상품도 기본 포함한다 ('true' 를 주면 활성만).
        activeOnly: req.query.activeOnly === 'true',
        highlightOnly: req.query.highlightOnly === 'true',
      });
      return res.json({ success: true, data: { storeConnection, ...data } });
    } catch (error) {
      return fail(res, userId, 'list', error, '매장 자체 상품을 불러오지 못했습니다.', 'LOCAL_PRODUCTS_LOAD_FAILED');
    }
  }

  /** GET /store-owner/local-products/:id */
  static async detail(req: Request, res: Response): Promise<any> {
    const userId = getUserId(req, res);
    if (!userId) return;

    try {
      const resolution = await resolvePharmacyHubStoreOrganization(userId);
      if (resolution.status !== 'connected') return sendWriteBlocked(res, resolution);

      const result = await getLocalProduct(AppDataSource, resolution.organizationId, req.params.id);
      if (!result.ok) return sendFailure(res, result);
      return res.json({ success: true, data: result.data });
    } catch (error) {
      return fail(res, userId, 'detail', error, '매장 자체 상품을 불러오지 못했습니다.', 'LOCAL_PRODUCT_LOAD_FAILED');
    }
  }

  /** POST /store-owner/local-products */
  static async create(req: Request, res: Response): Promise<any> {
    const userId = getUserId(req, res);
    if (!userId) return;
    if (rejectsOrganizationId(req, res)) return;

    try {
      const resolution = await resolvePharmacyHubStoreOrganization(userId);
      if (resolution.status !== 'connected') return sendWriteBlocked(res, resolution);

      const result = await createLocalProduct(AppDataSource, resolution.organizationId, req.body);
      if (!result.ok) return sendFailure(res, result);
      return res.status(201).json({ success: true, data: result.data });
    } catch (error) {
      return fail(res, userId, 'create', error, '매장 자체 상품을 등록하지 못했습니다.', 'LOCAL_PRODUCT_CREATE_FAILED');
    }
  }

  /** PUT /store-owner/local-products/:id */
  static async update(req: Request, res: Response): Promise<any> {
    const userId = getUserId(req, res);
    if (!userId) return;
    if (rejectsOrganizationId(req, res)) return;

    try {
      const resolution = await resolvePharmacyHubStoreOrganization(userId);
      if (resolution.status !== 'connected') return sendWriteBlocked(res, resolution);

      const result = await updateLocalProduct(
        AppDataSource,
        resolution.organizationId,
        req.params.id,
        req.body,
      );
      if (!result.ok) return sendFailure(res, result);
      return res.json({ success: true, data: result.data });
    } catch (error) {
      return fail(res, userId, 'update', error, '매장 자체 상품을 수정하지 못했습니다.', 'LOCAL_PRODUCT_UPDATE_FAILED');
    }
  }

  /** DELETE /store-owner/local-products/:id — 비활성화(soft delete) */
  static async deactivate(req: Request, res: Response): Promise<any> {
    const userId = getUserId(req, res);
    if (!userId) return;

    try {
      const resolution = await resolvePharmacyHubStoreOrganization(userId);
      if (resolution.status !== 'connected') return sendWriteBlocked(res, resolution);

      const result = await deactivateLocalProduct(
        AppDataSource,
        resolution.organizationId,
        req.params.id,
      );
      if (!result.ok) return sendFailure(res, result);
      return res.json({ success: true, data: result.data });
    } catch (error) {
      return fail(res, userId, 'deactivate', error, '매장 자체 상품을 비활성화하지 못했습니다.', 'LOCAL_PRODUCT_DEACTIVATE_FAILED');
    }
  }
}
