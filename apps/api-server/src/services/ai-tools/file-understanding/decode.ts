/**
 * Generic 스프레드시트 디코드 — bytes → 시트별 문자열 행렬(matrix)
 *
 * WO-O4O-COMMON-AUTOMATION-CORE-GENERIC-FILE-UNDERSTANDING-V1 (WO §15 · 디코드 계층)
 *
 * 구조만 뽑는다. 의미 해석·정규화는 하지 않는다. 도메인 어휘 없음.
 * SheetJS(xlsx)는 node·브라우저 공통 동작 → 이 파일은 환경 중립.
 *
 * magic-byte 판정(localDataset 의 검증된 디코드 조각을 generic 으로 추출):
 *   0x50 0x4b ('PK', ZIP)  → xlsx  → XLSX.read(bytes, { type:'array' })
 *   0xd0 0xcf (OLE)        → xls   → XLSX.read(bytes, { type:'array' })
 *   그 외                   → csv   → UTF-8 decode + BOM strip → XLSX.read(text, { type:'string' })
 *
 * CSV 를 array 모드로 읽으면 BOM 없는 UTF-8 을 CP1252 로 오독해 한글이 깨진다.
 * 따라서 텍스트는 반드시 명시적 UTF-8 디코드 후 string 모드로 넘긴다.
 */

import * as XLSX from 'xlsx';

import type { SpreadsheetFormat } from './contract.js';

export interface DecodedSheet {
  sheetName: string;
  /** 행 우선 문자열 행렬. 빈 셀은 ''. */
  matrix: string[][];
}

export interface DecodedWorkbook {
  sourceFormat: SpreadsheetFormat;
  sheets: DecodedSheet[];
}

function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

function sheetToMatrix(sheet: XLSX.WorkSheet): string[][] {
  const rows = XLSX.utils.sheet_to_json<string[]>(sheet, {
    header: 1,
    blankrows: false,
    raw: false,
    defval: '',
  });
  return rows.map((row) => (Array.isArray(row) ? row.map((cell) => (cell == null ? '' : String(cell))) : []));
}

function workbookToSheets(wb: XLSX.WorkBook): DecodedSheet[] {
  return wb.SheetNames.map((sheetName) => ({
    sheetName,
    matrix: sheetToMatrix(wb.Sheets[sheetName]),
  }));
}

/**
 * bytes(그리고 선택적 파일명)를 시트별 문자열 행렬로 디코드한다.
 * 파일 내용을 서버에 저장하지 않는다 — 호출자가 in-memory 로만 다룬다(§7 첨부≠지식).
 */
export function decodeWorkbook(bytes: Uint8Array): DecodedWorkbook {
  const isZip = bytes.length >= 2 && bytes[0] === 0x50 && bytes[1] === 0x4b;
  const isOle = bytes.length >= 2 && bytes[0] === 0xd0 && bytes[1] === 0xcf;

  if (isZip || isOle) {
    const wb = XLSX.read(bytes, { type: 'array' });
    return { sourceFormat: isZip ? 'xlsx' : 'xls', sheets: workbookToSheets(wb) };
  }

  const text = stripBom(new TextDecoder('utf-8').decode(bytes));
  const wb = XLSX.read(text, { type: 'string' });
  return { sourceFormat: 'csv', sheets: workbookToSheets(wb) };
}
