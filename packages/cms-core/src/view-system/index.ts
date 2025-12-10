/**
 * View System
 *
 * CMS 2.0의 View 기반 화면 구성 시스템
 *
 * 주요 구성요소:
 * - ViewRegistry: View 컴포넌트 중앙 관리
 * - NavigationRegistry: 메뉴 구조 자동 구성
 * - DynamicRouter: 동적 라우팅 자동 생성
 */

import type { NavigationItem, ViewComponent, ViewRegistrationOptions } from './types.js';
import { viewRegistry, ViewRegistry } from './view-registry.js';
import { navigationRegistry, NavigationRegistry } from './navigation-registry.js';
import { dynamicRouter, DynamicRouter } from './dynamic-router.js';

// Types
export * from './types.js';

// View Registry
export { ViewRegistry, viewRegistry };

// Navigation Registry
export { NavigationRegistry, navigationRegistry };

// Dynamic Router
export { DynamicRouter, dynamicRouter };

/**
 * View System 초기화 상태 로깅
 *
 * 앱 활성화 후 현재 상태를 로깅
 */
export function initializeViewSystem(): void {
  console.log('[ViewSystem] Initialized');
  console.log(`[ViewSystem] Views: ${viewRegistry.count()}`);
  console.log(`[ViewSystem] Nav Items: ${navigationRegistry.count()}`);
  console.log(`[ViewSystem] Routes: ${dynamicRouter.count()}`);
}

/**
 * View System 통계 조회
 */
export function getViewSystemStats() {
  const viewStats = viewRegistry.getStats();
  const navStats = navigationRegistry.getStats();

  return {
    ...viewStats,
    ...navStats,
    totalRoutes: dynamicRouter.count(),
  };
}

/**
 * 앱 manifest에서 ViewSystem 등록을 위한 헬퍼 함수
 *
 * 다른 앱들이 activate 시 사용할 수 있는 공통 함수
 *
 * @param appId - 앱 ID
 * @param manifest - 앱 manifest
 */
export function registerAppToViewSystem(
  appId: string,
  manifest: {
    navigation?: {
      admin?: Array<{
        id: string;
        label: string;
        path: string;
        icon?: string;
        parentId?: string;
        order?: number;
        permissions?: string[];
      }>;
    };
    viewTemplates?: Array<{
      viewId: string;
      route: string;
      title?: string;
      type?: string;
      layout?: string;
      auth?: boolean;
    }>;
  }
): { navCount: number; routeCount: number } {
  let navCount = 0;
  let routeCount = 0;

  // 1. Register navigation items
  if (manifest.navigation?.admin) {
    for (const navItem of manifest.navigation.admin) {
      const item: NavigationItem = {
        id: navItem.id,
        label: navItem.label,
        path: navItem.path,
        icon: navItem.icon,
        parentId: navItem.parentId,
        order: navItem.order,
        permissions: navItem.permissions,
        appId,
      };
      navigationRegistry.registerNav(item);
      navCount++;
    }
  }

  // 2. Register dynamic routes from viewTemplates
  if (manifest.viewTemplates) {
    dynamicRouter.registerFromManifest(appId, manifest.viewTemplates);
    routeCount = manifest.viewTemplates.length;
  }

  return { navCount, routeCount };
}

/**
 * 앱 ViewSystem 등록 해제를 위한 헬퍼 함수
 *
 * @param appId - 앱 ID
 * @param manifest - 앱 manifest (routes 해제용)
 */
export function unregisterAppFromViewSystem(
  appId: string,
  manifest?: {
    viewTemplates?: Array<{ route: string }>;
  }
): { viewCount: number; navCount: number; routeCount: number } {
  // 1. Unregister views
  const viewCount = viewRegistry.unregisterByApp(appId);

  // 2. Unregister navigation items
  const navCount = navigationRegistry.unregisterByApp(appId);

  // 3. Unregister dynamic routes
  let routeCount = 0;
  if (manifest?.viewTemplates) {
    for (const template of manifest.viewTemplates) {
      if (dynamicRouter.unregisterRoute(template.route)) {
        routeCount++;
      }
    }
  }

  return { viewCount, navCount, routeCount };
}

/**
 * View 컴포넌트 등록 헬퍼
 *
 * @param appId - 앱 ID
 * @param viewId - View ID (앱 내 고유)
 * @param component - React 컴포넌트
 * @param options - 등록 옵션
 */
export function registerView(
  appId: string,
  viewId: string,
  component: ViewComponent,
  options: ViewRegistrationOptions
): void {
  const fullViewId = `${appId}.${viewId}`;
  viewRegistry.registerView(fullViewId, component, options, appId);
}
