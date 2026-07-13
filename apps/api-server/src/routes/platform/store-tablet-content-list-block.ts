/**
 * Tablet content_list block — config 검증 + 정규화 (순수 함수, DB 접근 없음)
 *
 * WO-O4O-KPA-TABLET-CONTENT-LIST-BLOCK-SCHEMA-CONTRACT-V1
 *   설계: CHECK-O4O-KPA-TABLET-CONTENT-SOURCE-SELECTION-DESIGN-V1
 *   "코너에 배치할 콘텐츠 카드 목록" 블록. product_list(상품 record)와 축 분리.
 *   sourceType 2종:
 *     - o4o_product_description : SPD STORE canonical 직접 참조(키 = masterId + language)
 *     - store_content          : kpa_store_contents.id 참조(매장 상품설명/일반콘텐츠/복사편집본)
 *   본 모듈은 config 검증만. 실제 SPD/kpa_store_contents resolve 는 public 측
 *   store-public-tablet-content-resolve.ts (DB DI) 에서 수행.
 */

export const CONTENT_LIST_SOURCE_TYPES = ['o4o_product_description', 'store_content'] as const;
export type ContentListSourceType = (typeof CONTENT_LIST_SOURCE_TYPES)[number];

const DEFAULT_LANGUAGE = 'ko';
/** 한 블록당 item 상한(과도한 resolve 방지). 초과 시 저장 거부. */
const MAX_ITEMS = 100;

export interface ContentListItemBase {
  displayTitle: string | null;
  displaySummary: string | null;
  visible: boolean;
  sortOrder: number;
}
export interface O4oDescriptionItem extends ContentListItemBase {
  sourceType: 'o4o_product_description';
  masterId: string;
  language: string;
}
export interface StoreContentItem extends ContentListItemBase {
  sourceType: 'store_content';
  contentId: string;
}
export type ContentListItem = O4oDescriptionItem | StoreContentItem;

export interface NormalizedContentList {
  items: ContentListItem[];
}

export type ParseContentListResult =
  | { ok: true; value: NormalizedContentList }
  | { ok: false; error: string };

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}
function nonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}
/** optional override: undefined/null → null, 문자열 → trim, 그 외 → 에러 신호(undefined 반환 안 함) */
function normOverride(v: unknown): string | null | undefined {
  if (v === undefined || v === null) return null;
  if (typeof v === 'string') return v.trim() ? v.trim() : null;
  return undefined; // invalid
}

/**
 * content_list block config 검증 + 정규화.
 * 규칙:
 *   - config.items 는 배열(빈 배열 허용 → 렌더 시 items=[] 섹션).
 *   - 각 item.sourceType 는 CONTENT_LIST_SOURCE_TYPES.
 *   - o4o_product_description → masterId 필수(non-empty), language optional(기본 'ko').
 *   - store_content → contentId 필수(non-empty).
 *   - displayTitle/displaySummary optional override(string|null).
 *   - visible optional boolean(기본 true). sortOrder optional number(기본 index).
 *   - item 수 MAX_ITEMS 이하.
 */
export function parseContentListConfig(config: unknown): ParseContentListResult {
  if (!isPlainObject(config)) return { ok: false, error: 'config must be an object' };
  const items = config.items;
  if (!Array.isArray(items)) return { ok: false, error: 'config.items must be an array' };
  if (items.length > MAX_ITEMS) return { ok: false, error: `config.items exceeds max ${MAX_ITEMS}` };

  const out: ContentListItem[] = [];
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    if (!isPlainObject(it)) return { ok: false, error: `config.items[${i}] must be an object` };
    const sourceType = it.sourceType;
    if (typeof sourceType !== 'string' || !CONTENT_LIST_SOURCE_TYPES.includes(sourceType as ContentListSourceType)) {
      return { ok: false, error: `config.items[${i}].sourceType must be one of ${CONTENT_LIST_SOURCE_TYPES.join(', ')}` };
    }

    const displayTitle = normOverride(it.displayTitle);
    if (displayTitle === undefined) return { ok: false, error: `config.items[${i}].displayTitle must be string or null` };
    const displaySummary = normOverride(it.displaySummary);
    if (displaySummary === undefined) return { ok: false, error: `config.items[${i}].displaySummary must be string or null` };

    if (it.visible !== undefined && typeof it.visible !== 'boolean') {
      return { ok: false, error: `config.items[${i}].visible must be a boolean` };
    }
    const visible = it.visible !== false; // 기본 true

    let sortOrder = i;
    if (it.sortOrder !== undefined) {
      if (typeof it.sortOrder !== 'number' || !Number.isFinite(it.sortOrder)) {
        return { ok: false, error: `config.items[${i}].sortOrder must be a finite number` };
      }
      sortOrder = it.sortOrder;
    }

    const base: ContentListItemBase = { displayTitle, displaySummary, visible, sortOrder };

    if (sourceType === 'o4o_product_description') {
      if (!nonEmptyString(it.masterId)) return { ok: false, error: `config.items[${i}].masterId is required for o4o_product_description` };
      let language = DEFAULT_LANGUAGE;
      if (it.language !== undefined) {
        if (!nonEmptyString(it.language)) return { ok: false, error: `config.items[${i}].language must be a non-empty string` };
        language = it.language.trim();
      }
      out.push({ sourceType: 'o4o_product_description', masterId: it.masterId.trim(), language, ...base });
    } else {
      // store_content
      if (!nonEmptyString(it.contentId)) return { ok: false, error: `config.items[${i}].contentId is required for store_content` };
      out.push({ sourceType: 'store_content', contentId: it.contentId.trim(), ...base });
    }
  }

  return { ok: true, value: { items: out } };
}
