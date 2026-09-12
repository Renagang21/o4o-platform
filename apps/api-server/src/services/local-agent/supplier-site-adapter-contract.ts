/**
 * Supplier Site Adapter V0 — 등재부 · 정규화 · 결과 계약 (순수)
 *
 * WO-O4O-SUPPLIER-SITE-ADAPTER-V0 §6·§8·§9·§12·§13·§14·§15·§16·§17·§18·§19·§20·§29·§30·§31·§32·§33·§37
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 이 파일이 정하는 것
 *
 *   Adapter 등재부  = 어떤 공급처가 어떤 **등재 site** 위에서 어떤 **구조화 조건**으로
 *                     검색창 · 검색버튼 · 결과표를 찾는가 (§8·§29·§30)
 *   정규화          = 표에서 읽은 문자열 → 가격 · 재고 · 주문가능 · 포장단위 (§16~§19)
 *   결과 계약       = O4O 표준 `SupplierProductAvailability` (§15)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ Adapter 는 브라우저에 직접 닿지 않는다 (§6·§7)
 *
 *   raw Chrome · OS · selector · JavaScript 에 닿는 경로가 이 파일에 없다. 실행은 전부
 *   기존 `local.browser.dom.*`(BROWSER-DOM-CONTROL-V0) 을 경유하며, 이 파일은 그 tool 에
 *   넘길 **구조화 조건(role · text · name · label · placeholder)** 과 돌아온 **표 문자열의
 *   해석 규칙**만 정한다. 사이트 특화 규칙은 Adapter 정의 안에만 둔다(§30) — 공통 DOM tool 에
 *   공급처 전용 분기를 넣지 않는다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ 읽은 값을 추측으로 채우지 않는다 (§16·§17·§18)
 *
 *   가격이 화면에 없으면 `price = null` 이다. 계산 · 추정 · 과거값 재사용을 하지 않는다.
 *   재고 표기를 canonical 상태로 옮길 수 없으면 `unknown`, 주문 가능 여부를 단정할 수 없으면
 *   `orderable = null` 이다. "모른다" 를 돌려주는 것이 이 V0 의 정상 동작이다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ 상품명을 덮어쓰지 않는다 (§14)
 *
 *   사용자가 말한 이름(`sourceProductName`)과 공급처 사이트가 표시한 이름(`productName`)은
 *   **서로 다른 칸**이다. 어느 쪽도 상대를 대체하지 않는다. O4O 내부 상품 id 는 V0 에서
 *   붙이지 않는다(optional 칸만 둔다).
 */

import { BROWSER_SITE_IDS } from './browser-site-registry.js';
import type { DomFindQuery } from './browser-dom-contract.js';
import { DOM_QUERY_VALUE_MAX, domInputDenyReason, validateDomFindQuery } from './browser-dom-contract.js';

// ─── 한도 (§37 rate/abuse) ───────────────────────────────────────────────────

/** 상품 1건 조회 = 검색 1회(§37). 재시도도 없다 — 실패는 실패로 돌려준다. */
export const SUPPLIER_SEARCH_PER_LOOKUP = 1;
/**
 * 조회 1회에 발행할 수 있는 DOM 명령 상한(§37).
 *
 * 최악 경로 = get_context(1) + find 검색창(≤2) + set_input(1) + find 검색버튼(≤2) + click(1) +
 * read_table(1) = 8. 검색창을 찾지 못한 경로는 get_context(1) + find(≤2) + inspect(1) = 4 로 끝난다.
 * 상한을 넘기면 더 발행하지 않고 `SUPPLIER_SEARCH_FAILED` 로 끝낸다 — 재시도 폭주를 구조로 막는다.
 */
export const SUPPLIER_LOOKUP_MAX_DOM_COMMANDS = 8;
/** 검색어 상한. DOM find 조건 상한과 같은 값을 쓴다(§10). */
export const SUPPLIER_QUERY_MAX_LENGTH = DOM_QUERY_VALUE_MAX;
/** 결과 후보로 볼 표 행 상한. read_table 상한(50) 안에서 더 좁힌다. */
export const SUPPLIER_RESULT_MAX_ROWS = 50;
/** 가격으로 인정할 자릿수 상한(원 단위). */
const SUPPLIER_PRICE_MAX_DIGITS = 12;

