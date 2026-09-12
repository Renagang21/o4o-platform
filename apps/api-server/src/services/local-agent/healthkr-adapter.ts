/**
 * HealthKr Adapter — 약학정보원(health.kr) 화면 정의 · 표 해석 · 결과 계약 (순수)
 *
 * WO-O4O-PHARMACY-WEB-AUTOMATION-CORE-AND-HEALTHKR-ADAPTER-V0 §17~§34·§42·§48
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 이 파일이 정하는 것
 *
 *   Adapter 정의   = 검색창 · 검색 버튼 · 식별검색 입력칸 · 결과표를 찾는 **구조화 조건**(DOM 계약 5키)과
 *                    결과표 헤더 → canonical 필드 매핑. 사이트 특화 규칙은 전부 여기에만 둔다.
 *   표 해석        = read_table 이 돌려준 문자열 → DrugSearchItem · PillCandidate · DrugDetail.
 *   결과 계약      = 사이트가 실제로 표시한 값만. 추측 · 보강 · 의료적 확정 표현 없음(§22·§30·§31).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 2026-09-12 실측 (Playwright · 로그인 없이)
 *
 *   통합검색  헤더 textbox(placeholder "약물의 제품명 또는 성분명을 입력하세요.") + 버튼 "검 색" → POST →
 *             /searchDrug/search_total_result.asp 의 표: 식별/포장 · 제품명 · 성분/함량 · 효능 · 회사명 · 제형 · 구분 ·
 *             약가 · 공급유무. 제품명 셀은 `td onclick` — DOM V0 click 대상이 아니다(상세 진입은 사용자 클릭).
 *   식별검색  헤더 "식별검색" 링크 → /searchIdentity/search.asp. textbox "문자1" · "문자2" + 버튼 "검 색" →
 *             같은 페이지 표: 식별이미지 · 식별표시(앞/뒤) · 제형 · 크기(mm)[장축·단축·두께] · 제품명/성분명 · 회사명 ·
 *             출력담기. 색상 · 모양 · 분할선 · 제형 선택은 img/span 커스텀 컨트롤 — DOM V0 로 적용 불가(§38 후보).
 *   상세      /searchDrug/result_drug.asp?drug_cd=… 첫 표 = 제품 기본정보(행머리 제품명 · 성분/함량 · …),
 *             섹션 제목 "효능 · 효과" · "용법 · 용량" · "사용상의 주의사항".
 *   동일성분  /searchDrug/result_sunb.asp 는 robots Disallow → 통합검색을 **성분명**으로 다시 실행해 대체(§24).
 */

import type { DomFindQuery } from './browser-dom-contract.js';
import { validateDomFindQuery } from './browser-dom-contract.js';
import { compactAlias, type PillIdentificationInput } from './pharmacy-web-core.js';

// ─── Adapter 정의 (§20·§42) ──────────────────────────────────────────────────

export interface HealthkrAdapterDefinition {
  adapterId: 'healthkr';
  siteId: 'healthkr';
  adapterVersion: number;
  search: {
    box: readonly DomFindQuery[];
    submit: readonly DomFindQuery[];
    /** 결과표 헤더 동의어 → 필드. */
    columns: Readonly<Record<keyof DrugSearchItem, readonly string[]>>;
  };
  pill: {
    entryLinkText: string;
    front: readonly DomFindQuery[];
    back: readonly DomFindQuery[];
    submit: readonly DomFindQuery[];
    /** 결과표를 고르는 조건 — 같은 페이지의 입력 표와 구분한다. */
    resultTable: DomFindQuery;
    columns: Readonly<Record<'marks' | 'dosageForm' | 'size' | 'product' | 'company', readonly string[]>>;
  };
  detail: {
    /** 기본정보 표의 행머리 → 필드. */
    fields: Readonly<Record<keyof DrugDetailFields, readonly string[]>>;
    /** 섹션 제목(heading) — 존재 확인용(§32·§34). */
    sections: Readonly<Record<keyof DrugDetailSections, string>>;
  };
}

