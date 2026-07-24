/**
 * PharmacyApprovalGatePage - (폐지됨) 약국 서비스 별도 신청 게이트
 *
 * WO-O4O-KPA-OPERATOR-PHARMACY-SERVICE-REQUEST-LEGACY-REMOVE-V1:
 *   약국 서비스 별도 self-service 신청(pharmacyRequestApi.create) 흐름을 폐지한다.
 *   매장 운영 권한(kpa:store_owner)은 약국 경영자 회원 승인(Path B) 시 조직 생성과
 *   함께 자동 부여되므로, 별도 신청 폼을 제공하지 않는다.
 *
 *   기존 진입 링크 호환을 위해 라우트는 유지하되, /pharmacy 게이트(안내/리다이렉트)로
 *   즉시 이동시킨다. /pharmacy 는 role 상태에 따라:
 *     - store_owner  → /store
 *     - 그 외 회원   → 약국 경영자 회원 안내
 */

import { Navigate } from 'react-router-dom';

export function PharmacyApprovalGatePage() {
  return <Navigate to="/pharmacy" replace />;
}

export default PharmacyApprovalGatePage;
