/**
 * Store Public Utils — Shared helpers for unified store public routes
 *
 * WO-O4O-UNIFIED-STORE-PUBLIC-ROUTES-SPLIT-V1
 * Extracted from unified-store-public.routes.ts
 */

// WO-O4O-TRUSTED-CLIENT-IP-AND-SECURITY-LOG-REDACTION-V1
import { getTrustedClientIp } from '../../../utils/trusted-client-ip.js';
import { Request, Response } from 'express';
import { DataSource } from 'typeorm';
import rateLimit from 'express-rate-limit';
import { StoreSlugService } from '@o4o/platform-core/store-identity';
import { resolveCanonicalServiceKey } from '@o4o/security-core';
import { OrganizationStore } from '../../../modules/store-core/entities/organization-store.entity.js';
import { cacheAside, hashCacheKey, READ_CACHE_TTL } from '../../../cache/read-cache.js';
import type { StoreBlock, TemplateProfile } from '../../../modules/store/types/store-template.js';

// ============================================================================
// Service Key Mapping (WO-O4O-STORE-SERVICEKEY-MAPPING-FIX-V1)
// ============================================================================

/**
 * platform_store_slugs.service_key 와 organization_product_listings.service_key 의
 * **canonical alias 불일치**를 보정한다. OPL 조회 시 두 표기를 모두 포함한다.
 *
 *   slug 'kpa'       ↔ listing 'kpa-society'
 *   slug 'cosmetics' ↔ listing 'k-cosmetics'
 *
 * WO-O4O-MY-STORE-RUNTIME-CONTRACT-PRODUCTION-E2E-FINAL-CLOSURE-V1:
 *   이전 구현은 `kpa` 만 하드코딩해 **cosmetics 매장의 자기 상품이 영구 비노출**이었다
 *   (프로덕션 실측: slug `cosmetics` 매장의 listing 이 `k-cosmetics` 로 저장돼
 *    태블릿·화면세트·공개 storefront 전 경로에서 service_scope_mismatch 로 떨어졌다).
 *   새 로컬 맵을 만들지 않고 security-core 의 SSOT
 *   (`ROLE_PREFIX_TO_CANONICAL_SERVICE_KEY` = { kpa: 'kpa-society', cosmetics: 'k-cosmetics' })
 *   에서 파생한다. self-map 서비스(neture · pharmacy-hub)는 `[key]` 그대로다.
 *
 * 게이트를 넓히지 않는다 — `kpa-groupbuy` · `k-cosmetics-event-offer` 같은
 * **다른 축의 파생 키는 포함하지 않는다**(기존 kpa 동작과 동일한 범위).
 */
export function resolveServiceKeys(serviceKey: string): string[] {
  const canonical = resolveCanonicalServiceKey(serviceKey);
  return canonical === serviceKey ? [serviceKey] : [serviceKey, canonical];
}

// ============================================================================
// Slug Resolution Helper
// ============================================================================

export interface ResolvedStore {
  storeId: string;
  serviceKey: string;
  pharmacy: OrganizationStore;
}

export async function resolvePublicStore(
  dataSource: DataSource,
  slug: string,
  req: Request,
  res: Response,
): Promise<ResolvedStore | null> {
  const slugService = new StoreSlugService(dataSource);
  const record = await slugService.findBySlug(slug);

  if (!record || !record.isActive) {
    const redirect = await slugService.findOldSlugRedirect(slug);
    if (redirect) {
      const newPath = req.originalUrl.replace(
        `/${encodeURIComponent(slug)}`,
        `/${encodeURIComponent(redirect.newSlug)}`,
      );
      res.redirect(301, newPath);
      return null;
    }
    res.status(404).json({
      success: false,
      error: { code: 'STORE_NOT_FOUND', message: 'Store not found' },
    });
    return null;
  }

  const orgRepo = dataSource.getRepository(OrganizationStore);
  const pharmacy = await orgRepo.findOne({
    where: { id: record.storeId, isActive: true },
  });

  if (!pharmacy) {
    res.status(404).json({
      success: false,
      error: { code: 'STORE_NOT_FOUND', message: 'Store not found' },
    });
    return null;
  }

  return { storeId: record.storeId, serviceKey: record.serviceKey, pharmacy };
}

