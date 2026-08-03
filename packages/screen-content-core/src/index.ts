/**
 * @o4o/screen-content-core — 화면 콘텐츠 순수 계약
 *
 * WO-O4O-SCREEN-CONTENT-CORE-PURE-CONTRACT-EXTRACTION-V1
 *
 * KPA 태블릿 제작기(TabletScreenSetManager)에서 검증된 **순수 콘텐츠 로직**만 최소 추출한다.
 * React·브라우저·DB·API 에 의존하지 않는 순수 TypeScript. 저장 payload/공개 렌더 계약은 그대로다.
 *
 * 포함: Screen Block/Draft 타입 · 기본 block config · 코너 본문(객체→HTML) 정규화 ·
 *       block 동등성 서명 · content_list 추가/수정/삭제/순서/표시·숨김 · 저장 전 이름 validation ·
 *       업무 자동 block 확보.
 * 제외: UI 컴포넌트, API/route/DB, resolver, 채널·권한 로직 — Extension(소비처)에 남긴다.
 */

// ── 타입(순수 계약) — API DTO 와 구조적으로 동일. 소비처는 구조적 타이핑으로 그대로 전달한다. ──
export type ScreenBlockType =
  | 'idle_media'
  | 'product_list'
  | 'product_content'
  | 'corner_description'
  | 'health_info'
  | 'staff_inquiry'
  | 'qr_guide'
  | 'content_list';

