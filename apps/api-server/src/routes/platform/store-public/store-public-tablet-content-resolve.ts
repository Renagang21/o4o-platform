/**
 * 공개 태블릿 content_list resolve — block config item → viewer 카드 data
 *
 * WO-O4O-KPA-TABLET-CONTENT-LIST-BLOCK-SCHEMA-CONTRACT-V1
 *   /tablet/screen 이 content_list block 을 이 함수로 resolve 해 카드 배열을 반환한다.
 *   viewer 가 SPD/kpa_store_contents 를 직접 몰라도 되게 서버에서 resolve(참조ID만 통과하는
 *   product_content 의 dormant 실패를 반복하지 않음).
 *
 * WO-O4O-SCREEN-SET-RESOLVER-CONTENT-SOURCE-SEAM-V1
 *   원본 조회(store_content / o4o_product_description)는 ContentSourceAdapter 로 분리했다.
 *   이 함수는 **화면 구성**만 담당한다: config 파싱 · visible 필터 · sortOrder 정렬 · resolve 상한 ·
 *   사용자 지정 displayTitle/displaySummary override 적용 · 카드 조립. DB 는 직접 조회하지 않는다.
 *
 *   sourceType(원본 조회는 adapter 가 수행):
 *     - o4o_product_description : masterId+language → shared_product_descriptions
 *         (description_type='STORE', status='canonical') language 우선 → ko fallback.
 *     - store_content : kpa_store_contents.id → org 일치 + workspace_status≠'archived'.
 *     미존재/접근 불가(adapter 가 null 반환) → 해당 item skip.
 *
 *   HTML 안전(§6): 서버는 원문 html 을 전달하되, viewer 는 ContentRenderer(DOMPurify)로만
 *   렌더한다는 계약. 서버가 dangerously 렌더하지 않는다(문자열 전달만).
 */

import { parseContentListConfig } from '../store-tablet-content-list-block.js';
import type { ContentSourceAdapter } from './store-public-tablet-content-source.js';

/** resolve 상한(과도한 카드 방지). config 자체는 100까지 허용하나 공개 렌더는 50 로 제한. */
const RESOLVE_LIMIT = 50;

export interface ContentListCard {
  itemId: string;
  sourceType: 'o4o_product_description' | 'store_content';
  sourceBadge: string;
  title: string;
  summary: string;
  thumbnailUrl: string | null;
  hasDetail: boolean;
  relatedProductName: string | null;
  detail: { html: string };
}

/**
 * content_list block config → 카드 배열.
 * - 잘못된 config → [] (섹션은 caller 가 items=[] 로 반환).
 * - visible=false / resolve 실패(원본 미존재·접근불가) item → skip.
 * - sortOrder 오름차순. displayTitle/displaySummary override 적용.
 *
 * @param source content_list 원본 조회 adapter(호출부가 명시 주입 — 묵시적 DB fallback 없음).
 * @param organizationId store_content 경계 org.
 */
export async function resolveContentListItems(
  source: ContentSourceAdapter,
  organizationId: string,
  config: unknown,
): Promise<ContentListCard[]> {
  const parsed = parseContentListConfig(config);
  if (!parsed.ok) return [];

  const items = parsed.value.items
    .filter((it) => it.visible)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .slice(0, RESOLVE_LIMIT);

  const cards: ContentListCard[] = [];
  for (const item of items) {
    try {
      const src =
        item.sourceType === 'o4o_product_description'
          ? await source.fetchProductDescription(item.masterId, item.language)
          : await source.fetchStoreContent(organizationId, item.contentId);
      if (!src) continue; // 원본 미존재 / 접근 불가 → skip
      cards.push({
        itemId: src.itemId,
        sourceType: item.sourceType,
        sourceBadge: src.sourceBadge,
        // 사용자 지정 override(displayTitle/displaySummary) 우선, 없으면 원본 기본값.
        title: item.displayTitle ?? src.baseTitle,
        summary: item.displaySummary ?? src.baseSummary,
        thumbnailUrl: src.thumbnailUrl,
        hasDetail: src.hasDetail,
        relatedProductName: src.relatedProductName,
        detail: src.detail,
      });
    } catch {
      // 개별 item resolve 실패는 전체 /screen 을 깨지 않는다 → skip.
    }
  }
  return cards;
}