// ============================================================================
// B2C Visibility-Gated Product Query (serviceKeys parameterized)
// WO-STORE-MULTI-SERVICE-GRID-V1: serviceKey → serviceKeys[]
// ============================================================================

export async function queryVisibleProducts(
  dataSource: DataSource,
  pharmacyId: string,
  serviceKeys: string[],
  options: {
    category?: string;
    q?: string;
    sort?: string;
    order?: string;
    page?: number;
    limit?: number;
    isFeatured?: boolean;
    productId?: string;
  } = {},
): Promise<{ data: any[]; meta: { page: number; limit: number; total: number; totalPages: number } }> {
  // WO-O4O-GA-PRELAUNCH-VERIFICATION-V1: SHA1 hash key (collision-safe)
  const ck = hashCacheKey(`sf:${pharmacyId}`, {
    sk: serviceKeys.sort().join(','),
    p: options.page || 1,
    l: options.limit || 20,
    cat: options.category,
    q: options.q,
    s: options.sort,
    o: options.order,
    f: options.isFeatured,
    pid: options.productId,
  });

  return cacheAside(ck, READ_CACHE_TTL.STOREFRONT, async () => {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: any[] = [pharmacyId, serviceKeys];
    let paramIdx = 3;

    if (options.category) {
      conditions.push(`pm.brand_name = $${paramIdx}`);
      params.push(options.category);
      paramIdx++;
    }
    if (options.q && options.q.length >= 2) {
      conditions.push(`(pm.name ILIKE $${paramIdx})`);
      params.push(`%${options.q}%`);
      paramIdx++;
    }
    if (options.isFeatured !== undefined) {
      // is_featured not applicable in v2 — filter ignored
    }
    if (options.productId) {
      conditions.push(`spo.id = $${paramIdx}`);
      params.push(options.productId);
      paramIdx++;
    }

    const whereExtra = conditions.length > 0 ? 'AND ' + conditions.join(' AND ') : '';

    const sortMap: Record<string, string> = {
      created_at: 'spo.created_at',
      name: 'pm.name',
      price: 'spo.price_general',
      sort_order: 'opl.created_at',
    };
    const sortField = sortMap[options.sort || 'created_at'] || 'spo.created_at';
    const sortOrder = options.order?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const countResult: Array<{ count: string }> = await dataSource.query(
      `SELECT COUNT(DISTINCT spo.id)::int AS count
       FROM supplier_product_offers spo
       JOIN product_masters pm ON pm.id = spo.master_id
       JOIN neture_suppliers s ON s.id = spo.supplier_id
       INNER JOIN organization_product_listings opl
         ON opl.offer_id = spo.id
         AND opl.organization_id = $1
         AND opl.service_key = ANY($2::text[])
         AND opl.is_active = true
       INNER JOIN organization_product_channels opc
         ON opc.product_listing_id = opl.id
         AND opc.is_active = true
       INNER JOIN organization_channels oc
         ON oc.id = opc.channel_id
         AND oc.channel_type = 'B2C'
         AND oc.status = 'APPROVED'
       WHERE spo.is_active = true
         AND s.status = 'ACTIVE'
         ${whereExtra}`,
      params,
    );
    const total = Number(countResult[0]?.count || 0);

    const data = await dataSource.query(
      `SELECT DISTINCT ON (spo.id)
         spo.id, pm.name AS name,
         '' AS sku, pm.brand_name AS category,
         spo.price_general AS price, NULL::int AS sale_price,
         '[]'::jsonb AS images,
         CASE WHEN spo.is_active THEN 'active' ELSE 'inactive' END AS status,
         false AS is_featured,
         s.slug AS manufacturer,
         -- WO-O4O-KPA-STOREFRONT-DESCRIPTION-LINK-V1 / -STORE-PROFILE-OVERRIDE-POLICY-ALIGNMENT-V1:
         -- O4O 공용 대표(canonical) 설명을 우선 노출. 기존 store_product_profiles override(sp.description,
         -- 편집 UI = PATCH /api/v1/store/products/:id/description)는 삭제하지 않고 canonical 아래
         -- legacy fallback 으로 격하(데이터 보존, 비회귀, 매장 override 정책 격하).
         -- KPA storefront 는 ContentRenderer(HTML) 렌더 → 태그 보존(GP plain-text 와 달리 strip 안 함).
         COALESCE(spd.content, sp.description, spo.consumer_detail_description, '') AS description,
         COALESCE(spd.summary, spo.consumer_short_description, '') AS short_description,
         opl.created_at AS sort_order,
         spo.created_at, spo.updated_at,
         opl.organization_id AS pharmacy_id,
         opc.sales_limit
       FROM supplier_product_offers spo
       JOIN product_masters pm ON pm.id = spo.master_id
       JOIN neture_suppliers s ON s.id = spo.supplier_id
       INNER JOIN organization_product_listings opl
         ON opl.offer_id = spo.id
         AND opl.organization_id = $1
         AND opl.service_key = ANY($2::text[])
         AND opl.is_active = true
       INNER JOIN organization_product_channels opc
         ON opc.product_listing_id = opl.id
         AND opc.is_active = true
       INNER JOIN organization_channels oc
         ON oc.id = opc.channel_id
         AND oc.channel_type = 'B2C'
         AND oc.status = 'APPROVED'
       LEFT JOIN store_product_profiles sp
         ON sp.master_id = pm.id
         AND sp.organization_id = opl.organization_id
         AND sp.is_active = true
       -- WO-O4O-STORE-MULTILINGUAL-CANONICAL-DESCRIPTION-V1: canonical 이 언어별 다수 가능해짐 →
       -- LATERAL + ko 우선(없으면 최신) LIMIT 1 로 master 당 1행 보장(공개 목록 행 증식 방지, 비회귀).
       LEFT JOIN LATERAL (
         SELECT d.content, d.summary
           FROM shared_product_descriptions d
          WHERE d.master_id = pm.id
            AND d.status = 'canonical'
            AND d.description_type = 'STORE'
            AND d.deleted_at IS NULL
          ORDER BY (d.language = 'ko') DESC, d.updated_at DESC
          LIMIT 1
       ) spd ON true
       WHERE spo.is_active = true
         AND s.status = 'ACTIVE'
         ${whereExtra}
       ORDER BY spo.id, ${sortField} ${sortOrder}
       LIMIT ${limit} OFFSET ${offset}`,
      params,
    );

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  });
}