// ─── Adapter 정의 (§8·§29·§30·§31) ──────────────────────────────────────────

/** 표에서 읽은 열 → canonical 필드. 사이트별 헤더 동의어는 여기에만 둔다(§30). */
export interface SupplierColumnSynonyms {
  /** 필수. 이 열이 없으면 결과를 해석하지 않는다(§12). */
  productName: readonly string[];
  packSize?: readonly string[];
  price?: readonly string[];
  stock?: readonly string[];
  supplierProductId?: readonly string[];
  orderable?: readonly string[];
}

/** 재고 표기 → canonical 상태(§17). 사이트 문구를 그대로 적는다. */
export interface SupplierStockVocabulary {
  inStock: readonly string[];
  lowStock: readonly string[];
  outOfStock: readonly string[];
}

/** 주문 가능 표기(§18). 표에 별도 열이 있을 때만 쓴다. */
export interface SupplierOrderableVocabulary {
  yes: readonly string[];
  no: readonly string[];
}

export interface SupplierAdapterDefinition {
  /** canonical 식별자. AI · 서버가 주고받는 유일한 공급처 키다. */
  supplierId: string;
  /** 사용자에게 읽어줘도 안전한 이름. */
  displayName: string;
  /** 이 공급처 화면이 있는 **등재 site**(browser-site-registry). URL 은 여기에 없다. */
  siteId: string;
  /** DOM 구조가 바뀌면 올린다(§31). */
  adapterVersion: number;
  /** 검색창 후보 — 순서대로 시도한다(§11·§29 role/label/placeholder 우선). */
  searchBox: readonly DomFindQuery[];
  /** 검색 실행 버튼 후보(§11). */
  searchSubmit: readonly DomFindQuery[];
  /** 결과 읽기 방식. V0 은 표뿐이다(§12). */
  resultMode: 'table';
  columns: SupplierColumnSynonyms;
  stockText: SupplierStockVocabulary;
  orderableText?: SupplierOrderableVocabulary;
}

/**
 * V0 등재 목록 — **샘플 공급처 1곳**(§4·§39).
 *
 * 저장소에는 실제 외부 공급처가 등재되어 있지 않다(BROWSER_SITE_REGISTRY = `o4o.neture` 하나).
 * 그래서 V0 canonical 대상은 **등재 origin 위의 supplier-like fixture** 다 — 검색창 · 검색버튼 ·
 * 결과표(상품명 · 규격 · 단가 · 재고 · 상품코드)를 갖춘 화면이며, 이 Adapter 계약이 특정
 * 사이트에 의존하지 않는지를 먼저 증명하는 것이 목적이다(§49 "첫 Adapter 로 표준 contract 를 다듬는다").
 *
 * 실제 공급처 등재는 **사용자가 사이트를 지정하고 §36 약관·자동화 정책 조사를 통과한 뒤**,
 * 이 배열에 항목을 더하고(+ browser site 3 사본 · 확장 manifest) 수행한다. 코드 상수이며
 * 테이블 · migration · 관리 화면을 만들지 않는다(§21·§45 — browser site 등재부와 같은 이유).
 */
export const SUPPLIER_ADAPTER_REGISTRY: readonly SupplierAdapterDefinition[] = Object.freeze([
  Object.freeze({
    supplierId: 'o4o.sample-supplier',
    displayName: '샘플 공급처',
    siteId: 'o4o.neture',
    adapterVersion: 1,
    // 구조화 조건만(§29). CSS path 는 표현할 방법이 없다 — DomFindQuery 에 칸이 없다.
    searchBox: Object.freeze([
      Object.freeze({ role: 'searchbox' }),
      Object.freeze({ label: '상품명' }),
      Object.freeze({ placeholder: '상품명' }),
    ]),
    searchSubmit: Object.freeze([
      Object.freeze({ role: 'button', text: '검색' }),
      Object.freeze({ role: 'button', name: '검색' }),
    ]),
    resultMode: 'table',
    columns: Object.freeze({
      productName: Object.freeze(['상품명', '제품명', '품명']),
      packSize: Object.freeze(['규격', '포장', '포장단위', '단위']),
      price: Object.freeze(['단가', '가격', '공급가', '판매가']),
      stock: Object.freeze(['재고', '재고상태', '상태']),
      supplierProductId: Object.freeze(['상품코드', '제품코드', '코드']),
    }),
    stockText: Object.freeze({
      inStock: Object.freeze(['재고있음', '있음', '충분', '주문가능']),
      lowStock: Object.freeze(['소량', '부족', '잔여소량']),
      outOfStock: Object.freeze(['품절', '없음', '재고없음', '주문불가']),
    }),
  }) as SupplierAdapterDefinition,
]);

