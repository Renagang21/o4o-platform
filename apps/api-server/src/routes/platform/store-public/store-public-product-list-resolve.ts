/**
 * product_list canonical resolver — Screen Set 상품 집합의 **단일 진입점**
 *
 * WO-O4O-TABLET-PRODUCT-LIST-CONTRACT-AND-OPERATION-CORE-KPA-ADOPTION-V1 §2·§3
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 왜 만들었나 — 같은 Screen Set 이 경로마다 다른 상품을 보여줬다
 *
 *   프로덕션 실측(2026-09-08, 세트 `피부관리 기본 화면 세트`):
 *     preview  0건   (명시 선택 없으면 섹션 자체를 생략)
 *     tablet   3건   (코너 진열 tier — 게다가 supplier 만 섹션에 실리고 local 은 별도 endpoint)
 *     QR       0건   (명시 선택만 — 코너 진열을 보지 못함)
 *
 *   원인은 tier ① (명시 선택)이 아니라 **① 이 비었을 때의 처리**가 세 경로에 따로 있었던 것이다.
 *   이 파일은 그 분기를 하나로 모은다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * canonical 계약 (3단) — 세 경로가 **같은 순서로 같은 집합**을 얻는다
 *
 *   ① 명시 선택(config.products)   → 저장된 목록·순서          selectionMode='selected'
 *   ② 코너 확정 + 진열 있음         → store_tablet_displays 순서 selectionMode='corner_display'
 *   ③ 그 외                         → 상품 없음                 selectionMode='none'
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 암묵적 "매장 전체" fallback 폐기 (WO-O4O-PHARMACYHUB-...-PUBLIC-KIOSK-CLOSURE-V1 §2)
 *
 *   직전 회차는 진열 0행 코너를 `corner_legacy_all`(그 코너의 매장 전체 집합)로 두어
 *   드리프트만 없앴다. 이번 회차에서 그 단을 **폐기**한다. 확정 근거:
 *
 *     진열 0행 ≠ "매장 전체 상품을 보여달라" 는 의사표시
 *     진열 0행 = 이 코너에 명시적으로 선택된 상품이 없음
 *
 *   빈 설정을 암묵적으로 전체 상품으로 해석하면 preview/tablet/QR 에 숨은 fallback 이 다시 생긴다.
 *   현재 문제의 상당 부분이 그런 과거 fallback 에서 나왔다.
 *   "매장 전체" 가 실제로 필요해지면 **명시적 selection mode**(예: `all_products`)로만 표현한다 —
 *   지금은 필요성이 확인되지 않아 신설하지 않는다.
 *
 *   `WO-O4O-KPA-STORE-QR-SCREENSET-STATE-ALIGNMENT-V1` §5 가 막은 유입은 그대로 막힌다:
 *     - 미적용 세트의 QR → 코너 미확정 → ③ 상품 0건
 *     - 다른 코너의 상품 → 코너별 진열/문맥으로만 해석
 *
 *   ⚠️ 공개 `/tablet/products` 는 **Screen Set 이전 세대**(세트 미적용 태블릿·KCos/GP kiosk)의
 *      계약이라 이 폐기 대상이 아니다. 여기서 정하는 것은 **Screen Set product_list 계약**이다.
 *
 *   ②의 코너는 세 경로가 **같은 방식**으로 도출한다(`resolveScreenSetAppliedTablet`):
 *     - tablet runtime : URL 의 tabletId · 없으면 first_active (기존 계약 유지)
 *     - QR / preview   : 이 세트를 적용 중인 태블릿 **역참조**(정확히 1대일 때만)
 *
 *   ②는 "매장 전체 상품" 이 아니라 **그 코너에 진열된 상품**이다.
 *   `WO-O4O-KPA-STORE-QR-SCREENSET-STATE-ALIGNMENT-V1` §5 가 금지한 것은 매장 전체 폴백이며,
 *   코너 진열로 좁히는 것은 그 금지의 취지(코너 무관 상품 유입 0)와 일치한다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ②의 집합·순서는 공개 `/tablet/products` 와 **동일해야 한다**(kiosk 회귀 0).
 *   그 endpoint 는 supplier(4중 게이트 + configured) 와 local 을 각각 `disp.sort_order` 로 정렬해
 *   응답하고, kiosk 가 `[...suppliers, ...locals]` 로 병합한다.
 *   → 여기서도 **supplier 먼저, 그다음 local**, 각각 진열 순서로 만든다.
 *
 * read-only(SELECT 전용) — 공개 경로 DB write 0 계약 유지.
 */