// ============================================================================
// WO-O4O-KPA-TABLET-INLINE-MULTILINGUAL-DESCRIPTION-BRIDGE-V1
//   진열 선택 콘텐츠(kpa_store_contents.content_json)에 저장된 다국어 번역을
//   태블릿 공개 화면으로 실어보낼 때, **게시 가능(검수 완료) 번역만** 통과시킨다.
//   - 노출 기준 = 검수 상태(status). 누가/무엇으로 번역했는지는 구분하지 않는다.
//   - draft/pending/미검수/자동생성 직후 번역은 숨긴다(고객 화면 유출 방지).
//   - status/model 등 내부 필드는 벗겨 { locale: { title, html } } 만 전달한다.
//   translations 자체가 없거나 게시가능 항목이 0개면 null 반환 → 프론트는 언어 버튼 미표시.
// ============================================================================

const PUBLISHABLE_TRANSLATION_STATUSES = new Set(['ready', 'published']);

export function sanitizePublishableTranslations(
  raw: unknown,
): Record<string, { title?: string; html: string }> | null {
  if (!raw || typeof raw !== 'object') return null;
  const out: Record<string, { title?: string; html: string }> = {};
  for (const [locale, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!value || typeof value !== 'object') continue;
    const v = value as Record<string, unknown>;
    if (typeof v.status !== 'string' || !PUBLISHABLE_TRANSLATION_STATUSES.has(v.status)) continue;
    const html = typeof v.html === 'string' ? v.html : '';
    if (!html.trim()) continue;
    out[locale] = { html, ...(typeof v.title === 'string' ? { title: v.title } : {}) };
  }
  return Object.keys(out).length > 0 ? out : null;
}