export const SUPPLIER_ADAPTER_IDS: readonly string[] = Object.freeze(
  SUPPLIER_ADAPTER_REGISTRY.map((a) => a.supplierId),
);

export function findSupplierAdapter(supplierId: string): SupplierAdapterDefinition | undefined {
  return SUPPLIER_ADAPTER_REGISTRY.find((a) => a.supplierId === supplierId);
}

export function isRegisteredSupplierAdapter(supplierId: unknown): boolean {
  return typeof supplierId === 'string' && SUPPLIER_ADAPTER_IDS.includes(supplierId);
}

/**
 * 사용자 · AI 에게 보여줄 이름. 등재되지 않은 값이 들어와도 **원문을 되돌리지 않는다** —
 * 모델이 만들어낸 문자열이 화면에 그대로 찍히는 경로를 만들지 않는다(site 등재부와 같은 규칙).
 */
export function supplierAdapterDisplayName(supplierId: string): string {
  return findSupplierAdapter(supplierId)?.displayName ?? '해당 공급처';
}

/**
 * 등재부 자체의 정합성(§27·§29·§31). 테스트가 "위반 0건" 을 단언한다.
 * siteId 는 **등재 browser site** 여야 하고, find 조건은 DOM 계약의 다섯 키 형상을 통과해야 한다.
 */
export function findSupplierAdapterViolations(
  adapters: readonly SupplierAdapterDefinition[] = SUPPLIER_ADAPTER_REGISTRY,
): { supplierId: string; rule: string }[] {
  const out: { supplierId: string; rule: string }[] = [];
  for (const a of adapters) {
    if (!BROWSER_SITE_IDS.includes(a.siteId)) {
      out.push({ supplierId: a.supplierId, rule: 'siteId 는 등재 browser site 여야 함(§27)' });
    }
    if (!Number.isInteger(a.adapterVersion) || a.adapterVersion < 1) {
      out.push({ supplierId: a.supplierId, rule: 'adapterVersion 은 1 이상 정수(§31)' });
    }
    if (a.searchBox.length === 0 || a.searchSubmit.length === 0) {
      out.push({ supplierId: a.supplierId, rule: '검색창 · 검색버튼 조건이 하나 이상 있어야 함(§11)' });
    }
    for (const q of [...a.searchBox, ...a.searchSubmit]) {
      if (!validateDomFindQuery(q).ok) {
        out.push({ supplierId: a.supplierId, rule: 'find 조건은 DOM 계약 5키 형상만(§29)' });
      }
    }
    if (a.columns.productName.length === 0) {
      out.push({ supplierId: a.supplierId, rule: '상품명 열 동의어가 있어야 함(§12)' });
    }
  }
  return out;
}

// ─── 검색어 (§9·§10) ────────────────────────────────────────────────────────

export type SupplierQueryDenyReason = 'EMPTY' | 'TOO_LONG' | 'DENIED_CONTENT' | 'SHAPE';

/**
 * 검색어 검증. 사용자가 말한 상품명(또는 O4O 내부 후보명)만 들어온다 — Adapter 가 상품을
 * 지어내지 않는다(§10). `<>{}` 를 거절해 selector 조각이 검색어로 흘러드는 것을 막고,
 * credential · 명령어 성격 문자열은 DOM 입력 규칙(`domInputDenyReason`)으로 한 번 더 거른다(§9).
 */
