/**
 * Pharmacy-Hub Store Owner Handled Product Controller — "매장 경영활용 제품"
 *
 * WO-PHARMACY-HUB-STORE-HANDLED-PRODUCTS-V1 (B안)
 *
 *   GET    /api/v1/pharmacy-hub/store-owner/handled-products         취급 제품 목록
 *   POST   /api/v1/pharmacy-hub/store-owner/handled-products         취급 등록 (offerId)
 *   PATCH  /api/v1/pharmacy-hub/store-owner/handled-products/active  활성/비활성 전환
 *   POST   /api/v1/pharmacy-hub/store-owner/handled-products/remove  취급 해제
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 왜 공통 `/api/v1/store/handled-products` 를 그대로 쓰지 않는가
 *
 *   공통 라우트는 `resolveStoreAccess(ds, userId, roles)` 로 조직을 정하는데, 그 안의
 *   `organization_members … LIMIT 1` 은 service enrollment 를 보지 않는다. 다중 조직
 *   계정(예: KPA 약국 + Pharmacy-Hub 약국)에서 **다른 서비스 조직의 취급 제품을 읽거나
 *   수정**할 수 있다. 공통 해석기 변경은 본 WO 의 변경 금지 항목이므로,
 *   **조직 결정만** Pharmacy-Hub 기준(resolvePharmacyHubStoreOrganization)으로 하고
 *   조회·해제·활성 전환 로직은 공통 service(store-handled-products.service.ts)를 호출한다.
 *   → SQL·검증 계약 복제 0, 기존 KPA·GlycoPharm·K-Cosmetics 동작 불변.
 *
 * 조직 계약 (StoreInfo/Dashboard 와 동일 — 서비스 내 해석이 갈라지지 않게 한다)
 *   0개      : status='not_connected'  (GET 200 안내 / write 409 STORE_NOT_CONNECTED)
 *   2개 이상 : status='ambiguous'      (GET 200 안내 / write 409 AMBIGUOUS_STORE_CONNECTION)
 *   1개      : 해당 조직으로만 조회·수정
 *   클라이언트가 보낸 organizationId 는 어떤 경우에도 신뢰하지 않는다.
 *
 * SSOT 무변경
 *   organization_product_listings(listing) + store_local_products(local).
 *   Pharmacy-Hub 전용 상품 테이블·ProductMaster 사본을 만들지 않는다.
 *
 * 취급 등록 게이트
 *   목록(browse)·상세와 **같은** PHARMACY_HUB_OFFER_EXPOSURE_GATE_SQL 을 쓴다.
 *   목록에 보이지 않는 offer 를 ID 직접 지정으로 취급 등록할 수 없다.
 *   주문 완료 상품을 자동으로 취급 등록하지 않는다 (등록은 이 명시적 액션뿐).
 */
import type { Request, Response } from 'express';
import { AppDataSource } from '../../database/connection.js';
import { SERVICE_KEYS } from '../../constants/service-keys.js';
import logger from '../../utils/logger.js';
import { resolvePharmacyHubStoreOrganization, type StoreOrgResolution } from './store-organization.resolver.js';
import { PHARMACY_HUB_OFFER_EXPOSURE_GATE_SQL } from './offer-exposure.js';
import {
  listHandledProducts,
  parseHandledProductRefs,
  removeHandledProducts,
  setHandledProductActive,
  type HandledProductManagePaths,
} from '../../services/store/store-handled-products.service.js';

const SERVICE_KEY = SERVICE_KEYS.PHARMACY_HUB;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Pharmacy-Hub 화면 경로 — 기본값(KPA `/store/*`)은 PH 에서 dead link 이므로 주입한다. */
const PHARMACY_HUB_MANAGE_PATHS: HandledProductManagePaths = {
  listing: (id) => `/store-owner/handled-products?highlight=${id}`,
  local: (id) => `/store-owner/local-products?highlight=${id}`,
};

/** 화면이 "미연결/모호" 안내를 그릴 수 있게 하는 공통 표기 (조직 id 는 노출하지 않는다). */
function storeConnectionView(resolution: StoreOrgResolution) {
  return {
    status: resolution.status,
    candidateCount: resolution.candidateCount,
    errorCode: resolution.status === 'ambiguous' ? resolution.errorCode : null,
  };
}

