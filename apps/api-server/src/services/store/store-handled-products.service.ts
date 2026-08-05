/**
 * Store Handled Products Service — "매장 취급제품" 통합 조회·해제 공통 로직
 *
 * WO-PHARMACY-HUB-STORE-HANDLED-PRODUCTS-V1 (B안 — service 함수 추출)
 * 원본: routes/platform/store-handled-products.routes.ts (WO-O4O-KPA-STORE-HANDLED-PRODUCTS-UNIFIED-VIEW-V1)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 왜 추출하는가
 *   Pharmacy-Hub 는 공통 `/api/v1/store/*` 라우트를 그대로 쓸 수 없다. 그 라우트는
 *   `resolveStoreAccess(ds, userId, roles)` 를 serviceKey 없이 호출하고, 그 안의
 *   `organization_members … LIMIT 1` 은 service enrollment 를 보지 않아 **다중 조직
 *   계정에서 타 서비스 조직을 반환**할 수 있다. 공통 resolveStoreAccess 변경은 W7
 *   변경 금지 항목이므로, **조직 결정만 서비스별로 하고 조회·해제 로직은 여기서 공유**한다.
 *
 * 계약
 *   - 이 모듈은 **인증·조직 결정을 하지 않는다.** organizationId 는 호출자가
 *     이미 서비스 경계에 맞게 해석한 값이어야 한다 (KPA/GP/KCos = resolveStoreAccess,
 *     Pharmacy-Hub = resolvePharmacyHubStoreOrganization).
 *   - SSOT 무변경: organization_product_listings(listing) + store_local_products(local)
 *     을 물리 통합하지 않고 sourceType 으로 구분해 조회 통합한다.
 *   - Boundary Policy: organization_id 필터 필수 · Raw SQL parameter binding 필수.
 *
 * 기존 동작 보존
 *   기본값(includeInactive=false, 기본 managePaths)에서 생성되는 SQL 은 KPA·GlycoPharm·
 *   K-Cosmetics 가 쓰던 것과 동일하다. 응답은 `masterId` 1개만 additive 로 늘었다
 *   (기존 필드 제거·의미 변경 0 — 기존 화면 무영향).
 */

import type { DataSource, EntityManager } from 'typeorm';
import { deriveProductClassification } from '../../modules/neture/utils/product-type.util.js';

export type HandledProductSourceType = 'listing' | 'local';

interface UnifiedRow {
  source_type: HandledProductSourceType;
  source_id: string;
  name: string | null;
  image_url: string | null;
  price: string | number | null;
  is_active: boolean;
  listing_status: string | null;
  start_at: string | null;
  end_at: string | null;
  master_id: string | null;
  updated_at: string;
  regulatory_type: string | null;
  drug_category: string | null;
}

export interface HandledProductItem {
  sourceType: HandledProductSourceType;
  sourceId: string;
  name: string;
  imageUrl: string | null;
  originLabel: string;
  ownerLabel: string;
  price: number | null;
  isActive: boolean;
  classificationCode: string;
  classificationLabel: string;
  updatedAt: string;
  managePath: string;
  masterId: string | null;
}

/** 서비스별 "관리 화면으로 이동" 경로. 기본값 = KPA·GP·KCos 가 쓰던 기존 경로. */
export interface HandledProductManagePaths {
  listing: (sourceId: string) => string;
  local: (sourceId: string) => string;
}

const DEFAULT_MANAGE_PATHS: HandledProductManagePaths = {
  listing: (id) => `/store/my-products?highlight=${id}`,
  local: (id) => `/store/commerce/local-products?highlight=${id}`,
};

export interface ListHandledProductsOptions {
  page?: unknown;
  limit?: unknown;
  search?: unknown;
  /** 'all' | 'listing' | 'local' (기본 all) */
  source?: unknown;
  /**
   * true 면 비활성 제품도 포함한다 (활성 상태 관리 화면용).
   * 기본 false — 기존 소비처(KPA/GP/KCos)의 `is_active = true` 조건을 그대로 유지한다.
   */
  includeInactive?: boolean;
  managePaths?: HandledProductManagePaths;
}

export interface HandledProductsPage {
  items: HandledProductItem[];
  pagination: { page: number; limit: number; total: number };
}

