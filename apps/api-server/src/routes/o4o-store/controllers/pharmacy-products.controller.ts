/**
 * Pharmacy Products Controller
 *
 * WO-PHARMACY-PRODUCT-LISTING-APPROVAL-PHASE1-V1
 * WO-O4O-API-PHARMACY-B2B-CATALOG-V1: GET /catalog 추가, POST /apply supplyProductId 확장
 *
 * GET  /catalog             — 플랫폼 B2B 상품 카탈로그 (공용공간용)
 * POST /apply              — 상품 판매 신청
 * GET  /applications       — 내 신청 목록
 * GET  /approved           — 승인된 상품 목록
 * GET  /listings           — 내 매장 진열 상품
 * PUT  /listings/:id       — 진열 상품 수정 (가격/순서/활성)
 *
 * 인증: requireAuth + store owner 체크 (WO-ROLE-NORMALIZATION-PHASE3-A-V1)
 * 조직: organization_members 기반 자동 결정
 */

import { Router, Request, Response, RequestHandler } from 'express';
import { DataSource } from 'typeorm';
import { OrganizationProductListing } from '../../../modules/store-core/entities/organization-product-listing.entity.js';
import { OrganizationProductChannel } from '../../../modules/store-core/entities/organization-product-channel.entity.js';
import { KpaAuditLog } from '../../kpa/entities/kpa-audit-log.entity.js';
import { asyncHandler } from '../../../middleware/error-handler.js';
import { SERVICE_KEYS } from '../../../constants/service-keys.js';
import { ApiError } from '../../../utils/api-error.js';
import { createRequireStoreOwner, type StoreOwnerServiceKey } from '../../../utils/store-owner.utils.js';

type AuthMiddleware = RequestHandler;

const VALID_SERVICE_KEYS = Object.values(SERVICE_KEYS) as string[];

function resolveServiceKeyFromQuery(query: any): string {
  const requested = query?.service_key;
  if (!requested) return SERVICE_KEYS.KPA_SOCIETY;
  if (VALID_SERVICE_KEYS.includes(requested)) return requested;
  throw new ApiError(400, `Invalid service_key: ${requested}`, 'INVALID_SERVICE_KEY');
}

function resolveServiceKeyFromBody(body: any): string {
  const requested = body?.service_key;
  if (!requested) return SERVICE_KEYS.KPA_SOCIETY;
  if (VALID_SERVICE_KEYS.includes(requested)) return requested;
  throw new ApiError(400, `Invalid service_key: ${requested}`, 'INVALID_SERVICE_KEY');
}

// WO-O4O-SERVICE-OFFER-HUB-EXPOSURE-APPROVAL-GATE-FIX-V1:
//   catalog 팩토리 serviceKey(role-prefix: kpa/glycopharm/cosmetics) →
//   offer_service_approvals.service_key(platform-level: kpa-society/glycopharm/k-cosmetics) 매핑.
//   (store-owner.utils.ts 의 STORE_OWNER_SCOPE_TO_MEMBERSHIP_KEY 와 동일 의미 — 정책 SSOT 정합)
const STORE_SERVICE_KEY_TO_APPROVAL_KEY: Record<string, string> = {
  kpa: 'kpa-society',
  glycopharm: 'glycopharm',
  cosmetics: 'k-cosmetics',
};

