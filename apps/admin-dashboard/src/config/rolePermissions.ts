// Role-based menu permissions configuration
// Dynamically handles roles from database

import { authClient } from '@o4o/auth-client';

export interface MenuPermission {
  menuId: string;
  roles?: string[]; // Dynamic roles from database
  permissions?: string[];
  requireAll?: boolean; // Requires all permissions if true
}

/**
 * 플랫폼 전역 관리 데이터(회원·사용자)의 **백엔드 접근 경계**.
 *
 * **WO-O4O-ADMIN-MENU-ROUTE-BACKEND-ACCESS-ALIGNMENT-V1**
 *
 * 이 배열은 정책을 새로 정하는 것이 아니라, 이미 배포된 백엔드 guard 상수를 프런트에 **복제**한 것이다.
 *
 * | 백엔드 | 상수 |
 * |---|---|
 * | `/api/v1/admin/users` | `ADMIN_ROLES` — `routes/admin/users.routes.ts:32` |
 * | `/api/v1/membership/*` 관리자 subtree | `MEMBERSHIP_ADMIN_ROLES` — `bootstrap/membership-admin-guard.ts:34` |
 *
 * 메뉴(어떤 항목이 보이는가)와 프런트 route(직접 URL 접근 시 누가 통과하는가)가
 * 이 값을 함께 참조해야 세 계층이 갈라지지 않는다. 백엔드 상수가 바뀌면 여기도 함께 바꾼다
 * (`admin-menu-route-backend-alignment.test.ts` 가 백엔드 소스와 대조해 고정한다).
 */
export const PLATFORM_ADMIN_ROLES = ['platform:super_admin'] as const;

// Menu permission configuration without hardcoded roles
// Roles should be fetched from database and checked dynamically
export const menuPermissions: MenuPermission[] = [
  // WO-O4O-ADMIN-RBAC-LEGACY-AND-NAVIGATION-CLEANUP-CONSOLIDATED-V1:
  //   정적 메뉴 트리(admin-menu.static.tsx)와 전수 대조해 대응 항목이 없는 고아 설정 19건을 제거했다.
  //   제거 대상: home / dashboard-home / dashboard-overview / dashboard-stats / user-management /
  //   users / users-list / users-create / users-edit / reports / analytics / sales-reports /
  //   settings / general-settings / logs / profile / users-profile / ui-elements / ui-components
  //
  //   근거: hasMenuPermission 은 메뉴 항목의 id 로만 조회되고(useAdminMenu.ts:163),
  //   동적 메뉴(/api/v1/navigation/admin)는 Phase R1 이후 빈 배열 stub 이라 정적 트리가 유일한 소스다.
  //   위 id 를 가진 메뉴 항목이 0건이므로 해당 설정은 평가되는 경로가 없었다.
  //   또한 "설정 없음 = 허용" 정책(아래 hasMenuPermission)이라 제거로 접근이 좁아질 수 없다.
  //
  //   남긴 항목은 정적 메뉴에 실재하는 2건뿐이다: dashboard(무게이트) · core-users(실게이트).
  {
    menuId: 'dashboard',
    // No specific roles - available to all authenticated users
  },

  // WO-O4O-ADMIN-USERS-RBAC-CONSOLE-REPOSITIONING-V1:
  // /users 는 platform super_admin 전용 RBAC 권한 할당 콘솔로 재정렬됨.
  //
  // WO-O4O-ADMIN-MENU-ROUTE-BACKEND-ACCESS-ALIGNMENT-V1 — 백엔드 경계로 재정렬:
  //   화면이 실제 호출하는 API 는 `/api/v1/admin/users` 이고(UsersListClean.tsx:72),
  //   그 guard 는 `ADMIN_ROLES = ['platform:super_admin']` 이다
  //   (routes/admin/users.routes.ts:32).
  //   기존 선언은 백엔드 allow-list 와 어긋난 역할을 나열해 **백엔드가 허용하는 사용자에게 메뉴를 숨기고**,
  //   `super_admin` 을 포함해 **백엔드가 거부하는 사용자에게 메뉴를 보여주었다** — 양방향 불일치.
  {
    menuId: 'core-users',
    roles: [...PLATFORM_ADMIN_ROLES]
  },

  // WO-O4O-ADMIN-MENU-ROUTE-BACKEND-ACCESS-ALIGNMENT-V1
  //   회원 관리 메뉴 4건은 모두 `/api/v1/membership/*` 관리자 subtree 를 소비한다.
  //   그 경계는 `MEMBERSHIP_ADMIN_ROLES = ['platform:super_admin']` 이다
  //   (bootstrap/membership-admin-guard.ts:34, 대상 subtree 는 같은 파일 :58-87).
  //
  //   선행 WO 는 분류 메뉴에만 게이트를 걸면서 legacy `admin`·`super_admin` 을 함께 나열했고
  //   ("backend 판정에 따름" 으로 유보), 나머지 3건은 게이트 없이 두었다.
  //   그 결과 `admin`·`super_admin` 에게 메뉴 4건이 모두 보이지만 API 는 403 이다.
  //   메뉴는 보안 경계가 아니라 **실제 접근권을 반영하는 탐색 장치**이므로 백엔드 경계에 맞춘다.
  //
  //   ⚠️ 백엔드 상수가 RBAC 카탈로그의 canonical `admin`·`super_admin` 을 제외한 것이
  //   타당한지는 별도 사안이다. 이 WO 는 계층 간 불일치만 제거하고 경계 자체는 옮기지 않는다.
  { menuId: 'core-membership', roles: [...PLATFORM_ADMIN_ROLES] },
  { menuId: 'core-membership-members', roles: [...PLATFORM_ADMIN_ROLES] },
  { menuId: 'core-membership-verifications', roles: [...PLATFORM_ADMIN_ROLES] },
  { menuId: 'core-membership-categories', roles: [...PLATFORM_ADMIN_ROLES] },

  // Seller Management - No restriction (allow all)
  // These menus are visible to all authenticated users

  // E-commerce - No restriction (allow all)

  // Finance - No restriction (allow all)

  // Marketing - No restriction (allow all)

  // Support - No restriction (allow all)

  // Forum - No restriction (allow all)

  // WO-O4O-ADMIN-MENU-PERMISSIONS-ORPHAN-CONFIG-CLEANUP-V1:
  //   'yaksa-tools' 항목 제거 — 동일하게 대응 메뉴가 admin-menu.static.tsx 에 0건인 고아 설정.

  // CMS - No restriction (allow all)
  // Posts, Pages, Media - All users can view

  // WO-O4O-ADMIN-MENU-PERMISSIONS-ORPHAN-CONFIG-CLEANUP-V1:
  //   system-settings / integrations / tools / import-export / database 5개 항목 제거.
  //   해당 menuId 를 가진 메뉴 항목이 admin-menu.static.tsx 에 하나도 없고(각 0건),
  //   동적 메뉴(/api/v1/navigation/admin)는 Phase R1 이후 빈 배열 stub 이라 정적 트리가
  //   유일한 소스다. 즉 hasMenuPermission 이 이 id 들로 호출되는 경로가 존재하지 않았다.
  //   (선행 WO-…-CANONICAL-SUPER-ADMIN-MENU-PERMISSION-FIX-V1 이 이 항목들에 canonical
  //    역할을 additive 로 추가했으나, 항목 자체가 dead config 로 확정되어 제거로 대체된다.)
  //   Appearance 는 원래 무제한(설정 없음)이라 별도 항목이 없다.
];

