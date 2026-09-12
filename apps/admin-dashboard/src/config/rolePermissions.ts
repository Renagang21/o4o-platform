// Role-based menu permissions configuration
// Dynamically handles roles from database


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
  //   WO-O4O-ADMIN-AUTHORIZATION-REGISTRY-AND-DEAD-SURFACE-FINAL-CLOSURE-V1 (§4):
  //   deny-by-default 전환에 따라 'dashboard' 도 명시적인 설정을 갖는다.
  //   관리자 SPA 진입 floor(App.tsx)가 이미 platform:super_admin 전용이므로
  //   노출 범위는 변하지 않고 선언만 명시화된다.
  {
    menuId: 'dashboard',
    roles: [...PLATFORM_ADMIN_ROLES]
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

  // WO-O4O-ADMIN-INFORMATION-ARCHITECTURE-AND-MENU-ROLE-REFACTOR-V1
  //   `/operators` 는 `/users` 와 **같은 endpoint**(`/api/v1/admin/users`)를 소비하므로
  //   같은 경계를 선언한다. 무게이트로 두면 "설정 없음 = 허용" 정책에 따라
  //   서비스 접두 역할(kpa:operator 등)에게도 노출되는데, 백엔드는 그들을 403 으로 거부한다.
  {
    menuId: 'core-operators',
    roles: [...PLATFORM_ADMIN_ROLES]
  },

  // WO-O4O-KPA-BRANCH-SERVICE-MEMBER-APPROVAL-UI-V1
  //   `/admin/kpa-branch/service-members` — 백엔드 adminGuards(kpa-branch:admin · platformBypass).
  //   이 사이트 floor(platform:super_admin)와 같은 경계를 선언한다.
  {
    menuId: 'core-kpa-branch-service-members',
    roles: [...PLATFORM_ADMIN_ROLES]
  },

  // WO-O4O-ADMIN-INFORMATION-ARCHITECTURE-AND-MENU-ROLE-REFACTOR-V1 — 백엔드 경계 복제
  //
  //   아래 3건은 백엔드가 `platform:super_admin` 만 허용하는 화면이다. 무게이트로 두면
  //   "설정 없음 = 허용" 정책 + 당시 App.tsx floor(`['admin']`)의 서비스 접두 역할 수용 때문에
  //   `kpa:operator`·`neture:operator` 등에게도 메뉴가 보이지만, 클릭하면 API 가 403 이었다.
  //   **쓸 수 없는 메뉴를 보여주지 않는다.**
  //
  //   WO-O4O-ADMIN-PLATFORM-ONLY-ACCESS-AND-POST-REFACTOR-FINAL-CLOSURE-V1 (A축) 이후
  //   App.tsx floor 자체가 `['platform:super_admin']` 이라 서비스 접두 역할은 관리자 사이트에
  //   진입하지 못한다. 따라서 이 선언들은 이제 **이중 방어**다. floor 가 유일한 방어선이
  //   되지 않도록 유지하며, "설정 없음 = 허용" 에 기대는 platform 전용 메뉴는 없다.
  //
  //   | 메뉴 | 백엔드 | 가드 |
  //   |---|---|---|
  //   | core-points     | `/api/v1/points/admin/*`      | `requireAuth` + `requireAdmin` |
  //   | platform-hub    | `/api/v1/platform/hub/*`      | `requireAuth` + `requirePlatformAdmin` |
  //   | ops-metrics     | `/api/v1/admin/ops/metrics`   | `authenticate` + `requireAdmin` |
  //   | appstore-browse | `/api/v1/admin/apps`          | `requireAdmin` |
  //
  //   `requireAdmin` 은 WO-O4O-REQUIREADMIN-PREFIXED-ONLY-V1 이후 `platform:super_admin` 전용이다
  //   (legacy `admin`·`super_admin` 거부).
  {
    menuId: 'core-points',
    roles: [...PLATFORM_ADMIN_ROLES]
  },
  {
    menuId: 'platform-hub',
    roles: [...PLATFORM_ADMIN_ROLES]
  },
  {
    menuId: 'ops-metrics',
    roles: [...PLATFORM_ADMIN_ROLES]
  },
  {
    menuId: 'appstore-browse',
    roles: [...PLATFORM_ADMIN_ROLES]
  },

  // ===========================================================================
  // WO-O4O-ADMIN-AUTHORIZATION-REGISTRY-AND-DEAD-SURFACE-FINAL-CLOSURE-V1 §4
  //
  //   정책을 "설정 없음 = 허용" 에서 **deny-by-default** 로 전환하기 전에,
  //   정적 메뉴 트리(admin-menu.static.tsx)의 **모든 노드**가 명시적인 설정을
  //   갖도록 먼저 정렬한다 (§4.1 "반환값만 바꾸지 않는다",
  //   §4.2 "메뉴가 누락으로 사라지지 않는다").
  //
  //   대상 = 클릭 가능 메뉴 22 + 경로 없는 그룹 헤더 5 = 27 노드.
  //   그룹 헤더도 filterMenuItems 가 hasMenuPermission 을 호출하므로
  //   (useAdminMenu.ts) 설정이 없으면 자식까지 통째로 사라진다.
  //
  //   역할은 전부 PLATFORM_ADMIN_ROLES 로 통일한다. 관리자 SPA 진입 floor 가
  //   이미 platform:super_admin 전용이므로 실제 노출 범위는 변하지 않으며,
  //   §4.2 에 따라 platform 이외 역할은 메뉴 설정에 추가하지 않는다.
  //   (메뉴 권한 ≠ 백엔드 권한 — 백엔드 가드는 각 라우터가 독립적으로 검사한다.)
  // ===========================================================================

  // 그룹 헤더 (path 없음 — 자식 노출을 위해 반드시 설정이 필요하다)
  {
    menuId: 'core',
    roles: [...PLATFORM_ADMIN_ROLES]
  },
  {
    menuId: 'o4o-product-db',
    roles: [...PLATFORM_ADMIN_ROLES]
  },
  {
    menuId: 'content',
    roles: [...PLATFORM_ADMIN_ROLES]
  },
  {
    menuId: 'cms',
    roles: [...PLATFORM_ADMIN_ROLES]
  },
  {
    menuId: 'appstore',
    roles: [...PLATFORM_ADMIN_ROLES]
  },

  // 클릭 가능 메뉴 (기존 선언된 7건 외 잔여)
  {
    menuId: 'core-settings',
    roles: [...PLATFORM_ADMIN_ROLES]
  },
  {
    menuId: 'o4o-product-db-overview',
    roles: [...PLATFORM_ADMIN_ROLES]
  },
  {
    menuId: 'o4o-product-db-candidates',
    roles: [...PLATFORM_ADMIN_ROLES]
  },
  {
    menuId: 'o4o-product-db-store-requests',
    roles: [...PLATFORM_ADMIN_ROLES]
  },
  {
    menuId: 'o4o-product-db-masters',
    roles: [...PLATFORM_ADMIN_ROLES]
  },
  {
    menuId: 'o4o-product-db-supplier-store-descriptions',
    roles: [...PLATFORM_ADMIN_ROLES]
  },
  {
    menuId: 'o4o-product-db-image-quality',
    roles: [...PLATFORM_ADMIN_ROLES]
  },
  {
    menuId: 'o4o-product-db-maintenance',
    roles: [...PLATFORM_ADMIN_ROLES]
  },
  {
    menuId: 'content-overview',
    roles: [...PLATFORM_ADMIN_ROLES]
  },
  {
    menuId: 'content-assets',
    roles: [...PLATFORM_ADMIN_ROLES]
  },
  {
    menuId: 'content-policies',
    roles: [...PLATFORM_ADMIN_ROLES]
  },
  {
    menuId: 'content-analytics',
    roles: [...PLATFORM_ADMIN_ROLES]
  },
  {
    menuId: 'cms-contents',
    roles: [...PLATFORM_ADMIN_ROLES]
  },
  {
    menuId: 'cms-slots',
    roles: [...PLATFORM_ADMIN_ROLES]
  },
  // WO-O4O-AUTOMATION-VIDEO-JOB-P0-ADMIN-WORKSPACE-V1 — 그룹 헤더 + leaf.
  //   백엔드 /api/v1/platform/automation-jobs 는 platform:admin|super_admin 전용.
  {
    menuId: 'automation',
    roles: [...PLATFORM_ADMIN_ROLES]
  },
  {
    menuId: 'automation-video-jobs',
    roles: [...PLATFORM_ADMIN_ROLES]
  },
  {
    menuId: 'digital-signage-content',
    roles: [...PLATFORM_ADMIN_ROLES]
  },

  // 동적 CPT 메뉴의 부모 그룹 id (useDynamicCPTMenu.tsx) — 'cpt-' 접두사가 아니므로
  // DYNAMIC_MENU_ID_PREFIXES 가 아닌 명시 항목으로 선언한다.
  {
    menuId: 'custom-posts',
    roles: [...PLATFORM_ADMIN_ROLES]
  },

  // WO-O4O-LEGACY-YAKSA-ADMIN-AND-DOMAIN-FEATURES-FULL-REMOVAL-V1
  //   회원 관리(core-membership*) 메뉴 4건의 권한 설정은 메뉴·화면·`/api/v1/membership/*`
  //   백엔드 subtree 가 함께 제거되면서 평가 대상이 사라져 삭제했다.

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
 * 런타임에 생성되는 메뉴 id 접두사의 **명시적** 선언.
 *
 * **WO-O4O-ADMIN-AUTHORIZATION-REGISTRY-AND-DEAD-SURFACE-FINAL-CLOSURE-V1 §4**
 *
 * `useDynamicCPTMenu` 는 CPT slug 로부터 `cpt-{slug}` / `cpt-{slug}-all` /
 * `cpt-{slug}-new` / `cpt-{slug}-categories` 를 생성하므로 정적 배열에
 * 열거할 수 없다. deny-by-default 로 전환하면 이 계열이 통째로 사라지므로
 * 접두사를 **명시적으로 선언**해 동일한 정책(PLATFORM_ADMIN_ROLES)을 적용한다.
 *
 * 이것은 "설정 없음 = 허용" fallback 의 부활이 아니다 (§4.2 금지 사항).
 * 선언된 접두사에 해당하지 않는 미등록 menuId 는 그대로 거부된다.
 */
export const DYNAMIC_MENU_ID_PREFIXES: ReadonlyArray<{ prefix: string; roles: string[] }> = [
  { prefix: 'cpt-', roles: [...PLATFORM_ADMIN_ROLES] }
];

/**
 * 선언된 동적 메뉴 접두사에 해당하는 menuId 의 정책을 반환한다.
 * 해당 없으면 undefined — 호출측에서 deny 로 처리된다.
 */
function resolveDynamicMenuPermission(menuId: string): MenuPermission | undefined {
  const matched = DYNAMIC_MENU_ID_PREFIXES.find(entry => menuId.startsWith(entry.prefix));
  if (!matched) return undefined;
  // 선언된 접두사 정책의 역할을 그대로 복사한다 (DYNAMIC_MENU_ID_PREFIXES 가 유일한 출처).
  return { menuId, roles: matched.roles.slice() };
}

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
  const menuConfig = menuPermissions.find(m => m.menuId === menuId)
    ?? resolveDynamicMenuPermission(menuId);

  // POLICY: DENY BY DEFAULT
  //   WO-O4O-ADMIN-AUTHORIZATION-REGISTRY-AND-DEAD-SURFACE-FINAL-CLOSURE-V1 §4
  //   명시적으로 등록되지 않은 menuId 는 거부한다.
  //   전환 전에 정적 트리 27 노드 + 동적 CPT 접두사를 전수 선언했다.
  if (!menuConfig) {
    return false;
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

// WO-O4O-ADMIN-DASHBOARD-LEGACY-ROUTE-API-AND-NAVIGATION-CLOSURE-V1:
//   RoleConfig / fetchRolesFromDatabase(`/roles`, backend 없음) / fetchUserPermissions 는
//   소비처 0 인 placeholder 라 제거했다. 권한 조회는 useAdminMenu 가 담당한다.

// Export for backward compatibility
export default menuPermissions;