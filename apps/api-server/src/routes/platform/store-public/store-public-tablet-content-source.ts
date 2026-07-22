/**
 * content_list Content Source Adapter — 원본 조회 경계
 *
 * WO-O4O-SCREEN-SET-RESOLVER-CONTENT-SOURCE-SEAM-V1
 *   resolveContentListItems 의 **원본 조회**(store_content / o4o_product_description) 만 명시적
 *   adapter 경계로 분리한다. 화면 구성·정렬·표시 여부·override 적용은 resolver(resolveContentListItems)에
 *   남는다. adapter 는 참조ID → 공통 resolved content(ResolvedSourceContent) 정규화 + 미존재/접근불가 처리만 담당.
 *
 *   기본 Store Adapter(createStoreContentSourceAdapter)는 기존 DB 조회 구현을 **그대로 이동**
 *   (byte-equivalent). 신규 테이블·컬럼·migration 없음. 응답 필드 불변.
 *
 *   호출부(공개 태블릿 Screen Set / Screen Set QR / draft preview / 관리자·매장 미리보기)는
 *   이 기본 adapter 를 **명시적으로 주입**한다. adapter 없는 묵시적 DB 조회 fallback 은 하지 않는다.
 */

import type { DataSource } from 'typeorm';

/** 원본에서 도출한 공통 resolved content. displayTitle/displaySummary override·visible·순서는 resolver 가 적용. */
export interface ResolvedSourceContent {
  /** stable 카드 id (o4o:{masterId}:{language} / store:{contentId}). */
  itemId: string;
  /** 출처 배지('O4O 표준' | '매장 제작'). */
  sourceBadge: string;
  /** override 전 원본 기본 제목. */
  baseTitle: string;
  /** override 전 원본 요약. */
  baseSummary: string;
  thumbnailUrl: string | null;
  hasDetail: boolean;
  relatedProductName: string | null;
  detail: { html: string };
}

/**
 * content_list 원본 조회 계약. resolver 는 이 계약에만 의존하고 DB 를 직접 조회하지 않는다.
 *  - 반환 null = 미존재 / 접근 불가(타 org, archived, 설명 없음) → resolver 가 해당 item skip.
 */
export interface ContentSourceAdapter {
  /** o4o_product_description(SPD STORE canonical) 원본 조회. ProductMaster/설명 없으면 null. */
  fetchProductDescription(masterId: string, language: string): Promise<ResolvedSourceContent | null>;
  /** store_content(kpa_store_contents) 원본 조회. 미존재/타 org/archived 면 null. */
  fetchStoreContent(organizationId: string, contentId: string): Promise<ResolvedSourceContent | null>;
}

