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
}

const STORAGE_KEY = 'neture:hospital-drug:local-dataset:v1';

/** 지원 확장자(파일 선택 accept 값과 파싱 진입 판정). */
export const LOCAL_DRUG_ACCEPT = '.xlsx,.xls,.csv';

/** 헤더 셀(공백 제거·소문자) → 표준 필드. 한글·영문 흔한 표기를 모은다. */
const HEADER_ALIASES: Readonly<Record<string, keyof LocalDrugRow>> = Object.freeze({
  // product_name
  제품명: 'product_name', 약품명: 'product_name', 품명: 'product_name', 상품명: 'product_name',
  제품: 'product_name', 약품: 'product_name', 명칭: 'product_name', 의약품명: 'product_name',
  productname: 'product_name', product_name: 'product_name', name: 'product_name',
  drugname: 'product_name', itemname: 'product_name',
  // ingredient
  성분: 'ingredient', 성분명: 'ingredient', 주성분: 'ingredient', 주성분명: 'ingredient',
  ingredient: 'ingredient', ingredientname: 'ingredient', maincomponent: 'ingredient',
  // strength
  함량: 'strength', 규격: 'strength', 용량: 'strength', 함량규격: 'strength',
  strength: 'strength', content: 'strength', dose: 'strength',
  // dosage_form
  제형: 'dosage_form', 제형구분: 'dosage_form', 형태: 'dosage_form', 제제: 'dosage_form',
  dosageform: 'dosage_form', form: 'dosage_form',
  // manufacturer
  제조사: 'manufacturer', 제약사: 'manufacturer', 제조회사: 'manufacturer', 업체명: 'manufacturer',
  회사명: 'manufacturer', 제조업체: 'manufacturer', 공급사: 'manufacturer',
  manufacturer: 'manufacturer', maker: 'manufacturer', company: 'manufacturer', vendor: 'manufacturer',
  // status (재고·비고 등 부가 정보)
  상태: 'status', 비고: 'status', 재고: 'status', 재고상태: 'status', 보유: 'status', 메모: 'status',
  status: 'status', note: 'status', remark: 'status', memo: 'status',
});

function normalizeHeader(raw: unknown): string {
  return String(raw ?? '').replace(/\s+/g, '').toLowerCase();
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
  if (!sheet) return { rows: [], total: 0, skipped: 0, missingNameColumn: true };

  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    blankrows: false,
    raw: false,
    defval: '',
  });
  if (matrix.length === 0) return { rows: [], total: 0, skipped: 0, missingNameColumn: true };

  // 헤더 = 첫 비어있지 않은 행.
  let headerIdx = 0;
  while (headerIdx < matrix.length && (matrix[headerIdx] ?? []).every((c) => String(c ?? '').trim() === '')) {
    headerIdx++;
  }
  const headerRow = matrix[headerIdx] ?? [];

  // 컬럼 인덱스 → 표준 필드 (첫 등장 우선).
  const colField = new Map<number, keyof LocalDrugRow>();
  headerRow.forEach((cell, i) => {
    const field = HEADER_ALIASES[normalizeHeader(cell)];
    if (field && ![...colField.values()].includes(field)) colField.set(i, field);
  });

  if (![...colField.values()].includes('product_name')) {
    return { rows: [], total: 0, skipped: 0, missingNameColumn: true };
  }

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
  return { rows, total, skipped, missingNameColumn: false };
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
