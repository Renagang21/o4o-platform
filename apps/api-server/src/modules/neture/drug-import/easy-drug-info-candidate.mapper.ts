/**
 * Easy Drug Info Candidate Mapper — e약은요 item 1건 → ProductCandidate 후보 매핑 (PURE, DB 무관)
 *
 * WO-O4O-EASY-DRUG-INFO-PRODUCT-CANDIDATE-IMPORT-V1
 * 선행: CHECK-O4O-APPROVED-PUBLIC-DATA-API-BULK-FETCH-AND-SAMPLE-MAPPING-V1 (§7 API3 매핑표)
 *
 * 본 모듈은 **순수 함수**다. DB / 네트워크 / 파일 시스템을 만지지 않는다.
 *
 * 매핑 정책 (WO):
 *   sourceType=external_api / sourceLabel=MFDS_EASY_DRUG_INFO
 *   identifierType=MFDS_CODE / identifierValue=itemSeq / normalizedIdentifierValue=trim(itemSeq)
 *   candidateName=itemName / candidateManufacturer=entpName / candidateImageUrl=itemImage
 *   candidateCategory='의약품개요정보(e약은요)' / candidateSpec=null / candidateUnit=null
 *
 *   효능/용법/주의 등은 "상품 기본정보" 가 아니다 → 공식 공공 설명 원문으로
 *   rawPayload.officialConsumerText 에 별도 보존한다(Store 설명 제작과 섞지 않음).
 *
 * 엔티티 컬럼 매핑 주석:
 *   - officialConsumerText / reviewFlags / sourceAgency 등은 ProductCandidate 에 "해당 컬럼 없음"
 *     → 전부 rawPayload(jsonb) 에 보존.
 */

import type { EasyDrugInfoItem, ParsedEasyDrugRow } from './easy-drug-info-jsonl.parser.js';

/** 이 파이프라인 고정 상수 */
export const EASY_DRUG_SOURCE_LABEL = 'MFDS_EASY_DRUG_INFO';
export const EASY_DRUG_SOURCE_KIND = 'easy_drug_info';
export const EASY_DRUG_SOURCE_DATASET_ID = '15075057';
export const EASY_DRUG_SOURCE_DATASET_NAME = '의약품개요정보(e약은요)';
export const EASY_DRUG_CANDIDATE_CATEGORY = '의약품개요정보(e약은요)';

export type EasyDrugReviewFlag =
  | 'ITEM_SEQ_MISSING'
  | 'ITEM_NAME_MISSING'
  | 'MANUFACTURER_MISSING'
  | 'IMAGE_MISSING'
  | 'OFFICIAL_TEXT_MISSING'
  | 'UPDATE_DATE_MISSING';

export const EASY_DRUG_REVIEW_FLAGS: EasyDrugReviewFlag[] = [
  'ITEM_SEQ_MISSING',
  'ITEM_NAME_MISSING',
  'MANUFACTURER_MISSING',
  'IMAGE_MISSING',
  'OFFICIAL_TEXT_MISSING',
  'UPDATE_DATE_MISSING',
];

export interface MappedEasyDrugCandidate {
  /** ProductCandidate write 에 그대로 전달 가능한 입력 */
  candidateInput: {
    serviceKey: string | null;
    sourceType: 'external_api';
    sourceLabel: string; // MFDS_EASY_DRUG_INFO
    identifierType: 'MFDS_CODE' | null;
    identifierValue: string | null; // itemSeq (원본)
    normalizedIdentifierValue: string | null; // trim(itemSeq)
    candidateName: string | null;
    candidateManufacturer: string | null;
    candidateCategory: string | null;
    candidateSpec: string | null; // 항상 null (WO)
    candidateUnit: string | null; // 항상 null (WO)
    candidateImageUrl: string | null;
    rawPayload: Record<string, unknown>;
  };
  /** dedup 키 구성 요소 (sourceType + identifierType + normalized itemSeq + sourceKind) */
  dedupKey: {
    sourceType: 'external_api';
    identifierType: 'MFDS_CODE';
    normalizedIdentifierValue: string | null;
    sourceKind: string; // easy_drug_info
  };
  reviewFlags: EasyDrugReviewFlag[];
  /** 이미지 존재 여부 */
  hasImage: boolean;
  /** 공식 설명 원문 최소 1개 존재 여부 */
  hasOfficialText: boolean;
}

export interface MapEasyDrugOptions {
  serviceKey?: string | null;
  /** raw line 의 fetchedAt (없으면 null) */
  collectedAt?: string | null;
}

