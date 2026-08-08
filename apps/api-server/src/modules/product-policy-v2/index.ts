/**
 * Product Policy v2 Module
 *
 * WO-PRODUCT-POLICY-V2-SERVICE-LAYER-INTRODUCTION-V1
 *
 * 기존 승인 로직(OrganizationProductApplication)과 완전히 격리된
 * v2 승인/Listing 생성 서비스 레이어.
 *
 * 내부 테스트 엔드포인트(`/api/internal/v2/product-policy`)는
 * WO-O4O-PRODUCT-POLICY-V2-INTERNAL-SECRET-SEPARATION-V1 에서 제거됐다.
 * 승인은 서비스별 정식 operator route 가 이 서비스 레이어를 호출한다.
 */
export { ProductApprovalV2Service } from './product-approval-v2.service.js';
