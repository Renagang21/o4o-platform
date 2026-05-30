/**
 * OperatorCapability — Operator UI Visibility Control Layer
 *
 * WO-O4O-OPERATOR-CAPABILITY-LAYER-V1
 *
 * 모든 Operator 기능은 공통으로 존재하되,
 * 서비스별 노출은 이 Capability enum으로 제어한다.
 * Backend는 모든 기능 유지 — Frontend UI 제어 전용.
 */

// WO-O4O-OPERATOR-SHARED-CARE-TYPE-CONTRACT-REMOVAL-V1 (W5c-v2):
//   CARE enum 멤버 제거. IR-O4O-GLYCOPHARM-CARE-REINTRODUCTION-POLICY-V1 옵션 A
//   (Care 영구 폐기) 적용. Care 재도입 시 새 Core 의 sub-capability (care:consultation 등)
//   로 별도 설계 (IR-O4O-CARE-CORE-REINTRODUCTION-ARCHITECTURE-V1).
export enum OperatorCapability {
  USER_MANAGEMENT = 'USER_MANAGEMENT',
  MEMBERSHIP_APPROVAL = 'MEMBERSHIP_APPROVAL',
  CONTENT_MANAGEMENT = 'CONTENT_MANAGEMENT',
  COMMUNITY = 'COMMUNITY',
  SIGNAGE = 'SIGNAGE',
  STORE_MANAGEMENT = 'STORE_MANAGEMENT',
  ANALYTICS = 'ANALYTICS',
  SETTINGS = 'SETTINGS',
}
