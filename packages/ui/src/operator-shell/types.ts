/**
 * OperatorShell Types
 *
 * WO-O4O-OPERATOR-UI-STANDARDIZATION-V1
 * 모든 서비스의 Operator UI를 단일 OperatorShell로 통합.
 */

import type { ReactNode } from 'react';
import type { OperatorCapability } from '@o4o/types';

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
  | 'care'
  | 'system';

/**
 * OperatorShell Props.
 */
export interface OperatorShellProps {
  /** 서비스 표시명 (e.g., "Neture", "GlycoPharm") */
  serviceName: string;
  /** 그룹별 메뉴 항목 — 서비스가 라우트 매핑 제공 */
  menuItems: Partial<Record<OperatorGroupKey, OperatorMenuItem[]>>;
  /** 서비스 활성 Capability 목록 */
  capabilities: OperatorCapability[];
  /** 현재 사용자 */
  user: { name: string; email?: string } | null;
  /** 로그아웃 핸들러 */
  onLogout: () => void;
  /** 메인 사이트 링크 (default: "/") */
  homeLink?: string;
  /** 대시보드 로고 링크 (default: "/operator") — WO-O4O-OPERATOR-UI-UNIFICATION-V1 */
  dashboardLink?: string;
  /** Footer 커스텀. false = 숨김 */
  footer?: ReactNode | false;
  /** 헤더 우측 추가 액션 (e.g., AccountMenu) */
  headerActions?: ReactNode;
  /** 헤더 전체 커스터마이징 — 제공 시 기본 헤더 대신 렌더링 */
  renderHeader?: (props: {
    serviceName: string;
    user: { name: string; email?: string } | null;
    onLogout: () => void;
    homeLink: string;
    dashboardLink: string;
  }) => ReactNode;
  /** Sidebar sticky 오프셋 Tailwind 클래스 (default: 'top-6'). GlobalHeader 사용 시 'top-20' */
  sidebarTopOffset?: string;
  /** Content 영역 — 일반적으로 <Outlet /> */
  children: ReactNode;
}
