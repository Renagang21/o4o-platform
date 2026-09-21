/**
 * 원내 약품 Local Dataset — 브라우저 안에서만 사는 원내 약품 데이터 (Context)
 *
 * WO-O4O-HOSPITAL-DRUG-BROWSER-LOCAL-DATA-CONNECT-V1
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 이 모듈이 다루는 경계
 *
 *   "원내 약품 파일 연결" 은 **데이터 Context** 이지 자동화 실행 환경(Local Agent · PC 자동화)이
 *   아니다. 사용자가 고른 Excel/CSV 를 **브라우저에서 파싱**해 표준 필드로 정규화하고 localStorage
 *   에 담아 둔다. 이 데이터는 **브라우저 밖으로 나가지 않는다** — 서버에 업로드하지 않고, 새 서버
 *   저장소도 만들지 않으며, Local Agent 도 요구하지 않는다(WO §제약).
 *
 *   원내 조회("우리 원내에 이 약 있어?")는 이 데이터를 **브라우저에서** 뒤져 답한다(§queryLocalRows).
 *   research(효능 조사)는 여전히 서버 공통 Core(Gemini grounding)로 가고, 원내 Context 만 여기서 얹는다.
 */

import * as XLSX from 'xlsx';

/** Excel/CSV 한 행을 표준화한 원내 약품 항목. product_name 만 필수, 나머지는 있으면 채운다. */
export interface LocalDrugRow {
  product_name: string;
  ingredient?: string;
  strength?: string;
  dosage_form?: string;
  manufacturer?: string;
  status?: string;
}

/** localStorage 에 저장되는 원내 데이터셋. */
export interface LocalDrugDataset {
  /** 스키마 버전 — 형식이 바뀌면 올린다(과거 값은 무시). */
  v: 1;
  fileName: string;
  /** 연결 시각(ISO). */
  connectedAt: string;
  count: number;
  rows: LocalDrugRow[];
}

export interface ParseOutcome {
  rows: LocalDrugRow[];
  /** 데이터 행 총수(헤더 제외). */
  total: number;
  /** product_name 이 비어 건너뛴 행 수. */
  skipped: number;
  /** 헤더에서 product_name 컬럼을 못 찾았으면 true(연결 거부 사유). */
  missingNameColumn: boolean;
  /** 헤더로 판정한 행의 0-기반 인덱스. 실패 시 -1. **값이 아니라 위치**만(디버그 로그용). */
  headerRowIndex: number;
  /**
   * 연결 실패 시 안내용 — 인식한 **열 제목 후보**(데이터 값 행이 아님). 최대 12개·각 24자.
   * "제품명/약품명/품목명 등의 열이 있는지 확인" 안내를 돕는다.
   */
  detectedHeaders: string[];
}

const STORAGE_KEY = 'neture:hospital-drug:local-dataset:v1';

/** 지원 확장자(파일 선택 accept 값과 파싱 진입 판정). */
export const LOCAL_DRUG_ACCEPT = '.xlsx,.xls,.csv';

/** 헤더 셀(공백 제거·소문자) → 표준 필드. 한글·영문 흔한 표기를 모은다. */
const HEADER_ALIASES: Readonly<Record<string, keyof LocalDrugRow>> = Object.freeze({
  // product_name — 현업 원내 목록의 실제 열명(원내명·품목명 등) 포함
  제품명: 'product_name', 약품명: 'product_name', 품명: 'product_name', 상품명: 'product_name',
  제품: 'product_name', 약품: 'product_name', 명칭: 'product_name', 의약품명: 'product_name',
  품목명: 'product_name', 원내명: 'product_name', 원내약품명: 'product_name', 원내약명: 'product_name',
  원내제품명: 'product_name', 약품상품명: 'product_name',
  productname: 'product_name', product_name: 'product_name', name: 'product_name',
  drugname: 'product_name', itemname: 'product_name',
  // ingredient
  성분: 'ingredient', 성분명: 'ingredient', 주성분: 'ingredient', 주성분명: 'ingredient',
  일반명: 'ingredient',
  ingredient: 'ingredient', ingredientname: 'ingredient', maincomponent: 'ingredient',
  genericname: 'ingredient',
  // strength
  함량: 'strength', 규격: 'strength', 용량: 'strength', 함량규격: 'strength', 함량단위: 'strength',
  strength: 'strength', content: 'strength', dose: 'strength',
  // dosage_form
  제형: 'dosage_form', 제형구분: 'dosage_form', 형태: 'dosage_form', 제제: 'dosage_form',
  dosageform: 'dosage_form', form: 'dosage_form',
  // manufacturer
  제조사: 'manufacturer', 제약사: 'manufacturer', 제조회사: 'manufacturer', 업체명: 'manufacturer',
  회사명: 'manufacturer', 제조업체: 'manufacturer', 공급사: 'manufacturer', 제조원: 'manufacturer',
  제약회사: 'manufacturer',
  manufacturer: 'manufacturer', maker: 'manufacturer', company: 'manufacturer', vendor: 'manufacturer',
  // status (재고·비고 등 부가 정보)
  상태: 'status', 비고: 'status', 재고: 'status', 재고상태: 'status', 보유: 'status', 메모: 'status',
  status: 'status', note: 'status', remark: 'status', memo: 'status',
});

