/**
 * Medical Device Standard-Code Candidate Mapper — 의료기기 item 1건 → ProductCandidate 후보 (PURE, DB 무관)
 *
 * WO-O4O-MEDICAL-DEVICE-PUBLIC-CANDIDATE-IMPORT-V1
 * 정책 근거: docs/checks/CHECK-O4O-MEDICAL-DEVICE-UDI-IDENTIFIER-CONFLICT-POLICY-V1.md (D2/D3/D4)
 *
 * 본 모듈은 **순수 함수**다. DB / 네트워크 / 파일 시스템을 만지지 않는다.
 *
 * identifierType 정책 (D2/D3):
 *   - UDIDI_CD 숫자 13/14 + GTIN check-digit pass → 'GTIN'  (원형 보존, zero-pad 금지)
 *   - UDIDI_CD 그 외(HIBCC '+' / 비숫자 / 숫자이나 check-digit fail) → 'UDI_DI' (원형 보존)
 *   - UDIDI_CD 결측 → null (식별 불가, reviewFlag)
 *
 *   ProductMaster 승격은 이 파이프라인 범위 밖. ProductCandidate 만.
 *
 * 교차행 플래그(UDI_DI_DUP_CONFLICT / MULTI_UDI_PER_PERMIT)는 단건 매퍼가 알 수 없으므로
 * service 계층에서 배치 후 계산·부착한다. 본 매퍼는 단건 플래그만 계산한다.
 *
 * 허가 상태(active/inactive)는 이 오프라인 importer 에서 join 하지 않는다 → 전건 STATUS_UNCHECKED.
 */

import { isValidGtin } from '../../../utils/gtin.js';
import { normalizeIdentifier } from '../utils/product-identifier.util.js';
import type { ProductIdentifierType } from '../entities/ProductIdentifier.entity.js';
import type { MedicalDeviceStandardCodeItem, ParsedMedicalDeviceRow } from './medical-device-standard-code-jsonl.parser.js';

/** 이 파이프라인 고정 상수 */
export const MDS_SOURCE_LABEL = 'MFDS_MEDICAL_DEVICE_STANDARD_CODE';
export const MDS_SOURCE_KIND = 'medical_device_standard_code';
export const MDS_SOURCE_DATASET_ID = '15073875';
export const MDS_SOURCE_DATASET_NAME = '의료기기 표준코드별 제품정보';
export const MDS_REGULATORY_TYPE = 'MEDICAL_DEVICE';

/** ProductCandidate.candidate_name 컬럼 한도 (varchar 255) */
export const CANDIDATE_NAME_MAX_LEN = 255;

export type MedicalDeviceReviewFlag =
  | 'UDI_DI_MISSING'
  | 'UDI_DI_NON_GTIN'
  | 'UDI_DI_GTIN13'
  | 'UDI_DI_GTIN14_CHECKDIGIT_PASS'
  | 'UDI_DI_GTIN_CHECKDIGIT_FAIL'
  | 'UDI_DI_DUP_CONFLICT' // service 계층 부착
  | 'MULTI_UDI_PER_PERMIT' // service 계층 부착
  | 'PERMIT_NO_MISSING'
  | 'PRODUCT_NAME_MISSING'
  | 'MANUFACTURER_MISSING'
  | 'MODEL_MISSING'
  | 'CANDIDATE_NAME_OVERLENGTH'
  | 'STATUS_UNCHECKED';

export const MDS_REVIEW_FLAGS: MedicalDeviceReviewFlag[] = [
  'UDI_DI_MISSING',
  'UDI_DI_NON_GTIN',
  'UDI_DI_GTIN13',
  'UDI_DI_GTIN14_CHECKDIGIT_PASS',
  'UDI_DI_GTIN_CHECKDIGIT_FAIL',
  'UDI_DI_DUP_CONFLICT',
  'MULTI_UDI_PER_PERMIT',
  'PERMIT_NO_MISSING',
  'PRODUCT_NAME_MISSING',
  'MANUFACTURER_MISSING',
  'MODEL_MISSING',
  'CANDIDATE_NAME_OVERLENGTH',
  'STATUS_UNCHECKED',
];

export type MatchStatus = 'unmatched' | 'conflict';

