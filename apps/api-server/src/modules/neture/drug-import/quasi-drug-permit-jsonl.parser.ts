/**
 * Quasi-Drug Permit JSONL Parser — 의약외품 제품 허가정보 raw JSONL 파서 (DB 무관)
 *
 * WO-O4O-QUASI-DRUG-PUBLIC-CANDIDATE-IMPORT-MAPPER-AND-SERVICE-V1
 * 선행: CHECK-O4O-QUASI-DRUG-PUBLIC-SEED-MAPPING-V1,
 *       WO-O4O-QUASI-DRUG-PUBLIC-RAW-RESTORE-AND-FIELD-SAMPLE-DRYRUN-V1,
 *       WO-O4O-QUASI-DRUG-PUBLIC-RAW-REMAINDER-FETCH-AND-FULL-DRYRUN-V1
 *
 * raw 파일 구조 (repo 밖, git 미추적):
 *   각 line = {"sourceDataset","fetchedAt","pageNo","rowIndex","item":{...}}
 *   item 20필드: ITEM_SEQ, ITEM_NAME, ENTP_NAME, ITEM_PERMIT_DATE, ITEM_NO,
 *     CANCEL_CODE_NAME, CANCEL_DATE, MAIN_INGR, ADIT_INGR, CLASS_NO, CLASS_NO_NAME,
 *     PERMIT_KIND_CODE_NM, INDUTY_CODE, MANUF_COUNTRY_NAMES,
 *     EE_DOC_DATA, UD_DOC_DATA, NB_DOC_DATA, ENTP_NO, ENTP_SEQ, BIZRNO
 *
 *  - 본 모듈은 파일을 읽지 않는다 — 문자열(text) 또는 line 을 입력받아 순수 파싱한다(테스트 용이).
 *  - JSON.parse 실패 line 은 throw 하지 않고 errors[] 에 누적(무음 손실 금지).
 *  - item 래핑 여부에 관대: fetch 메타로 감싼 경우 .item 을, 평면 item 인 경우 자체를 사용한다.
 */

/** 의약외품 item 필드 (전부 nullable — 공공데이터 결측 관대) */
export interface QuasiDrugPermitItem {
  ITEM_SEQ?: string | null;
  ITEM_NAME?: string | null;
  ENTP_NAME?: string | null;
  ITEM_PERMIT_DATE?: string | null;
  ITEM_NO?: string | null;
  CANCEL_CODE_NAME?: string | null;
  CANCEL_DATE?: string | null;
  MAIN_INGR?: string | null;
  ADIT_INGR?: string | null;
  CLASS_NO?: string | null;
  CLASS_NO_NAME?: string | null;
  PERMIT_KIND_CODE_NM?: string | null;
  INDUTY_CODE?: string | null;
  MANUF_COUNTRY_NAMES?: string | null;
  EE_DOC_DATA?: string | null;
  UD_DOC_DATA?: string | null;
  NB_DOC_DATA?: string | null;
  ENTP_NO?: string | null;
  ENTP_SEQ?: string | null;
  BIZRNO?: string | null;
  [k: string]: unknown;
}

/** raw JSONL line 파싱 결과 (fetch 메타 + item) */
export interface ParsedQuasiDrugRow {
  /** 1-base line 번호 */
  lineNumber: number;
  sourceDataset: string | null;
  fetchedAt: string | null;
  pageNo: number | null;
  rowIndex: number | null;
  /** 언랩된 item */
  item: QuasiDrugPermitItem;
}

export interface QuasiDrugParseError {
  lineNumber: number | null;
  reason: string;
}

export interface QuasiDrugParseResult {
  rows: ParsedQuasiDrugRow[];
  errors: QuasiDrugParseError[];
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
 * 단일 line(JSON 문자열) → ParsedQuasiDrugRow.
 * fetch 메타 래핑(`{item:{...}}`) 이면 언랩, 평면 item 이면 자체를 item 으로 본다.
 */
export function parseQuasiDrugLine(line: string, lineNumber: number): ParsedQuasiDrugRow {
  const obj = JSON.parse(line) as Record<string, unknown>;
  const hasWrapper = obj != null && typeof obj === 'object' && 'item' in obj;
  const item = (hasWrapper ? (obj.item as QuasiDrugPermitItem) : (obj as QuasiDrugPermitItem)) ?? {};
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
export function parseQuasiDrugPermitJsonl(text: string): QuasiDrugParseResult {
  const errors: QuasiDrugParseError[] = [];
  const rows: ParsedQuasiDrugRow[] = [];
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
      rows.push(parseQuasiDrugLine(raw, lineNumber));
    } catch (e) {
      errors.push({ lineNumber, reason: `JSON_PARSE_ERROR: ${(e as Error).message}` });
    }
  }

  return { rows, errors, blankLines };
}
