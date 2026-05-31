/**
 * Operator 공통 메뉴 타입
 *
 * WO-O4O-OPERATOR-UI-STANDARDIZATION-V1
 * WO-O4O-UI-OPERATOR-SHELL-COMPONENT-REMOVAL-V1:
 *   OperatorShellProps 제거 (OperatorShell 컴포넌트 삭제 동반). OperatorMenuItem / OperatorGroupKey 는
 *   DomainIASidebar 등 공통 컴포넌트 + 4 서비스 operatorMenuGroups 가 사용하므로 유지.
 */

/**
 * 단일 메뉴 항목 (그룹 내 라우트).
 */
export interface OperatorMenuItem {
  /** 표시 라벨 */
  label: string;
  /** 라우트 경로 (e.g., '/operator/users') */
  path: string;
  /** true이면 정확 일치에서만 활성 (Dashboard 등) */
  exact?: boolean;
}

/**
 * Capability Group 키.
 * CLAUDE.md Section 11 표준 순서.
 * resources, lms — WO-KPA-LMS-INSTRUCTOR-APPROVAL-RELOCATE-V1 추가
 */
// WO-O4O-OPERATOR-SHARED-CARE-TYPE-CONTRACT-REMOVAL-V1 (W5c-v2):
//   'care' group key 제거. 5개 서비스 어디에도 active 메뉴 항목 0건이었음.
export type OperatorGroupKey =
  | 'dashboard'
  | 'users'
  | 'approvals'
  | 'products'
  | 'stores'
  | 'orders'
  | 'content'
  | 'resources'
  | 'lms'
  | 'signage'
  | 'forum'
  | 'analytics'
  | 'system';