export interface MappedMedicalDeviceCandidate {
  candidateInput: {
    serviceKey: string | null;
    sourceType: 'external_api';
    sourceLabel: string; // MFDS_MEDICAL_DEVICE_STANDARD_CODE
    matchStatus: MatchStatus; // 기본 unmatched (conflict 는 service 가 승격)
    identifierType: Extract<ProductIdentifierType, 'GTIN' | 'UDI_DI'> | null;
    identifierValue: string | null; // UDIDI_CD 원형
    normalizedIdentifierValue: string | null; // normalizeIdentifier(type, UDIDI_CD)
    candidateName: string | null; // PRDLST_NM 우선 → PRDT_NM_INFO, 255 truncate
    candidateManufacturer: string | null; // MNFT_IPRT_ENTP_NM
    candidateCategory: string | null; // MDEQ_CLSF_NO (+ 등급)
    candidateSpec: string | null; // FOML_INFO (모델/형명)
    candidateUnit: string | null; // 항상 null (포장/SKU 축 미확정)
    candidateImageUrl: string | null; // 항상 null
    rawPayload: Record<string, unknown>;
  };
  /** dedup/idempotency 키 — UDIDI 만으로는 충돌행이 병합되므로 rowSignature 사용 */
  dedupKey: {
    sourceType: 'external_api';
    sourceLabel: string;
    sourceKind: string; // medical_device_standard_code
    rowSignature: string; // PRDLST_NM|FOML_INFO|PERMIT_NO|MNFT|MDEQ_CLSF_NO|UDIDI_CD
  };
  /** 충돌 판정용 정규화 UDIDI (service 교차행 계산 입력) */
  conflictKeyUdi: string | null;
  /** MULTI_UDI_PER_PERMIT 판정용 (service 교차행 계산 입력) */
  permitNo: string | null;
  reviewFlags: MedicalDeviceReviewFlag[];
  nameTruncated: boolean;
}

export interface MapMedicalDeviceOptions {
  serviceKey?: string | null;
  collectedAt?: string | null;
}

/** 값 정규화: trim. 빈 문자열은 null 로. */
function clean(v: unknown): string | null {
  if (v == null) return null;
  const t = String(v).trim();
  return t.length === 0 ? null : t;
}

/**
 * UDIDI_CD 형식 분류 + identifierType 결정.
 * 반환: { identifierType, formatFlag }
 */
function classifyUdi(
  udi: string | null,
): { identifierType: 'GTIN' | 'UDI_DI' | null; formatFlag: MedicalDeviceReviewFlag | null } {
  if (!udi) return { identifierType: null, formatFlag: 'UDI_DI_MISSING' };

  const isNumeric = /^\d+$/.test(udi);
  const len = udi.length;

  if (isNumeric && (len === 13 || len === 14)) {
    if (isValidGtin(udi)) {
      return {
        identifierType: 'GTIN',
        formatFlag: len === 14 ? 'UDI_DI_GTIN14_CHECKDIGIT_PASS' : 'UDI_DI_GTIN13',
      };
    }
    // 숫자 13/14 이나 check-digit 실패 → GTIN 부적합. UDI_DI 로 보존.
    return { identifierType: 'UDI_DI', formatFlag: 'UDI_DI_GTIN_CHECKDIGIT_FAIL' };
  }

  // HIBCC('+') / 비숫자 / 기타 길이 숫자 → UDI_DI (원형 보존)
  return { identifierType: 'UDI_DI', formatFlag: 'UDI_DI_NON_GTIN' };
}

/**
 * 의료기기 표준코드 item → 후보 + 검토 플래그 (단건).
 */