/**
 * Check if a user has permission for a menu item
 * @param userRoles - User's roles from database
 * @param userPermissions - User's permissions from database
 * @param menuId - Menu item ID to check
 * @returns boolean indicating if user has access
 */
export function hasMenuPermission(
  userRoles: string[],
  userPermissions: string[],
  menuId: string
): boolean {
  const menuConfig = menuPermissions.find(m => m.menuId === menuId);

  // POLICY: ALLOW BY DEFAULT (Whitelist approach)
  // Menu not found in configuration - allow by default for backward compatibility
  // This allows all menus to be visible unless explicitly restricted
  if (!menuConfig) {
    return true;
  }

  // If no roles or permissions specified, allow all authenticated users
  if (!menuConfig.roles?.length && !menuConfig.permissions?.length) {
    return true;
  }

  // Check role-based access
  if (menuConfig.roles?.length) {
    const hasRole = menuConfig.roles.some(role => userRoles.includes(role));
    // If user has required role, grant access immediately
    if (hasRole) return true;

    // If roles are specified but user doesn't have them, check if permissions are also specified
    // If only roles specified (no permissions), deny access
    if (!menuConfig.permissions?.length) {
      return false;
    }
  }

  // Check permission-based access
  if (menuConfig.permissions?.length) {
    // Special handling: if permissions array is not empty, check them
    if (menuConfig.requireAll) {
      // Requires all permissions
      return menuConfig.permissions.every(permission =>
        userPermissions.includes(permission)
      );
    } else {
      // Requires at least one permission
      const hasPermission = menuConfig.permissions.some(permission =>
        userPermissions.includes(permission)
      );

      // If user has required permission, grant access
      if (hasPermission) return true;

      // If permissions are specified but user doesn't have any, deny access
      return false;
    }
  }

  // Fallback: if we reach here, allow access (should not happen with current logic)
  return true;
}

/**
 * Get all accessible menu items for a user
 * @param userRoles - User's roles from database
 * @param userPermissions - User's permissions from database
 * @returns Array of accessible menu IDs
 */
export function getAccessibleMenus(
  userRoles: string[],
  userPermissions: string[]
): string[] {
  return menuPermissions
    .filter(menu => hasMenuPermission(userRoles, userPermissions, menu.menuId))
    .map(menu => menu.menuId);
}

/**
 * Role configuration should be fetched from API
 * This is a placeholder for the actual API call
 */
export interface RoleConfig {
  id: string;
  name: string;
  displayName: string;
  permissions: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Fetch roles from database
 * This should be replaced with actual API call
 */
export async function fetchRolesFromDatabase(): Promise<RoleConfig[]> {
  try {
    const response = await authClient.api.get('/roles');
    return response.data || [];
  } catch (error) {
    console.error('Error fetching roles:', error);
    // Return empty array as fallback
    return [];
  }
}

/**
 * Fetch user's permissions from database
 * This should be replaced with actual API call
 */
export async function fetchUserPermissions(userId: string): Promise<string[]> {
  try {
    const response = await authClient.api.get(`/userRole/${userId}/permissions`);
    return response.data?.permissions || [];
  } catch (error) {
    console.error('Failed to fetch user permissions:', error);
    return [];
  }
}

// Export for backward compatibility
export default menuPermissions;