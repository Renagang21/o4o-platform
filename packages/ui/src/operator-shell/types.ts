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
  /**
   * WO-O4O-KPA-OPERATOR-STORES-MENU-VISUAL-SECTION-V1:
   * 지정 시 이 항목 위에 그룹 내부 구획 라벨(비클릭)을 렌더한다. 그룹을 나누지 않고
   * 동일 그룹 안에서 성격이 다른 업무를 시각적으로 구분하기 위한 additive 힌트.
   * 미지정(대부분)이면 기존 렌더 그대로 — 4서비스 무영향.
   */
  sectionLabel?: string;
}

/**
 * 통합 메뉴 항목 — adminOnly 플래그 포함.
 *
 * WO-O4O-OPERATOR-MENU-ROLE-FILTER-COMMONIZATION-G3A-V1:
 *   4 서비스(KPA-Society / GlycoPharm / K-Cosmetics / Neture) 의 config 에 각각
 *   중복 선언돼 있던 동일 타입. filterMenuByRole 의 입력 타입이다.
 */
export interface UnifiedMenuItem extends OperatorMenuItem {
  /** true = admin 역할에게만 표시 */
  adminOnly?: boolean;
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