export function mapMedicalDeviceItem(
  item: MedicalDeviceStandardCodeItem,
  opts: MapMedicalDeviceOptions = {},
): MappedMedicalDeviceCandidate {
  const udi = clean(item.UDIDI_CD);
  const prdlstNm = clean(item.PRDLST_NM);
  const prdtNmInfo = clean(item.PRDT_NM_INFO);
  const entrps = clean(item.MNFT_IPRT_ENTP_NM);
  const permitNo = clean(item.PERMIT_NO);
  const foml = clean(item.FOML_INFO);
  const clsfNo = clean(item.MDEQ_CLSF_NO);
  const grade = clean(item.CLSF_NO_GRAD_CD);

  const { identifierType, formatFlag } = classifyUdi(udi);
  const normalizedIdentifierValue =
    identifierType && udi ? normalizeIdentifier(identifierType, udi) : null;

  // candidateName: PRDLST_NM 우선, 없으면 PRDT_NM_INFO. varchar(255) 방어적 truncate.
  const nameFull = prdlstNm ?? prdtNmInfo;
  const nameTruncated = nameFull != null && nameFull.length > CANDIDATE_NAME_MAX_LEN;
  const candidateName = nameFull != null ? nameFull.slice(0, CANDIDATE_NAME_MAX_LEN) : null;

  const candidateCategory =
    [clsfNo, grade ? `등급${grade}` : null].filter((x): x is string => !!x).join(' / ') || null;

  const reviewFlags: MedicalDeviceReviewFlag[] = [];
  if (formatFlag) reviewFlags.push(formatFlag);
  if (permitNo == null) reviewFlags.push('PERMIT_NO_MISSING');
  if (nameFull == null) reviewFlags.push('PRODUCT_NAME_MISSING');
  if (entrps == null) reviewFlags.push('MANUFACTURER_MISSING');
  if (foml == null) reviewFlags.push('MODEL_MISSING');
  if (nameTruncated) reviewFlags.push('CANDIDATE_NAME_OVERLENGTH');
  // 허가 상태는 이 오프라인 importer 에서 join 하지 않음 → 전건 표시.
  reviewFlags.push('STATUS_UNCHECKED');

  // dedup/idempotency: UDIDI 단독은 충돌행(같은 코드 다른 제품)을 병합하므로 rowSignature 사용.
  const rowSignature = [prdlstNm, foml, permitNo, entrps, clsfNo, udi]
    .map((x) => x ?? '')
    .join('|');

  const rawPayload: Record<string, unknown> = {
    sourceAgency: 'MFDS',
    sourceDatasetName: MDS_SOURCE_DATASET_NAME,
    sourceDatasetId: MDS_SOURCE_DATASET_ID,
    sourceKind: MDS_SOURCE_KIND,
    sourceRowKey: 'UDIDI_CD',
    sourceRowSignature: rowSignature,
    regulatoryType: MDS_REGULATORY_TYPE,
    permitNo,
    permitDate: clean(item.PRMSN_YMD),
    model: foml,
    classificationNo: clsfNo,
    grade,
    // 공식 사용목적/조건은 상품 기본정보가 아님 → 보존만(Store 설명 제작과 섞지 말 것)
    usePurpose: clean(item.USE_PURPS_CONT),
    storageCondition: clean(item.STRG_CND_INFO),
    circulationCondition: clean(item.CIRC_CND_INFO),
    collectedAt: opts.collectedAt ?? null,
    candidateNameTruncated: nameTruncated,
    candidateNameOriginalLength: nameFull != null ? nameFull.length : 0,
    // 상태 미조인 표시 (permit status map 미연결)
    statusJoined: false,
    reviewFlags,
    // 무손실 원본 item 전체
    source: item,
  };

  return {
    candidateInput: {
      serviceKey: opts.serviceKey ?? null,
      sourceType: 'external_api',
      sourceLabel: MDS_SOURCE_LABEL,
      matchStatus: 'unmatched',
      identifierType,
      identifierValue: udi,
      normalizedIdentifierValue,
      candidateName,
      candidateManufacturer: entrps,
      candidateCategory,
      candidateSpec: foml,
      candidateUnit: null,
      candidateImageUrl: null,
      rawPayload,
    },
    dedupKey: {
      sourceType: 'external_api',
      sourceLabel: MDS_SOURCE_LABEL,
      sourceKind: MDS_SOURCE_KIND,
      rowSignature,
    },
    conflictKeyUdi: normalizedIdentifierValue,
    permitNo,
    reviewFlags,
    nameTruncated,
  };
}

/** ParsedMedicalDeviceRow 편의 오버로드 — collectedAt 를 row.fetchedAt 로 채운다. */
export function mapMedicalDeviceRow(
  row: ParsedMedicalDeviceRow,
  opts: { serviceKey?: string | null } = {},
): MappedMedicalDeviceCandidate {
  return mapMedicalDeviceItem(row.item, {
    serviceKey: opts.serviceKey ?? null,
    collectedAt: row.fetchedAt,
  });
}