export function supplierQueryDenyReason(query: unknown): SupplierQueryDenyReason | null {
  if (typeof query !== 'string') return 'SHAPE';
  const trimmed = query.trim();
  if (trimmed.length === 0) return 'EMPTY';
  if (query.length > SUPPLIER_QUERY_MAX_LENGTH) return 'TOO_LONG';
  if (/[<>{}]/.test(query)) return 'SHAPE';
  return domInputDenyReason(query) === null ? null : 'DENIED_CONTENT';
}

// ─── 표 해석 (§12·§19·§20) ──────────────────────────────────────────────────

/** 비교용 정규화 — 공백 제거 + 소문자. 원문은 건드리지 않는다(§13). */
export function normalizeSupplierText(value: unknown): string {
  return String(value ?? '')
    .replace(/\s+/g, '')
    .toLowerCase();
}

export interface SupplierColumnMap {
  productName: number;
  packSize: number;
  price: number;
  stock: number;
  supplierProductId: number;
  orderable: number;
}

const NO_COLUMN = -1;

function matchColumn(columns: readonly string[], synonyms: readonly string[] | undefined): number {
  if (!synonyms || synonyms.length === 0) return NO_COLUMN;
  const wanted = synonyms.map(normalizeSupplierText);
  // 정확 일치 우선 → 포함. "공급단가" 같은 변형을 포함으로 잡되 정확한 헤더가 있으면 그쪽을 쓴다.
  for (const pass of [0, 1]) {
    for (let i = 0; i < columns.length; i += 1) {
      const header = normalizeSupplierText(columns[i]);
      if (header.length === 0) continue;
      const hit = pass === 0 ? wanted.includes(header) : wanted.some((w) => header.includes(w));
      if (hit) return i;
    }
  }
  return NO_COLUMN;
}

/**
 * 표 헤더 → canonical 열 위치(§12). 상품명 열을 찾지 못하면 결과를 해석하지 않는다 —
 * 엉뚱한 열을 가격으로 읽는 것보다 "해석 불가" 가 안전하다(§32 adapter outdated 판정 입력).
 */
export function mapSupplierColumns(
  columns: readonly string[],
  def: SupplierAdapterDefinition,
): { ok: boolean; map?: SupplierColumnMap } {
  const map: SupplierColumnMap = {
    productName: matchColumn(columns, def.columns.productName),
    packSize: matchColumn(columns, def.columns.packSize),
    price: matchColumn(columns, def.columns.price),
    stock: matchColumn(columns, def.columns.stock),
    supplierProductId: matchColumn(columns, def.columns.supplierProductId),
    orderable: matchColumn(columns, def.columns.orderable),
  };
  if (map.productName === NO_COLUMN) return { ok: false };
  return { ok: true, map };
}

function cell(row: readonly string[], index: number): string {
  if (index === NO_COLUMN || index < 0 || index >= row.length) return '';
  return String(row[index] ?? '').trim();
}

/**
 * 가격 문자열 → 숫자(§16). **화면에 표시된 값만** 읽는다. 추측 · 계산 · 단위 환산을 하지 않는다.
 * 숫자를 찾을 수 없으면 null 이다("문의" · "-" · 빈 칸 포함).
 */
export function parseSupplierPrice(raw: unknown): number | null {
  const text = String(raw ?? '');
  // 원 단위 정수만 본다. 소수점 · 통화기호 · 단위는 V0 에서 해석하지 않는다(§16 과도한 표준화 금지).
  const m = text.match(/[0-9][0-9,]*/);
  if (!m) return null;
  const digits = m[0].replace(/,/g, '');
  if (digits.length === 0 || digits.length > SUPPLIER_PRICE_MAX_DIGITS) return null;
  const value = Number(digits);
  return Number.isFinite(value) ? value : null;
}

export type SupplierStockStatus = 'in_stock' | 'low_stock' | 'out_of_stock' | 'unknown';

/**
 * 재고 표기 → canonical 상태(§17). 사이트가 수량을 주면 숫자로도 판정한다(0 = 품절).
 * 어느 어휘에도 걸리지 않으면 `unknown` — 임의로 "있음" 으로 올리지 않는다.
 */
