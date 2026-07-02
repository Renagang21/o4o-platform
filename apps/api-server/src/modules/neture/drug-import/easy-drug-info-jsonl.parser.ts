/**
 * Easy Drug Info JSONL Parser — 의약품개요정보(e약은요) raw JSONL 파서 (DB 무관)
 *
 * WO-O4O-EASY-DRUG-INFO-PRODUCT-CANDIDATE-IMPORT-V1
 * 선행: CHECK-O4O-APPROVED-PUBLIC-DATA-API-BULK-FETCH-AND-SAMPLE-MAPPING-V1 (API3, 4,774건 전량)
 *
 * raw 파일 구조 (repo 밖, git 미추적):
 *   각 line = {"sourceDataset","fetchedAt","pageNo","rowIndex","item":{...}}
 *   item 필드: itemSeq, itemName, entpName, itemImage, efcyQesitm, useMethodQesitm,
 *              atpnWarnQesitm, atpnQesitm, intrcQesitm, seQesitm, depositMethodQesitm,
 *              openDe, updateDe, bizrno 등
 *
 *  - 본 모듈은 파일을 읽지 않는다 — 문자열(text) 또는 line 배열을 입력받아 순수 파싱한다(테스트 용이).
 *  - JSON.parse 실패 line 은 throw 하지 않고 errors[] 에 누적(무음 손실 금지).
 *  - item 래핑 여부에 관대: fetch 메타로 감싼 경우 .item 을, 평면 item 인 경우 자체를 사용한다.
 */

/** e약은요 item 필드 (전부 nullable — 공공데이터 결측 관대) */
export interface EasyDrugInfoItem {
  itemSeq?: string | null;
  itemName?: string | null;
  entpName?: string | null;
  itemImage?: string | null;
  efcyQesitm?: string | null;
  useMethodQesitm?: string | null;
  atpnWarnQesitm?: string | null;
  atpnQesitm?: string | null;
  intrcQesitm?: string | null;
  seQesitm?: string | null;
  depositMethodQesitm?: string | null;
  openDe?: string | null;
  updateDe?: string | null;
  bizrno?: string | null;
  [k: string]: unknown;
}

/** raw JSONL line 파싱 결과 (fetch 메타 + item) */
export interface ParsedEasyDrugRow {
  /** 1-base line 번호 */
  lineNumber: number;
  /** 원본 fetch 메타 (없을 수 있음) */
  sourceDataset: string | null;
  fetchedAt: string | null;
  pageNo: number | null;
  rowIndex: number | null;
  /** 언랩된 item */
  item: EasyDrugInfoItem;
}

export interface EasyDrugParseError {
  lineNumber: number | null;
  reason: string;
}

export interface EasyDrugParseResult {
  rows: ParsedEasyDrugRow[];
  errors: EasyDrugParseError[];
  /** 비어있어 skip 된 line 수 (공백/빈줄) */
  blankLines: number;
}

function asStr(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v === 'string') return v;
  return String(v);
}

function asNum(v: unknown): number | null {
  if (v == null) return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * 단일 line(JSON 문자열) → ParsedEasyDrugRow.
 * fetch 메타 래핑(`{item:{...}}`) 이면 언랩, 평면 item 이면 자체를 item 으로 본다.
 */
export function parseEasyDrugLine(line: string, lineNumber: number): ParsedEasyDrugRow {
  const obj = JSON.parse(line) as Record<string, unknown>;
  const hasWrapper = obj != null && typeof obj === 'object' && 'item' in obj;
  const item = (hasWrapper ? (obj.item as EasyDrugInfoItem) : (obj as EasyDrugInfoItem)) ?? {};
  return {
    lineNumber,
    sourceDataset: hasWrapper ? asStr(obj.sourceDataset) : null,
    fetchedAt: hasWrapper ? asStr(obj.fetchedAt) : null,
    pageNo: hasWrapper ? asNum(obj.pageNo) : null,
    rowIndex: hasWrapper ? asNum(obj.rowIndex) : null,
    item: item ?? {},
  };
}

/**
 * JSONL 텍스트(여러 line) → 파싱 결과. line 단위 오류는 errors[] 로 수집한다.
 */
export function parseEasyDrugInfoJsonl(text: string): EasyDrugParseResult {
  const errors: EasyDrugParseError[] = [];
  const rows: ParsedEasyDrugRow[] = [];
  let blankLines = 0;

  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const lineNumber = i + 1;
    if (raw.trim().length === 0) {
      blankLines += 1;
      continue;
    }
    try {
      rows.push(parseEasyDrugLine(raw, lineNumber));
    } catch (e) {
      errors.push({ lineNumber, reason: `JSON_PARSE_ERROR: ${(e as Error).message}` });
    }
  }

  return { rows, errors, blankLines };
}