export async function listHandledProducts(
  dataSource: DataSource,
  organizationId: string,
  options: ListHandledProductsOptions = {},
): Promise<HandledProductsPage> {
  const page = Math.max(1, parseInt(options.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(options.limit as string) || 20));
  const offset = (page - 1) * limit;
  const search = ((options.search as string) || '').trim();
  const sourceParam = (options.source as string) || 'all';
  const includeListing = sourceParam !== 'local';
  const includeLocal = sourceParam !== 'listing';
  const managePaths = options.managePaths ?? DEFAULT_MANAGE_PATHS;

  // 비활성 포함 여부. 기본은 활성만 (기존 계약).
  const activeListing = options.includeInactive ? '' : ' AND opl.is_active = true';
  const activeLocal = options.includeInactive ? '' : ' AND lp.is_active = true';

  // ── 공통 파라미터 ($1=org, $2=search) ──
  const baseParams: any[] = [organizationId];
  const hasSearch = search.length > 0;
  if (hasSearch) baseParams.push(`%${search}%`);
  const searchListing = hasSearch ? ` AND pm.name ILIKE $2` : '';
  const searchLocal = hasSearch ? ` AND lp.name ILIKE $2` : '';

  const listingSelect = `
        SELECT 'listing'::text AS source_type, opl.id AS source_id, pm.name AS name,
               (SELECT pi.image_url FROM product_images pi WHERE pi.master_id = opl.master_id AND pi.deleted_at IS NULL
                 ORDER BY pi.is_primary DESC, pi.sort_order ASC LIMIT 1) AS image_url,
               COALESCE(opl.price, spo.price_general) AS price,
               opl.is_active AS is_active, opl.status AS listing_status,
               opl.start_at AS start_at, opl.end_at AS end_at, opl.master_id AS master_id,
               opl.updated_at AS updated_at,
               pm.regulatory_type AS regulatory_type, pm.drug_category AS drug_category
        FROM organization_product_listings opl
        LEFT JOIN product_masters pm ON pm.id = opl.master_id
        LEFT JOIN supplier_product_offers spo ON spo.id = opl.offer_id
        WHERE opl.organization_id = $1${activeListing}${searchListing}`;

  const localSelect = `
        SELECT 'local'::text AS source_type, lp.id AS source_id, lp.name AS name,
               lp.thumbnail_url AS image_url,
               lp.price_display AS price,
               lp.is_active AS is_active, NULL::varchar AS listing_status,
               NULL::timestamp AS start_at, NULL::timestamp AS end_at, NULL::uuid AS master_id,
               lp.updated_at AS updated_at,
               NULL::varchar AS regulatory_type, NULL::varchar AS drug_category
        FROM store_local_products lp
        WHERE lp.organization_id = $1${activeLocal}${searchLocal}`;

  const selects: string[] = [];
  if (includeListing) selects.push(listingSelect);
  if (includeLocal) selects.push(localSelect);
  if (selects.length === 0) {
    return { items: [], pagination: { page, limit, total: 0 } };
  }
  const unionSql = selects.join('\n        UNION ALL\n');

  const dataSql = `WITH unified AS (${unionSql})
        SELECT * FROM unified ORDER BY updated_at DESC NULLS LAST
        LIMIT $${baseParams.length + 1} OFFSET $${baseParams.length + 2}`;
  const countSql = `WITH unified AS (${unionSql}) SELECT count(*)::int AS total FROM unified`;

  const [rows, countRes]: [UnifiedRow[], { total: number }[]] = await Promise.all([
    dataSource.query(dataSql, [...baseParams, limit, offset]),
    dataSource.query(countSql, baseParams),
  ]);
  const total = countRes[0]?.total ?? 0;

  const items = rows.map((r) => {
    const isListing = r.source_type === 'listing';
    const cls = deriveProductClassification({ regulatoryType: r.regulatory_type, drugCategory: r.drug_category });
    return {
      sourceType: r.source_type,
      sourceId: r.source_id,
      name: r.name || '(이름 없음)',
      imageUrl: r.image_url || null,
      originLabel: isListing ? 'O4O 기반 제품' : '매장 경영활용 제품',
      ownerLabel: isListing ? '공급/플랫폼' : '내 매장',
      price: r.price != null ? Number(r.price) : null,
      isActive: r.is_active,
      classificationCode: cls.code,
      classificationLabel: cls.label,
      updatedAt: r.updated_at,
      managePath: isListing ? managePaths.listing(r.source_id) : managePaths.local(r.source_id),
      masterId: r.master_id,
    };
  });

  return { items, pagination: { page, limit, total } };
}