export function normalizeSupplierStock(raw: unknown, def: SupplierAdapterDefinition): SupplierStockStatus {
  const text = normalizeSupplierText(raw);
  if (text.length === 0) return 'unknown';
  const has = (list: readonly string[]) => list.some((k) => text.includes(normalizeSupplierText(k)));
  // 품절을 먼저 본다 — "재고없음" 은 '있음' 도 포함하는 문자열이다.
  if (has(def.stockText.outOfStock)) return 'out_of_stock';
  if (has(def.stockText.lowStock)) return 'low_stock';
  if (has(def.stockText.inStock)) return 'in_stock';
  const numeric = text.match(/^([0-9][0-9,]*)(개|ea|box|박스)?$/);
  if (numeric) {
    const count = Number(numeric[1].replace(/,/g, ''));
    if (Number.isFinite(count)) return count <= 0 ? 'out_of_stock' : 'in_stock';
  }
  return 'unknown';
}

/**
 * 주문 가능 여부(§18). 표의 주문 열이 있으면 그 표기를, 없으면 재고 상태에서 **단정할 수 있는
 * 경우만** 파생한다. 판단 불가는 `null` 이다 — `false` 로 내리지 않는다(주문 가능한 상품을
 * 불가로 보고하면 업무가 멈춘다).
 */
export function resolveSupplierOrderable(
  row: readonly string[],
  map: SupplierColumnMap,
  stockStatus: SupplierStockStatus,
  def: SupplierAdapterDefinition,
): boolean | null {
  const raw = normalizeSupplierText(cell(row, map.orderable));
  if (raw.length > 0 && def.orderableText) {
    const has = (list: readonly string[]) => list.some((k) => raw.includes(normalizeSupplierText(k)));
    if (has(def.orderableText.no)) return false;
    if (has(def.orderableText.yes)) return true;
  }
  if (stockStatus === 'out_of_stock') return false;
  if (stockStatus === 'in_stock' || stockStatus === 'low_stock') return true;
  return null;
}

/**
 * 포장단위(§19). **원문을 보존하고** 비교용 정규화 값을 따로 둔다. `10T` · `100정` · `20g` 를
 * 하나의 단위 체계로 환산하지 않는다 — V0 에서 과도한 표준화는 금지다.
 */
export function normalizeSupplierPackSize(raw: unknown): { packSize?: string; packSizeNormalized?: string } {
  const text = String(raw ?? '').trim();
  if (text.length === 0) return {};
  return { packSize: text, packSizeNormalized: normalizeSupplierText(text) };
}

// ─── 상품 식별 (§12·§13·§14) ────────────────────────────────────────────────

export type SupplierMatchStatus = 'one' | 'multiple' | 'none';

export interface SupplierMatchResult {
  status: SupplierMatchStatus;
  /** status==='one' 일 때만 채워진다(행 index). */
  rowIndex?: number;
  /** 검색어와 관련 있다고 본 후보 수. */
  candidateCount: number;
}

/**
 * 검색 결과 행 중 어느 것이 요청한 상품인지 고른다(§13).
 *
 * V0 는 AI 매칭 엔진을 만들지 않는다. 규칙은 셋뿐이다:
 *   1. 정규화 후 **정확 일치**(상품명 · 상품명+규격 · 상품코드)가 있으면 그것.
 *   2. 정확 일치가 없으면 **포함 후보**를 본다. 하나면 그것, 둘 이상이면 `multiple`.
 *   3. 후보가 없으면 `none`.
 *
 * 불확실하면 하나를 확정하지 않는다(§35) — 상위 Workflow · 사용자가 판단한다.
 */