export const HEALTHKR_ADAPTER: HealthkrAdapterDefinition = Object.freeze({
  adapterId: 'healthkr',
  siteId: 'healthkr',
  adapterVersion: 1,
  search: Object.freeze({
    box: Object.freeze([Object.freeze({ placeholder: '제품명 또는 성분명' }), Object.freeze({ role: 'textbox', placeholder: '성분명' })]),
    submit: Object.freeze([Object.freeze({ role: 'button', text: '검색' })]),
    columns: Object.freeze({
      productName: Object.freeze(['제품명']),
      ingredient: Object.freeze(['성분/함량', '성분']),
      company: Object.freeze(['회사명', '제조사']),
      dosageForm: Object.freeze(['제형']),
      category: Object.freeze(['구분']),
      price: Object.freeze(['약가']),
      supplied: Object.freeze(['공급유무']),
    }),
  }),
  pill: Object.freeze({
    entryLinkText: '식별검색',
    front: Object.freeze([Object.freeze({ role: 'textbox', name: '문자1' })]),
    back: Object.freeze([Object.freeze({ role: 'textbox', name: '문자2' })]),
    submit: Object.freeze([Object.freeze({ role: 'button', text: '검색' })]),
    resultTable: Object.freeze({ role: 'table', text: '식별표시' }),
    columns: Object.freeze({
      marks: Object.freeze(['식별표시']),
      dosageForm: Object.freeze(['제형']),
      size: Object.freeze(['크기']),
      product: Object.freeze(['제품명/성분명', '제품명']),
      company: Object.freeze(['회사명']),
    }),
  }),
  detail: Object.freeze({
    fields: Object.freeze({
      productName: Object.freeze(['제품명']),
      ingredient: Object.freeze(['성분 / 함량', '성분/함량', '성분']),
      company: Object.freeze(['회사명', '제조사', '업체명']),
      dosageForm: Object.freeze(['제형', '성상']),
      category: Object.freeze(['구분', '전문/일반']),
      insurance: Object.freeze(['급여', '보험']),
    }),
    sections: Object.freeze({
      efficacy: '효능 · 효과',
      dosage: '용법 · 용량',
      precautions: '주의사항',
    }),
  }),
}) as HealthkrAdapterDefinition;

/** 정의 정합성 — find 조건은 DOM 계약 5키 형상만(§46). 테스트가 위반 0 을 단언한다. */
export function findHealthkrAdapterViolations(def: HealthkrAdapterDefinition = HEALTHKR_ADAPTER): string[] {
  const out: string[] = [];
  const queries = [...def.search.box, ...def.search.submit, ...def.pill.front, ...def.pill.back, ...def.pill.submit, def.pill.resultTable];
  for (const q of queries) if (!validateDomFindQuery(q).ok) out.push('find 조건은 DOM 계약 5키 형상만(§46)');
  if (!Number.isInteger(def.adapterVersion) || def.adapterVersion < 1) out.push('adapterVersion 은 1 이상 정수');
  if (def.pill.entryLinkText.trim().length === 0) out.push('식별검색 진입 링크 텍스트 필요');
  return out;
}

// ─── 표 해석 공통 ───────────────────────────────────────────────────────────

const NO_COLUMN = -1;

function matchColumn(columns: readonly string[], synonyms: readonly string[]): number {
  const wanted = synonyms.map(compactAlias);
  for (const pass of [0, 1]) {
    for (let i = 0; i < columns.length; i += 1) {
      const header = compactAlias(columns[i]);
      if (header.length === 0) continue;
      if (pass === 0 ? wanted.includes(header) : wanted.some((w) => header.includes(w))) return i;
    }
  }
  return NO_COLUMN;
}

function cell(row: readonly string[], index: number): string {
  if (index === NO_COLUMN || index < 0 || index >= row.length) return '';
  return String(row[index] ?? '').trim();
}

// ─── 의약품 검색 (§21·§22·§23) ──────────────────────────────────────────────

