/**
 * Quasi-Drug Permit Candidate Mapper — 의약외품 item 1건 → ProductCandidate 후보 매핑 (PURE, DB 무관)
 *
 * WO-O4O-QUASI-DRUG-PUBLIC-CANDIDATE-IMPORT-MAPPER-AND-SERVICE-V1
 * 선행 dry-run: WO-O4O-QUASI-DRUG-PUBLIC-CANDIDATE-IMPORT-DRYRUN-V1,
 *              WO-O4O-QUASI-DRUG-PUBLIC-RAW-REMAINDER-FETCH-AND-FULL-DRYRUN-V1
 *
 * 본 모듈은 **순수 함수**다. DB / 네트워크 / 파일 시스템을 만지지 않는다.
 *
 * 매핑 정책 (WO):
 *   sourceType=external_api / sourceLabel=MFDS_QUASI_DRUG_PERMIT
 *   identifierType=MFDS_CODE / identifierValue=ITEM_SEQ / normalizedIdentifierValue=trim(ITEM_SEQ)
 *   candidateName=trim(ITEM_NAME) → **255자 truncate** (초과 시 CANDIDATE_NAME_OVERLENGTH flag)
 *   candidateManufacturer=trim(ENTP_NAME) / candidateCategory=trim(CLASS_NO_NAME)
 *   candidateSpec/Unit/ImageUrl=null (포장·SKU·이미지 축 부재 — 전량 dry-run 확정)
 *
 *   ProductMaster 승격은 이 파이프라인 범위 밖(barcode/SKU 부재). ProductCandidate 만.
 *
 * 엔티티 컬럼 매핑 주석:
 *   - regulatoryType / status / officialRegulatoryText / reviewFlags / sourceAgency 등은
 *     ProductCandidate 에 "해당 컬럼 없음" → 전부 rawPayload(jsonb) 에 보존.
 *   - candidate_name 컬럼은 varchar(255). ITEM_NAME 은 최대 1,840자(실측) → truncate 필수.
 *     원문 전체는 rawPayload.source.ITEM_NAME 에 무손실 보존되므로 손실 0.
 *   - EE_DOC_DATA/UD_DOC_DATA/NB_DOC_DATA(효능/용법/주의 XML)는 **파싱하지 않고** 원문 보존.
 *     파싱은 후속 XML 파서 WO 로 분리한다.
 */

import type { QuasiDrugPermitItem, ParsedQuasiDrugRow } from './quasi-drug-permit-jsonl.parser.js';

/** 이 파이프라인 고정 상수 */
export const QUASI_DRUG_SOURCE_LABEL = 'MFDS_QUASI_DRUG_PERMIT';
export const QUASI_DRUG_SOURCE_KIND = 'quasi_drug_permit';
export const QUASI_DRUG_SOURCE_DATASET_ID = '15095679';
export const QUASI_DRUG_SOURCE_DATASET_NAME = '의약외품 제품 허가정보';
export const QUASI_DRUG_ACTIVE_STATUS = '정상';
export const QUASI_DRUG_NOTIFICATION_KIND = '신고';

/** ProductCandidate.candidate_name 컬럼 한도 (varchar 255) */
export const CANDIDATE_NAME_MAX_LEN = 255;

export type QuasiDrugReviewFlag =
  | 'ITEM_SEQ_MISSING'
  | 'ITEM_NAME_MISSING'
  | 'MANUFACTURER_MISSING'
  | 'CATEGORY_MISSING'
  | 'NOT_ACTIVE_PERMIT'
  | 'OFFICIAL_TEXT_MISSING'
  | 'XML_PARSE_REQUIRED'
  | 'CDATA_PRESENT'
  | 'NOTIFICATION_ITEM'
  | 'CANDIDATE_NAME_OVERLENGTH'
  | 'SKU_IDENTIFIER_MISSING';

