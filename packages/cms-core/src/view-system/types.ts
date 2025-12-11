/**
 * View System Types
 *
 * View System의 핵심 타입 정의
 * Phase 6: Multi-Tenancy & Service Group Support
 */

import type { ComponentType } from 'react';

/**
 * Service Group 타입 (Phase 6)
 */
export type ServiceGroup =
  | 'cosmetics'    // 화장품 서비스
  | 'yaksa'        // 약사회 서비스
  | 'tourist'      // 관광객 서비스
  | 'sellerops'    // 판매자 운영
  | 'supplierops'  // 공급자 운영
  | 'global';      // 모든 서비스 공통

/**
 * View Query Context (Phase 6)
 * View 조회 시 사용되는 필터링 컨텍스트
 */
export interface ViewQueryContext {
  /** 현재 서비스 그룹 */
  serviceGroup?: ServiceGroup;
  /** 현재 테넌트 ID */
  tenantId?: string;
  /** 사용자 권한 */
  permissions?: string[];
  /** 사용자 역할 */
  roles?: string[];
}

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
  /** Service Group 제한 (Phase 6) */
  serviceGroups?: ServiceGroup[];
  /** 허용된 테넌트 목록 (Phase 6) */
  allowedTenants?: string[];
  /** 우선순위 (높을수록 먼저 선택됨, Phase 6) */
  priority?: number;
  /** 조건 함수 - 동적으로 View 선택 여부 결정 (Phase 6) */
  condition?: (context: ViewQueryContext) => boolean;
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

/**
 * Theme Token Context for Views (Phase 6)
 * Views can access theme tokens for styling
 */
export interface ViewThemeContext {
  /** Theme identifier */
  themeId?: string;
  /** Color mode */
  colorMode?: 'light' | 'dark' | 'system';
  /** Custom token overrides */
  tokenOverrides?: Record<string, string>;
  /** Whether to apply token CSS variables */
  injectTokens?: boolean;
}

/**
 * Extended View Props with Theme Context (Phase 6)
 */
export interface ViewPropsWithTheme extends ViewProps {
  /** Theme context for styling */
  theme?: ViewThemeContext;
  /** Service group context */
  serviceGroup?: ServiceGroup;
  /** Tenant context */
  tenantId?: string;
}