export interface DrugSearchItem {
  productName: string;
  ingredient: string;
  company: string;
  dosageForm: string;
  category: string;
  /** 사이트 표시 원문(예: "390원/1정"). 숫자로 바꾸지 않는다. */
  price: string;
  supplied: string;
}

/** 검색 결과표 → 항목. 제품명 열이 없으면 해석하지 않는다(ENTRYPOINT_OUTDATED 의 입력). */
export function parseHealthkrSearchTable(
  columns: readonly string[],
  rows: readonly (readonly string[])[],
  def: HealthkrAdapterDefinition = HEALTHKR_ADAPTER,
): { ok: boolean; items: DrugSearchItem[] } {
  const c = def.search.columns;
  const idx = {
    productName: matchColumn(columns, c.productName),
    ingredient: matchColumn(columns, c.ingredient),
    company: matchColumn(columns, c.company),
    dosageForm: matchColumn(columns, c.dosageForm),
    category: matchColumn(columns, c.category),
    price: matchColumn(columns, c.price),
    supplied: matchColumn(columns, c.supplied),
  };
  if (idx.productName === NO_COLUMN) return { ok: false, items: [] };
  const items: DrugSearchItem[] = [];
  for (const row of rows) {
    if (!Array.isArray(row)) continue;
    const productName = cell(row, idx.productName);
    if (productName.length === 0) continue;
    items.push({
      productName,
      ingredient: cell(row, idx.ingredient),
      company: cell(row, idx.company),
      dosageForm: cell(row, idx.dosageForm),
      category: cell(row, idx.category),
      price: cell(row, idx.price),
      supplied: cell(row, idx.supplied),
    });
  }
  return { ok: true, items };
}

export interface DrugMatchResult {
  status: 'one' | 'multiple' | 'none';
  index?: number;
  candidateCount: number;
}

/**
 * 검색 결과 중 요청한 제품(§23·§26). 정규화 후 제품명 정확 일치 1개 → one. 그 밖에 검색어를 포함하는
 * 제품명이 1개면 one, 여럿이면 multiple(후보 목록은 호출부가 실어 보낸다). 제품명에 검색어가 없어도 사이트가
 * 결과를 돌려줬으면(성분명 · 영문명 검색) 그 결과가 후보다. 결과 자체가 없을 때만 none 이다.
 * AI 가 임의로 하나를 확정하지 않는다.
 */
export function matchHealthkrDrug(items: readonly DrugSearchItem[], query: string): DrugMatchResult {
  const want = compactAlias(query);
  if (want.length === 0) return { status: 'none', candidateCount: 0 };
  const exact = items.map((it, i) => (compactAlias(it.productName) === want ? i : -1)).filter((i) => i >= 0);
  if (exact.length === 1) return { status: 'one', index: exact[0], candidateCount: 1 };
  if (exact.length > 1) return { status: 'multiple', candidateCount: exact.length };
  const partial = items.map((it, i) => (compactAlias(it.productName).includes(want) ? i : -1)).filter((i) => i >= 0);
  if (partial.length === 1) return { status: 'one', index: partial[0], candidateCount: 1 };
  if (partial.length > 1) return { status: 'multiple', candidateCount: partial.length };
  // 성분명 · 영문명으로 검색하면 제품명에 검색어가 없다 — 사이트가 돌려준 결과가 곧 후보다(1건이면 그것).
  if (items.length === 1) return { status: 'one', index: 0, candidateCount: 1 };
  if (items.length > 1) return { status: 'multiple', candidateCount: items.length };
  return { status: 'none', candidateCount: 0 };
}

// ─── 동일성분 (§24·§25·§26) ─────────────────────────────────────────────────

export interface IngredientKey {
  /** 함량 · 부가 표기를 뗀 성분명(예: "Amlodipine Camsylate"). 재검색 검색어가 된다. */
  name: string;
  /** "외 1" 처럼 성분이 둘 이상인 복합제. V0 는 동일성분을 정의하지 않는다(§25 범위). */
  compound: boolean;
}