export interface ScreenBlock {
  id?: string;
  screenSetId?: string;
  blockType: ScreenBlockType;
  sortOrder: number;
  isEnabled: boolean;
  config: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

/** content_list item(저장 config) — 계약: masterId+language(o4o) / contentId(store) */
export type ContentListItem =
  | { sourceType: 'o4o_product_description'; masterId: string; language: string; displayTitle: string | null; displaySummary: string | null; visible: boolean; sortOrder: number }
  | { sourceType: 'store_content'; contentId: string; displayTitle: string | null; displaySummary: string | null; visible: boolean; sortOrder: number };

/**
 * product_list 상품 참조(저장 config) — WO-O4O-SCREEN-SET-CORNER-CONTENT-FREE-AUTHORING-AND-LLM-ASSIST-V1
 *
 * 식별자 계약은 **기존 매장 진열(store_tablet_displays)과 동일**하다:
 *   supplier → organization_product_listings.id   (매장 취급 상품 = 상품 풀의 supplierProducts[].id)
 *   local    → store_local_products.id            (매장 자체 상품)
 * 새 식별 체계를 만들지 않는다(신규 테이블/컬럼 없음 — Screen Set block config 안에만 저장).
 *
 * WO-O4O-SCREEN-SET-PRODUCT-QR-SELECTION-V1: `qrCodeId` 를 **additive** 로 추가한다.
 *   - 값 = 매장 소유 기존 QR(`store_qr_codes.id`). 신규 QR 을 만들지 않고 **사용자가 고른 기존 QR** 만 참조한다.
 *   - 미선택/해제 = 필드 없음(또는 null) → QR 미표시. 대표 QR 자동 판정 없음.
 *   - 과거 저장값(필드 없음)과 완전 호환.
 */
export type SelectedProductRef = {
  productType: 'supplier' | 'local';
  productId: string;
  /** 이 상품 카드에 표시할 기존 QR(store_qr_codes.id). 미선택이면 undefined. */
  qrCodeId?: string;
};

/** 편집 Draft — 저장 전 화면 세트 편집 모델(블록 목록). */
export interface ScreenSetDraft {
  blocks: ScreenBlock[];
}

// ── 기본 block config ──
export function defaultConfig(type: ScreenBlockType): Record<string, unknown> {
  switch (type) {
    case 'idle_media': return { source: 'legacy_idle_playlist' };
    case 'corner_description': return { title: '', body: '' };
    case 'health_info': return { title: '', body: '' };
    case 'staff_inquiry': return { message: '' };
    case 'qr_guide': return { label: '', url: '' };
    case 'product_list': return { source: 'legacy_tablet_displays' };
    case 'content_list': return { items: [] };
    default: return {};
  }
}

// ── 코너 본문(객체형 { html, json } → HTML 문자열) 정규화 ──
//   corner_description.config.body 는 항상 HTML 문자열이어야 한다(공개 렌더 str()·ContentRenderer 계약).
//   과거 잘못된 연결로 body 에 { html, json } 객체가 들어왔을 가능성을 읽기/쓰기 경계에서 방어.
export function normalizeCornerBody(body: unknown): string {
  if (typeof body === 'string') return body;
  if (body && typeof body === 'object' && 'html' in body && typeof (body as { html?: unknown }).html === 'string') {
    return (body as { html: string }).html;
  }
  return '';
}

// ── block 동등성 서명(dirty 비교) — 타입/표시여부/config + 순서만. 서버 sort_order 값은 무시(위치 기반 재정규화). ──
export function normalizeBlocks(bs: ScreenBlock[]): string {
  return JSON.stringify(bs.map((b) => ({ t: b.blockType, e: b.isEnabled, c: b.config ?? {} })));
}

// ── 업무 자동 block 확보 ──
//   업무 항목이 쓰는 내부 블록을 자동 확보한다. **추가만** — 기존 블록의 순서·설정·표시여부를 바꾸거나 삭제하지 않는다.
//   qr_guide 는 사용자 미노출 → 신규 생성 시 기본 라벨(빈 라벨이면 공개 화면에서 QR 섹션이 사라짐).
export const AUTO_BLOCK_TYPES: ScreenBlockType[] = ['idle_media', 'corner_description', 'content_list', 'product_list', 'qr_guide'];

export function ensureAutoBlocks(blocks: ScreenBlock[]): ScreenBlock[] {
  const missing = AUTO_BLOCK_TYPES.filter((t) => !blocks.some((b) => b.blockType === t));
  if (missing.length === 0) return blocks;
  const added = missing.map((t, i) => ({
    blockType: t,
    sortOrder: blocks.length + i,
    isEnabled: true,
    config: t === 'qr_guide' ? { label: '모바일로 더 보기', url: '' } : defaultConfig(t),
  }));
  return [...blocks, ...added];
}

// ── 저장 detail → 편집 block seed(하이드레이트) — 코너 본문 정규화 한 곳 ──
export function seedInitialBlocks(detail: ScreenSetDraft | null): ScreenBlock[] {
  return detail
    ? detail.blocks.map((b) =>
        b.blockType === 'corner_description'
          ? { ...b, config: { ...(b.config ?? {}), body: normalizeCornerBody((b.config ?? {}).body) } }
          : { ...b, config: b.config ?? {} },
      )
    : [];
}

// ── content_list(추가 정보) 순수 연산 ──
export function contentItemKey(it: ContentListItem): string {
  return it.sourceType === 'o4o_product_description' ? `o4o:${it.masterId}:${it.language}` : `store:${it.contentId}`;
}

export function reindexContentItems(arr: ContentListItem[]): ContentListItem[] {
  return arr.map((it, idx) => ({ ...it, sortOrder: idx * 10 } as ContentListItem));
}

export function updateContentItem(items: ContentListItem[], i: number, patch: Partial<ContentListItem>): ContentListItem[] {
  return items.map((it, idx) => (idx === i ? ({ ...it, ...patch } as ContentListItem) : it));
}

/** i 번째를 dir 로 이동 + 재정렬. 범위를 벗어나면 동일 배열 참조를 그대로 반환(no-op). */
export function moveContentItem(items: ContentListItem[], i: number, dir: 'up' | 'down'): ContentListItem[] {
  const t = dir === 'up' ? i - 1 : i + 1;
  if (t < 0 || t >= items.length) return items;
  const next = [...items];
  [next[i], next[t]] = [next[t], next[i]];
  return reindexContentItems(next);
}

/** i 번째 제거 + 재정렬(현재 목록에서만 — 원본 콘텐츠 불변은 소비처 책임). */
export function removeContentItem(items: ContentListItem[], i: number): ContentListItem[] {
  return reindexContentItems(items.filter((_, idx) => idx !== i));
}

/** 추가(키 기준 dedup) + 재정렬. */
export function addContentItems(items: ContentListItem[], added: ContentListItem[]): ContentListItem[] {
  const seen = new Set(items.map(contentItemKey));
  const fresh = added.filter((it) => !seen.has(contentItemKey(it)));
  return reindexContentItems([...items, ...fresh]);
}

// ── product_list(상품 목록) 순수 연산 ──
//   기존 계약 `{ source: 'legacy_tablet_displays' }`(매장 진열 순서 그대로)를 깨지 않는다.
//   명시 선택은 `{ source: 'selected_products', products: [...] }` 로 **추가**한다.
//   선택이 비면 legacy 형태로 되돌려 저장한다 → 과거 소비처/공개 렌더 동작 불변.
export function productRefKey(ref: SelectedProductRef): string {
  return `${ref.productType}:${ref.productId}`;
}

/** config → 명시 선택 목록. legacy/미지정/깨진 값은 모두 빈 배열(= 매장 진열 그대로). */
export function selectedProductsOf(config: Record<string, unknown> | undefined | null): SelectedProductRef[] {
  const c = config ?? {};
  if (c.source !== 'selected_products') return [];
  const raw = Array.isArray(c.products) ? c.products : [];
  const seen = new Set<string>();
  const out: SelectedProductRef[] = [];
  for (const it of raw) {
    if (!it || typeof it !== 'object') continue;
    const { productType, productId } = it as Partial<SelectedProductRef>;
    if (productType !== 'supplier' && productType !== 'local') continue;
    if (typeof productId !== 'string' || productId.trim() === '') continue;
    const ref: SelectedProductRef = { productType, productId };
    // WO-O4O-SCREEN-SET-PRODUCT-QR-SELECTION-V1: 선택된 기존 QR id 를 보존(빈 문자열/비문자열은 미선택 취급).
    const { qrCodeId } = it as Partial<SelectedProductRef>;
    if (typeof qrCodeId === 'string' && qrCodeId.trim() !== '') ref.qrCodeId = qrCodeId.trim();
    const key = productRefKey(ref);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(ref);
  }
  return out;
}

/** 명시 선택 여부(= 매장 진열 그대로가 아닌 상태). */
export function hasSelectedProducts(config: Record<string, unknown> | undefined | null): boolean {
  return selectedProductsOf(config).length > 0;
}

/** 선택 목록을 config 로 반영. 빈 목록이면 legacy 계약으로 복귀. */
export function withSelectedProducts(
  config: Record<string, unknown> | undefined | null,
  products: SelectedProductRef[],
): Record<string, unknown> {
  const rest = { ...(config ?? {}) };
  delete rest.source;
  delete rest.products;
  if (products.length === 0) return { ...rest, source: 'legacy_tablet_displays' };
  const seen = new Set<string>();
  const uniq = products.filter((p) => {
    const key = productRefKey(p);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return {
    ...rest,
    source: 'selected_products',
    // WO-O4O-SCREEN-SET-PRODUCT-QR-SELECTION-V1: qrCodeId 는 선택된 경우에만 additive 로 직렬화(미선택은 키 자체 없음).
    products: uniq.map((p) =>
      p.qrCodeId && p.qrCodeId.trim() !== ''
        ? { productType: p.productType, productId: p.productId, qrCodeId: p.qrCodeId.trim() }
        : { productType: p.productType, productId: p.productId },
    ),
  };
}

/**
 * WO-O4O-SCREEN-SET-PRODUCT-QR-SELECTION-V1
 * 특정 상품의 QR 선택을 지정/해제한다(순수 함수). `qrCodeId=null` 이면 해제.
 * 같은 QR 을 여러 상품에 지정할 수 있고, 다른 상품의 선택에는 영향이 없다.
 */
export function withProductQr(
  products: SelectedProductRef[],
  target: SelectedProductRef,
  qrCodeId: string | null,
): SelectedProductRef[] {
  const key = productRefKey(target);
  return products.map((p) => {
    if (productRefKey(p) !== key) return p;
    if (!qrCodeId || qrCodeId.trim() === '') {
      const { qrCodeId: _drop, ...rest } = p;
      return rest;
    }
    return { ...p, qrCodeId: qrCodeId.trim() };
  });
}

// ── 저장 전 validation ──
export function isValidScreenSetName(name: string): boolean {
  return name.trim().length > 0;
}
