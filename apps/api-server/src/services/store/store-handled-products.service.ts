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
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WO-O4O-STORE-HANDLED-PRODUCTS-CROSS-SERVICE-DEDUPE-CONTRACT-V1
 *
 * 문제
 *   같은 매장(organization)이 같은 공급 offer 를 서로 다른 service_key 로 여러 번 진열해
 *   같은 상품이 목록에 2~3회 반복 노출됐다. 운영 실측(2026-08-19):
 *     (org, master) 그룹 26개 중 25개는 listing 1건, 1개 그룹만 3건이며
 *     그 3건은 organization_id·master_id·offer_id·price(NULL)·status('pending')·
 *     is_active(true) 가 전부 같고 service_key 와 source_type 만 달랐다 → TRUE_DUPLICATE.
 *
 * 왜 service_key 필터로 닫지 않는가
 *   OPL.service_key 는 이 화면의 서비스 축이 아니다. 진열 생성 경로마다 축이 다르다:
 *     - store-product-library : 사용자 membership 에서 도출(MULTI_MEMBERSHIP_PRIORITY 가
 *       neture 우선) → KPA 약국의 실제 취급 제품 20건이 service_key='neture' 로 저장돼 있다.
 *     - event-offer 파생행    : 참여한 이벤트의 서비스로 저장('glycopharm' / 'k-cosmetics').
 *     - auto-listing          : enrollment.service_code 복사.
 *   따라서 "현재 서비스의 canonical key 만 필터"하면 실제 취급 제품 20/23 이 화면에서
 *   사라진다(기능 은폐). Boundary Policy §7 상 Store Ops 의 경계는 organizationId 이고,
 *   이 화면은 매장 단위 제품 풀이므로 **service_key 는 경계가 아니다**.
 *
 * 확정 계약 — HYBRID(제품 중심 1행, 진열 식별자는 대표 행 유지)
 *   동일 항목 판정 키(supply identity) = (organization_id, master_id, offer_id).
 *     - master 가 같아도 offer 가 다르면 공급처·공급조건이 다르므로 **합치지 않는다**
 *       (SERVICE_DISTINCT 보존). offer_id 는 NULL 끼리만 같은 그룹이다.
 *     - master 가 없는 예외 행은 자기 자신만의 그룹이다(id 로 대체).
 *   대표 행 선정(임의 우선순위 금지 — 기존 계약 근거만 사용):
 *     1) is_active DESC          매장이 실제로 진열 중인 행이 우선
 *     2) source_type IS NULL DESC 매장이 명시적으로 등록한 행 우선. 근거: pharmacy-products
 *        controller 가 source_type='event-offer' 를 "주문 후 파생 진열 행" 으로 규정하고
 *        주문 가능 목록에서 제외한다(파생행은 대표가 아니다).
 *     3) created_at ASC, id ASC   결정적 tie-break(페이지네이션 안정).
 *   가격이 낮다는 이유로 대표를 고르지 않는다.
 *
 * 쓰기 경로 정합 (읽기만 합치면 "지웠는데 다시 나타난다")
 *   remove / setActive 는 대표 행 1건이 아니라 **같은 supply identity 그룹 전체**에
 *   적용한다. 매장 관점에서 "이 제품을 내린다/끈다" 는 제품 단위 동작이기 때문이다.
 *   조직 경계(organization_id)는 그대로 유지된다.
 *
 * 미변경
 *   응답 shape·필드·pagination 계약 무변경(total 도 중복 제거 후 기준이라 items 와 일치).
 *   store_local_products(local) 은 master 축이 없어 중복 판정 대상이 아니다 — 무접촉.
 */

import type { DataSource, EntityManager } from 'typeorm';
import { deriveProductClassification } from '../../modules/neture/utils/product-type.util.js';

export type HandledProductSourceType = 'listing' | 'local';

/**
 * 동일 항목(supply identity) 판정 키 — 읽기(dedupe)와 쓰기(group 적용)가 **같은 정의**를 쓴다.
 *   organization_id + master_id(없으면 자기 id) + offer_id(NULL 끼리만 동일 그룹)
 * SQL 파편이지만 사용자 입력을 포함하지 않는 고정 문자열이다(Boundary Policy: binding 대상 아님).
 */