/**
 * 헤더 셀 구분자 — 괄호·슬래시·가운뎃점·하이픈·쉼표 등. `제품명(약품명)` · `성분/함량` · `제품명 · 약품명`
 * 처럼 한 셀에 별칭이 여러 개 붙은 실제 파일을 토큰으로 쪼개 인식하려고 쓴다.
 */
const HEADER_SEP = /[()[\]{}<>/,.·・∙‧|、，;:：\-–—_~]+/g;

/**
 * containment(부분일치) 폴백에 쓰는 별칭 키 — 한글·**3자 이상**만 사용한다. `약품`·`제품`·`성분` 같은
 * 2자 일반 키는 `약품코드`·`성분코드` 같은 **다른 열명의 부분**이라 오인 위험이 커서 제외한다.
 * 긴 키를 먼저 본다(가장 구체적인 일치 우선).
 */
const hasNonAscii = (s: string): boolean => {
  for (let i = 0; i < s.length; i++) if (s.charCodeAt(i) > 127) return true;
  return false;
};
const CONTAINMENT_KEYS: readonly string[] = Object.freeze(
  Object.keys(HEADER_ALIASES)
    .filter((k) => k.length >= 3 && hasNonAscii(k))
    .sort((a, b) => b.length - a.length),
);

function normalizeHeader(raw: unknown): string {
  return String(raw ?? '').replace(/\s+/g, '').toLowerCase();
}

type HeaderMatchTier = 'exact' | 'token' | 'contains';

/**
 * 헤더 셀 하나를 표준 필드로 해석한다. 세 단계(엄격 → 느슨):
 *   ① exact  — 셀 전체(공백/소문자 정규화)가 별칭과 정확히 일치. 단순 파일·기존 별칭.
 *   ② token  — 구분자로 쪼갠 토큰 중 하나가 별칭과 일치. `제품명(약품명)` · `성분/함량`.
 *   ③ contains — 구분자 제거 후 3자+ 한글 별칭을 부분 포함. `원내제품명` · `주성분함량`.
 * tier 를 함께 돌려줘 헤더 행 판정에서 약한(contains) 단독 일치를 걸러낼 수 있게 한다.
 * 데이터 값(예: `아세트아미노펜`)은 어떤 별칭과도 일치하지 않아 헤더로 오인되지 않는다.
 */
function resolveHeaderField(raw: unknown): { field: keyof LocalDrugRow; tier: HeaderMatchTier } | undefined {
  const base = normalizeHeader(raw);
  if (!base) return undefined;
  const direct = HEADER_ALIASES[base];
  if (direct) return { field: direct, tier: 'exact' };

  const tokens = base.split(HEADER_SEP).filter(Boolean);
  if (tokens.length > 1) {
    for (const tok of tokens) {
      const f = HEADER_ALIASES[tok];
      if (f) return { field: f, tier: 'token' };
    }
  }

  const collapsed = base.replace(HEADER_SEP, '');
  for (const key of CONTAINMENT_KEYS) {
    if (collapsed.includes(key)) return { field: HEADER_ALIASES[key], tier: 'contains' };
  }
  return undefined;
}

interface HeaderPick {
  index: number;
  colField: Map<number, keyof LocalDrugRow>;
}

