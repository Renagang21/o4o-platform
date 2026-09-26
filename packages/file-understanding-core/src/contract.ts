/**
 * Generic File / Spreadsheet Understanding — 순수 계약 (pure contract)
 *
 * WO-O4O-COMMON-AUTOMATION-CORE-GENERIC-FILE-UNDERSTANDING-V1
 *
 * 이 파일이 소유하는 것 / 소유하지 않는 것
 * ─────────────────────────────────────────────────────────────────────────────
 *  - 공통 Core 는 **도메인 필드명을 소유하지 않는다.** product_name·ingredient 같은
 *    필드는 surface(hospital-drug 등)가 TargetSchema 로 주입한다. 이 파일 어디에도
 *    특정 업종·약품·서비스 어휘를 넣지 않는다(task-modality-router 와 같은 도메인 중립 원칙).
 *  - AI 는 **구조만** 해석한다(헤더 위치·구역·열→역할 매핑). 전체 행 대량 처리는 하지 않는다.
 *    전체 행 정규화는 `normalize.ts` 가 결정론적으로 수행한다.
 *  - 계약 3자 분리: 구역 제목(sectionLabel) / 헤더 행(headerRow) / 실제 데이터 시작(dataStartRow).
 *    `경 구 약 품` 같은 구역 제목을 헤더로 오독하지 않기 위한 구조적 장치.
 *
 * DB · 네트워크 · DOM 의존 없음 — 브라우저·서버·테스트에서 동일하게 쓰는 순수 계층.
 */

// ─────────────────────────────────────────────────────────────────────────────
// 상수
// ─────────────────────────────────────────────────────────────────────────────

/** AI 에 보내는 표본 상단 행 수(전체 파일이 아니라 최소 표본). */
export const STRUCTURE_PROFILE_SAMPLE_ROWS = 20;
/** 열 통계 대표 표본 개수. */
export const COLUMN_STAT_SAMPLE_COUNT = 3;
/** 열 통계 대표 표본 1개 최대 길이(민감정보 유입 최소화). */
export const COLUMN_STAT_SAMPLE_MAX_LEN = 40;
/** confidence gate 기본 임계값. surface 가 override 가능. */
export const DEFAULT_CONFIDENCE_THRESHOLD = 0.6;

export type SpreadsheetFormat = 'xlsx' | 'xls' | 'csv';

// ─────────────────────────────────────────────────────────────────────────────
// 계약 A — StructureProfile (AI 입력 = 최소 표본)
// ─────────────────────────────────────────────────────────────────────────────

export interface StructureProfile {
  sheets: SheetProfile[];
  sourceFormat: SpreadsheetFormat;
}

export interface SheetProfile {
  sheetName: string;
  /** 전체 행 수(표본이 아닌 실제 총량 — 규모 판단용). */
  totalRows: number;
  /** 가장 넓은 행 기준 열 개수. */
  columnCount: number;
  /** 상단 표본 행(기본 20). 헤더/구역 제목 판정용. 각 셀은 문자열. */
  sampleRows: string[][];
  /** 열별 통계(전체 행 스캔, 값 자체는 최소화). */
  columnStats: ColumnStat[];
}