export function matchSupplierProduct(
  rows: readonly (readonly string[])[],
  map: SupplierColumnMap,
  query: string,
): SupplierMatchResult {
  const want = normalizeSupplierText(query);
  if (want.length === 0) return { status: 'none', candidateCount: 0 };

  const exact: number[] = [];
  const partial: number[] = [];
  const limit = Math.min(rows.length, SUPPLIER_RESULT_MAX_ROWS);
  for (let i = 0; i < limit; i += 1) {
    const row = rows[i];
    if (!Array.isArray(row)) continue;
    const name = normalizeSupplierText(cell(row, map.productName));
    if (name.length === 0) continue;
    const pack = normalizeSupplierText(cell(row, map.packSize));
    const code = normalizeSupplierText(cell(row, map.supplierProductId));
    if (name === want || name + pack === want || (code.length > 0 && code === want)) {
      exact.push(i);
      continue;
    }
    // 규격까지 말한 검색어("아크클리어크림20g")가 상품명만 있는 행에 걸리도록 양방향으로 본다.
    if (name.includes(want) || want.includes(name)) partial.push(i);
  }

  if (exact.length === 1) return { status: 'one', rowIndex: exact[0], candidateCount: 1 };
  if (exact.length > 1) return { status: 'multiple', candidateCount: exact.length };
  if (partial.length === 1) return { status: 'one', rowIndex: partial[0], candidateCount: 1 };
  if (partial.length > 1) return { status: 'multiple', candidateCount: partial.length };
  return { status: 'none', candidateCount: 0 };
}

// ─── 표준 결과 (§15·§20·§22) ────────────────────────────────────────────────

/**
 * Adapter 표준 결과 한 건(§15).
 *
 * `productName` 은 **공급처 사이트가 표시한 이름**이다(§14 supplierProductName). 사용자가 말한
 * 이름은 호출부가 `sourceProductName` 으로 따로 들고 있으며 어느 쪽도 상대를 덮어쓰지 않는다.
 * 장기 캐시를 하지 않으므로 시점 표시로 `checkedAt` 만 싣는다(§22).
 */
export interface SupplierProductAvailability {
  supplierId: string;
  supplierProductId?: string;
  productName: string;
  packSize?: string;
  packSizeNormalized?: string;
  price: number | null;
  currency?: 'KRW';
  stockStatus: SupplierStockStatus;
  orderable: boolean | null;
  checkedAt: string;
}

/** 표 한 행 → 표준 결과(§15~§20). 읽지 못한 칸은 채우지 않는다. */
export function buildSupplierAvailability(
  row: readonly string[],
  map: SupplierColumnMap,
  def: SupplierAdapterDefinition,
  checkedAt: string,
): SupplierProductAvailability {
  const stockStatus = normalizeSupplierStock(cell(row, map.stock), def);
  const price = parseSupplierPrice(cell(row, map.price));
  const out: SupplierProductAvailability = {
    supplierId: def.supplierId,
    productName: cell(row, map.productName),
    price,
    stockStatus,
    orderable: resolveSupplierOrderable(row, map, stockStatus, def),
    checkedAt,
  };
  if (price !== null) out.currency = 'KRW';
  const code = cell(row, map.supplierProductId);
  // 사이트가 고유 상품코드를 주면 반드시 보존한다(§20 — 후속 product mapping 의 키).
  if (code.length > 0) out.supplierProductId = code;
  const pack = normalizeSupplierPackSize(cell(row, map.packSize));
  if (pack.packSize) {
    out.packSize = pack.packSize;
    out.packSizeNormalized = pack.packSizeNormalized;
  }
  return out;
}

// ─── 오류 코드 (§33) ────────────────────────────────────────────────────────

export const SUPPLIER_ERROR = Object.freeze({
  SITE_NOT_READY: 'SUPPLIER_SITE_NOT_READY',
  LOGIN_REQUIRED: 'SUPPLIER_LOGIN_REQUIRED',
  SEARCH_FAILED: 'SUPPLIER_SEARCH_FAILED',
  PRODUCT_NOT_FOUND: 'SUPPLIER_PRODUCT_NOT_FOUND',
  MULTIPLE_MATCHES: 'SUPPLIER_MULTIPLE_MATCHES',
  PRICE_UNAVAILABLE: 'SUPPLIER_PRICE_UNAVAILABLE',
  STOCK_UNKNOWN: 'SUPPLIER_STOCK_UNKNOWN',
  ADAPTER_OUTDATED: 'SUPPLIER_ADAPTER_OUTDATED',
  SITE_CROSS_ORIGIN: 'SUPPLIER_SITE_CROSS_ORIGIN',
  /** 등재되지 않은 공급처. allowlist 바깥 값은 명령 발행 전에 끝난다. */
  NOT_REGISTERED: 'SUPPLIER_NOT_REGISTERED',
  /** 검색어가 비었거나 허용 형상 밖이다(§9·§10). */
  QUERY_INVALID: 'SUPPLIER_QUERY_INVALID',
} as const);

