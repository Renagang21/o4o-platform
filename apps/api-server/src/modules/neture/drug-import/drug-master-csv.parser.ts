/**
 * Drug Master CSV Parser — CP949(EUC-KR) → UTF-8 변환 + 따옴표 안전 파서 (DB 무관)
 *
 * WO-O4O-DRUG-CANDIDATE-IMPORT-PIPELINE-V1
 *
 *  - 인코딩: CP949(EUC-KR) 가 기본. iconv-lite 로 변환(strict EUC-KR 미사용 — CP949 전용문자 보존).
 *    --encoding utf-8 지정 또는 UTF-8 BOM 감지 시 UTF-8 로 디코드.
 *  - CSV: csv-parse(relax) 사용 — 따옴표/쉼표/줄바꿈 안전. 단순 split 금지.
 *  - 변환/파싱 실패 row 는 throw 하지 않고 errors[] 에 누적(무음 손실 금지).
 *
 * 본 모듈은 파일을 읽지 않는다 — Buffer 를 입력받아 순수하게 파싱한다(테스트 용이).
 */

import { parse as csvParse } from 'csv-parse/sync';
import iconv from 'iconv-lite';
import { DRUG_MASTER_HEADERS, DRUG_MASTER_COLUMN_COUNT } from './drug-master-row.mapper.js';

export type DrugCsvEncoding = 'cp949' | 'utf-8' | 'auto';

export interface ParsedDrugRow {
  /** 1-base 데이터 행 번호 (헤더 제외) */
  rowNumber: number;
  /** 헤더명 → 값 (헤더 기준 정렬) */
  record: Record<string, string>;
  /** 원본 row 의 실제 컬럼 수 */
  rawColumnCount: number;
}

export interface DrugCsvParseError {
  rowNumber: number | null;
  reason: string;
}

export interface DrugCsvParseResult {
  encodingUsed: 'cp949' | 'utf-8';
  header: string[];
  headerMatches: boolean;
  rows: ParsedDrugRow[];
  errors: DrugCsvParseError[];
}

const UTF8_BOM = Buffer.from([0xef, 0xbb, 0xbf]);

/** BOM 또는 디코드 휴리스틱으로 인코딩 자동 판정 */
export function detectEncoding(buf: Buffer): 'cp949' | 'utf-8' {
  if (buf.length >= 3 && buf.subarray(0, 3).equals(UTF8_BOM)) return 'utf-8';
  // UTF-8 로 strict 디코드 시 U+FFFD 가 생기면 cp949 로 본다.
  const asUtf8 = buf.subarray(0, Math.min(buf.length, 65536)).toString('utf-8');
  if (asUtf8.includes('�')) return 'cp949';
  // '한글상품명' 헤더가 UTF-8 로 보이면 utf-8, 아니면 cp949.
  return asUtf8.startsWith('한글상품명') || asUtf8.startsWith('﻿한글상품명') ? 'utf-8' : 'cp949';
}

function decode(buf: Buffer, encoding: DrugCsvEncoding): { text: string; used: 'cp949' | 'utf-8' } {
  const used = encoding === 'auto' ? detectEncoding(buf) : encoding;
  if (used === 'utf-8') {
    let b = buf;
    if (b.length >= 3 && b.subarray(0, 3).equals(UTF8_BOM)) b = b.subarray(3);
    return { text: b.toString('utf-8'), used };
  }
  // cp949 (iconv-lite 는 cp949 = euc-kr superset)
  return { text: iconv.decode(buf, 'cp949'), used };
}

/**
 * Buffer → 파싱 결과. row 단위 오류는 errors[] 로 수집한다.
 */
export function parseDrugMasterCsv(buf: Buffer, encoding: DrugCsvEncoding = 'cp949'): DrugCsvParseResult {
  const errors: DrugCsvParseError[] = [];
  const { text, used } = decode(buf, encoding);

  // 2-pass: (1) 헤더 + 컬럼수 무관 raw 배열, (2) 헤더 키 매핑.
  // csv-parse 로 array-of-arrays 파싱(따옴표/줄바꿈 안전). relax 옵션으로 컬럼수 불일치 허용.
  let records: string[][];
  try {
    records = csvParse(text, {
      bom: true,
      relax_quotes: true,
      relax_column_count: true,
      skip_empty_lines: true,
      trim: false, // trim 은 mapper 의 clean() 에서 (따옴표 내부 보존)
    }) as string[][];
  } catch (e) {
    return {
      encodingUsed: used,
      header: [],
      headerMatches: false,
      rows: [],
      errors: [{ rowNumber: null, reason: `CSV_PARSE_FATAL: ${(e as Error).message}` }],
    };
  }

  if (records.length === 0) {
    return { encodingUsed: used, header: [], headerMatches: false, rows: [], errors };
  }

  const header = records[0].map((h) => h.trim());
  const headerMatches =
    header.length === DRUG_MASTER_COLUMN_COUNT &&
    DRUG_MASTER_HEADERS.every((h, i) => header[i] === h);

  // 헤더가 약가마스터 형식이 아니면 알린다(중단은 아님 — 매핑은 헤더명 키로 진행).
  if (!headerMatches) {
    errors.push({
      rowNumber: 0,
      reason: `HEADER_MISMATCH: expected ${DRUG_MASTER_COLUMN_COUNT} cols 약가마스터 header, got ${header.length}`,
    });
  }

  const rows: ParsedDrugRow[] = [];
  for (let i = 1; i < records.length; i++) {
    const cols = records[i];
    const rowNumber = i; // 데이터 행 1-base
    const record: Record<string, string> = {};
    // 헤더 기준으로 매핑 (헤더 키 사용 — 약가마스터 표준 헤더명)
    const keyRow = headerMatches ? DRUG_MASTER_HEADERS : header;
    for (let c = 0; c < keyRow.length; c++) {
      record[keyRow[c]] = cols[c] ?? '';
    }
    rows.push({ rowNumber, record, rawColumnCount: cols.length });
  }

  return { encodingUsed: used, header, headerMatches, rows, errors };
}