/** 헤더 후보 스캔 상한 — 앞에 제목·작성일·병원명 같은 행이 있어도 2~10행 아래 헤더를 잡을 여유. */
const HEADER_SCAN_LIMIT = 30;

/**
 * 헤더 행을 **자동 탐색**한다. 첫 비어있지 않은 행을 무조건 쓰지 않는다 — 앞쪽에 제목/작성일/부서명 행이
 * 있을 수 있어서다. 각 후보 행에서 알아본 표준 필드 수(중복 제외)를 점수로 삼아, product_name 을 포함하는
 * 행 중 점수가 가장 높은(동점이면 가장 위) 행을 헤더로 뽑는다. product_name 이 contains 단독(점수 1)으로만
 * 잡히면 문장형 제목 행일 수 있어 헤더로 인정하지 않는다.
 */
function detectHeader(matrix: unknown[][]): HeaderPick | null {
  const scanEnd = Math.min(matrix.length, HEADER_SCAN_LIMIT);
  let best: { pick: HeaderPick; score: number } | null = null;
  for (let idx = 0; idx < scanEnd; idx++) {
    const row = matrix[idx] ?? [];
    if (row.every((c) => String(c ?? '').trim() === '')) continue;

    const colField = new Map<number, keyof LocalDrugRow>();
    let pnTier: HeaderMatchTier | null = null;
    row.forEach((cell, i) => {
      const res = resolveHeaderField(cell);
      if (!res) return;
      if ([...colField.values()].includes(res.field)) return; // 필드 첫 등장만
      colField.set(i, res.field);
      if (res.field === 'product_name') pnTier = res.tier;
    });

    if (!colField.size || !pnTier) continue; // 헤더는 product_name 을 포함해야 한다
    const score = colField.size;
    if (score === 1 && pnTier === 'contains') continue; // 약한 단독 일치 → 헤더 아님

    if (!best || score > best.score) best = { pick: { index: idx, colField }, score };
  }
  return best?.pick ?? null;
}

/**
 * 연결 실패 시 화면에 보여줄 **열 제목 후보**를 고른다 — 데이터 값 행이 아니라, 스캔 범위에서 알아본 필드가
 * 가장 많은 행(없으면 첫 비어있지 않은 행)의 셀 텍스트. 최대 12개·각 24자로 자른다(원문 노출 최소화).
 */
function collectHeaderCandidates(matrix: unknown[][]): string[] {
  const scanEnd = Math.min(matrix.length, HEADER_SCAN_LIMIT);
  let bestRow: unknown[] | null = null;
  let bestHits = -1;
  let firstNonEmpty: unknown[] | null = null;
  for (let idx = 0; idx < scanEnd; idx++) {
    const row = matrix[idx] ?? [];
    if (row.every((c) => String(c ?? '').trim() === '')) continue;
    if (!firstNonEmpty) firstNonEmpty = row;
    const hits = row.reduce<number>((n, c) => (resolveHeaderField(c) ? n + 1 : n), 0);
    if (hits > bestHits) {
      bestHits = hits;
      bestRow = row;
    }
  }
  const pick = (bestHits > 0 ? bestRow : firstNonEmpty) ?? [];
  return pick
    .map((c) => String(c ?? '').trim())
    .filter(Boolean)
    .slice(0, 12)
    .map((s) => (s.length > 24 ? `${s.slice(0, 24)}…` : s));
}

/** 값 정규화(공백·소문자 제거) — 검색 매칭 축. 한글은 정규식 리터럴 대신 문자열 연산. */
function compact(s: unknown): string {
  return String(s ?? '').replace(/\s+/g, '').toLowerCase();
}

