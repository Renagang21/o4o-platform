import { MDS_SOURCE_LABEL } from '../drug-import/medical-device-standard-code-candidate.mapper.js';
import { HFF_SOURCE_LABEL } from '../drug-import/health-functional-food-candidate.mapper.js';
import { QUASI_DRUG_SOURCE_LABEL } from '../drug-import/quasi-drug-permit-candidate.mapper.js';
import { EASY_DRUG_SOURCE_LABEL } from '../drug-import/easy-drug-info-candidate.mapper.js';
import type { ProductCandidate } from '../entities/ProductCandidate.entity.js';

/** Storage status remains unchanged. Intake is a preparation pool, not an approval request. */
export const PUBLIC_CANDIDATE_SOURCE_LABELS=[MDS_SOURCE_LABEL,HFF_SOURCE_LABEL,QUASI_DRUG_SOURCE_LABEL,EASY_DRUG_SOURCE_LABEL] as const;
export const candidateIntakeSql = (alias: string) => `(${alias}.source_type='external_api' AND COALESCE(${alias}.source_label,'') IN (${PUBLIC_CANDIDATE_SOURCE_LABELS.map(label=>`'${label}'`).join(',')}))`;
export const candidateUnsupportedIntakeSql=(alias:string)=>`(${candidateIntakeSql(alias)} AND COALESCE(${alias}.raw_payload->>'source','') <> 'supplier_bulk_upload')`;
export const CANDIDATE_REVIEW_FLAGS = {
  STATUS_UNCHECKED: '허가 상태 미확인', UDI_DI_MISSING: 'UDI 식별자 누락',
  UDI_DI_NON_GTIN: '일반 바코드 등록 대상이 아닌 UDI', UDI_DI_GTIN_CHECKDIGIT_FAIL: '바코드 검증 필요',
  UDI_DI_DUP_CONFLICT: '동일 UDI의 원천 정보 충돌', PERMIT_NO_MISSING: '허가번호 누락',
  PRODUCT_NAME_MISSING: '상품명 누락', MANUFACTURER_MISSING: '제조사 누락', MODEL_MISSING: '모델 정보 누락',
} as const;
export function candidateTriage(candidate: ProductCandidate) {
  const intake = candidate.sourceType === 'external_api' && PUBLIC_CANDIDATE_SOURCE_LABELS.some(label=>label===candidate.sourceLabel);
  const payload = candidate.rawPayload ?? {};
  const medicalDevice = candidate.sourceLabel === 'MFDS_MEDICAL_DEVICE_STANDARD_CODE' || payload.regulatoryType === 'MEDICAL_DEVICE';
  const flags = Array.isArray(payload.reviewFlags) ? payload.reviewFlags.filter((value): value is string => typeof value === 'string') : [];
  const reasons: string[] = flags.filter(flag => Object.hasOwn(CANDIDATE_REVIEW_FLAGS,flag)).map(flag => CANDIDATE_REVIEW_FLAGS[flag as keyof typeof CANDIDATE_REVIEW_FLAGS]);
  if (!candidate.candidateName && !reasons.includes('상품명 누락')) reasons.push('상품명 누락');
  if (!candidate.identifierValue && !reasons.includes('UDI 식별자 누락')) reasons.push('식별자 미등록');
  const registered = !!candidate.matchedProductMasterId;
  const active = !registered && ['pending','reviewing'].includes(candidate.candidateStatus);
  const drug = (candidate.sourceLabel ?? '').toLowerCase().startsWith('mfds-drug-master-standard-code');
  const supplier = candidate.sourceType === 'supplier_web' || payload.source === 'supplier_bulk_upload';
  const registration = registered ? 'linked' : drug ? 'drug' : supplier ? 'supplier' : 'unsupported';
  if (registration === 'unsupported' && active) reasons.unshift('현재 화면의 상품 등록 경로 미지원');
  if (!reasons.length && active) reasons.push(intake ? '수집 후 등록 전 검증 필요' : '상품 정보 검토 필요');
  return {
    queue: intake ? 'intake' : 'review', registration, medicalDevice,
    reasons: active ? reasons : [registered ? '상품 등록·연결 완료' : '종료 상태'],
    nextStep: !active ? '처리 결과 확인' : intake
      ? '원천 식별자·허가·필수 정보 검증 후 해당 제품군 등록 경로 검토'
      : '후보 정보를 확인하고 검토 시작 또는 전체 관리자 등록 검토',
  };
}
