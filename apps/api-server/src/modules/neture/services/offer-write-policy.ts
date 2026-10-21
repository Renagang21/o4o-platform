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
