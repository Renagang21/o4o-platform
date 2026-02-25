/**
 * Product Policy v2 Module
 *
 * WO-PRODUCT-POLICY-V2-SERVICE-LAYER-INTRODUCTION-V1
 * WO-PRODUCT-POLICY-V2-INTERNAL-TEST-ENDPOINT-V1
 *
 * 기존 승인 로직(OrganizationProductApplication)과 완전히 격리된
 * v2 승인/Listing 생성 서비스 레이어 + 내부 테스트 엔드포인트.
 */
export { ProductApprovalV2Service } from './product-approval-v2.service.js';
export { createProductPolicyV2InternalRouter } from './product-policy-v2.internal.routes.js';