export const QUASI_DRUG_REVIEW_FLAGS: QuasiDrugReviewFlag[] = [
  'ITEM_SEQ_MISSING',
  'ITEM_NAME_MISSING',
  'MANUFACTURER_MISSING',
  'CATEGORY_MISSING',
  'NOT_ACTIVE_PERMIT',
  'OFFICIAL_TEXT_MISSING',
  'XML_PARSE_REQUIRED',
  'CDATA_PRESENT',
  'NOTIFICATION_ITEM',
  'CANDIDATE_NAME_OVERLENGTH',
  'SKU_IDENTIFIER_MISSING',
];

export interface MappedQuasiDrugCandidate {
  candidateInput: {
    serviceKey: string | null;
    sourceType: 'external_api';
    sourceLabel: string; // MFDS_QUASI_DRUG_PERMIT
    identifierType: 'MFDS_CODE' | null;
    identifierValue: string | null; // ITEM_SEQ (trim)
    normalizedIdentifierValue: string | null; // trim(ITEM_SEQ)
    candidateName: string | null; // trim(ITEM_NAME) truncated to 255
    candidateManufacturer: string | null;
    candidateCategory: string | null;
    candidateSpec: string | null; // 항상 null (WO)
    candidateUnit: string | null; // 항상 null (WO)
    candidateImageUrl: string | null; // 항상 null (WO)
    rawPayload: Record<string, unknown>;
  };
  /** dedup 키 (sourceType + identifierType + normalized ITEM_SEQ + sourceKind) */
  dedupKey: {
    sourceType: 'external_api';
    identifierType: 'MFDS_CODE';
    normalizedIdentifierValue: string | null;
    sourceKind: string; // quasi_drug_permit
  };
  reviewFlags: QuasiDrugReviewFlag[];
  /** CANCEL_CODE_NAME !== '정상' */
  isCancelled: boolean;
  /** candidate_name 이 255자 초과로 truncate 됐는지 */
  nameTruncated: boolean;
  /** EE/UD/NB 중 최소 1개 존재 */
  hasOfficialText: boolean;
}