/** 값 정규화: trim. 빈 문자열은 null 로. */
function clean(v: string | null | undefined): string | null {
  if (v == null) return null;
  const t = String(v).trim();
  return t.length === 0 ? null : t;
}

/**
 * e약은요 item → 후보 + 검토 플래그.
 *
 * @param item   e약은요 item (fetch 메타 언랩 후)
 * @param opts   serviceKey / collectedAt
 */
export function mapEasyDrugInfoItem(
  item: EasyDrugInfoItem,
  opts: MapEasyDrugOptions = {},
): MappedEasyDrugCandidate {
  const itemSeqRaw = item.itemSeq == null ? null : String(item.itemSeq);
  const itemSeq = clean(itemSeqRaw);
  const itemName = clean(item.itemName == null ? null : String(item.itemName));
  const entpName = clean(item.entpName == null ? null : String(item.entpName));
  const itemImage = clean(item.itemImage == null ? null : String(item.itemImage));
  const updateDe = clean(item.updateDe == null ? null : String(item.updateDe));

  // 공식 공공 설명 원문 (상품 기본정보 아님 — 별도 보존)
  const officialConsumerText = {
    efficacy: item.efcyQesitm ?? null,
    usage: item.useMethodQesitm ?? null,
    warning: item.atpnWarnQesitm ?? null,
    caution: item.atpnQesitm ?? null,
    interaction: item.intrcQesitm ?? null,
    sideEffect: item.seQesitm ?? null,
    storage: item.depositMethodQesitm ?? null,
  };
  const hasOfficialText = Object.values(officialConsumerText).some(
    (v) => v != null && String(v).trim().length > 0,
  );

  const hasImage = itemImage != null;

  const reviewFlags: EasyDrugReviewFlag[] = [];
  if (itemSeq == null) reviewFlags.push('ITEM_SEQ_MISSING');
  if (itemName == null) reviewFlags.push('ITEM_NAME_MISSING');
  if (entpName == null) reviewFlags.push('MANUFACTURER_MISSING');
  if (!hasImage) reviewFlags.push('IMAGE_MISSING');
  if (!hasOfficialText) reviewFlags.push('OFFICIAL_TEXT_MISSING');
  if (updateDe == null) reviewFlags.push('UPDATE_DATE_MISSING');

  // itemSeq 결측이면 식별자 미부착 → dedup 키 없음.
  const identifierType = itemSeq ? 'MFDS_CODE' : null;

  // rawPayload — 상품 기본정보 외 전부 여기에 보존 (해당 컬럼 없음)
  const rawPayload: Record<string, unknown> = {
    sourceAgency: 'MFDS',
    sourceDatasetName: EASY_DRUG_SOURCE_DATASET_NAME,
    sourceDatasetId: EASY_DRUG_SOURCE_DATASET_ID,
    sourceKind: EASY_DRUG_SOURCE_KIND,
    sourceRowKey: 'itemSeq',
    sourceBaseDate: null,
    collectedAt: opts.collectedAt ?? null,
    itemSeq: itemSeq,
    itemImage: itemImage,
    // 공식 공공 설명 원문 (Store 설명 제작과 섞지 말 것)
    officialConsumerText,
    // 검토 플래그 (해당 컬럼 없음 → rawPayload 보존)
    reviewFlags,
    // 무손실 원본 item 전체
    source: item,
  };

  return {
    candidateInput: {
      serviceKey: opts.serviceKey ?? null,
      sourceType: 'external_api',
      sourceLabel: EASY_DRUG_SOURCE_LABEL,
      identifierType,
      identifierValue: itemSeq, // itemSeq (trim)
      normalizedIdentifierValue: itemSeq, // trim(itemSeq)
      candidateName: itemName,
      candidateManufacturer: entpName,
      candidateCategory: EASY_DRUG_CANDIDATE_CATEGORY,
      candidateSpec: null,
      candidateUnit: null,
      candidateImageUrl: itemImage,
      rawPayload,
    },
    dedupKey: {
      sourceType: 'external_api',
      identifierType: 'MFDS_CODE',
      normalizedIdentifierValue: itemSeq,
      sourceKind: EASY_DRUG_SOURCE_KIND,
    },
    reviewFlags,
    hasImage,
    hasOfficialText,
  };
}

/** ParsedEasyDrugRow 편의 오버로드 — collectedAt 를 row.fetchedAt 로 채운다. */
export function mapEasyDrugRow(
  row: ParsedEasyDrugRow,
  opts: { serviceKey?: string | null } = {},
): MappedEasyDrugCandidate {
  return mapEasyDrugInfoItem(row.item, {
    serviceKey: opts.serviceKey ?? null,
    collectedAt: row.fetchedAt,
  });
}
