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
 * Menu admin item interface (nested structure with children)
 * Phase P0 Task A: Support menus.admin pattern
 */
interface MenuAdminItem {
  id: string;
  label: string;
  path?: string;
  icon?: string;
  order?: number;
  permissions?: string[];
  children?: MenuAdminItem[];
}

/**
 * Flatten nested menu items to flat structure with parentId
 */
function flattenMenuItems(
  items: MenuAdminItem[],
  appId: string,
  parentId?: string
): NavigationItem[] {
  const result: NavigationItem[] = [];

  for (const item of items) {
    const navId = `${appId}.${item.id}`;
    const navParentId = parentId ? `${appId}.${parentId}` : undefined;

    result.push({
      id: navId,
      label: item.label,
      path: item.path || '',
      icon: item.icon,
      order: item.order,
      permissions: item.permissions,
      parentId: navParentId,
      appId,
    });

    if (item.children?.length) {
      result.push(...flattenMenuItems(item.children, appId, item.id));
    }
  }

  return result;
}

/**
 * 앱 manifest에서 ViewSystem 등록을 위한 헬퍼 함수
 *
 * 다른 앱들이 activate 시 사용할 수 있는 공통 함수
 * Phase P0 Task A: Supports both navigation.admin and menus.admin patterns
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
    menus?: {
      admin?: MenuAdminItem[];
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

  // 1a. Register navigation items from navigation.admin (flat structure)
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

  // 1b. Register navigation items from menus.admin (nested structure)
  if (manifest.menus?.admin) {
    const flattenedItems = flattenMenuItems(manifest.menus.admin, appId);
    for (const item of flattenedItems) {
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