/** 파일 → ArrayBuffer. 최신 브라우저는 Blob.arrayBuffer, 그 밖(구형·일부 테스트 환경)은 FileReader. */
function readArrayBuffer(file: Blob): Promise<ArrayBuffer> {
  if (typeof file.arrayBuffer === 'function') return file.arrayBuffer();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error ?? new Error('file read failed'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Excel(xlsx/xls) · CSV 를 **브라우저에서** 파싱해 표준 행으로 정규화한다. 첫 시트·첫 헤더 행을 쓴다.
 * product_name 컬럼을 못 찾으면 missingNameColumn=true 로 알린다(연결 거부).
 *
 * 인코딩: xlsx(ZIP·PK)·xls(OLE)는 바이너리(array)로, CSV/텍스트는 **UTF-8 로 디코드**해 문자열(string)로
 * 넘긴다 — SheetJS array 모드는 BOM 없는 CSV 를 CP1252 로 오독해 한글이 깨진다. CSV 는 UTF-8 권장(한글이
 * 깨지면 xlsx 로 저장). xlsx/xls 는 인코딩 문제가 없다.
 */
export async function parseDrugFile(file: File): Promise<ParseOutcome> {
  const buf = await readArrayBuffer(file);
  const bytes = new Uint8Array(buf);
  const isZip = bytes[0] === 0x50 && bytes[1] === 0x4b; // 'PK' — xlsx
  const isOle = bytes[0] === 0xd0 && bytes[1] === 0xcf; // xls (OLE compound)
  let wb;
  if (isZip || isOle) {
    wb = XLSX.read(bytes, { type: 'array' });
  } else {
    let text = new TextDecoder('utf-8').decode(bytes);
    if (text.charCodeAt(0) === 0xfeff) text = text.slice(1); // BOM 제거
    wb = XLSX.read(text, { type: 'string' });
  }
  const first = wb.SheetNames[0];
  const sheet = first ? wb.Sheets[first] : undefined;
  if (!sheet) return { rows: [], total: 0, skipped: 0, missingNameColumn: true, headerRowIndex: -1, detectedHeaders: [] };

  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    blankrows: false,
    raw: false,
    defval: '',
  });
  if (matrix.length === 0) return { rows: [], total: 0, skipped: 0, missingNameColumn: true, headerRowIndex: -1, detectedHeaders: [] };

  // 헤더 행 자동 탐색 — 첫 비어있지 않은 행 고정이 아니라, product_name 을 포함하는 최고 점수 행.
  const header = detectHeader(matrix);
  if (!header) {
    return {
      rows: [],
      total: 0,
      skipped: 0,
      missingNameColumn: true,
      headerRowIndex: -1,
      detectedHeaders: collectHeaderCandidates(matrix),
    };
  }
  const { index: headerIdx, colField } = header;

  const rows: LocalDrugRow[] = [];
  let total = 0;
  let skipped = 0;
  for (let r = headerIdx + 1; r < matrix.length; r++) {
    const cells = matrix[r] ?? [];
    if (cells.every((c) => String(c ?? '').trim() === '')) continue;
    total++;
    const row: LocalDrugRow = { product_name: '' };
    colField.forEach((field, i) => {
      const v = String(cells[i] ?? '').trim();
      if (v) row[field] = v;
    });
    if (!row.product_name) {
      skipped++;
      continue;
    }
    rows.push(row);
  }
  return { rows, total, skipped, missingNameColumn: false, headerRowIndex: headerIdx, detectedHeaders: [] };
}

export function makeDataset(fileName: string, rows: LocalDrugRow[]): LocalDrugDataset {
  return { v: 1, fileName, connectedAt: new Date().toISOString(), count: rows.length, rows };
}

/** 저장 — localStorage 초과 등 실패는 던지지 않고 사유를 돌려준다. */
export function saveLocalDataset(ds: LocalDrugDataset): { ok: true } | { ok: false; reason: 'quota' | 'error' } {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ds));
    return { ok: true };
  } catch (err) {
    const name = (err as { name?: string })?.name ?? '';
    return { ok: false, reason: name === 'QuotaExceededError' || name === 'NS_ERROR_DOM_QUOTA_REACHED' ? 'quota' : 'error' };
  }
}

/** 새로고침 후에도 유지되는 원내 데이터셋을 읽는다. 손상·구버전은 null. */
export function loadLocalDataset(): LocalDrugDataset | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      (parsed as LocalDrugDataset).v !== 1 ||
      !Array.isArray((parsed as LocalDrugDataset).rows)
    ) {
      return null;
    }
    return parsed as LocalDrugDataset;
  } catch {
    return null;
  }
}

export function clearLocalDataset(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* 저장소 접근 불가 — 무시(§per-viewer). */
  }
}