function asString(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

/**
 * 기본 Store Adapter — 기존 resolveO4oItem/resolveStoreItem 의 DB 조회를 그대로 이동(byte-equivalent).
 */
export function createStoreContentSourceAdapter(dataSource: DataSource): ContentSourceAdapter {
  return {
    async fetchProductDescription(masterId, language) {
      const rows = await dataSource.query(
        `SELECT pm.name AS "masterName", spd.content AS "content", spd.summary AS "summary"
           FROM product_masters pm
           LEFT JOIN LATERAL (
             SELECT d.content, d.summary
               FROM shared_product_descriptions d
              WHERE d.master_id = pm.id
                AND d.description_type = 'STORE'
                AND d.status = 'canonical'
                AND d.deleted_at IS NULL
              ORDER BY (d.language = $2) DESC, (d.language = 'ko') DESC, d.updated_at DESC
              LIMIT 1
           ) spd ON true
          WHERE pm.id = $1
          LIMIT 1`,
        [masterId, language],
      );
      const row = rows?.[0];
      if (!row) return null; // ProductMaster 없음
      const html = asString(row.content);
      if (!html.trim()) return null; // STORE canonical 없음 → 설명 없는 카드는 skip
      const masterName = asString(row.masterName);
      return {
        itemId: `o4o:${masterId}:${language}`,
        sourceBadge: 'O4O 표준',
        baseTitle: masterName,
        baseSummary: asString(row.summary),
        thumbnailUrl: null,
        hasDetail: true,
        relatedProductName: masterName || null,
        detail: { html },
      };
    },

    async fetchStoreContent(organizationId, contentId) {
      const rows = await dataSource.query(
        `SELECT title, content_json AS "contentJson", workspace_status AS "workspaceStatus"
           FROM kpa_store_contents
          WHERE id = $1 AND organization_id = $2
          LIMIT 1`,
        [contentId, organizationId],
      );
      const row = rows?.[0];
      if (!row) return null; // 없음 / 타 org(=조회 안 됨)
      if (row.workspaceStatus === 'archived') return null; // archived 제외
      const cj = (row.contentJson && typeof row.contentJson === 'object' && !Array.isArray(row.contentJson)
        ? row.contentJson
        : {}) as Record<string, unknown>;
      const html = asString(cj.html) || asString(cj.body);
      return {
        itemId: `store:${contentId}`,
        sourceBadge: '매장 제작',
        baseTitle: asString(row.title),
        baseSummary: asString(cj.summary),
        thumbnailUrl: null,
        hasDetail: !!html.trim(),
        relatedProductName: null,
        detail: { html },
      };
    },
  };
}

/**
 * 운영자 Adapter — WO-O4O-OPERATOR-SCREEN-SET-AUTHORING-FOUNDATION-V1
 *
 *   운영자 Screen Set 원본이 소비할 수 있는 콘텐츠 원본을 제한한다.
 *   - fetchProductDescription: O4O 상품 상세설명서(SPD STORE canonical) — 기본 Store Adapter 와 동일.
 *       STORE canonical 만 조회하므로 **승인되지 않은(비-canonical) 공급자·초안 콘텐츠는 자연 제외**된다.
 *   - fetchStoreContent: **항상 null**(매장 제작 콘텐츠 조회 차단). 운영자는 특정 매장 org 에 속하지 않으며,
 *       WO 차단 조건("매장 콘텐츠 조회") 을 adapter 경계에서 강제한다. content_list config 에 store 항목이
 *       섞여 들어와도 resolver 가 null → 해당 카드 skip.
 *
 *   신규 테이블·컬럼·migration 없음. o4o 조회 로직은 Store Adapter 를 재사용(byte-equivalent).
 */
export function createOperatorContentSourceAdapter(dataSource: DataSource): ContentSourceAdapter {
  const store = createStoreContentSourceAdapter(dataSource);
  return {
    fetchProductDescription: store.fetchProductDescription,
    async fetchStoreContent() {
      return null; // 매장 제작 콘텐츠는 운영자 원본에서 조회 불가(WO 차단 조건).
    },
  };
}

/**
 * 공급자 Adapter — WO-O4O-SUPPLIER-SCREEN-SET-BACKEND-HUB-COPY-V2B
 *
 *   공급자 Screen Set 원본이 소비할 수 있는 콘텐츠 원본을 제한한다.
 *   - fetchProductDescription: **O4O 표준 상품 정보**(SPD STORE canonical) — 운영자 adapter 와 동일 허용.
 *       canonical STORE 설명서는 플랫폼 canonical(공급자 사유 데이터 아님)이므로 "사용이 허용된 O4O 표준 상품
 *       정보"(WO 허용 범위). 비-canonical/미승인 공급자·초안 콘텐츠는 STORE canonical 조건으로 자연 제외되고,
 *       **다른 공급자의 사유(private) 콘텐츠는 애초에 이 경로로 노출되지 않는다**(canonical 만 조회).
 *   - fetchStoreContent: **항상 null**(매장 제작 콘텐츠 조회 차단 — WO 차단 조건). 공급자는 특정 매장 org 무소속.
 *
 *   ※ 공급자 "자기 상품"(supplier_product_offers) 한정 노출은 별도 own-offer 게이트로 강화 가능하나,
 *     content_list 는 O4O 표준(canonical) 축이므로 본 adapter 는 canonical 허용 + store 차단으로 둔다.
 *     의약품 약국 전용 등 안전 제약은 게시·가져오기 시점의 의약품 이중 가드(store-tablet-medication-guard)가 담당.
 *   신규 테이블·컬럼·migration 없음.
 */
export function createSupplierContentSourceAdapter(dataSource: DataSource): ContentSourceAdapter {
  const store = createStoreContentSourceAdapter(dataSource);
  return {
    fetchProductDescription: store.fetchProductDescription,
    async fetchStoreContent() {
      return null; // 매장 제작 콘텐츠는 공급자 원본에서 조회 불가.
    },
  };
}
