/**
 * Health Functional Food JSONL Parser — 건강기능식품정보 raw JSONL 파서 (DB 무관)
 *
 * WO-O4O-HEALTH-FUNCTIONAL-FOOD-PUBLIC-CANDIDATE-IMPORT-MAPPER-AND-SERVICE-V1
 * 선행 dry-run: WO-O4O-HEALTH-FUNCTIONAL-FOOD-PUBLIC-CANDIDATE-IMPORT-DRYRUN-V1,
 *              WO-O4O-HEALTH-FUNCTIONAL-FOOD-PUBLIC-FULL-RAW-FETCH-AND-FULL-DRYRUN-V1
 *
 * raw 파일 구조 (repo 밖, git 미추적):
 *   각 line = **flatten 된 item 그 자체** (건강기능식품 트랙은 body.items[].item 을
 *   수집 단계에서 이미 flatten → 1 line = 1 item, 최상위 필드 직접).
 *   item 필드(11): ENTRPS, PRDUCT, STTEMNT_NO, REGIST_DT, DISTB_PD, SUNGSANG,
 *                  SRV_USE, PRSRV_PD, INTAKE_HINT1, MAIN_FNCTN, BASE_STANDARD
 *
 *  - 본 모듈은 파일을 읽지 않는다 — 문자열(text) 또는 line 배열을 입력받아 순수 파싱한다(테스트 용이).
 *  - JSON.parse 실패 line 은 throw 하지 않고 errors[] 에 누적(무음 손실 금지).
 *  - item 래핑 여부에 관대: fetch 메타(`{item:{...}}`)로 감싼 경우 .item 을,
 *    평면 item(HFF 기본)인 경우 자체를 사용한다.
 */

/** 건강기능식품 item 필드 (전부 nullable — 공공데이터 결측 관대) */
export interface HealthFunctionalFoodItem {
  ENTRPS?: string | null; // 업체명
  PRDUCT?: string | null; // 제품명 (선행 공백 존재 → trim)
  STTEMNT_NO?: string | null; // 품목제조신고번호 (식별자)
  REGIST_DT?: string | null; // 등록일자
  DISTB_PD?: string | null; // 유통기한
  SUNGSANG?: string | null; // 성상
  SRV_USE?: string | null; // 섭취방법/용도
  PRSRV_PD?: string | null; // 보관조건
  INTAKE_HINT1?: string | null; // 섭취 시 주의사항
  MAIN_FNCTN?: string | null; // 주된 기능성
  BASE_STANDARD?: string | null; // 기준·규격
  [k: string]: unknown;
}

/** raw JSONL line 파싱 결과 (fetch 메타 언랩 시 메타 + item) */
export interface ParsedHealthFunctionalFoodRow {
  /** 1-base line 번호 */
  lineNumber: number;
  /** 원본 fetch 메타 (flatten raw 에는 없음 → null) */
  sourceDataset: string | null;
  fetchedAt: string | null;
  pageNo: number | null;
  rowIndex: number | null;
  /** 언랩된 item */
  item: HealthFunctionalFoodItem;
}

export interface HealthFunctionalFoodParseError {
  lineNumber: number | null;
  reason: string;
}

export interface HealthFunctionalFoodParseResult {
  rows: ParsedHealthFunctionalFoodRow[];
  errors: HealthFunctionalFoodParseError[];
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
 * 단일 line(JSON 문자열) → ParsedHealthFunctionalFoodRow.
 * fetch 메타 래핑(`{item:{...}}`) 이면 언랩, 평면 item(HFF 기본) 이면 자체를 item 으로 본다.
 */
export function parseHealthFunctionalFoodLine(
  line: string,
  lineNumber: number,
): ParsedHealthFunctionalFoodRow {
  const obj = JSON.parse(line) as Record<string, unknown>;
  const hasWrapper = obj != null && typeof obj === 'object' && 'item' in obj;
  const item =
    (hasWrapper ? (obj.item as HealthFunctionalFoodItem) : (obj as HealthFunctionalFoodItem)) ?? {};
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
export function parseHealthFunctionalFoodJsonl(text: string): HealthFunctionalFoodParseResult {
  const errors: HealthFunctionalFoodParseError[] = [];
  const rows: ParsedHealthFunctionalFoodRow[] = [];
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
      rows.push(parseHealthFunctionalFoodLine(raw, lineNumber));
    } catch (e) {
      errors.push({ lineNumber, reason: `JSON_PARSE_ERROR: ${(e as Error).message}` });
    }
  }

  return { rows, errors, blankLines };
}