export type SupplierErrorCode = (typeof SUPPLIER_ERROR)[keyof typeof SUPPLIER_ERROR];

/**
 * DOM 축 오류 → 공급처 오류(§33 normalization).
 *
 * DOM 계층의 사정(탭 없음 · 확장 미연결 · 준비 안 됨)은 공급처 화면을 쓸 수 없다는 한 가지
 * 사실로 모은다. 비밀번호 · 로그인 단계 차단(`DOM_USER_ACTION_REQUIRED`)은 **로그인 필요**로,
 * 등재 밖 이동 차단은 **cross-origin** 으로 옮긴다. 매핑이 없으면 `undefined` — 호출부가
 * 단계별 기본 오류를 쓴다.
 */
export function supplierErrorFromDom(domErrorCode: string | undefined): SupplierErrorCode | undefined {
  switch (domErrorCode) {
    case 'DOM_USER_ACTION_REQUIRED':
      return SUPPLIER_ERROR.LOGIN_REQUIRED;
    case 'DOM_CROSS_ORIGIN_BLOCKED':
      return SUPPLIER_ERROR.SITE_CROSS_ORIGIN;
    case 'DOM_SITE_NOT_ALLOWED':
    case 'DOM_TAB_NOT_FOUND':
    case 'DOM_CONTENT_UNAVAILABLE':
    case 'DOM_ELEMENT_STALE':
    case 'BROWSER_DOM_PERMISSION_REQUIRED':
    case 'O4O_EXTENSION_NOT_CONNECTED':
      return SUPPLIER_ERROR.SITE_NOT_READY;
    default:
      return undefined;
  }
}

// ─── Adapter health (§32) ───────────────────────────────────────────────────

export interface SupplierAdapterHealth {
  searchBoxFound: boolean;
  resultAreaFound: boolean;
  /** 둘 다 실패 = DOM 구조가 바뀌었다고 본다(§32). */
  outdated: boolean;
}

/**
 * 최소 health 판정(§32). "검색창을 찾을 수 있나 · 결과 영역을 찾을 수 있나" 둘뿐이다.
 * 둘 다 실패면 `SUPPLIER_ADAPTER_OUTDATED` 로 보고한다 — 사이트 탓인지 Adapter 탓인지
 * 구분할 수 있는 신호를 남기는 것이 목적이다(§31 version up 판단 입력).
 */
export function supplierAdapterHealth(searchBoxFound: boolean, resultAreaFound: boolean): SupplierAdapterHealth {
  return { searchBoxFound, resultAreaFound, outdated: !searchBoxFound && !resultAreaFound };
}

/**
 * 로그인 화면인지 추정(§5·§33). `inspect` 요소 요약만 본다 — 비밀번호 칸이 있거나
 * 로그인 표식이 보이면 사용자가 직접 로그인해야 한다는 뜻이다. **O4O 는 로그인하지 않는다**
 * (§5·§25 — 자동 fallback 금지 단계).
 */
const SUPPLIER_LOGIN_HINTS_KO: readonly string[] = Object.freeze(['로그인', '비밀번호', '아이디', '인증번호']);
const SUPPLIER_LOGIN_HINTS_EN: readonly string[] = Object.freeze(['login', 'log in', 'sign in', 'password']);

export function looksLikeSupplierLoginScreen(elements: readonly Record<string, unknown>[]): boolean {
  for (const el of elements) {
    const label = `${String(el?.name ?? '')} ${String(el?.text ?? '')}`;
    const compact = label.replace(/\s+/g, '');
    if (SUPPLIER_LOGIN_HINTS_KO.some((k) => compact.includes(k))) return true;
    const lower = label.toLowerCase();
    if (SUPPLIER_LOGIN_HINTS_EN.some((k) => lower.includes(k))) return true;
  }
  return false;
}