import type { DataSource } from 'typeorm';
import { queryTabletVisibleProducts, resolveServiceKeys, sanitizePublishableTranslations } from './store-public-utils.js';

export type ProductListSelectionMode = 'selected' | 'corner_display' | 'none';

/**
 * 소비처가 "서버가 이미 상품을 확정했는가" 를 판정하는 단일 술어.
 *
 * `'none'` 도 **서버가 확정한 결과(0건)** 다 — 소비처가 자체 조회로 되돌아가면
 * 폐기한 암묵적 fallback 이 클라이언트 쪽에서 되살아난다.
 * 자체 조회는 product_list 섹션 자체가 없을 때(=세트 미적용 legacy 태블릿)로만 남는다.
 */
export function isServerResolvedProductList(mode: unknown): boolean {
  return mode === 'selected' || mode === 'corner_display' || mode === 'none';
}

export interface ProductListSectionData extends Record<string, unknown> {
  products: any[];
  /** 이 목록이 3단 중 어느 단에서 왔는지. 소비처(kiosk/뷰어)가 자체 조회 여부를 이걸로 정한다. */
  selectionMode: ProductListSelectionMode;
  localProductsEndpoint: string | null;
  /** ① 에서 저장된 선택 수(②·③ 은 0). */
  selectedCount: number;
  /** 노출 게이트에서 제외돼 화면에 나오지 않는 수. */
  excludedCount: number;
}

export interface ProductListResolveContext {
  organizationId: string;
  storeId: string;
  serviceKey: string;
  storeSlug: string | null;
}

/** ②의 코너 문맥. tabletId 는 "이 세트를 실제로 실행 중인 태블릿". */
export interface ScreenSetTabletContext {
  tabletId: string;
  /** 가시 진열행 존재 여부. false 면 진열이 비어 있어 ② 가 성립하지 않는다. */
  configured: boolean;
}

export const EMPTY_PRODUCT_LIST_SECTION: ProductListSectionData = {
  products: [],
  selectionMode: 'none',
  localProductsEndpoint: null,
  selectedCount: 0,
  excludedCount: 0,
};

/**
 * 이 Screen Set 을 적용 중인 태블릿을 역참조한다 — QR·preview 가 tablet runtime 과 같은 코너를 보게 하는 축.
 *
 * **정확히 1대**일 때만 문맥을 만든다.
 *   0대  → 적용된 코너가 없다(아직 어디에도 안 붙었거나 해제됨) → ③
 *   2대+ → 어느 코너 기준인지 결정 불가 → ③ (임의로 한 대를 고르지 않는다)
 * 이 규칙은 결정적이며 매장 전체 상품으로 번지지 않는다.
 */
export async function resolveScreenSetAppliedTablet(
  dataSource: DataSource,
  screenSetId: string,
  organizationId: string,
): Promise<ScreenSetTabletContext | null> {
  const rows = await dataSource.query(
    `SELECT t.id,
            (SELECT COUNT(*)::int FROM store_tablet_displays d
              WHERE d.tablet_id = t.id AND d.is_visible = true) AS "visibleDisplays"
       FROM store_tablets t
      WHERE t.current_screen_set_id = $1
        AND t.organization_id = $2
        AND t.is_active = true
      LIMIT 2`,
    [screenSetId, organizationId],
  );
  if (!Array.isArray(rows) || rows.length !== 1) return null;
  return { tabletId: String(rows[0].id), configured: Number(rows[0].visibleDisplays || 0) > 0 };
}