export interface ColumnStat {
  /** 0-base 열 인덱스. */
  index: number;
  nonEmptyRatio: number; // 0..1
  numericRatio: number; // 0..1
  /** 대표 값 표본(최대 COLUMN_STAT_SAMPLE_COUNT, 각 ≤ COLUMN_STAT_SAMPLE_MAX_LEN). */
  samples: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// 계약 C — TargetSchema 주입 (surface 소유 · generic descriptor)
//   surface 의 실제 결과 타입(예: LocalDrugRow)을 Core 가 알면 안 된다.
//   surface 는 의미 설명이 담긴 generic descriptor 만 넘기고,
//   normalized 결과를 자기 도메인 타입으로 변환하는 것은 surface adapter 의 몫이다.
// ─────────────────────────────────────────────────────────────────────────────

export interface TargetSchema {
  /** 스키마 식별자(캐시 키의 일부). */
  id: string;
  fields: TargetField[];
}

export interface TargetField {
  /** semantic 필드 키(예: 'product_name'). Core 는 값의 의미를 모른다. */
  key: string;
  /** AI 에 주는 자연어 설명(surface 소유). */
  description: string;
  /** 하나 이상 매핑돼야 연결을 허용하는 필드. */
  required: boolean;
  /** AI 의 의미 판단 보조용 예시(선택). 결정론적 alias 표가 아니다 — 힌트일 뿐. */
  examples?: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// 계약 B — FileStructureInference (AI 출력 JSON)
// ─────────────────────────────────────────────────────────────────────────────

export interface FileStructureInference {
  sheets: SheetInference[];
  /** 전체 추론 신뢰도 0..1 — confidence gate 1차 기준. */
  confidence: number;
  /** 사람이 읽는 경고(복수 헤더 후보·불확실 구역 등). 비어 있을 수 있다. */
  warnings: string[];
}

export interface SheetInference {
  sheetName: string;
  regions: DataRegion[];
  /** TargetSchema 에 없는 열(AI 가 임의 필드를 만들지 못하게 하고 여기 보고만). */
  unmappedColumns: UnmappedColumn[];
}

export interface DataRegion {
  /** 구역 시작 행(구역 제목 포함 가능, 0-base). */
  startRow: number;
  /** 구역 끝 행(0-base, inclusive). 미지정이면 시트 끝까지. */
  endRow?: number;
  /** 헤더 행 인덱스(0-base). 헤더 없는 파일이면 미지정. */
  headerRow?: number;
  /** 실제 데이터가 시작하는 행(0-base). normalizer 가 이 값을 직접 쓴다(재추측 없음). */
  dataStartRow: number;
  /** 구역 제목(예: '경 구 약 품'). **분류값이지 헤더가 아니다.** 섹션형이 아니면 미지정. */
  sectionLabel?: string;
  columns: ColumnMapping[];
  confidence: number;
}

export interface ColumnMapping {
  /** 원본 열 인덱스(0-base). */
  sourceColumn: number;
  /** 원본 헤더 텍스트(있으면). */
  sourceLabel?: string;
  /** **TargetSchema 에 선언된 key 만.** 임의 필드는 허용하지 않는다(위반 → unmappedColumns). */
  targetField: string;
  confidence: number;
}

export interface UnmappedColumn {
  sourceColumn: number;
  sourceLabel?: string;
  reason?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// 계약 D — Mapping 재사용 캐시 (structure fingerprint)
// ─────────────────────────────────────────────────────────────────────────────

export interface MappingCacheEntry {
  fingerprint: string;
  targetSchemaId: string;
  inference: FileStructureInference;
  createdAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// 런타임 검증 — AI 출력이 계약을 지키도록 강제
//   Gemini 는 엄격 responseSchema 미지원(MIME 강제만) → 여기서 방어적으로 정규화한다.
//   핵심: targetField 가 TargetSchema key 가 아니면 매핑에서 제거하고 unmappedColumns 로 옮긴다.
// ─────────────────────────────────────────────────────────────────────────────

function clamp01(n: unknown): number {
  const v = typeof n === 'number' && Number.isFinite(n) ? n : 0;
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}

function asString(v: unknown): string {
  return typeof v === 'string' ? v : v == null ? '' : String(v);
}

function asIntOrUndef(v: unknown): number | undefined {
  return typeof v === 'number' && Number.isInteger(v) ? v : undefined;
}

/** 코드펜스(```json … ```)로 감싸진 응답도 관대하게 파싱한다. */
export function parseInferenceJson(content: string): unknown {
  const trimmed = String(content ?? '').trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  const body = fenced ? fenced[1] : trimmed;
  return JSON.parse(body);
}

/**
 * AI 원본 출력을 계약 형태로 정규화한다. 알 수 없는 targetField 는 unmappedColumns 로 강등한다.
 * confidence 는 0..1 로 clamp. dataStartRow 가 없으면 headerRow+1 또는 startRow 로 보정한다.
 */
export function validateInference(raw: unknown, targetSchema: TargetSchema): FileStructureInference {
  const allowed = new Set(targetSchema.fields.map((f) => f.key));
  const root = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;

  const sheetsRaw = Array.isArray(root.sheets) ? root.sheets : [];
  const sheets: SheetInference[] = sheetsRaw.map((s) => {
    const so = (s && typeof s === 'object' ? s : {}) as Record<string, unknown>;
    const unmapped: UnmappedColumn[] = Array.isArray(so.unmappedColumns)
      ? (so.unmappedColumns as unknown[]).map((u) => {
          const uo = (u && typeof u === 'object' ? u : {}) as Record<string, unknown>;
          return {
            sourceColumn: asIntOrUndef(uo.sourceColumn) ?? -1,
            sourceLabel: uo.sourceLabel != null ? asString(uo.sourceLabel) : undefined,
            reason: uo.reason != null ? asString(uo.reason) : undefined,
          };
        })
      : [];

    const regionsRaw = Array.isArray(so.regions) ? so.regions : [];
    const regions: DataRegion[] = regionsRaw.map((r) => {
      const ro = (r && typeof r === 'object' ? r : {}) as Record<string, unknown>;
      const startRow = asIntOrUndef(ro.startRow) ?? 0;
      const headerRow = asIntOrUndef(ro.headerRow);
      const dataStartRow =
        asIntOrUndef(ro.dataStartRow) ?? (headerRow != null ? headerRow + 1 : startRow);

      const colsRaw = Array.isArray(ro.columns) ? ro.columns : [];
      const columns: ColumnMapping[] = [];
      for (const c of colsRaw) {
        const co = (c && typeof c === 'object' ? c : {}) as Record<string, unknown>;
        const targetField = asString(co.targetField);
        const sourceColumn = asIntOrUndef(co.sourceColumn);
        if (sourceColumn == null) continue;
        const sourceLabel = co.sourceLabel != null ? asString(co.sourceLabel) : undefined;
        if (!allowed.has(targetField)) {
          // AI 가 만들어낸(스키마에 없는) 필드 → 매핑 불가, 보고만.
          unmapped.push({ sourceColumn, sourceLabel, reason: 'unknown_target_field' });
          continue;
        }
        columns.push({ sourceColumn, sourceLabel, targetField, confidence: clamp01(co.confidence) });
      }

      return {
        startRow,
        endRow: asIntOrUndef(ro.endRow),
        headerRow,
        dataStartRow,
        sectionLabel: ro.sectionLabel != null && asString(ro.sectionLabel) !== '' ? asString(ro.sectionLabel) : undefined,
        columns,
        confidence: clamp01(ro.confidence),
      };
    });

    return {
      sheetName: asString(so.sheetName),
      regions,
      unmappedColumns: unmapped,
    };
  });

  const warnings = Array.isArray(root.warnings) ? (root.warnings as unknown[]).map(asString).filter((w) => w !== '') : [];

  return {
    sheets,
    confidence: clamp01(root.confidence),
    warnings,
  };
}