const HANDLED_LISTING_IDENTITY_PARTITION =
  "opl.organization_id, COALESCE(opl.master_id::text, opl.id::text), opl.offer_id";


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

  // 같은 supply identity(= organization_id, master_id, offer_id)의 진열행이 service_key 만
  // 달라 반복 노출되던 것을 대표 1행으로 접는다. 상세 계약·근거는 파일 상단 주석 참조.
  const listingSelect = `
        SELECT source_type, source_id, name, image_url, price, is_active, listing_status,
               start_at, end_at, master_id, updated_at, regulatory_type, drug_category
        FROM (
        SELECT 'listing'::text AS source_type, opl.id AS source_id, pm.name AS name,
               (SELECT pi.image_url FROM product_images pi WHERE pi.master_id = opl.master_id AND pi.deleted_at IS NULL
                 ORDER BY pi.is_primary DESC, pi.sort_order ASC LIMIT 1) AS image_url,
               COALESCE(opl.price, spo.price_general) AS price,
               opl.is_active AS is_active, opl.status AS listing_status,
               opl.start_at AS start_at, opl.end_at AS end_at, opl.master_id AS master_id,
               opl.updated_at AS updated_at,
               pm.regulatory_type AS regulatory_type, pm.drug_category AS drug_category,
               ROW_NUMBER() OVER (
                 PARTITION BY ${HANDLED_LISTING_IDENTITY_PARTITION}
                 ORDER BY opl.is_active DESC, (opl.source_type IS NULL) DESC,
                          opl.created_at ASC, opl.id ASC
               ) AS identity_rank
        FROM organization_product_listings opl
        LEFT JOIN product_masters pm ON pm.id = opl.master_id
        LEFT JOIN supplier_product_offers spo ON spo.id = opl.offer_id
        WHERE opl.organization_id = $1${activeListing}${searchListing}
        ) listing_ranked
        WHERE identity_rank = 1`;

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

/**
 * 참조 진열행과 **같은 supply identity** 인 행 전체(자기 자신 포함)를 반환한다.
 * 판정 키는 조회 dedupe 와 동일하다 — 읽기에서 접힌 형제 행이 쓰기에서 남지 않게 한다.
 * organization_id 경계는 항상 유지한다(Boundary Policy). 대상 없음 = 빈 배열(호출자가 404 처리).
 */
async function resolveListingIdentityGroup(
  m: EntityManager,
  organizationId: string,
  sourceId: string,
): Promise<string[]> {
  const rows: Array<{ id: string }> = await m.query(
    `SELECT sib.id
       FROM organization_product_listings sib
       JOIN organization_product_listings ref
         ON ref.id = $1 AND ref.organization_id = $2
      WHERE sib.organization_id = $2
        AND COALESCE(sib.master_id::text, sib.id::text) = COALESCE(ref.master_id::text, ref.id::text)
        AND sib.offer_id IS NOT DISTINCT FROM ref.offer_id`,
    [sourceId, organizationId],
  );
  return rows.map((r) => r.id);
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
        // listing 은 supply identity 그룹 전체가 대상이다(목록이 그 단위로 접히므로).
        // local 은 중복 판정 축이 없어 기존대로 단건이다.
        const targetIds =
          it.sourceType === 'listing'
            ? await resolveListingIdentityGroup(m, organizationId, it.sourceId)
            : [it.sourceId];
        if (targetIds.length === 0) {
          const e: any = new Error('NOT_FOUND');
          e.code = 'NOT_FOUND';
          throw e;
        }

        await m.query(
          `DELETE FROM kpa_store_content_product_links
               WHERE organization_id = $1 AND product_source_type = $2 AND product_source_id = ANY($3::uuid[])`,
          [organizationId, it.sourceType, targetIds],
        );
        const table = it.sourceType === 'listing' ? 'organization_product_listings' : 'store_local_products';
        const del = await m.query(
          `DELETE FROM ${table} WHERE id = ANY($1::uuid[]) AND organization_id = $2 RETURNING id`,
          [targetIds, organizationId],
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
  if (ref.sourceType === 'listing') {
    // 목록이 supply identity 단위이므로 활성 토글도 그 단위다. 대표 행만 끄면 형제 행이
    // 대표로 승격돼 "껐는데 그대로 켜져 있다"로 보인다.
    return await dataSource.transaction(async (m: EntityManager) => {
      const ids = await resolveListingIdentityGroup(m, organizationId, ref.sourceId);
      if (ids.length === 0) return false;
      const raw = await m.query(
        `UPDATE organization_product_listings SET is_active = $1, updated_at = NOW()
          WHERE id = ANY($2::uuid[]) AND organization_id = $3`,
        [isActive, ids, organizationId],
      );
      return affectedRows(raw) > 0;
    });
  }

  const raw = await dataSource.query(
    `UPDATE store_local_products SET is_active = $1, updated_at = NOW()
      WHERE id = $2 AND organization_id = $3`,
    [isActive, ref.sourceId, organizationId],
  );
  return affectedRows(raw) > 0;
}