const UUID_LOOSE_RE = /^[0-9a-fA-F-]{36}$/;

/**
 * UPDATE/DELETE 의 영향 행 수.
 *
 * TypeORM(postgres)의 `query()` 는 UPDATE·DELETE 에 대해 **`[rows, rowCount]`** 를 돌려준다
 * (PostgresQueryRunner: `case 'DELETE': case 'UPDATE': result.raw = [raw.rows, raw.rowCount]`).
 * RETURNING 을 붙여도 마찬가지라 `result.length` 는 항상 2 다 — 원본 라우트의
 * `del.length === 0` 은 그래서 NOT_FOUND 를 한 번도 감지하지 못했다(잠복 결함).
 * 여기서는 rowCount 로 판정한다. 두 형태(SELECT-유사 배열 / 튜플) 모두 수용한다.
 */
function affectedRows(raw: any): number {
  if (Array.isArray(raw) && Array.isArray(raw[0]) && typeof raw[1] === 'number') return raw[1];
  if (Array.isArray(raw)) return raw.length;
  return 0;
}

export interface HandledProductRef {
  sourceType: HandledProductSourceType;
  sourceId: string;
}

/** 요청 body 의 items 를 검증한다 (원본 라우트와 동일한 규칙). */
export function parseHandledProductRefs(rawItems: unknown): HandledProductRef[] {
  const list = Array.isArray(rawItems) ? rawItems : [];
  return list.filter(
    (it: any) =>
      it &&
      (it.sourceType === 'listing' || it.sourceType === 'local') &&
      typeof it.sourceId === 'string' &&
      UUID_LOOSE_RE.test(it.sourceId),
  ) as HandledProductRef[];
}

export interface RemoveHandledProductsResult {
  removed: number;
  failed: Array<{ sourceType: string; sourceId: string; reason: string }>;
}

/**
 * 선택 제품을 "매장 취급 목록에서 제거"한다 (상품 정보 삭제 아님).
 *   - listing: organization_product_listings 행 삭제(매장↔제품 연결 해제).
 *              ProductMaster / 설명서(SPD) / 이미지 등 원본은 무접촉.
 *   - local  : store_local_products 행 삭제.
 *   - 공통: 제품↔콘텐츠 연결(kpa_store_content_product_links)만 해제. 콘텐츠·QR 자체는 보존.
 */
export async function removeHandledProducts(
  dataSource: DataSource,
  organizationId: string,
  refs: HandledProductRef[],
): Promise<RemoveHandledProductsResult> {
  let removed = 0;
  const failed: RemoveHandledProductsResult['failed'] = [];

  for (const it of refs) {
    try {
      await dataSource.transaction(async (m: EntityManager) => {
        await m.query(
          `DELETE FROM kpa_store_content_product_links
               WHERE organization_id = $1 AND product_source_type = $2 AND product_source_id = $3`,
          [organizationId, it.sourceType, it.sourceId],
        );
        const table = it.sourceType === 'listing' ? 'organization_product_listings' : 'store_local_products';
        const del = await m.query(
          `DELETE FROM ${table} WHERE id = $1 AND organization_id = $2 RETURNING id`,
          [it.sourceId, organizationId],
        );
        if (affectedRows(del) === 0) {
          const e: any = new Error('NOT_FOUND');
          e.code = 'NOT_FOUND';
          throw e;
        }
      });
      removed++;
    } catch (e: any) {
      failed.push({ sourceType: it.sourceType, sourceId: it.sourceId, reason: e?.code || e?.message || 'ERROR' });
    }
  }

  return { removed, failed };
}

/**
 * 취급 제품 활성/비활성 전환.
 *
 * 신규 저장 구조가 아니라 기존 `is_active` 컬럼 토글이다 (listing / local 동일 축).
 * @returns true = 대상 1건 갱신 / false = 현재 매장 소유 행 없음(404)
 */
export async function setHandledProductActive(
  dataSource: DataSource,
  organizationId: string,
  ref: HandledProductRef,
  isActive: boolean,
): Promise<boolean> {
  const table = ref.sourceType === 'listing' ? 'organization_product_listings' : 'store_local_products';
  const raw = await dataSource.query(
    `UPDATE ${table} SET is_active = $1, updated_at = NOW()
      WHERE id = $2 AND organization_id = $3`,
    [isActive, ref.sourceId, organizationId],
  );
  return affectedRows(raw) > 0;
}
