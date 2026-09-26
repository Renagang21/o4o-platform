/**
 * 계약 G — 구조 fingerprint (StructureProfile → 안정적 해시)
 *
 * WO-O4O-COMMON-AUTOMATION-CORE-GENERIC-FILE-UNDERSTANDING-V1 (WO §15-G)
 *
 * 같은 형식의 파일은 같은 fingerprint 를 낸다 → 캐시된 inference 를 재사용하고
 * AI 를 다시 부르지 않는다(비용·지연 절감). fingerprint 는 **구조에서만** 파생한다:
 *   sourceFormat + 각 시트(이름순 정렬)의 이름·열수·상단 셀 구조 시그니처·열 numericRatio 버킷.
 *
 * 셀의 실제 값(개인정보 포함 가능)은 fingerprint 에 넣지 않는다 —
 * 상단 표본은 '텍스트/숫자/빈칸' 형태(shape)로만 축약한다.
 * crypto 의존 없이 FNV-1a 32bit 로 환경 중립 유지(node·브라우저 동일).
 */

import type { StructureProfile } from './contract.js';

/** 상단 표본 행 중 시그니처에 쓰는 최대 행 수. */
const SIGNATURE_ROWS = 4;

function cellShape(value: string): string {
  const v = String(value ?? '').trim();
  if (v === '') return '_';
  if (/^-?\d+(\.\d+)?$/.test(v.replace(/[,\s]/g, ''))) return '#';
  return 't';
}

function bucket(ratio: number): number {
  // 0..1 → 0..10 (구조적 안정성 확보용 거친 버킷).
  return Math.round(Math.max(0, Math.min(1, ratio)) * 10);
}

function fnv1a(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/** StructureProfile → 구조 fingerprint 문자열('fp1_' + 8 hex). */
export function computeStructureFingerprint(profile: StructureProfile): string {
  const sheets = [...profile.sheets].sort((a, b) => a.sheetName.localeCompare(b.sheetName));
  const parts: string[] = [`fmt=${profile.sourceFormat}`];

  for (const sheet of sheets) {
    const rowShapes = sheet.sampleRows
      .slice(0, SIGNATURE_ROWS)
      .map((row) => row.map(cellShape).join(''))
      .join('|');
    const numericBuckets = sheet.columnStats.map((stat) => bucket(stat.numericRatio)).join(',');
    parts.push(`s=${sheet.sheetName}#c=${sheet.columnCount}#r=${rowShapes}#n=${numericBuckets}`);
  }

  return `fp1_${fnv1a(parts.join('\n'))}`;
}