// ============================================================================
// WO-O4O-KPA-TABLET-PUBLIC-DISPLAY-SOURCE-ALIGNMENT-V1
//   공개 태블릿 상품 집합의 권위 = 매장 first active tablet 의 visible display rows.
//   - configured: first active tablet 이 있고 visible display row 가 1개 이상 → 그 rows 로 집합/순서 제한.
//   - legacy_fallback: active tablet 없음 또는 visible row 0 → 기존 legacy 집합(supplier=TABLET gate, local=active 전체).
//   device pairing 없는 V1 이므로 공개 URL 은 first active tablet 기준(관리 화면에 안내).
// ============================================================================

/**
 * WO-O4O-KPA-TABLET-GENERATION-CONSOLIDATION-AND-CANONICAL-REFERENCE-V1 §4 — `first_active` 존치 판정
 *
 * 판정: **존치**(제거 불가). 근거는 추정이 아니라 프로덕션 실측(2026-09-08)이다.
 *
 *   ① 공개 kiosk URL `/{slug}/tablet*` 은 `?tabletId=` 없이 열리는 경로가 정상 사용이다
 *      (device pairing 부재 — 태블릿이 자기 id 를 모른다). 이 fallback 을 없애면
 *      products·idle·screen 세 endpoint 가 모두 태블릿을 못 고르고 빈 화면이 된다.
 *   ② 조직별 active 태블릿 수 실측:
 *        e3d14288… 3대(전부 active) · 9c87f46b… 2대 active · 68e1291f… 0대
 *      → 다태블릿 매장에서 `ORDER BY created_at ASC LIMIT 1` 은 **가장 오래된 1대로 고정**된다.
 *        즉 fallback 은 "임의"가 아니라 결정적이지만, 코너별 화면을 구분하지는 못한다.
 *   ③ QR 공개 URL 은 이 fallback 에 의존하지 않는다 — screen set 의 `public_qr_slug`
 *      (active set 15개 전부 보유 · `store_qr_codes.landing_type='screen_set'` 39건)로
 *      **세트 자체를 직접 지목**한다. 따라서 QR 축은 §4 판정의 영향을 받지 않는다.
 *
 * 결론: 코너별 정확도가 필요한 경로는 이미 `?tabletId=`(북마크) 와 screen-set QR 이 담당한다.
 *       `first_active` 는 그 둘이 없을 때의 **매장 단위 기본 태블릿** 계약으로 유지한다.
 *       device pairing 이 도입되면 이 함수 하나만 교체하면 된다(호출부 3곳 모두 이 함수 경유).
 *       응답의 `tabletSource` 필드가 어느 경로로 결정됐는지를 이미 노출한다.
 */
export async function resolveTabletDisplaySource(
  dataSource: DataSource,
  organizationId: string,
  // WO-O4O-KPA-TABLET-CORNER-IDLE-YOUTUBE-VIMEO-AUTO-RETURN-V1:
  //   코너별 태블릿 지정(크롬 북마크용). requestedTabletId 가 이 매장의 active tablet 이면 그 태블릿,
  //   아니면 first active 로 안전 fallback. products/idle 가 같은 기준을 쓰도록 공용화.
  requestedTabletId?: string | null,
): Promise<{ tabletId: string | null; configured: boolean; source: 'query' | 'first_active' | 'none' }> {
  let tabletId: string | null = null;
  let source: 'query' | 'first_active' | 'none' = 'none';

  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (requestedTabletId && uuidRe.test(requestedTabletId)) {
    const q = await dataSource.query(
      `SELECT id FROM store_tablets
       WHERE id = $1 AND organization_id = $2 AND is_active = true
       LIMIT 1`,
      [requestedTabletId, organizationId],
    );
    if (q?.[0]?.id) {
      tabletId = q[0].id;
      source = 'query';
    }
  }

  if (!tabletId) {
    const rows = await dataSource.query(
      `SELECT id FROM store_tablets
       WHERE organization_id = $1 AND is_active = true
       ORDER BY created_at ASC LIMIT 1`,
      [organizationId],
    );
    tabletId = rows?.[0]?.id ?? null;
    if (tabletId) source = 'first_active';
  }

  if (!tabletId) return { tabletId: null, configured: false, source: 'none' };
  const cnt = await dataSource.query(
    `SELECT COUNT(*)::int AS c FROM store_tablet_displays
     WHERE tablet_id = $1 AND is_visible = true`,
    [tabletId],
  );
  return { tabletId, configured: Number(cnt?.[0]?.c || 0) > 0, source };
}

