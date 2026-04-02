/**
 * OperatorCapability — Operator UI Visibility Control Layer
 *
 * WO-O4O-OPERATOR-CAPABILITY-LAYER-V1
 *
 * 모든 Operator 기능은 공통으로 존재하되,
 * 서비스별 노출은 이 Capability enum으로 제어한다.
 * Backend는 모든 기능 유지 — Frontend UI 제어 전용.
 */

export enum OperatorCapability {
  USER_MANAGEMENT = 'USER_MANAGEMENT',
  MEMBERSHIP_APPROVAL = 'MEMBERSHIP_APPROVAL',
  CONTENT_MANAGEMENT = 'CONTENT_MANAGEMENT',
  COMMUNITY = 'COMMUNITY',
  SIGNAGE = 'SIGNAGE',
  STORE_MANAGEMENT = 'STORE_MANAGEMENT',
  ANALYTICS = 'ANALYTICS',
  CARE = 'CARE',
  SETTINGS = 'SETTINGS',
}
