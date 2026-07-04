/**
 * Medical Device Standard-Code JSONL Parser — 의료기기 표준코드별 제품정보 raw JSONL 파서 (DB 무관)
 *
 * WO-O4O-MEDICAL-DEVICE-PUBLIC-CANDIDATE-IMPORT-V1
 * 선행: docs/checks/WO-O4O-MEDICAL-DEVICE-PUBLIC-RAW-RESTORE-AND-FIELD-SAMPLE-DRYRUN-V1.md
 *
 * raw 파일 구조 (repo 밖, git 미추적):
 *   각 line = fetch 메타 래핑 `{ sourceDataset, fetchedAt, pageNo, rowIndex, item:{...} }`.
 *   실 필드는 item 하위 20개(UDIDI_CD, PRDLST_NM, MDEQ_CLSF_NO, CLSF_NO_GRAD_CD,
 *   PERMIT_NO, PRMSN_YMD, FOML_INFO, PRDT_NM_INFO, MNFT_IPRT_ENTP_NM, USE_PURPS_CONT,
 *   STRG_CND_INFO, CIRC_CND_INFO, 그리고 Y/N 속성 플래그류).
 *
 *  - 파일을 읽지 않는다 — 문자열(text)을 입력받아 순수 파싱한다(테스트 용이).
 *  - JSON.parse 실패 line 은 throw 하지 않고 errors[] 에 누적(무음 손실 금지).
 *  - 래핑에 관대: `{item:{...}}` 이면 .item 을, 평면 item 이면 자체를 item 으로 사용.
 */

/** 의료기기 표준코드 item 필드 (전부 nullable — 공공데이터 결측 관대) */
export interface MedicalDeviceStandardCodeItem {
  UDIDI_CD?: string | null; // UDI-DI 표준코드 (식별자)
  PRDLST_NM?: string | null; // 품목명
  PRDT_NM_INFO?: string | null; // 제품명 정보
  MDEQ_CLSF_NO?: string | null; // 의료기기 분류번호
  CLSF_NO_GRAD_CD?: string | null; // 등급
  PERMIT_NO?: string | null; // 품목허가번호
  PRMSN_YMD?: string | null; // 허가일자
  FOML_INFO?: string | null; // 형명/모델명
  MNFT_IPRT_ENTP_NM?: string | null; // 제조/수입업체명
  USE_PURPS_CONT?: string | null; // 사용목적
  STRG_CND_INFO?: string | null; // 저장조건
  CIRC_CND_INFO?: string | null; // 유통조건
  [k: string]: unknown;
}

export interface ParsedMedicalDeviceRow {
  /** 1-base line 번호 */
  lineNumber: number;
  sourceDataset: string | null;
  fetchedAt: string | null;
  pageNo: number | null;
  rowIndex: number | null;
  item: MedicalDeviceStandardCodeItem;
}

export interface MedicalDeviceParseError {
  lineNumber: number | null;
  reason: string;
}

export interface MedicalDeviceParseResult {
  rows: ParsedMedicalDeviceRow[];
  errors: MedicalDeviceParseError[];
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
 * 단일 line(JSON 문자열) → ParsedMedicalDeviceRow.
 * fetch 메타 래핑(`{item:{...}}`) 이면 언랩, 평면 item 이면 자체를 item 으로 본다.
 */
export function parseMedicalDeviceLine(line: string, lineNumber: number): ParsedMedicalDeviceRow {
  const obj = JSON.parse(line) as Record<string, unknown>;
  const hasWrapper = obj != null && typeof obj === 'object' && 'item' in obj;
  const item =
    (hasWrapper ? (obj.item as MedicalDeviceStandardCodeItem) : (obj as MedicalDeviceStandardCodeItem)) ??
    {};
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
export function parseMedicalDeviceJsonl(text: string): MedicalDeviceParseResult {
  const errors: MedicalDeviceParseError[] = [];
  const rows: ParsedMedicalDeviceRow[] = [];
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
      rows.push(parseMedicalDeviceLine(raw, lineNumber));
    } catch (e) {
      errors.push({ lineNumber, reason: `JSON_PARSE_ERROR: ${(e as Error).message}` });
    }
  }

  return { rows, errors, blankLines };
}