// ============================================================================
// TABLET Visibility-Gated Product Query (serviceKey parameterized)
// ============================================================================

export async function queryTabletVisibleProducts(
  dataSource: DataSource,
  pharmacyId: string,
  // WO-O4O-KPA-TABLET-SUPPLIER-PRODUCT-SERVICEKEY-ALIGNMENT-V1:
  //   slug service_key('kpa')와 OPL service_key('kpa-society' 등)가 다를 수 있어,
  //   B2C 형제 쿼리(queryVisibleProducts)와 동일하게 serviceKey 배열 + ANY($2::text[]) 로 정합.
  //   단일키 서비스(neture/cosmetics)는 [key] 이므로 ANY([key]) == (= key) 로 동작 불변.
  serviceKeys: string[],
  options: {
    category?: string;
    q?: string;
    sort?: string;
    order?: string;
    page?: number;
    limit?: number;
    // WO-O4O-KPA-TABLET-PUBLIC-DISPLAY-SOURCE-ALIGNMENT-V1: first active tablet 진열 정합.
    //   firstTabletId 가 있으면 그 태블릿의 visible display row 로 content attach.
    //   configured=true 면 그 rows 로 상품 집합/순서까지 제한(없으면 legacy).
    firstTabletId?: string | null;
    configured?: boolean;
  } = {},
): Promise<{ data: any[]; meta: { page: number; limit: number; total: number; totalPages: number } }> {
  // WO-O4O-GA-PRELAUNCH-VERIFICATION-V1: SHA1 hash key (collision-safe)
  const ck = hashCacheKey(`sf:tablet:${pharmacyId}`, {
    sk: serviceKeys.slice().sort().join(','),
    p: options.page || 1,
    l: options.limit || 20,
    cat: options.category,
    q: options.q,
    s: options.sort,
    o: options.order,
    // 진열 정합 상태를 키에 포함 → 태블릿 구성 변경 시 캐시 분리
    ft: options.firstTabletId || null,
    cfg: options.configured ? 1 : 0,
  });

  return cacheAside(ck, READ_CACHE_TTL.STOREFRONT, async () => {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    // WO-O4O-KPA-TABLET-SUPPLIER-PRODUCT-SERVICEKEY-ALIGNMENT-V1:
    //   $2 = serviceKeys text[] (ANY 매칭). count/data 공통 base params 로 사용.
    const params: any[] = [pharmacyId, serviceKeys];
    let paramIdx = 3;

    if (options.category) {
      conditions.push(`pm.brand_name = $${paramIdx}`);
      params.push(options.category);
      paramIdx++;
    }
    if (options.q && options.q.length >= 2) {
      conditions.push(`(pm.name ILIKE $${paramIdx})`);
      params.push(`%${options.q}%`);
      paramIdx++;
    }

    const whereExtra = conditions.length > 0 ? 'AND ' + conditions.join(' AND ') : '';

    const sortMap: Record<string, string> = {
      created_at: 'spo.created_at',
      name: 'pm.name',
      price: 'spo.price_general',
      sort_order: 'opl.created_at',
    };
    const sortField = sortMap[options.sort || 'sort_order'] || 'opl.created_at';
    const sortOrder = options.order?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    // WO-O4O-KPA-TABLET-PUBLIC-DISPLAY-SOURCE-ALIGNMENT-V1:
    //   first active tablet 이 있으면 그 태블릿의 visible display row(supplier)로 content attach.
    //   configured 면 그 rows 로 상품 집합/순서까지 제한. 없으면 legacy(TABLET gate 전체).
    const hasTablet = !!options.firstTabletId;
    const configured = hasTablet && !!options.configured;
    // firstTabletId 를 참조할 파라미터 위치($N). count/data 각각 참조 시에만 append 한다
    // (참조하지 않는 쿼리에 여분 파라미터를 넘기면 Postgres 가 개수 불일치로 실패한다).
    const ftIdx = params.length + 1;
    // count: configured 면 visible display supplier row 로 제한(INNER), 아니면 legacy.
    const countDispJoin = configured
      ? `INNER JOIN store_tablet_displays cdisp
           ON cdisp.product_id = opl.id AND cdisp.product_type = 'supplier'
           AND cdisp.tablet_id = $${ftIdx} AND cdisp.is_visible = true`
      : '';
    const countParams = configured ? [...params, options.firstTabletId] : params;

    const countResult: Array<{ count: string }> = await dataSource.query(
      `SELECT COUNT(DISTINCT spo.id)::int AS count
       FROM supplier_product_offers spo
       JOIN product_masters pm ON pm.id = spo.master_id
       JOIN neture_suppliers s ON s.id = spo.supplier_id
       INNER JOIN organization_product_listings opl
         ON opl.offer_id = spo.id
         AND opl.organization_id = $1
         AND opl.service_key = ANY($2::text[])
         AND opl.is_active = true
       INNER JOIN organization_product_channels opc
         ON opc.product_listing_id = opl.id
         AND opc.is_active = true
       INNER JOIN organization_channels oc
         ON oc.id = opc.channel_id
         AND oc.channel_type = 'TABLET'
         AND oc.status = 'APPROVED'
       ${countDispJoin}
       WHERE spo.is_active = true
         AND s.status = 'ACTIVE'
         ${whereExtra}`,
      countParams,
    );
    const total = Number(countResult[0]?.count || 0);

    // WO-O4O-KPA-TABLET-PUBLIC-DISPLAY-SOURCE-ALIGNMENT-V1: content attach 와 상품 집합/순서를
    //   first active tablet 의 visible display row(disp)로 정합. hasTablet 이 아니면 legacy(콘텐츠 attach 없음).
    const contentSelect = hasTablet
      ? `tc.id AS "selectedContentId",
         tc.title AS "selectedContentTitle",
         COALESCE(tc.content_json->>'html', tc.content_json->>'body', '') AS "selectedContentHtml",
         tc.content_json->'translations' AS "selectedContentTranslationsRaw",
         disp.sort_order AS display_sort_order`
      : `NULL AS "selectedContentId",
         NULL AS "selectedContentTitle",
         '' AS "selectedContentHtml",
         NULL AS "selectedContentTranslationsRaw",
         NULL::int AS display_sort_order`;
    // WO-O4O-KPA-TABLET-GENERATION-CONSOLIDATION-AND-CANONICAL-REFERENCE-V1 §5 — 1순위 단일화
    //
    //   정본(O4O-STORE-CONTENT-AND-EXECUTION-MODEL-V1 §2) 1순위는
    //   "매장이 **해당 상품에** 명시적으로 연결한 내 매장 콘텐츠" 다. 그 연결의 원장은
    //   `kpa_store_content_product_links`(organization × content × product) 이다.
    //
    //   기존 구현은 그 링크를 **1세대 진열 컬럼 `disp.content_id` 를 경유해서만** 찾았다
    //   (`scl.content_id = disp.content_id`). 프로덕션 실측(2026-09-08):
    //     store_tablet_displays.content_id 채워진 행 = 0 / 6
    //   → 1순위가 **구조적으로 발화 불가능**했고, 사실상 2순위(SPD)부터 시작하고 있었다.
    //
    //   여기서는 링크 원장을 **직접** 1순위 근거로 삼는다. `disp.content_id` 는 값이 있을 때
    //   우선하도록 정렬 키로만 남긴다(과거 데이터 호환 — 진열에 붙인 콘텐츠가 있으면 그것이 먼저).
    //   LATERAL + LIMIT 1 로 링크 다중 시 행 증식·비결정성을 막는다(SPD 조인과 동일 패턴).
    const dispJoins = hasTablet
      ? `LEFT JOIN store_tablet_displays disp
           ON disp.product_id = opl.id AND disp.product_type = 'supplier'
           AND disp.tablet_id = $${ftIdx} AND disp.is_visible = true
         LEFT JOIN LATERAL (
           SELECT c.id, c.title, c.content_json
             FROM kpa_store_content_product_links l
             JOIN kpa_store_contents c
               ON c.id = l.content_id AND c.organization_id = $1
            WHERE l.organization_id = $1
              AND l.link_type = 'product_description'
              AND l.product_source_type = 'listing'
              AND l.product_source_id = opl.id
            ORDER BY (l.content_id = disp.content_id) DESC, c.updated_at DESC
            LIMIT 1
         ) tc ON true`
      : '';
    // configured: visible display row 있는 supplier 만(집합 제한) + 편성 순서(disp.sort_order).
    const configuredFilter = configured ? 'AND disp.id IS NOT NULL' : '';
    const secondaryOrder = configured ? 'disp.sort_order ASC NULLS LAST' : `${sortField} ${sortOrder}`;
    // data 쿼리는 hasTablet 이면 disp 조인($ftIdx)을 쓰므로 firstTabletId append.
    const dataParams = hasTablet ? [...params, options.firstTabletId] : params;

    const data = await dataSource.query(
      `SELECT DISTINCT ON (spo.id)
         spo.id, pm.name AS name,
         '' AS sku, pm.brand_name AS category,
         -- WO-O4O-TABLET-PRODUCT-TEXT-BUTTON-NO-IMAGE-V1: 규격·수량·제형·포장 (텍스트 버튼 2행). additive, migration 불필요.
         pm.specification AS specification,
         spo.price_general AS price, NULL::int AS sale_price,
         '[]'::jsonb AS images,
         CASE WHEN spo.is_active THEN 'active' ELSE 'inactive' END AS status,
         false AS is_featured,
         s.slug AS manufacturer,
         -- WO-O4O-KPA-TABLET-DESCRIPTION-CANONICAL-LINK-V1: storefront 와 동일 정책 — canonical 우선,
         -- store_product_profiles override(sp.description)는 legacy fallback 으로 보존(데이터 무삭제).
         COALESCE(spd.content, sp.description, spo.consumer_detail_description, '') AS description,
         COALESCE(spd.summary, spo.consumer_short_description, '') AS short_description,
         ${contentSelect},
         -- WO-O4O-SCREEN-SET-CORNER-CONTENT-FREE-AUTHORING-AND-LLM-ASSIST-V1:
         -- Screen Set product_list 의 명시 선택(config.products[].productId = organization_product_listings.id)과
         -- 대조하기 위한 listing id. additive select — 기존 소비처는 이 필드를 읽지 않으므로 영향 없음.
         opl.id AS "listingId",
         opl.created_at AS sort_order,
         spo.created_at, spo.updated_at,
         opl.organization_id AS pharmacy_id
       FROM supplier_product_offers spo
       JOIN product_masters pm ON pm.id = spo.master_id
       JOIN neture_suppliers s ON s.id = spo.supplier_id
       INNER JOIN organization_product_listings opl
         ON opl.offer_id = spo.id
         AND opl.organization_id = $1
         AND opl.service_key = ANY($2::text[])
         AND opl.is_active = true
       INNER JOIN organization_product_channels opc
         ON opc.product_listing_id = opl.id
         AND opc.is_active = true
       INNER JOIN organization_channels oc
         ON oc.id = opc.channel_id
         AND oc.channel_type = 'TABLET'
         AND oc.status = 'APPROVED'
       LEFT JOIN store_product_profiles sp
         ON sp.master_id = pm.id
         AND sp.organization_id = opl.organization_id
         AND sp.is_active = true
       -- WO-O4O-STORE-MULTILINGUAL-CANONICAL-DESCRIPTION-V1: canonical 언어별 다수 가능 →
       -- LATERAL + ko 우선(없으면 최신) LIMIT 1 로 master 당 1행 보장(태블릿 목록 행 증식 방지).
       LEFT JOIN LATERAL (
         SELECT d.content, d.summary
           FROM shared_product_descriptions d
          WHERE d.master_id = pm.id
            AND d.status = 'canonical'
            AND d.description_type = 'STORE'
            AND d.deleted_at IS NULL
          ORDER BY (d.language = 'ko') DESC, d.updated_at DESC
          LIMIT 1
       ) spd ON true
       ${dispJoins}
       WHERE spo.is_active = true
         AND s.status = 'ACTIVE'
         ${whereExtra}
         ${configuredFilter}
       ORDER by spo.id, ${secondaryOrder}
       LIMIT ${limit} OFFSET ${offset}`,
      dataParams,
    );

    // WO-O4O-KPA-TABLET-PUBLIC-DISPLAY-SOURCE-ALIGNMENT-V1:
    //   configured 면 편성 순서(disp.sort_order)로 정렬. DISTINCT ON 은 spo.id 선두라 여기서 재정렬.
    if (configured) {
      data.sort((a: any, b: any) => (a.display_sort_order ?? 0) - (b.display_sort_order ?? 0));
    }

    // WO-O4O-KPA-TABLET-INLINE-MULTILINGUAL-DESCRIPTION-BRIDGE-V1:
    //   선택 콘텐츠 번역을 게시 가능(검수 완료) locale 만 남기고 status/model 은 제거.
    for (const row of data) {
      row.selectedContentTranslations = sanitizePublishableTranslations(row.selectedContentTranslationsRaw);
      delete row.selectedContentTranslationsRaw;
      delete row.display_sort_order;
    }

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  });
}