export function createPharmacyProductsController(
  dataSource: DataSource,
  requireAuth: AuthMiddleware,
  // WO-GLYCOPHARM-STORE-GUARD-SERVICE-AWARE-FIX-V1:
  //   serviceKey 지정 시 해당 서비스의 store_owner role 만 통과 (cross-service leakage 차단).
  //   미지정 시 기존 동작 유지 (back-compat — 모든 서비스 store_owner role 허용).
  serviceKey?: StoreOwnerServiceKey,
): Router {
  const router = Router();
  const listingRepo = dataSource.getRepository(OrganizationProductListing);
  const auditRepo = dataSource.getRepository(KpaAuditLog);

  // WO-ROLE-NORMALIZATION-PHASE3-A-V1: organization_members 기반 middleware
  // WO-GLYCOPHARM-STORE-GUARD-SERVICE-AWARE-FIX-V1: serviceKey 전파.
  const requirePharmacyOwner = createRequireStoreOwner(dataSource, serviceKey);

  // WO-O4O-KPA-STORE-ORDERABLE-PRODUCT-SOURCE-TABS-V1:
  //   마운트 serviceKey 캡처. /apply 내부에서 body-resolved serviceKey 가 동명 지역변수로 가려지므로
  //   "마운트가 KPA 인지" 판별용으로 별도 보관. (KPA 한정 정책 적용 — GP/KCos 무영향)
  const mountServiceKey = serviceKey;

  // ─── GET /catalog — 플랫폼 B2B 상품 카탈로그 ─────────────────────
  // WO-O4O-API-PHARMACY-B2B-CATALOG-V1
  // WO-KPA-HUB-PRODUCT-TABS-DATA-CRITERIA-REALIGNMENT-V1: recommended 필터 추가
  // WO-O4O-STORE-PRODUCT-STATUS-REMOVAL-V1:
  //   - 매장 상품 상태(판매 준비/판매중/비활성) 개념 제거
  //   - isApplied/isApproved/isListed/isListingInactive 4개 boolean → 단일 isAdded
  //   - operatorView 필터는 운영자 흐름 식별용으로 유지
  // supplier_product_offers (PUBLIC + active) + 내 매장 취급 여부 조인
  router.get('/catalog', requireAuth, requirePharmacyOwner, asyncHandler(async (req: Request, res: Response) => {
    const organizationId = (req as any).organizationId;
    const category = req.query.category as string | undefined;
    const distributionType = req.query.distributionType as string | undefined;
    const recommended = req.query.recommended === 'true';
    const operatorView = req.query.operatorView === 'true';
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    let categoryFilter = '';
    let distributionFilter = '';
    let operatorFilter = '';
    const params: any[] = [organizationId, limit, offset];

    if (category) {
      params.push(category);
      categoryFilter = `AND pm.brand_name = $${params.length}`;
    }
    if (operatorView) {
      // 운영자 탭: SERVICE 상품 중 약국이 승인 흐름에 참여 중인 상품만
      distributionFilter = `AND spo.distribution_type = 'SERVICE'`;
      operatorFilter = `AND (
        EXISTS(SELECT 1 FROM product_approvals pa3 WHERE pa3.organization_id = $1 AND pa3.offer_id = spo.id)
        OR EXISTS(SELECT 1 FROM organization_product_listings opl2 WHERE opl2.organization_id = $1 AND opl2.offer_id = spo.id)
      )`;
    } else if (distributionType && ['PUBLIC', 'SERVICE', 'PRIVATE'].includes(distributionType)) {
      params.push(distributionType);
      distributionFilter = `AND spo.distribution_type = $${params.length}`;
    }

    // WO-O4O-SERVICE-OFFER-HUB-EXPOSURE-APPROVAL-GATE-FIX-V1:
    //   서비스 운영자 승인 게이트. PUBLIC 은 승인 예외(전체 공개) → 통과.
    //   SERVICE/PRIVATE 은 현재 서비스(serviceKey)의 offer_service_approvals 가 'approved' 일 때만 노출.
    //   (전역 spo.is_active=true 만으로는 타 서비스 승인이 현재 서비스 HUB 로 누출됨 → per-service 게이트로 차단)
    //   serviceKey 미지정(back-compat 마운트)이면 게이트 미적용(기존 동작 보존).
    const approvalServiceKey = serviceKey ? STORE_SERVICE_KEY_TO_APPROVAL_KEY[serviceKey] : undefined;
    let approvalFilter = '';
    if (approvalServiceKey) {
      params.push(approvalServiceKey);
      approvalFilter = `AND (
        spo.distribution_type = 'PUBLIC'
        OR EXISTS (
          SELECT 1 FROM offer_service_approvals osa
          WHERE osa.offer_id = spo.id
            AND osa.service_key = $${params.length}
            AND osa.approval_status = 'approved'
        )
      )`;
    }

    // WO-KPA-RECOMMENDED-TAB-REPLACE-CURATION-WITH-SUPPLIER-HIGHLIGHT-V1:
    // recommended 탭은 공급자 강조 플래그(spo.is_featured) 우선 → created_at DESC fallback
    // 기존 offer_curations 의존 제거. 별도 WHERE 필터 없이 ORDER BY로 자연 fallback.
    const orderBy = recommended
      ? 'spo.is_featured DESC, spo.created_at DESC'
      : 'spo.updated_at DESC';

    const rows = await dataSource.query(
      `SELECT
         spo.id AS "id",
         pm.name AS "name",
         pm.brand_name AS "category",
         '' AS "description",
         spo.distribution_type AS "distributionType",
         spo.price_general AS "priceGeneral",
         spo.price_gold AS "priceGold",
         spo.consumer_reference_price AS "consumerReferencePrice",
         spo.created_at AS "createdAt",
         spo.updated_at AS "updatedAt",
         s.id AS "supplierId",
         o.name AS "supplierName",
         s.logo_url AS "supplierLogoUrl",
         s.category AS "supplierCategory",
         -- 내 매장 취급 여부 (신청 또는 진열 어느 하나라도 존재)
         (EXISTS(
           SELECT 1 FROM product_approvals pa2
           WHERE pa2.organization_id = $1
             AND pa2.offer_id = spo.id
         ) OR EXISTS(
           SELECT 1 FROM organization_product_listings opl
           WHERE opl.organization_id = $1
             AND opl.offer_id = spo.id
         )) AS "isAdded"
       FROM supplier_product_offers spo
       JOIN product_masters pm ON pm.id = spo.master_id
       JOIN neture_suppliers s ON s.id = spo.supplier_id
       LEFT JOIN organizations o ON o.id = s.organization_id
       WHERE spo.distribution_type IN ('PUBLIC', 'SERVICE', 'PRIVATE')
         AND spo.is_active = true
         AND s.status = 'ACTIVE'
         ${categoryFilter}
         ${distributionFilter}
         ${operatorFilter}
         ${approvalFilter}
       ORDER BY ${orderBy}
       LIMIT $2 OFFSET $3`,
      params,
    );

    // Total count (for pagination)
    const countParams: any[] = operatorView ? [organizationId] : [];
    let countCategoryFilter = '';
    let countDistributionFilter = '';
    let countOperatorFilter = '';
    if (category) {
      countParams.push(category);
      countCategoryFilter = `AND pm.brand_name = $${countParams.length}`;
    }
    if (operatorView) {
      countDistributionFilter = `AND spo.distribution_type = 'SERVICE'`;
      countOperatorFilter = `AND (
        EXISTS(SELECT 1 FROM product_approvals pa3 WHERE pa3.organization_id = $1 AND pa3.offer_id = spo.id)
        OR EXISTS(SELECT 1 FROM organization_product_listings opl2 WHERE opl2.organization_id = $1 AND opl2.offer_id = spo.id)
      )`;
    } else if (distributionType && ['PUBLIC', 'SERVICE', 'PRIVATE'].includes(distributionType)) {
      countParams.push(distributionType);
      countDistributionFilter = `AND spo.distribution_type = $${countParams.length}`;
    }
    // WO-O4O-SERVICE-OFFER-HUB-EXPOSURE-APPROVAL-GATE-FIX-V1: count 쿼리도 동일 게이트 동기화.
    let countApprovalFilter = '';
    if (approvalServiceKey) {
      countParams.push(approvalServiceKey);
      countApprovalFilter = `AND (
        spo.distribution_type = 'PUBLIC'
        OR EXISTS (
          SELECT 1 FROM offer_service_approvals osa
          WHERE osa.offer_id = spo.id
            AND osa.service_key = $${countParams.length}
            AND osa.approval_status = 'approved'
        )
      )`;
    }

    const countResult = await dataSource.query(
      `SELECT COUNT(*)::int AS total
       FROM supplier_product_offers spo
       JOIN product_masters pm ON pm.id = spo.master_id
       JOIN neture_suppliers s ON s.id = spo.supplier_id
       WHERE spo.distribution_type IN ('PUBLIC', 'SERVICE', 'PRIVATE')
         AND spo.is_active = true
         AND s.status = 'ACTIVE'
         ${countCategoryFilter}
         ${countDistributionFilter}
         ${countOperatorFilter}
         ${countApprovalFilter}`,
      countParams,
    );

    res.json({
      success: true,
      data: rows,
      pagination: {
        total: countResult[0]?.total || 0,
        limit,
        offset,
      },
    });
  }));

  // ─── POST /apply — v2 distribution type 분기 ────────────────────
  // WO-KPA-HUB-STORE-ORDERABLE-PRODUCT-APPLY-FIX-V1:
  // SERVICE → createServiceApproval, PUBLIC → createPublicListing
  router.post('/apply', requireAuth, requirePharmacyOwner, asyncHandler(async (req: Request, res: Response) => {
    const user = (req as any).user;
    const organizationId = (req as any).organizationId;
    const { supplyProductId } = req.body;
    const serviceKey = resolveServiceKeyFromBody(req.body);

    if (!supplyProductId) {
      throw new ApiError(400, 'supplyProductId is required', 'MISSING_PARAM');
    }
    if (!organizationId) {
      throw new ApiError(400, 'Store not set up. Please complete store setup first.', 'STORE_NOT_CONFIGURED');
    }

    const { ProductApprovalV2Service } = await import(
      '../../../modules/product-policy-v2/product-approval-v2.service.js'
    );
    const service = new ProductApprovalV2Service(dataSource);

    // Offer distribution type 조회
    const [offer] = await dataSource.query(
      `SELECT distribution_type FROM supplier_product_offers WHERE id = $1::uuid AND is_active = true`,
      [supplyProductId]
    );
    if (!offer) {
      throw new ApiError(404, 'Product not found or inactive', 'PRODUCT_NOT_FOUND');
    }

    let result;
    if (offer.distribution_type === 'SERVICE') {
      result = await service.createServiceApproval(supplyProductId, organizationId, serviceKey, user.id);
    } else if (offer.distribution_type === 'PUBLIC') {
      result = await service.createPublicListing(supplyProductId, organizationId, serviceKey);
      // WO-O4O-KPA-STORE-ORDERABLE-PRODUCT-SOURCE-TABS-V1 (KPA 한정 정책):
      //   KPA 는 '활성화 대기'(inactive OPL) 상태를 사용하지 않는다 — 약국이 허브에서 PUBLIC 상품을
      //   선택하면 즉시 주문 가능한 active OPL 이 된다. createPublicListing 의 공유 기본값(is_active=false)은
      //   유지하고(GP/KCos 무영향), KPA 마운트일 때만 생성 직후 활성화한다.
      if (mountServiceKey === 'kpa' && result.success && (result.data as any)?.id) {
        await dataSource.query(
          `UPDATE organization_product_listings SET is_active = true, updated_at = NOW() WHERE id = $1`,
          [(result.data as any).id],
        );
        (result.data as any).is_active = true;
      }
    } else if (offer.distribution_type === 'PRIVATE') {
      result = await service.createPrivateApproval(supplyProductId, organizationId, serviceKey, user.id);
    } else {
      throw new ApiError(400, `Unsupported distribution type: ${offer.distribution_type}`, 'UNSUPPORTED_TYPE');
    }

    if (!result.success) {
      throw new ApiError(400, result.error || 'Application failed', 'APPLICATION_FAILED');
    }

    res.json({ success: true, data: result.data });
  }));

  // ─── GET /applications — 내 신청 목록 (v2: product_approvals) ───────
  router.get('/applications', requireAuth, requirePharmacyOwner, asyncHandler(async (req: Request, res: Response) => {
    const organizationId = (req as any).organizationId;
    const status = req.query.status as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const serviceKey = resolveServiceKeyFromQuery(req.query);

    const hasStatus = status && ['pending', 'approved', 'rejected'].includes(status);
    const statusFilter = hasStatus ? `AND pa.approval_status = $3` : '';
    const baseParams: any[] = hasStatus ? [organizationId, serviceKey, status] : [organizationId, serviceKey];

    const countResult = await dataSource.query(
      `SELECT COUNT(*)::int AS total
       FROM product_approvals pa
       WHERE pa.organization_id = $1 AND pa.service_key = $2 ${statusFilter}`,
      baseParams,
    );
    const total = countResult[0]?.total || 0;

    const limitIdx = baseParams.length + 1;
    const offsetIdx = baseParams.length + 2;
    const data = await dataSource.query(
      `SELECT pa.id, pa.organization_id, pa.service_key,
              pa.offer_id,
              pm.name AS product_name,
              pa.metadata AS product_metadata,
              pa.approval_status AS status,
              pa.reason AS reject_reason,
              pa.requested_by,
              pa.created_at AS requested_at,
              pa.decided_by AS reviewed_by,
              pa.decided_at AS reviewed_at,
              pa.created_at, pa.updated_at
       FROM product_approvals pa
       LEFT JOIN supplier_product_offers spo ON spo.id = pa.offer_id
       LEFT JOIN product_masters pm ON pm.id = spo.master_id
       WHERE pa.organization_id = $1 AND pa.service_key = $2 ${statusFilter}
       ORDER BY pa.created_at DESC
       LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      [...baseParams, limit, (page - 1) * limit],
    );

    res.json({
      success: true,
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  }));

  // ─── GET /approved — 승인된 상품 목록 (v2: product_approvals) ──────
  router.get('/approved', requireAuth, requirePharmacyOwner, asyncHandler(async (req: Request, res: Response) => {
    const organizationId = (req as any).organizationId;
    const serviceKey = resolveServiceKeyFromQuery(req.query);

    const data = await dataSource.query(
      `SELECT pa.id, pa.organization_id, pa.service_key,
              pa.offer_id,
              pm.name AS product_name,
              pa.metadata AS product_metadata,
              pa.approval_status AS status,
              pa.reason AS reject_reason,
              pa.requested_by,
              pa.created_at AS requested_at,
              pa.decided_by AS reviewed_by,
              pa.decided_at AS reviewed_at,
              pa.created_at, pa.updated_at
       FROM product_approvals pa
       LEFT JOIN supplier_product_offers spo ON spo.id = pa.offer_id
       LEFT JOIN product_masters pm ON pm.id = spo.master_id
       WHERE pa.organization_id = $1
         AND pa.service_key = $2
         AND pa.approval_status = 'approved'
       ORDER BY pa.created_at DESC`,
      [organizationId, serviceKey],
    );

    res.json({ success: true, data });
  }));

  // ─── GET /orderable — 주문 가능 상품 통합 조회 (공급유형 탭) ──────────
  // WO-O4O-KPA-STORE-ORDERABLE-PRODUCT-SOURCE-TABS-V1
  //   내 약국이 "현재 주문할 수 있는" 상품을 공급유형(source)별로 통합 조회한다.
  //   권위 테이블 = organization_product_listings(opl) (약국 활성 진열). offer/supplier JOIN 으로
  //   출처를 분류하고 공급 중단/승인 취소/이벤트 종료를 서버에서 제외한다. DB 컬럼 추가 없음.
  //
  //   출처 분류(우선순위): seller_recruitment > event_offer(service_key=kpa-groupbuy) >
  //     operator(distribution_type=SERVICE) > b2b(PUBLIC/PRIVATE).
  //   사용자 확정(WO 답변): '운영자'=운영자 승인(SERVICE + 유효 서비스 승인). 운영자 직접 공급 개념 없음.
  //
  //   제외(공통): offer 비활성 / 공급자 status≠ACTIVE (공급자 판매 중단 — 최우선).
  //     event: status=approved + 기간(start≤now≤end) + 수량>0 아닌 행 제외(종료/취소/수량소진 숨김).
  //     operator(SERVICE): 현재 서비스 offer_service_approvals=approved 아닌 행 제외(승인 취소 반영).
  //   판매자 모집: source_type='seller_recruitment' + 위 공통 제외 → 활성 OPL+유효 offer 존재 행만.
  //     (승인됐지만 OPL 없음 = bridge 정합성 결함 → 여기서 미표시. GET 자가치유 안 함.)
  const ORDERABLE_SOURCE_CLASS: Record<string, string> = {
    b2b: 'b2b',
    operator: 'operator',
    event: 'event_offer',
    'seller-recruitment': 'seller_recruitment',
  };
  router.get('/orderable', requireAuth, requirePharmacyOwner, asyncHandler(async (req: Request, res: Response) => {
    const organizationId = (req as any).organizationId;
    if (!organizationId) {
      throw new ApiError(400, 'Store not set up. Please complete store setup first.', 'STORE_NOT_CONFIGURED');
    }
    const sourceParam = (req.query.source as string | undefined) || 'all';
    const sourceClass = sourceParam === 'all' ? null : (ORDERABLE_SOURCE_CLASS[sourceParam] ?? null);
    const search = (req.query.search as string | undefined)?.trim() || null;
    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = (page - 1) * limit;

    // serviceKey 미지정(back-compat 마운트)이면 SERVICE 승인 게이트 미적용(catalog 와 동일 정책).
    const approvalServiceKey = serviceKey ? STORE_SERVICE_KEY_TO_APPROVAL_KEY[serviceKey] : null;
    const searchPattern = search ? `%${search}%` : null;

    // 공통 CTE — 분류 + 제외 게이트. $1=orgId, $2=approvalServiceKey(nullable).
    const baseCte = `
      WITH orderable AS (
        SELECT
          opl.id                       AS listing_id,
          opl.offer_id                 AS offer_id,
          opl.master_id                AS master_id,
          opl.service_key              AS service_key,
          opl.source_type              AS source_type,
          opl.is_active                AS is_active,
          opl.price                    AS listing_price,
          opl.event_price              AS event_price,
          opl.start_at                 AS start_at,
          opl.end_at                   AS end_at,
          opl.total_quantity           AS total_quantity,
          opl.per_order_limit          AS per_order_limit,
          opl.per_store_limit          AS per_store_limit,
          opl.created_at               AS created_at,
          spo.distribution_type        AS distribution_type,
          spo.price_general            AS price_general,
          spo.price_gold               AS price_gold,
          spo.consumer_reference_price AS consumer_reference_price,
          s.id                         AS supplier_id,
          o.name                       AS supplier_name,
          s.logo_url                   AS supplier_logo_url,
          pm.name                      AS product_name,
          pm.brand_name                AS category,
          CASE
            WHEN opl.source_type = 'seller_recruitment' THEN 'seller_recruitment'
            WHEN opl.service_key = 'kpa-groupbuy'        THEN 'event_offer'
            WHEN spo.distribution_type = 'SERVICE'       THEN 'operator'
            ELSE 'b2b'
          END AS source_class
        FROM organization_product_listings opl
        JOIN supplier_product_offers spo ON spo.id = opl.offer_id
        JOIN neture_suppliers s ON s.id = spo.supplier_id
        LEFT JOIN organizations o ON o.id = s.organization_id
        JOIN product_masters pm ON pm.id = opl.master_id
        WHERE opl.organization_id = $1
          AND opl.is_active = true
          AND spo.is_active = true
          AND s.status = 'ACTIVE'
          AND (
            opl.service_key <> 'kpa-groupbuy'
            OR (
              opl.status = 'approved'
              AND (opl.start_at IS NULL OR NOW() >= opl.start_at)
              AND (opl.end_at   IS NULL OR NOW() <= opl.end_at)
              AND (opl.total_quantity IS NULL OR opl.total_quantity > 0)
            )
          )
          AND (
            spo.distribution_type <> 'SERVICE'
            OR $2::text IS NULL
            OR EXISTS (
              SELECT 1 FROM offer_service_approvals osa
              WHERE osa.offer_id = spo.id
                AND osa.service_key = $2
                AND osa.approval_status = 'approved'
            )
          )
      )`;

    // outer 필터: source_class + 검색. 파라미터 인덱스 동적.
    const params: any[] = [organizationId, approvalServiceKey];
    let sourceFilter = '';
    if (sourceClass) {
      params.push(sourceClass);
      sourceFilter = `AND source_class = $${params.length}`;
    }
    let searchFilter = '';
    if (searchPattern) {
      params.push(searchPattern);
      searchFilter = `AND product_name ILIKE $${params.length}`;
    }

    const countRows = await dataSource.query(
      `${baseCte} SELECT COUNT(*)::int AS total FROM orderable WHERE 1=1 ${sourceFilter} ${searchFilter}`,
      params,
    );
    const total = countRows[0]?.total || 0;

    const limitIdx = params.length + 1;
    const offsetIdx = params.length + 2;
    const rows = await dataSource.query(
      `${baseCte}
       SELECT * FROM orderable
       WHERE 1=1 ${sourceFilter} ${searchFilter}
       ORDER BY created_at DESC, listing_id
       LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      [...params, limit, offset],
    );

    const data = rows.map((r: any) => ({
      listingId: r.listing_id,
      offerId: r.offer_id,
      masterId: r.master_id,
      sourceType: r.source_class as 'b2b' | 'operator' | 'event_offer' | 'seller_recruitment',
      serviceKey: r.service_key,
      productName: r.product_name || '(상품 정보 없음)',
      category: r.category ?? null,
      supplierId: r.supplier_id ?? null,
      supplierName: r.supplier_name ?? '—',
      supplierLogoUrl: r.supplier_logo_url ?? null,
      // 단가: 이벤트는 event_price 우선, 그 외 listing price → 공급가 fallback
      unitPrice:
        r.event_price != null ? Number(r.event_price)
        : r.listing_price != null ? Number(r.listing_price)
        : r.price_gold != null ? Number(r.price_gold)
        : r.price_general != null ? Number(r.price_general)
        : null,
      eventPrice: r.event_price != null ? Number(r.event_price) : null,
      consumerReferencePrice: r.consumer_reference_price != null ? Number(r.consumer_reference_price) : null,
      // 이벤트 메타(이벤트 행만 의미 있음)
      startAt: r.start_at ? new Date(r.start_at).toISOString() : null,
      endAt: r.end_at ? new Date(r.end_at).toISOString() : null,
      totalQuantity: r.total_quantity ?? null,
      perOrderLimit: r.per_order_limit ?? null,
      perStoreLimit: r.per_store_limit ?? null,
      createdAt: r.created_at ? new Date(r.created_at).toISOString() : null,
    }));

    res.json({
      success: true,
      data,
      pagination: { total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) },
    });
  }));

  // ─── GET /listings — 내 매장 진열 상품 ─────────────────────────────
  // WO-O4O-STORE-DOMAIN-TABS-OPERATIONAL-READINESS-V1:
  // service_key 미전달 시 전체 도메인 반환 (all 탭 지원)
  router.get('/listings', requireAuth, requirePharmacyOwner, asyncHandler(async (req: Request, res: Response) => {
    const organizationId = (req as any).organizationId;
    const requestedKey = req.query.service_key as string | undefined;

    if (requestedKey && !VALID_SERVICE_KEYS.includes(requestedKey)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_SERVICE_KEY', message: `Invalid service_key: ${requestedKey}` },
      });
    }

    const where: Record<string, string> = { organization_id: organizationId };
    if (requestedKey) {
      where.service_key = requestedKey;
    }

    const listings = await listingRepo.find({
      where,
      order: { created_at: 'DESC' },
    });

    res.json({ success: true, data: listings });
  }));

  // ─── PUT /listings/:id — 진열 상품 수정 ────────────────────────────
  router.put('/listings/:id', requireAuth, requirePharmacyOwner, asyncHandler(async (req: Request, res: Response) => {
    const user = (req as any).user;
    const organizationId = (req as any).organizationId;
    const { id } = req.params;

    const serviceKey = resolveServiceKeyFromBody(req.body);
    const listing = await listingRepo.findOne({
      where: { id, organization_id: organizationId, service_key: serviceKey },
    });

    if (!listing) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Listing not found' },
      });
      return;
    }

    const { isActive } = req.body;

    if (isActive !== undefined) listing.is_active = isActive;

    const updated = await listingRepo.save(listing);

    // Audit log
    try {
      const log = auditRepo.create({
        operator_id: user.id,
        operator_role: (user.roles || []).find((r: string) => r.startsWith('kpa:')) || 'pharmacy_owner',
        action_type: 'CONTENT_UPDATED' as any,
        target_type: 'content' as any,
        target_id: updated.id,
        metadata: { action: 'listing_updated', changes: { isActive } },
      });
      await auditRepo.save(log);
    } catch (e) {
      console.error('[KPA AuditLog] Failed to write listing update audit:', e);
    }

    res.json({ success: true, data: updated });
  }));

  // ─── GET /listings/:id/channels — 상품의 채널별 설정 조회 ──────────
  router.get('/listings/:id/channels', requireAuth, requirePharmacyOwner, asyncHandler(async (req: Request, res: Response) => {
    const organizationId = (req as any).organizationId;
    const { id } = req.params;

    // Verify listing belongs to this organization
    const serviceKey = resolveServiceKeyFromQuery(req.query);
    const listing = await listingRepo.findOne({
      where: { id, organization_id: organizationId, service_key: serviceKey },
    });
    if (!listing) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Listing not found' },
      });
      return;
    }

    // Fetch all channels for this organization with product channel mapping
    const channels = await dataSource.query(
      `SELECT
         oc.id AS "channelId",
         oc.channel_type AS "channelType",
         oc.status,
         opc.id AS "productChannelId",
         COALESCE(opc.is_active, false) AS "isVisible",
         opc.sales_limit AS "salesLimit",
         opc.display_order AS "displayOrder"
       FROM organization_channels oc
       LEFT JOIN organization_product_channels opc
         ON opc.channel_id = oc.id AND opc.product_listing_id = $1
       WHERE oc.organization_id = $2
       ORDER BY oc.created_at ASC`,
      [id, organizationId]
    );

    res.json({ success: true, data: channels });
  }));

  // ─── PUT /listings/:id/channels — 상품의 채널별 설정 저장 ──────────
  router.put('/listings/:id/channels', requireAuth, requirePharmacyOwner, asyncHandler(async (req: Request, res: Response) => {
    const user = (req as any).user;
    const organizationId = (req as any).organizationId;
    const { id } = req.params;
    const channelSettings: Array<{
      channelId: string;
      isVisible: boolean;
      salesLimit?: number | null;
      displayOrder?: number;
    }> = req.body.channels;

    if (!Array.isArray(channelSettings)) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'channels array is required' },
      });
      return;
    }

    // Verify listing
    const serviceKey = resolveServiceKeyFromBody(req.body);
    const listing = await listingRepo.findOne({
      where: { id, organization_id: organizationId, service_key: serviceKey },
    });
    if (!listing) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Listing not found' },
      });
      return;
    }

    const pcRepo = dataSource.getRepository(OrganizationProductChannel);

    for (const setting of channelSettings) {
      // Validate sales_limit: reject 0
      if (setting.salesLimit !== undefined && setting.salesLimit !== null && setting.salesLimit <= 0) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'salesLimit must be greater than 0 or null' },
        });
        return;
      }

      // Find existing mapping
      let pc = await pcRepo.findOne({
        where: { channel_id: setting.channelId, product_listing_id: id },
      });

      if (pc) {
        // Update existing
        pc.is_active = setting.isVisible;
        if (setting.salesLimit !== undefined) pc.sales_limit = setting.salesLimit;
        if (setting.displayOrder !== undefined) pc.display_order = setting.displayOrder;
        await pcRepo.save(pc);
      } else if (setting.isVisible) {
        // Create new mapping only if making visible
        pc = pcRepo.create({
          channel_id: setting.channelId,
          product_listing_id: id,
          is_active: true,
          sales_limit: setting.salesLimit ?? null,
          display_order: setting.displayOrder ?? 0,
        });
        await pcRepo.save(pc);
      }
    }

    // Audit log
    try {
      const log = auditRepo.create({
        operator_id: user.id,
        operator_role: (user.roles || []).find((r: string) => r.startsWith('kpa:')) || 'pharmacy_owner',
        action_type: 'CONTENT_UPDATED' as any,
        target_type: 'content' as any,
        target_id: id,
        metadata: { action: 'channel_settings_updated', channelCount: channelSettings.length },
      });
      await auditRepo.save(log);
    } catch (e) {
      console.error('[KPA AuditLog] Failed to write channel settings audit:', e);
    }

    res.json({ success: true, data: { updated: channelSettings.length } });
  }));

  // ─── DELETE /by-offer/:offerId — 내 매장에서 상품 제외 ────────────────
  // WO-O4O-STORE-HUB-B2B-UI-REFINEMENT-V1
  // offer ID 기반으로 product_approvals + organization_product_listings 모두 제거.
  // 제거 후 카탈로그에서 해당 상품이 'available' 상태로 복귀됨.
  router.delete('/by-offer/:offerId', requireAuth, requirePharmacyOwner, asyncHandler(async (req: Request, res: Response) => {
    const organizationId = (req as any).organizationId;
    const { offerId } = req.params;

    // 1. product_approvals 삭제 (SERVICE / PRIVATE 흐름)
    await dataSource.query(
      `DELETE FROM product_approvals
       WHERE organization_id = $1 AND offer_id = $2::uuid`,
      [organizationId, offerId],
    );

    // 2. organization_product_listings 삭제 (PUBLIC 흐름 + auto-expand 결과)
    await dataSource.query(
      `DELETE FROM organization_product_listings
       WHERE organization_id = $1 AND offer_id = $2::uuid`,
      [organizationId, offerId],
    );

    res.json({ success: true });
  }));

  return router;
}
