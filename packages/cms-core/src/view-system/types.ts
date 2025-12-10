/**
 * View System Types
 *
 * View System의 핵심 타입 정의
 */

import type { ComponentType } from 'react';

/**
 * View 컴포넌트 타입
 */
export type ViewComponent = ComponentType<ViewProps>;

/**
 * View Props 기본 인터페이스
 */
export interface ViewProps {
  /** View에 전달되는 데이터 */
  data?: Record<string, unknown>;
  /** 라우트 파라미터 */
  params?: Record<string, string>;
  /** 쿼리 스트링 */
  query?: Record<string, string>;
}

/**
 * View 등록 옵션
 */
export interface ViewRegistrationOptions {
  /** View 유형 */
  type: 'list' | 'detail' | 'edit' | 'create' | 'custom';
  /** 연결된 CPT (Custom Post Type) */
  cptName?: string;
  /** View 레이아웃 */
  layout?: 'default' | 'fullwidth' | 'sidebar';
  /** 접근 권한 */
  permissions?: string[];
  /** View 제목 */
  title?: string;
  /** View 설명 */
  description?: string;
}

/**
 * 등록된 View 엔트리
 */
export interface ViewEntry {
  /** View 고유 ID */
  viewId: string;
  /** View 컴포넌트 */
  component: ViewComponent;
  /** 등록 옵션 */
  options: ViewRegistrationOptions;
  /** 소유 앱 ID */
  appId: string;
  /** 등록 시간 */
  registeredAt: Date;
}

/**
 * Navigation 아이템
 */
export interface NavigationItem {
  /** 메뉴 ID */
  id: string;
  /** 표시 라벨 */
  label: string;
  /** 경로 */
  path: string;
  /** 아이콘 (optional) */
  icon?: string;
  /** 부모 메뉴 ID (하위 메뉴인 경우) */
  parentId?: string;
  /** 정렬 순서 */
  order?: number;
  /** 접근 권한 */
  permissions?: string[];
  /** 소유 앱 ID */
  appId: string;
  /** 하위 메뉴 */
  children?: NavigationItem[];
}

/**
 * Dynamic Route 설정
 */
export interface DynamicRouteConfig {
  /** 라우트 패턴 (예: /forum/:id) */
  pattern: string;
  /** 연결된 View ID */
  viewId: string;
  /** 라우트 메타데이터 */
  meta?: {
    title?: string;
    layout?: string;
    auth?: boolean;
  };
}

/**
 * View System 통계
 */
export interface ViewSystemStats {
  totalViews: number;
  viewsByApp: Record<string, number>;
  viewsByType: Record<string, number>;
  totalNavItems: number;
  totalRoutes: number;
}