// ============================================================================
// Layout: Template Profile → Default Blocks
// ============================================================================

export function generateDefaultBlocks(profile: TemplateProfile): StoreBlock[] {
  switch (profile) {
    case 'COMMERCE_FOCUS':
      return [
        { type: 'HERO', enabled: true },
        { type: 'PRODUCT_GRID', enabled: true, config: { limit: 4 } },
        { type: 'BLOG_LIST', enabled: true, config: { limit: 3 } },
      ];
    case 'CONTENT_FOCUS':
      return [
        { type: 'HERO', enabled: true },
        { type: 'BLOG_LIST', enabled: true, config: { limit: 3 } },
        { type: 'INFO_SECTION', enabled: true },
        { type: 'PRODUCT_GRID', enabled: true, config: { limit: 4 } },
      ];
    case 'MINIMAL':
      return [
        { type: 'HERO', enabled: true },
        { type: 'PRODUCT_GRID', enabled: true, config: { limit: 4 } },
      ];
    case 'BASIC':
    default:
      return [
        { type: 'HERO', enabled: true },
        { type: 'PRODUCT_GRID', enabled: true, config: { limit: 4 } },
        { type: 'BLOG_LIST', enabled: true, config: { limit: 3 } },
        { type: 'TABLET_PROMO', enabled: true },
      ];
  }
}

export async function deriveChannels(
  dataSource: DataSource,
  organizationId: string,
): Promise<{ B2C: boolean; TABLET: boolean; SIGNAGE: boolean }> {
  const rows: Array<{ channel_type: string }> = await dataSource.query(
    `SELECT channel_type FROM organization_channels WHERE organization_id = $1 AND status = 'APPROVED'`,
    [organizationId],
  );
  const approved = new Set(rows.map((r) => r.channel_type));
  return {
    B2C: approved.has('B2C'),
    TABLET: approved.has('TABLET'),
    SIGNAGE: approved.has('SIGNAGE'),
  };
}

// ============================================================================
// Rate limiter for tablet requests
// ============================================================================

export const tabletRequestLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    error: { code: 'RATE_LIMIT_EXCEEDED', message: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
  },
  standardHeaders: true,
  legacyHeaders: false,
  // WO-O4O-TRUSTED-CLIENT-IP-AND-SECURITY-LOG-REDACTION-V1:
  //   XFF 첫 값 직접 파싱 금지 — 클라이언트가 주입 가능해 rate-limit 우회에 쓰인다.
  keyGenerator: (req: any) => getTrustedClientIp(req),
});
