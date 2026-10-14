import { OfferDistributionType } from '../entities/index.js';
import { OfferErrorCode } from '../constants/offer-error-code.js';


/**
 * WO-NETURE-DISTRIBUTION-MODEL-SPLIT-PUBLIC-AND-SERVICE-SUPPLY-V1
 * isPublic + serviceKeys → distributionType 파생 (하위호환)
 */
export function deriveDistributionType(isPublic: boolean, serviceKeys: string[]): OfferDistributionType {
  if (isPublic) return OfferDistributionType.PUBLIC;
  if (serviceKeys.length > 0) return OfferDistributionType.SERVICE;
  return OfferDistributionType.PRIVATE;
}

/**
 * WO-O4O-REGULATED-PRODUCT-GATE-CONSOLIDATION-V1
 *
 * 규제 상품(의약품/건강기능식품/의약외품 등)은 약국 전용 서비스에만 연결될 수 있다.
 *
 * 약국 대상 서비스 판정은 DB 정책(service_audience_policies)을 SSOT 로 사용한다.
 *  - WO-O4O-SERVICE-PHARMACY-AUDIENCE-POLICY-SETTINGS-V1 에서 admin 설정 소스 도입.
 *  - WO-O4O-DRUG-SERVICE-CONNECTION-GATE-V1 에서 본 함수가 ServiceAudienceService 를 참조하도록 전환
 *    (기존 하드코딩 ['kpa-society'] 는 ServiceAudienceService 의 fallback 으로 이전됨).
 *  - 카테고리 정의 / 규제 판정 기준(isRegulated) 자체는 변경하지 않는다.
 */

/**
 * WO-O4O-REGULATED-PRODUCT-GATE-CONSOLIDATION-V1
 *
 * 규제 상품 permit 게이트 공통 헬퍼.
 * 기존 두 분기(승인 / 등록)의 동작을 그대로 유지하며 단일 진입점으로 흡수.
 *
 * - 'approval': 승인 시점 — DB 조회된 mfds_permit_number 부재 시 PERMIT_REQUIRED_FOR_APPROVAL
 * - 'registration': 등록 시점 — master MFDS 미검증 + 입력 허가번호 부재 시 PERMIT_REQUIRED_FOR_UNVERIFIED_REGULATED
 */
export function assertRegulatedPermit(args: {
  isRegulated: boolean;
  mfdsPermitNumber: string | null | undefined;
  isMfdsVerified?: boolean;
  mode: 'approval' | 'registration';
}): OfferErrorCode | null {
  if (!args.isRegulated) return null;
  if (args.mode === 'approval') {
    return args.mfdsPermitNumber ? null : OfferErrorCode.PERMIT_REQUIRED_FOR_APPROVAL;
  }
  // registration
  if (!args.isMfdsVerified && !args.mfdsPermitNumber) {
    return OfferErrorCode.PERMIT_REQUIRED_FOR_UNVERIFIED_REGULATED;
  }
  return null;
}

/**
 * WO-O4O-REGULATED-PRODUCT-GATE-CONSOLIDATION-V1
 *
 * 규제 상품의 service_keys가 약국 전용 서비스의 부분집합인지 검증.
 * 위반 시 OfferErrorCode.REGULATED_PRODUCT_NON_PHARMACY_SERVICE 반환.
 *
 * - 규제 상품 아님 → no-op
 * - service_keys 비어있음 → 본 WO에서는 강제하지 않음 (no-op)
 * - service_keys에 비-약국 서비스 1개라도 포함 → 거부
 */
export function assertPharmacyOnlyServiceKeys(
  isPharmacyAudienceService: (serviceKey: string) => boolean,
  isRegulated: boolean,
  serviceKeys: string[] | null | undefined,
): OfferErrorCode | null {
  if (!isRegulated) return null;
  if (!serviceKeys || serviceKeys.length === 0) return null;
  const violating = serviceKeys.filter((k) => !isPharmacyAudienceService(k));
  if (violating.length > 0) {
    return OfferErrorCode.REGULATED_PRODUCT_NON_PHARMACY_SERVICE;
  }
  return null;
}