/**
 * "Amlodipine Camsylate 7.841mg" → { name: "Amlodipine Camsylate", compound: false }
 * "Amlodipine Camsylate 7.841mg 외 1" → compound: true.
 * 숫자+단위(mg · g · ml · mcg · IU · %) 이후를 버린다. 남는 것이 없으면 name 은 빈 문자열.
 */
const COMPOUND_MARKER = '외';

export function ingredientKeyOf(ingredientCell: string): IngredientKey {
  const raw = String(ingredientCell ?? '').replace(/\s+/g, ' ').trim();
  // "외 1" 표기는 문자열로 찾는다(한글 정규식 리터럴 금지 — esbuild ascii charset).
  const outsideAt = raw.indexOf(' ' + COMPOUND_MARKER);
  const compound = outsideAt >= 0;
  const cut = raw.search(/\s[0-9][0-9.,]*\s*(mg|g|ml|mcg|iu|%)/i);
  let name = cut >= 0 ? raw.slice(0, cut) : raw;
  const nameOutside = name.indexOf(' ' + COMPOUND_MARKER);
  if (nameOutside >= 0) name = name.slice(0, nameOutside);
  return { name: name.trim(), compound };
}

// ─── 낱알 식별 (§27~§31) ────────────────────────────────────────────────────

export interface PillCandidate {
  /** 사이트 표시 원문(예: "HMP / AM 5"). */
  marks: string;
  dosageForm: string;
  /** 장축 · 단축 · 두께(mm) 원문. 표가 주지 않으면 빈 문자열. */
  size: { long: string; short: string; thick: string };
  /** 제품명/성분명 열 원문. */
  product: string;
  company: string;
}

/**
 * 식별검색 결과표 → 후보(§30). 헤더는 7개("크기(mm)" 하나)이고 데이터 행은 크기가 3셀로 펼쳐져 9개다 —
 * 헤더 index 로 셀을 고르면 어긋나므로, 행 길이가 헤더보다 2 길면 크기 뒤 열을 2칸 밀어 읽는다.
 */
export function parseHealthkrPillTable(
  columns: readonly string[],
  rows: readonly (readonly string[])[],
  def: HealthkrAdapterDefinition = HEALTHKR_ADAPTER,
): { ok: boolean; candidates: PillCandidate[] } {
  const c = def.pill.columns;
  const iMarks = matchColumn(columns, c.marks);
  const iForm = matchColumn(columns, c.dosageForm);
  const iSize = matchColumn(columns, c.size);
  const iProduct = matchColumn(columns, c.product);
  const iCompany = matchColumn(columns, c.company);
  if (iMarks === NO_COLUMN || iProduct === NO_COLUMN) return { ok: false, candidates: [] };
  const candidates: PillCandidate[] = [];
  for (const row of rows) {
    if (!Array.isArray(row)) continue;
    // 2단 헤더의 둘째 줄(장축 · 단축 · 두께)은 read_table 에 데이터 행으로 온다 — 셀 수가 헤더보다 적으면 건너뛴다.
    if (row.length < columns.length) continue;
    const expanded = row.length >= columns.length + 2 && iSize !== NO_COLUMN;
    const shift = (i: number) => (expanded && i > iSize ? i + 2 : i);
    const product = cell(row, shift(iProduct));
    const marks = cell(row, iMarks);
    if (product.length === 0 && marks.length === 0) continue;
    candidates.push({
      marks,
      dosageForm: cell(row, iForm),
      size: expanded
        ? { long: cell(row, iSize), short: cell(row, iSize + 1), thick: cell(row, iSize + 2) }
        : { long: cell(row, iSize), short: '', thick: '' },
      product,
      company: cell(row, shift(iCompany)),
    });
  }
  return { ok: true, candidates };
}