/**
 * 원내 행 검색 — terms 중 하나라도 지정 필드(기본: 제품명·성분)에 contains 매칭되면 채택.
 * 값 원문은 노출하지 않고, 매칭된 행만 돌려준다.
 */
export function queryLocalRows(
  rows: readonly LocalDrugRow[],
  terms: readonly string[],
  opts?: { fields?: (keyof LocalDrugRow)[]; limit?: number },
): LocalDrugRow[] {
  const needles = terms.map(compact).filter((t) => t.length >= 2);
  if (needles.length === 0) return [];
  const fields = opts?.fields ?? (['product_name', 'ingredient'] as (keyof LocalDrugRow)[]);
  const limit = opts?.limit ?? 50;
  const out: LocalDrugRow[] = [];
  for (const row of rows) {
    const hay = fields.map((f) => compact(row[f])).join('');
    if (needles.some((n) => hay.includes(n))) {
      out.push(row);
      if (out.length >= limit) break;
    }
  }
  return out;
}

/**
 * research 본문에 등장한 성분과 같은 성분의 원내 행을 찾는다(동일성분 결합).
 * 원내 데이터셋 자체의 성분 어휘로 research 본문을 훑어, 클라이언트만으로 "동일성분 원내약" 을 근사한다.
 */
export function matchLocalByResearchIngredients(
  rows: readonly LocalDrugRow[],
  researchContent: string,
  limit = 50,
): LocalDrugRow[] {
  const hayResearch = compact(researchContent);
  if (!hayResearch) return [];
  const ingredients = new Set<string>();
  for (const row of rows) {
    const ing = compact(row.ingredient);
    if (ing.length >= 2) ingredients.add(ing);
  }
  const mentioned = [...ingredients].filter((ing) => hayResearch.includes(ing));
  if (mentioned.length === 0) return [];
  const out: LocalDrugRow[] = [];
  for (const row of rows) {
    if (mentioned.includes(compact(row.ingredient))) {
      out.push(row);
      if (out.length >= limit) break;
    }
  }
  return out;
}

/** §7 — 함량이 지정되면 그 함량과 일치하는 행을 앞으로(성분→함량 축). 서버 renderLocalBlock 과 같은 규칙. */
function orderRows(rows: LocalDrugRow[], strength: string | null): LocalDrugRow[] {
  if (!strength) return rows;
  const want = compact(strength);
  const match = (r: LocalDrugRow) => compact(r.strength).includes(want);
  return [...rows].sort((a, b) => (match(a) === match(b) ? 0 : match(a) ? -1 : 1));
}

/** 원내 행 한 줄 — canonical 필드만, 없는 값은 비운다(지어내지 않음). 서버 renderRow 와 동일 형식. */
function renderRow(row: LocalDrugRow): string {
  const parts: string[] = [];
  if (row.product_name) parts.push(row.product_name);
  if (row.ingredient) parts.push(`성분 ${row.ingredient}`);
  if (row.strength) parts.push(`함량 ${row.strength}`);
  if (row.dosage_form) parts.push(`제형 ${row.dosage_form}`);
  if (row.manufacturer) parts.push(`제조사 ${row.manufacturer}`);
  return `- ${parts.join(' · ') || '(표시 가능한 항목 없음)'}`;
}

/**
 * 원내 조회 결과 블록. 서버 `renderLocalBlock` 과 같은 문구·형식을 브라우저에서 재현한다
 * (연결/미연결 안내는 화면 배지가 담당하므로 여기서는 매칭 결과만).
 */
export function renderLocalContextBlock(matches: LocalDrugRow[], strength: string | null): string {
  if (matches.length === 0) {
    return '[원내 약품] 원내 목록에서 일치하는 항목을 찾지 못했습니다.';
  }
  const rows = orderRows(matches, strength);
  const shown = rows.slice(0, 20).map(renderRow);
  const head = `[원내 약품] ${rows.length}건 확인`;
  let note = '';
  if (strength) {
    const anyMatch = rows.some((r) => compact(r.strength).includes(compact(strength)));
    if (!anyMatch) note = `\n(참고: 요청하신 함량 ${strength} 과(와) 정확히 일치하는 항목은 확인되지 않았습니다.)`;
  }
  return `${head}\n${shown.join('\n')}${note}`;
}
