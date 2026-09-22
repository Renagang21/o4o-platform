/**
 * Hospital Pharmacy — GFU NormalizedRecord → HospitalDrugRecord adapter (surface adapter)
 *
 * WO-O4O-HOSPITAL-PHARMACY-SERVICE-FOUNDATION-V1 §2·§3
 *
 * 공통 GFU 는 도메인 타입(HospitalDrugRecord)을 모른다. GFU 가 내놓는 generic NormalizedRecord
 * ({ fields: TargetSchema key → 값 }) 를 병원 도메인 타입으로 바꾸는 것은 **surface adapter 의 몫**이다
 * (contract.ts 주석의 계약). TargetSchema key 가 HospitalDrugRecord 필드와 1:1 이라 매핑은 결정론적이다.
 *
 * Core 를 import 하지 않기 위해, 입력은 GFU NormalizedRecord 와 구조적으로 호환되는 최소 shape 로만 받는다.
 */

import type { HospitalDrugField, HospitalDrugRecord } from './domain.js';

/** GFU NormalizedRecord 와 구조적으로 호환되는 최소 입력 shape. */
export interface NormalizedRecordLike {
  fields: Record<string, string>;
}

/** HospitalDrugRecord 의 선택 필드(product_name 제외). */
const OPTIONAL_FIELDS: readonly HospitalDrugField[] = [
  'ingredient',
  'strength',
  'dosage_form',
  'manufacturer',
  'status',
];

/**
 * NormalizedRecord 하나 → HospitalDrugRecord. product_name 이 비어 있으면 null(유효 원내 행 아님).
 * 빈 문자열 선택 필드는 담지 않는다(없는 값을 지어내지 않음).
 */
export function normalizedRecordToHospitalRow(record: NormalizedRecordLike): HospitalDrugRecord | null {
  const name = String(record.fields.product_name ?? '').trim();
  if (!name) return null;
  const row: HospitalDrugRecord = { product_name: name };
  for (const field of OPTIONAL_FIELDS) {
    const value = String(record.fields[field] ?? '').trim();
    if (value) row[field] = value;
  }
  return row;
}

export interface HospitalRowsFromRecords {
  rows: HospitalDrugRecord[];
  /** 입력 레코드 총수. */
  total: number;
  /** product_name 이 비어 버려진 레코드 수. */
  skipped: number;
}

/** NormalizedRecord[] → HospitalDrugRecord[] (product_name 없는 행 skip 집계). */
export function normalizedRecordsToHospitalRows(
  records: readonly NormalizedRecordLike[],
): HospitalRowsFromRecords {
  const rows: HospitalDrugRecord[] = [];
  let skipped = 0;
  for (const record of records) {
    const row = normalizedRecordToHospitalRow(record);
    if (row) rows.push(row);
    else skipped += 1;
  }
  return { rows, total: records.length, skipped };
}