export interface MapQuasiDrugOptions {
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
 * 의약외품 item → 후보 + 검토 플래그.
 *
 * @param item  의약외품 item (fetch 메타 언랩 후)
 * @param opts  serviceKey / collectedAt
 */
export function mapQuasiDrugPermitItem(
  item: QuasiDrugPermitItem,
  opts: MapQuasiDrugOptions = {},
): MappedQuasiDrugCandidate {
  const itemSeq = clean(item.ITEM_SEQ == null ? null : String(item.ITEM_SEQ));
  const itemNameFull = clean(item.ITEM_NAME == null ? null : String(item.ITEM_NAME));
  const entpName = clean(item.ENTP_NAME == null ? null : String(item.ENTP_NAME));
  const className = clean(item.CLASS_NO_NAME == null ? null : String(item.CLASS_NO_NAME));
  const cancelCodeName = clean(item.CANCEL_CODE_NAME == null ? null : String(item.CANCEL_CODE_NAME));
  const cancelDate = clean(item.CANCEL_DATE == null ? null : String(item.CANCEL_DATE));
  const permitKind = clean(item.PERMIT_KIND_CODE_NM == null ? null : String(item.PERMIT_KIND_CODE_NM));

  // candidate_name: varchar(255) → truncate. 원문은 rawPayload.source 에 무손실 보존.
  const nameTruncated = itemNameFull != null && itemNameFull.length > CANDIDATE_NAME_MAX_LEN;
  const candidateName = itemNameFull != null ? itemNameFull.slice(0, CANDIDATE_NAME_MAX_LEN) : null;

  // 공식 규제 설명 원문 (XML) — 파싱하지 않고 원문 보존
  const ee = item.EE_DOC_DATA ?? null;
  const ud = item.UD_DOC_DATA ?? null;
  const nb = item.NB_DOC_DATA ?? null;
  const officialRegulatoryText = {
    efficacyXml: ee,
    dosageXml: ud,
    cautionXml: nb,
    ingredients: {
      main: item.MAIN_INGR ?? null,
      additive: item.ADIT_INGR ?? null,
    },
  };
  const docBlob = [ee, ud, nb].filter((v) => v != null && String(v).trim().length > 0).join('');
  const hasOfficialText = docBlob.length > 0;
  const hasCdata = /<!\[CDATA\[/i.test(docBlob);

  const isCancelled = cancelCodeName == null || cancelCodeName !== QUASI_DRUG_ACTIVE_STATUS;

  const reviewFlags: QuasiDrugReviewFlag[] = [];
  if (itemSeq == null) reviewFlags.push('ITEM_SEQ_MISSING');
  if (itemNameFull == null) reviewFlags.push('ITEM_NAME_MISSING');
  if (entpName == null) reviewFlags.push('MANUFACTURER_MISSING');
  if (className == null) reviewFlags.push('CATEGORY_MISSING');
  if (isCancelled) reviewFlags.push('NOT_ACTIVE_PERMIT');
  if (!hasOfficialText) reviewFlags.push('OFFICIAL_TEXT_MISSING');
  if (hasOfficialText) reviewFlags.push('XML_PARSE_REQUIRED');
  if (hasCdata) reviewFlags.push('CDATA_PRESENT');
  if (permitKind === QUASI_DRUG_NOTIFICATION_KIND) reviewFlags.push('NOTIFICATION_ITEM');
  if (nameTruncated) reviewFlags.push('CANDIDATE_NAME_OVERLENGTH');
  // 의약외품 데이터셋에는 barcode/표준코드/포장단위 축이 없음 → 전건 표시(승격 보류 근거)
  reviewFlags.push('SKU_IDENTIFIER_MISSING');

  // ITEM_SEQ 결측이면 식별자 미부착 → dedup 키 없음.
  const identifierType = itemSeq ? 'MFDS_CODE' : null;

  const rawPayload: Record<string, unknown> = {
    sourceAgency: 'MFDS',
    sourceDatasetName: QUASI_DRUG_SOURCE_DATASET_NAME,
    sourceDatasetId: QUASI_DRUG_SOURCE_DATASET_ID,
    sourceKind: QUASI_DRUG_SOURCE_KIND,
    sourceRowKey: 'ITEM_SEQ',
    regulatoryType: 'QUASI_DRUG',
    collectedAt: opts.collectedAt ?? null,
    status: { cancelCodeName, cancelDate },
    // 공식 규제 설명 원문 (파싱 금지 — 후속 WO). Store 설명 제작과 섞지 말 것.
    officialRegulatoryText,
    // candidate_name truncate 흔적
    candidateNameTruncated: nameTruncated,
    candidateNameOriginalLength: itemNameFull != null ? itemNameFull.length : 0,
    // 검토 플래그 (해당 컬럼 없음 → rawPayload 보존)
    reviewFlags,
    // 무손실 원본 item 전체 (ITEM_NAME 원문 포함)
    source: item,
  };

  return {
    candidateInput: {
      serviceKey: opts.serviceKey ?? null,
      sourceType: 'external_api',
      sourceLabel: QUASI_DRUG_SOURCE_LABEL,
      identifierType,
      identifierValue: itemSeq,
      normalizedIdentifierValue: itemSeq,
      candidateName,
      candidateManufacturer: entpName,
      candidateCategory: className,
      candidateSpec: null,
      candidateUnit: null,
      candidateImageUrl: null,
      rawPayload,
    },
    dedupKey: {
      sourceType: 'external_api',
      identifierType: 'MFDS_CODE',
      normalizedIdentifierValue: itemSeq,
      sourceKind: QUASI_DRUG_SOURCE_KIND,
    },
    reviewFlags,
    isCancelled,
    nameTruncated,
    hasOfficialText,
  };
}

/** ParsedQuasiDrugRow 편의 오버로드 — collectedAt 를 row.fetchedAt 로 채운다. */
export function mapQuasiDrugRow(
  row: ParsedQuasiDrugRow,
  opts: { serviceKey?: string | null } = {},
): MappedQuasiDrugCandidate {
  return mapQuasiDrugPermitItem(row.item, {
    serviceKey: opts.serviceKey ?? null,
    collectedAt: row.fetchedAt,
  });
}