/**
 * ② 코너 진열 상품 — supplier(게이트 통과분) + local, **진열 순서**.
 *
 * 진열(`store_tablet_displays`)에 있는 것만 담는다. 진열이 비면 호출부가 ③(0건)으로 간다 —
 * 이 함수는 "매장 전체" 를 만들 수 있는 경로를 갖지 않는다(암묵적 fallback 구조적 차단).
 *
 * 공개 `/tablet/products` 의 configured 분기와 **같은 소스·필터·정렬**을 쓰고,
 * 병합 순서도 kiosk 와 동일하게 **supplier → local**.
 */
export async function resolveCornerProducts(
  dataSource: DataSource,
  ctx: ProductListResolveContext,
  tabletId: string,
): Promise<any[]> {
  // supplier — 기존 공개 목록 쿼리 그대로(4중 가시성 게이트 · configured 진열 제한 · disp.sort_order).
  const supplierResult: any = await queryTabletVisibleProducts(
    dataSource,
    ctx.storeId,
    resolveServiceKeys(ctx.serviceKey),
    { page: 1, limit: 50, sort: 'sort_order', order: 'asc', firstTabletId: tabletId, configured: true },
  );
  const suppliers = supplierResult?.data ?? [];

  // local — 공개 endpoint 의 local 분기와 동일한 SELECT·JOIN·필터·정렬.
  //   1순위 콘텐츠 링크는 링크 원장 직접 조회(WO-...-CANONICAL-REFERENCE-V1 §5 계약과 동일).
  const locals = await dataSource.query(
    `SELECT lp.id, lp.name, lp.description, lp.summary, lp.thumbnail_url, lp.images, lp.gallery_images,
            lp.category, lp.price_display, lp.badge_type, lp.highlight_flag, lp.sort_order,
            tc.id AS "selectedContentId", tc.title AS "selectedContentTitle",
            COALESCE(tc.content_json->>'html', tc.content_json->>'body', '') AS "selectedContentHtml",
            tc.content_json->'translations' AS "selectedContentTranslationsRaw"
       FROM store_local_products lp
       LEFT JOIN store_tablet_displays disp
         ON disp.product_id = lp.id AND disp.product_type = 'local'
        AND disp.tablet_id = $2 AND disp.is_visible = true
       LEFT JOIN LATERAL (
         SELECT c.id, c.title, c.content_json
           FROM kpa_store_content_product_links l
           JOIN kpa_store_contents c
             ON c.id = l.content_id AND c.organization_id = $1
          WHERE l.organization_id = $1
            AND l.link_type = 'product_description'
            AND l.product_source_type = 'local'
            AND l.product_source_id = lp.id
          ORDER BY (l.content_id = disp.content_id) DESC, c.updated_at DESC
          LIMIT 1
       ) tc ON true
      WHERE lp.organization_id = $1 AND lp.is_active = true
        AND disp.id IS NOT NULL
      ORDER BY disp.sort_order ASC NULLS LAST, lp.name ASC`,
    [ctx.organizationId, tabletId],
  );
  for (const row of locals) {
    row.selectedContentTranslations = sanitizePublishableTranslations(row.selectedContentTranslationsRaw);
    delete row.selectedContentTranslationsRaw;
    // 소비처가 supplier/local 을 구분할 수 있게 한다(kiosk mapLocalProduct 와 같은 축).
    row.type = 'local';
    // 표시용 camelCase alias — 소비처마다 다른 필드명을 읽는 문제를 **여기 한 곳**에서 흡수한다.
    //   `/tablet/products` 소비처(kiosk mapLocalProduct)는 snake_case 를 읽고,
    //   섹션 소비처(QR 뷰어 ProductCard · kiosk mapSectionProduct)는 camelCase 를 읽는다.
    //   양쪽을 다 실어 보내면 어느 화면에서도 가격·이미지가 사라지지 않는다(원본 필드 유지 = 회귀 0).
    row.priceDisplay = row.price_display ?? null;
    row.imageUrl = row.thumbnail_url ?? (Array.isArray(row.images) ? row.images[0] ?? null : null);
  }

  return [...suppliers, ...locals];
}
