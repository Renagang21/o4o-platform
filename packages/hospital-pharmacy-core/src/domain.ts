/**
 * Hospital Pharmacy — Domain 타입 (얇은 Domain Core)
 *
 * WO-O4O-HOSPITAL-PHARMACY-SERVICE-FOUNDATION-V1 §2·§9
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 경계
 *
 *   공통 Generic File Understanding(GFU)은 **구조**만 안다(sheet/section/header/column).
 *   "어떤 값이 product_name / ingredient / strength 인지" 는 **이 Domain Core** 가 정의한다.
 *   따라서 원내 약품의 표준 필드는 여기 한 곳에서만 선언한다 — GFU 는 이 어휘를 몰라야 한다.
 *
 *   저장(localStorage) 은 브라우저 표면(web-hospital-pharmacy)이 담당한다. 이 Core 는 저장소·DOM 을
 *   건드리지 않는다(순수 계층). 여기서는 저장 데이터의 **형식**만 정의한다.
 */

/** 원내 약품 한 행을 표준화한 항목. product_name 만 필수, 나머지는 있으면 채운다(지어내지 않음). */
export interface HospitalDrugRecord {
  product_name: string;
  ingredient?: string;
  strength?: string;
  dosage_form?: string;
  manufacturer?: string;
  status?: string;
}

/** HospitalDrugRecord 의 필드 키(= GFU TargetSchema 의 target key 와 1:1). */
export type HospitalDrugField = keyof HospitalDrugRecord;

/**
 * 브라우저 localStorage 에 저장되는 원내 데이터셋(V1 = Local-first · SSOT = 브라우저).
 * 형식이 바뀌면 v 를 올린다(과거 값은 무시). 서버에 저장하지 않는다.
 */
export interface HospitalDrugDataset {
  v: 1;
  fileName: string;
  /** 연결 시각(ISO). */
  connectedAt: string;
  count: number;
  rows: HospitalDrugRecord[];
}

/** 원내 데이터셋 localStorage 키(web 표면이 사용). 기존 /hospital-drug 데이터셋과 형식 호환. */
export const HOSPITAL_DRUG_STORAGE_KEY = 'neture:hospital-drug:local-dataset:v1';

/** 파일 선택 accept 값. */
export const HOSPITAL_DRUG_FILE_ACCEPT = '.xlsx,.xls,.csv';

/** 새 데이터셋 조립(순수 — 시각은 호출측이 now 주입 가능, 기본 현재시각). */
export function makeHospitalDrugDataset(
  fileName: string,
  rows: HospitalDrugRecord[],
  connectedAt: string = new Date().toISOString(),
): HospitalDrugDataset {
  return { v: 1, fileName, connectedAt, count: rows.length, rows };
}

/** 저장된 값이 유효한 HospitalDrugDataset 인지 판정(손상·구버전 방어). */
export function isHospitalDrugDataset(value: unknown): value is HospitalDrugDataset {
  if (!value || typeof value !== 'object') return false;
  const ds = value as HospitalDrugDataset;
  return ds.v === 1 && Array.isArray(ds.rows);
}
