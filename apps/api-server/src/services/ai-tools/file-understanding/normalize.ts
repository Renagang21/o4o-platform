/**
 * 계약 F — 결정론적 행 정규화 + 계약 E — 2계층 confidence gate
 *
 * WO-O4O-COMMON-AUTOMATION-CORE-GENERIC-FILE-UNDERSTANDING-V1 (WO §15-F, §15-E)
 *
 * AI 는 **구조(inference)만** 제공한다. 전체 행 정규화는 여기서 결정론적으로 수행한다 —
 * AI 재호출 없음, 같은 inference → 같은 결과.
 *
 * 산출 NormalizedRecord 는 generic 이다: fields 는 TargetSchema key → 값 문자열 map.
 * Core 는 도메인 타입(LocalDrugRow 등)을 모른다. 그 변환은 surface adapter 의 몫이다.
 * sectionLabel(구역 제목)은 generic metadata 로 실려 나갈 뿐 도메인 필드가 아니다.
 */

import {
  DEFAULT_CONFIDENCE_THRESHOLD,
  type DataRegion,
  type FileStructureInference,
  type SheetInference,
  type TargetSchema,
} from './contract.js';
import type { DecodedWorkbook } from './decode.js';

export interface NormalizedRecord {
  /** TargetSchema key → 셀 값(문자열). */
  fields: Record<string, string>;
  /** 이 레코드가 속한 구역 제목(있으면). 분류 metadata. */
  sectionLabel?: string;
  sheetName: string;
  /** 원본 행 인덱스(0-base) — 추적·디버그용. */
  sourceRow: number;
}

export interface NormalizeResult {
  records: NormalizedRecord[];
  /** 처리 시도한 데이터 행 총수. */
  totalRows: number;
  /** required 전부 빈 값이라 버려진 행 수. */
  skipped: number;
}

// ── 계약 E — 2계층 confidence verdict ──

export interface LowConfidenceColumn {
  sheetName: string;
  sectionLabel?: string;
  sourceColumn: number;
  targetField: string;
  confidence: number;
}

export interface LowConfidenceRegion {
  sheetName: string;
  sectionLabel?: string;
  regionIndex: number;
  confidence: number;
}

export interface ConfidenceVerdict {
  /** 사용자 확인이 필요 없는가(전체·구역·열 모두 임계값 이상 & required 충족). */
  ok: boolean;
  threshold: number;
  /** 어디에도 매핑되지 않은 required 필드 key. */
  missingRequired: string[];
  /** 임계값 미만 열(이것만 사용자에게 확인 — 전부 다시 묻지 않는다). */
  lowConfidenceColumns: LowConfidenceColumn[];
  /** 임계값 미만 구역. */
  lowConfidenceRegions: LowConfidenceRegion[];
}

function matrixBySheet(decoded: DecodedWorkbook): Map<string, string[][]> {
  const map = new Map<string, string[][]>();
  for (const sheet of decoded.sheets) map.set(sheet.sheetName, sheet.matrix);
  return map;
}

function regionEndRow(region: DataRegion, matrix: string[][]): number {
  const last = matrix.length - 1;
  if (region.endRow == null) return last;
  return Math.min(region.endRow, last);
}

/**
 * 계약 F — inference + targetSchema 에 따라 전체 행을 결정론적으로 정규화한다.
 * required 필드가 모두 비어 있는 행은 버린다(구역 사이 빈 줄·소계 행 방어).
 */
export function normalizeRows(
  decoded: DecodedWorkbook,
  inference: FileStructureInference,
  targetSchema: TargetSchema,
): NormalizeResult {
  const bySheet = matrixBySheet(decoded);
  const requiredKeys = targetSchema.fields.filter((f) => f.required).map((f) => f.key);
  const records: NormalizedRecord[] = [];
  let totalRows = 0;
  let skipped = 0;

  for (const sheet of inference.sheets) {
    const matrix = bySheet.get(sheet.sheetName);
    if (!matrix) continue;

    for (const region of sheet.regions) {
      const end = regionEndRow(region, matrix);
      for (let r = region.dataStartRow; r <= end; r += 1) {
        const row = matrix[r];
        if (!row) continue;
        totalRows += 1;

        const fields: Record<string, string> = {};
        for (const col of region.columns) {
          const value = row[col.sourceColumn];
          fields[col.targetField] = value == null ? '' : String(value).trim();
        }

        // required 가 있으면 하나라도 값이 있어야 유효 행으로 채택.
        const hasRequiredValue =
          requiredKeys.length === 0 || requiredKeys.some((key) => (fields[key] ?? '') !== '');
        if (!hasRequiredValue) {
          skipped += 1;
          continue;
        }

        records.push({
          fields,
          sectionLabel: region.sectionLabel,
          sheetName: sheet.sheetName,
          sourceRow: r,
        });
      }
    }
  }

  return { records, totalRows, skipped };
}

/**
 * 계약 E — 2계층 confidence gate. 전체·구역·열 신뢰도와 required 충족을 평가한다.
 * 낮은 항목만 QUESTION 대상으로 돌려주고, 나머지는 그대로 사용하게 한다.
 */
export function evaluateConfidence(
  inference: FileStructureInference,
  targetSchema: TargetSchema,
  threshold: number = DEFAULT_CONFIDENCE_THRESHOLD,
): ConfidenceVerdict {
  const requiredKeys = new Set(targetSchema.fields.filter((f) => f.required).map((f) => f.key));
  const mapped = new Set<string>();
  const lowConfidenceColumns: LowConfidenceColumn[] = [];
  const lowConfidenceRegions: LowConfidenceRegion[] = [];

  inference.sheets.forEach((sheet: SheetInference) => {
    sheet.regions.forEach((region, regionIndex) => {
      if (region.confidence < threshold) {
        lowConfidenceRegions.push({
          sheetName: sheet.sheetName,
          sectionLabel: region.sectionLabel,
          regionIndex,
          confidence: region.confidence,
        });
      }
      for (const col of region.columns) {
        mapped.add(col.targetField);
        if (col.confidence < threshold) {
          lowConfidenceColumns.push({
            sheetName: sheet.sheetName,
            sectionLabel: region.sectionLabel,
            sourceColumn: col.sourceColumn,
            targetField: col.targetField,
            confidence: col.confidence,
          });
        }
      }
    });
  });

  const missingRequired = [...requiredKeys].filter((key) => !mapped.has(key));
  const ok =
    inference.confidence >= threshold &&
    missingRequired.length === 0 &&
    lowConfidenceColumns.length === 0 &&
    lowConfidenceRegions.length === 0;

  return { ok, threshold, missingRequired, lowConfidenceColumns, lowConfidenceRegions };
}
