/**
 * Health Functional Food Candidate Mapper — 건강기능식품 item 1건 → ProductCandidate 후보 (PURE, DB 무관)
 *
 * WO-O4O-HEALTH-FUNCTIONAL-FOOD-PUBLIC-CANDIDATE-IMPORT-MAPPER-AND-SERVICE-V1
 * 선행 dry-run: WO-O4O-HEALTH-FUNCTIONAL-FOOD-PUBLIC-CANDIDATE-IMPORT-DRYRUN-V1,
 *              WO-O4O-HEALTH-FUNCTIONAL-FOOD-PUBLIC-FULL-RAW-FETCH-AND-FULL-DRYRUN-V1
 *
 * 본 모듈은 **순수 함수**다. DB / 네트워크 / 파일 시스템을 만지지 않는다.
 *
 * 매핑 정책 (WO):
 *   sourceType=external_api / sourceLabel=MFDS_HEALTH_FUNCTIONAL_FOOD
 *   identifierType=MFDS_STTEMNT_NO / identifierValue=STTEMNT_NO / normalized=trim(STTEMNT_NO)
 *   candidateName=trim(PRDUCT) → **255자 방어적 truncate** (초과 시 CANDIDATE_NAME_OVERLENGTH flag)
 *   candidateManufacturer=trim(ENTRPS) / candidateCategory='HEALTH_FUNCTIONAL_FOOD'(상수)
 *   candidateSpec/Unit/ImageUrl=null (포장·SKU·이미지 축 부재 — 전량 dry-run 확정)
 *
 *   ProductMaster 승격은 이 파이프라인 범위 밖(barcode/SKU/허가상태 부재). ProductCandidate 만.
 *
 * 엔티티 컬럼 매핑 주석:
 *   - regulatoryType / mainFunction / reviewFlags / sourceAgency 등은 ProductCandidate 에
 *     "해당 컬럼 없음" → 전부 rawPayload(jsonb) 에 보존.
 *   - candidate_name 컬럼은 varchar(255). 전량 44,885 실측 PRDUCT max=110 → 초과 0 이나,
 *     증분 데이터 대비 방어적 truncate 로직을 유지한다(원문은 rawPayload.source.PRDUCT 보존).
 */

import type {
  HealthFunctionalFoodItem,
  ParsedHealthFunctionalFoodRow,
} from './health-functional-food-jsonl.parser.js';

/** 이 파이프라인 고정 상수 */
export const HFF_SOURCE_LABEL = 'MFDS_HEALTH_FUNCTIONAL_FOOD';
export const HFF_SOURCE_KIND = 'health_functional_food';
export const HFF_SOURCE_DATASET_ID = '15056760';
export const HFF_SOURCE_DATASET_NAME = '건강기능식품정보';
export const HFF_IDENTIFIER_TYPE = 'MFDS_STTEMNT_NO';
export const HFF_CANDIDATE_CATEGORY = 'HEALTH_FUNCTIONAL_FOOD';
export const HFF_REGULATORY_TYPE = 'HEALTH_FUNCTIONAL';

/** ProductCandidate.candidate_name 컬럼 한도 (varchar 255) */
export const CANDIDATE_NAME_MAX_LEN = 255;

export type HealthFunctionalFoodReviewFlag =
  | 'STTEMNT_NO_MISSING'
  | 'PRDUCT_MISSING'
  | 'MANUFACTURER_MISSING'
  | 'MAIN_FUNCTION_MISSING'
  | 'PRESERVATION_MISSING'
  | 'INTAKE_HINT_MISSING'
  | 'CANDIDATE_NAME_OVERLENGTH'
  | 'SKU_IDENTIFIER_MISSING';

export const HFF_REVIEW_FLAGS: HealthFunctionalFoodReviewFlag[] = [
  'STTEMNT_NO_MISSING',
  'PRDUCT_MISSING',
  'MANUFACTURER_MISSING',
  'MAIN_FUNCTION_MISSING',
  'PRESERVATION_MISSING',
  'INTAKE_HINT_MISSING',
  'CANDIDATE_NAME_OVERLENGTH',
  'SKU_IDENTIFIER_MISSING',
];

export interface MappedHealthFunctionalFoodCandidate {
  candidateInput: {
    serviceKey: string | null;
    sourceType: 'external_api';
    sourceLabel: string; // MFDS_HEALTH_FUNCTIONAL_FOOD
    identifierType: 'MFDS_STTEMNT_NO' | null;
    identifierValue: string | null; // STTEMNT_NO (trim)
    normalizedIdentifierValue: string | null; // trim(STTEMNT_NO)
    candidateName: string | null; // trim(PRDUCT) truncated to 255
    candidateManufacturer: string | null;
    candidateCategory: string | null; // HEALTH_FUNCTIONAL_FOOD (상수)
    candidateSpec: string | null; // 항상 null (WO)
    candidateUnit: string | null; // 항상 null (WO)
    candidateImageUrl: string | null; // 항상 null (WO)
    rawPayload: Record<string, unknown>;
  };
  /** dedup 키 (sourceType + identifierType + normalized STTEMNT_NO + sourceKind) */
  dedupKey: {
    sourceType: 'external_api';
    identifierType: 'MFDS_STTEMNT_NO';
    normalizedIdentifierValue: string | null;
    sourceKind: string; // health_functional_food
  };
  reviewFlags: HealthFunctionalFoodReviewFlag[];
  /** candidate_name 이 255자 초과로 truncate 됐는지 */
  nameTruncated: boolean;
}