/** V0 에서 DOM 으로 사이트에 적용한 조건과 적용하지 못한 조건(§28·§38). 사용자에게 그대로 알린다. */
export function splitPillConditions(input: PillIdentificationInput): { applied: string[]; unapplied: string[] } {
  const applied: string[] = [];
  const unapplied: string[] = [];
  if (input.frontMark) applied.push('frontMark');
  if (input.backMark) applied.push('backMark');
  for (const k of ['color', 'shape', 'line', 'dosageForm'] as const) if (input[k]) unapplied.push(k);
  return { applied, unapplied };
}

// ─── 의약품 상세 (§32·§33·§34) ─────────────────────────────────────────────

export interface DrugDetailFields {
  productName: string;
  ingredient: string;
  company: string;
  dosageForm: string;
  category: string;
  insurance: string;
}

export interface DrugDetailSections {
  efficacy: boolean;
  dosage: boolean;
  precautions: boolean;
}

/** 기본정보 셀 안의 보조 링크 텍스트("복사" · "동일성분 의약품")를 뗀다. 값 자체는 바꾸지 않는다. */
const DETAIL_HELPER_TEXTS: readonly string[] = Object.freeze(['복사', '동일성분 의약품', '허가정보 바로가기']);

export function cleanHealthkrDetailValue(value: string): string {
  // 공백 단위 토큰으로 보조 링크 텍스트를 뗀다(한글 정규식 리터럴 금지). 값 자체는 바꾸지 않는다.
  let text = ' ' + String(value ?? '').replace(/\s+/g, ' ').trim() + ' ';
  for (const helper of DETAIL_HELPER_TEXTS) text = text.split(' ' + helper + ' ').join(' ');
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * 기본정보 표(행머리 + 값) → 필드(§32). read_table 은 첫 행에 th 가 있으면 그 행을 헤더로 돌려주므로,
 * `columns` 도 데이터 행으로 함께 본다(행머리 표는 열 머리가 없다). 못 찾은 필드는 빈 문자열이다.
 */
export function parseHealthkrDetailTable(
  columns: readonly string[],
  rows: readonly (readonly string[])[],
  def: HealthkrAdapterDefinition = HEALTHKR_ADAPTER,
): DrugDetailFields {
  const all: (readonly string[])[] = [columns, ...rows].filter((r) => Array.isArray(r) && r.length >= 2);
  const pick = (synonyms: readonly string[]): string => {
    const wanted = synonyms.map(compactAlias);
    for (const pass of [0, 1]) {
      for (const r of all) {
        const head = compactAlias(r[0]);
        if (head.length === 0) continue;
        if (pass === 0 ? wanted.includes(head) : wanted.some((w) => head.includes(w))) {
          return cleanHealthkrDetailValue(String(r[1] ?? ''));
        }
      }
    }
    return '';
  };
  const f = def.detail.fields;
  return {
    productName: pick(f.productName),
    ingredient: pick(f.ingredient),
    company: pick(f.company),
    dosageForm: pick(f.dosageForm),
    category: pick(f.category),
    insurance: pick(f.insurance),
  };
}

// ─── 오류 코드 (§48) ────────────────────────────────────────────────────────

export const HEALTHKR_ERROR = Object.freeze({
  DRUG_NOT_FOUND: 'HEALTHKR_DRUG_NOT_FOUND',
  MULTIPLE_MATCHES: 'HEALTHKR_MULTIPLE_MATCHES',
  SAME_INGREDIENT_UNAVAILABLE: 'HEALTHKR_SAME_INGREDIENT_UNAVAILABLE',
  PILL_NO_MATCH: 'HEALTHKR_PILL_NO_MATCH',
  PILL_MULTIPLE_MATCHES: 'HEALTHKR_PILL_MULTIPLE_MATCHES',
  DETAIL_UNAVAILABLE: 'HEALTHKR_DETAIL_UNAVAILABLE',
} as const);

export type HealthkrErrorCode = (typeof HEALTHKR_ERROR)[keyof typeof HEALTHKR_ERROR];

/** 결과 요약에 실을 후보 상한 — 페이지 전체를 넘기지 않는다(§33). */
export const HEALTHKR_MAX_CANDIDATES = 10;