/** write 경로에서 조직이 확정되지 않으면 409 — 임의 조직으로 쓰지 않는다. */
function sendWriteBlocked(res: Response, resolution: StoreOrgResolution): void {
  if (resolution.status === 'not_connected') {
    res.status(409).json({
      success: false,
      error: '매장이 연결되어 있지 않아 취급 제품을 변경할 수 없습니다.',
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

function getUserId(req: Request, res: Response): string | null {
  const userId = (req as any).user?.id;
  if (typeof userId !== 'string' || userId.length === 0) {
    res.status(401).json({ success: false, error: 'Unauthorized' });
    return null;
  }
  return userId;
}

export class PharmacyHubHandledProductController {
  /**
   * GET /store-owner/handled-products
   * query: page, limit, search, source('all'|'listing'|'local'), includeInactive('false' 시 활성만)
   *
   * 활성 상태 관리 화면이므로 **비활성 제품도 기본 포함**한다. 공통 소비처(KPA/GP/KCos)는
   * 기존대로 활성만 보므로 service 기본값은 건드리지 않고 여기서 옵션으로만 켠다.
   */
  static async list(req: Request, res: Response): Promise<any> {
    const userId = getUserId(req, res);
    if (!userId) return;

    try {
      const resolution = await resolvePharmacyHubStoreOrganization(userId);
      const storeConnection = storeConnectionView(resolution);

      if (resolution.status !== 'connected') {
        const page = Math.max(1, parseInt(String(req.query.page)) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit)) || 20));
        return res.json({
          success: true,
          data: { storeConnection, items: [], pagination: { page, limit, total: 0 } },
        });
      }

      const data = await listHandledProducts(AppDataSource, resolution.organizationId, {
        page: req.query.page,
        limit: req.query.limit,
        search: req.query.search,
        source: req.query.source,
        includeInactive: req.query.includeInactive !== 'false',
        managePaths: PHARMACY_HUB_MANAGE_PATHS,
      });

      return res.json({ success: true, data: { storeConnection, ...data } });
    } catch (error) {
      logger.error('[PharmacyHubHandledProduct] list failed', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      return res.status(500).json({
        success: false,
        error: '취급 제품 목록을 불러오지 못했습니다.',
        code: 'HANDLED_PRODUCTS_LOAD_FAILED',
      });
    }
  }

  /**
   * POST /store-owner/handled-products  { offerId }
   *
   * 매장이 O4O 제공 상품을 "우리 매장이 취급한다"고 등록한다 (organization_product_listings).
   * - 노출 게이트를 통과한 offer 만 등록 가능 (목록과 동일 조건).
   * - 재등록은 멱등 — UNIQUE(organization_id, service_key, offer_id) 충돌 시 활성화만 한다.
   * - ProductMaster·설명서·이미지 원본은 복제하지 않는다 (master_id 참조만).
   */
  static async apply(req: Request, res: Response): Promise<any> {
    const userId = getUserId(req, res);
    if (!userId) return;

    const body = req.body ?? {};
    if ('organizationId' in body) {
      return res.status(400).json({
        success: false,
        error: '매장은 서버가 결정합니다. organizationId 는 보낼 수 없습니다.',
        code: 'FIELD_NOT_ACCEPTED',
      });
    }
    const offerId = String(body.offerId ?? '');
    if (!UUID_RE.test(offerId)) {
      return res.status(400).json({
        success: false,
        error: '상품 식별자가 올바르지 않습니다.',
        code: 'INVALID_OFFER_ID',
      });
    }

    try {
      const resolution = await resolvePharmacyHubStoreOrganization(userId);
      if (resolution.status !== 'connected') return sendWriteBlocked(res, resolution);
      const organizationId = resolution.organizationId;

      // 게이트 탈락과 부존재를 구분하지 않는다 (제공 대상이 아닌 상품의 존재를 노출하지 않음).
      const [offer] = await AppDataSource.query(
        `SELECT spo.id AS "offerId", spo.master_id AS "masterId", pm.name AS "name"
           FROM supplier_product_offers spo
           JOIN neture_suppliers ns ON ns.id = spo.supplier_id
           JOIN product_masters pm  ON pm.id = spo.master_id
          WHERE ${PHARMACY_HUB_OFFER_EXPOSURE_GATE_SQL}
            AND spo.id = $2::uuid`,
        [SERVICE_KEY, offerId],
      );
      if (!offer) {
        return res.status(404).json({
          success: false,
          error: '상품을 찾을 수 없습니다.',
          code: 'PRODUCT_NOT_FOUND',
        });
      }

      const rows = await AppDataSource.query(
        `INSERT INTO organization_product_listings
             (id, organization_id, service_key, master_id, offer_id, is_active, created_at, updated_at)
         VALUES (gen_random_uuid(), $1::uuid, $2, $3::uuid, $4::uuid, true, NOW(), NOW())
         ON CONFLICT (organization_id, service_key, offer_id)
         DO UPDATE SET is_active = true, updated_at = NOW()
         RETURNING id, (xmax = 0) AS "inserted"`,
        [organizationId, SERVICE_KEY, offer.masterId, offerId],
      );
      const row = Array.isArray(rows) ? rows[0] : undefined;

      return res.status(row?.inserted ? 201 : 200).json({
        success: true,
        data: {
          sourceType: 'listing' as const,
          sourceId: row?.id ?? null,
          offerId,
          masterId: offer.masterId,
          name: offer.name,
          isActive: true,
          created: Boolean(row?.inserted),
        },
      });
    } catch (error) {
      logger.error('[PharmacyHubHandledProduct] apply failed', {
        userId,
        offerId,
        error: error instanceof Error ? error.message : String(error),
      });
      return res.status(500).json({
        success: false,
        error: '취급 등록에 실패했습니다.',
        code: 'HANDLED_PRODUCT_APPLY_FAILED',
      });
    }
  }

  /**
   * PATCH /store-owner/handled-products/active  { sourceType, sourceId, isActive }
   * 기존 is_active 컬럼 토글 — 신규 상태 저장소를 만들지 않는다.
   */
  static async setActive(req: Request, res: Response): Promise<any> {
    const userId = getUserId(req, res);
    if (!userId) return;

    const body = req.body ?? {};
    const [ref] = parseHandledProductRefs([{ sourceType: body.sourceType, sourceId: body.sourceId }]);
    if (!ref) {
      return res.status(400).json({
        success: false,
        error: '대상 제품 정보가 올바르지 않습니다.',
        code: 'INVALID_TARGET',
      });
    }
    if (typeof body.isActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'isActive 는 true 또는 false 여야 합니다.',
        code: 'INVALID_IS_ACTIVE',
      });
    }

    try {
      const resolution = await resolvePharmacyHubStoreOrganization(userId);
      if (resolution.status !== 'connected') return sendWriteBlocked(res, resolution);

      const updated = await setHandledProductActive(
        AppDataSource,
        resolution.organizationId,
        ref,
        body.isActive,
      );
      if (!updated) {
        // 타 조직 소유는 organization_id 조건으로 걸러져 여기로 온다 (존재 여부 노출 금지).
        return res.status(404).json({
          success: false,
          error: '취급 제품을 찾을 수 없습니다.',
          code: 'NOT_FOUND',
        });
      }
      return res.json({ success: true, data: { ...ref, isActive: body.isActive } });
    } catch (error) {
      logger.error('[PharmacyHubHandledProduct] setActive failed', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      return res.status(500).json({
        success: false,
        error: '활성 상태를 변경하지 못했습니다.',
        code: 'HANDLED_PRODUCT_ACTIVE_FAILED',
      });
    }
  }

  /**
   * POST /store-owner/handled-products/remove  { items: [{ sourceType, sourceId }] }
   * "매장 취급 목록에서 제거"이며 상품 정보 삭제가 아니다 (공통 service 계약 그대로).
   */
  static async remove(req: Request, res: Response): Promise<any> {
    const userId = getUserId(req, res);
    if (!userId) return;

    const refs = parseHandledProductRefs(req.body?.items);
    if (refs.length === 0) {
      return res.status(400).json({
        success: false,
        error: '제거할 제품을 선택해 주세요.',
        code: 'NO_VALID_ITEMS',
      });
    }

    try {
      const resolution = await resolvePharmacyHubStoreOrganization(userId);
      if (resolution.status !== 'connected') return sendWriteBlocked(res, resolution);

      const result = await removeHandledProducts(AppDataSource, resolution.organizationId, refs);
      return res.json({ success: true, data: result });
    } catch (error) {
      logger.error('[PharmacyHubHandledProduct] remove failed', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      return res.status(500).json({
        success: false,
        error: '취급 해제에 실패했습니다.',
        code: 'HANDLED_PRODUCT_REMOVE_FAILED',
      });
    }
  }
}