export interface MapHealthFunctionalFoodOptions {
  serviceKey?: string | null;
  /** raw line 의 fetchedAt (flatten raw 에는 없음 → null) */
  collectedAt?: string | null;
}

/** 값 정규화: trim. 빈 문자열은 null 로. */
function clean(v: unknown): string | null {
  if (v == null) return null;
  const t = String(v).trim();
  return t.length === 0 ? null : t;
}

/**
 * 건강기능식품 item → 후보 + 검토 플래그.
 *
 * @param item  건강기능식품 item (flatten raw 그대로)
 * @param opts  serviceKey / collectedAt
 */
export function mapHealthFunctionalFoodItem(
  item: HealthFunctionalFoodItem,
  opts: MapHealthFunctionalFoodOptions = {},
): MappedHealthFunctionalFoodCandidate {
  const sttemntNo = clean(item.STTEMNT_NO);
  const prductFull = clean(item.PRDUCT);
  const entrps = clean(item.ENTRPS);
  const mainFnctn = clean(item.MAIN_FNCTN);
  const prsrvPd = clean(item.PRSRV_PD);
  const intakeHint = clean(item.INTAKE_HINT1);

  // candidate_name: varchar(255) → 방어적 truncate. 원문은 rawPayload.source 에 무손실 보존.
  const nameTruncated = prductFull != null && prductFull.length > CANDIDATE_NAME_MAX_LEN;
  const candidateName = prductFull != null ? prductFull.slice(0, CANDIDATE_NAME_MAX_LEN) : null;

  const reviewFlags: HealthFunctionalFoodReviewFlag[] = [];
  if (sttemntNo == null) reviewFlags.push('STTEMNT_NO_MISSING');
  if (prductFull == null) reviewFlags.push('PRDUCT_MISSING');
  if (entrps == null) reviewFlags.push('MANUFACTURER_MISSING');
  if (mainFnctn == null) reviewFlags.push('MAIN_FUNCTION_MISSING');
  if (prsrvPd == null) reviewFlags.push('PRESERVATION_MISSING');
  if (intakeHint == null) reviewFlags.push('INTAKE_HINT_MISSING');
  if (nameTruncated) reviewFlags.push('CANDIDATE_NAME_OVERLENGTH');
  // 건강기능식품 데이터셋에는 barcode/표준코드/포장단위 축이 없음 → 전건 표시(승격 보류 근거)
  reviewFlags.push('SKU_IDENTIFIER_MISSING');

  // STTEMNT_NO 결측이면 식별자 미부착 → dedup 키 없음.
  const identifierType = sttemntNo ? HFF_IDENTIFIER_TYPE : null;

  const rawPayload: Record<string, unknown> = {
    sourceAgency: 'MFDS',
    sourceDatasetName: HFF_SOURCE_DATASET_NAME,
    sourceDatasetId: HFF_SOURCE_DATASET_ID,
    sourceKind: HFF_SOURCE_KIND,
    sourceRowKey: 'STTEMNT_NO',
    regulatoryType: HFF_REGULATORY_TYPE,
    // 기능성은 상품 기본정보가 아님 → 별도 보존 (Store 설명 제작과 섞지 말 것)
    mainFunction: mainFnctn,
    collectedAt: opts.collectedAt ?? null,
    // candidate_name truncate 흔적
    candidateNameTruncated: nameTruncated,
    candidateNameOriginalLength: prductFull != null ? prductFull.length : 0,
    // 검토 플래그 (해당 컬럼 없음 → rawPayload 보존)
    reviewFlags,
    // 무손실 원본 item 전체 (PRDUCT 원문 포함)
    source: item,
  };

  return {
    candidateInput: {
      serviceKey: opts.serviceKey ?? null,
      sourceType: 'external_api',
      sourceLabel: HFF_SOURCE_LABEL,
      identifierType,
      identifierValue: sttemntNo,
      normalizedIdentifierValue: sttemntNo,
      candidateName,
      candidateManufacturer: entrps,
      candidateCategory: HFF_CANDIDATE_CATEGORY,
      candidateSpec: null,
      candidateUnit: null,
      candidateImageUrl: null,
      rawPayload,
    },
    dedupKey: {
      sourceType: 'external_api',
      identifierType: HFF_IDENTIFIER_TYPE,
      normalizedIdentifierValue: sttemntNo,
      sourceKind: HFF_SOURCE_KIND,
    },
    reviewFlags,
    nameTruncated,
  };
}

/** ParsedHealthFunctionalFoodRow 편의 오버로드 — collectedAt 를 row.fetchedAt 로 채운다. */
export function mapHealthFunctionalFoodRow(
  row: ParsedHealthFunctionalFoodRow,
  opts: { serviceKey?: string | null } = {},
): MappedHealthFunctionalFoodCandidate {
  return mapHealthFunctionalFoodItem(row.item, {
    serviceKey: opts.serviceKey ?? null,
    collectedAt: row.fetchedAt,
  });
}
