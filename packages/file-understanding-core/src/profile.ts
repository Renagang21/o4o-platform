/**
 * 계약 A — Workbook 구조 프로파일러 (matrix → StructureProfile)
 *
 * WO-O4O-COMMON-AUTOMATION-CORE-GENERIC-FILE-UNDERSTANDING-V1 (WO §15-A)
 *
 * AI 에 보내는 것은 **최소 표본**뿐이다: 상단 N 행 + 열별 통계.
 * 전체 파일/전체 행은 절대 밖으로 나가지 않는다(privacy-first, §7).
 * 도메인 어휘·의미 판정 없음 — 순수 구조 계량.
 */

import {
  COLUMN_STAT_SAMPLE_COUNT,
  COLUMN_STAT_SAMPLE_MAX_LEN,
  STRUCTURE_PROFILE_SAMPLE_ROWS,
  type ColumnStat,
  type SheetProfile,
  type StructureProfile,
} from './contract.js';
import type { DecodedSheet, DecodedWorkbook } from './decode.js';

export interface ProfileOptions {
  sampleRows?: number;
}

/** 숫자형 판정: 콤마/공백 제거 후 정수·소수만. '500mg' 처럼 문자가 섞이면 비숫자. */
const NUMERIC_RE = /^-?\d+(\.\d+)?$/;

function isNumericLike(value: string): boolean {
  const cleaned = value.replace(/[,\s]/g, '');
  return cleaned !== '' && NUMERIC_RE.test(cleaned);
}

function truncate(value: string): string {
  const v = value.trim();
  return v.length > COLUMN_STAT_SAMPLE_MAX_LEN ? v.slice(0, COLUMN_STAT_SAMPLE_MAX_LEN) : v;
}

function profileSheet(sheet: DecodedSheet, sampleRowCount: number): SheetProfile {
  const matrix = sheet.matrix;
  const totalRows = matrix.length;
  const columnCount = matrix.reduce((max, row) => (row.length > max ? row.length : max), 0);

  const sampleRows = matrix.slice(0, sampleRowCount).map((row) => {
    const padded: string[] = [];
    for (let c = 0; c < columnCount; c += 1) padded.push(row[c] ?? '');
    return padded;
  });

  const columnStats: ColumnStat[] = [];
  for (let c = 0; c < columnCount; c += 1) {
    let nonEmpty = 0;
    let numeric = 0;
    const samples: string[] = [];
    for (let r = 0; r < totalRows; r += 1) {
      const raw = matrix[r][c] ?? '';
      const value = String(raw).trim();
      if (value === '') continue;
      nonEmpty += 1;
      if (isNumericLike(value)) numeric += 1;
      if (samples.length < COLUMN_STAT_SAMPLE_COUNT) samples.push(truncate(value));
    }
    columnStats.push({
      index: c,
      nonEmptyRatio: totalRows > 0 ? nonEmpty / totalRows : 0,
      numericRatio: nonEmpty > 0 ? numeric / nonEmpty : 0,
      samples,
    });
  }

  return { sheetName: sheet.sheetName, totalRows, columnCount, sampleRows, columnStats };
}

/** DecodedWorkbook → StructureProfile(AI 입력용 최소 표본). */
export function profileWorkbook(decoded: DecodedWorkbook, options: ProfileOptions = {}): StructureProfile {
  const sampleRowCount = options.sampleRows ?? STRUCTURE_PROFILE_SAMPLE_ROWS;
  return {
    sourceFormat: decoded.sourceFormat,
    sheets: decoded.sheets.map((sheet) => profileSheet(sheet, sampleRowCount)),
  };
}
