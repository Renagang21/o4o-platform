/**
 * useAdminMenu - Admin Navigation Hook
 *
 * 메뉴 SSOT 는 `@/admin/menu/admin-menu.static` 이다. 이 hook 은
 * 1. 정적 메뉴에 CPT 메뉴를 주입하고
 * 2. 사용자 권한(`/v1/userRole/:id/permissions`) · app 상태로 노출을 필터한다.
 *
 * WO-O4O-ADMIN-DASHBOARD-LEGACY-ROUTE-API-AND-NAVIGATION-CLOSURE-V1:
 *   과거 "Phase P0 Task A: Dynamic Navigation System" 의 `/v1/navigation/admin`
 *   fetch 분기(NavigationRegistry)는 backend 가 영구 stub(`data: []`)이라 단 한 번도
 *   메뉴를 공급한 적이 없다 → STUB_NAVIGATION_DEPENDENCY 로 판정하고 제거했다.
 *   backend `/api/v1/navigation` · `/api/v1/routes` stub 도 같은 WO 에서 함께 제거됐다.
 *   메뉴 노출은 인가 경계가 아니다 — 실제 권한 검사는 backend 계약이 담당한다.
 */

import { useEffect, useState, useCallback } from 'react';
import { adminMenuStatic, MenuItem } from '@/admin/menu/admin-menu.static';
import { useDynamicCPTMenu, injectCPTMenuItems } from './useDynamicCPTMenu';
import { useAuth } from '@o4o/auth-context';
import { hasMenuPermission } from '@/config/rolePermissions';
import { unifiedApi } from '@/api/unified-client';
import { useAppStatus } from './useAppStatus';

export const useAdminMenu = () => {
  const { user } = useAuth();
  const { cptMenuItems, isLoading: cptLoading } = useDynamicCPTMenu();
  const {
    isActive: isAppActive,
    isLoading: appStatusLoading,
    isUnavailable: appStatusUnavailable,
  } = useAppStatus();

  const [apiLoading, setApiLoading] = useState(true);
  const [userPermissions, setUserPermissions] = useState<string[]>([]);

  // Get user roles (support multiple roles)
  const rawRoles = (user as any)?.roles || (user?.role ? [{ name: user.role }] : []);
  const userRoles: string[] = rawRoles.map((r: any) => typeof r === 'string' ? r : r.name).filter(Boolean);

  useEffect(() => {
    const fetchPermissions = async () => {
      if (!user?.id) {
        setUserPermissions([]);
        setApiLoading(false);
        return;
      }

      setApiLoading(true);

      try {
        const response = await unifiedApi.raw.get(`/v1/userRole/${user.id}/permissions`);
        if (response.data?.success) {
          setUserPermissions(response.data.data?.permissions || []);
        } else {
          setUserPermissions(user.permissions || []);
        }
      } catch {
        // Use fallback permissions
        const fallbackPermissions = user.permissions?.length
          ? user.permissions
          : ['content.view', 'dashboard:view'];
        setUserPermissions(fallbackPermissions);
      }

      setApiLoading(false);
    };

    fetchPermissions();
  }, [user?.id]);

  // Inject CPT menus into the static menu
  const allMenuItems = injectCPTMenuItems([...adminMenuStatic], cptMenuItems);

  // Filter menu items based on permissions and app status
  const filterMenuItems = useCallback((items: MenuItem[]): MenuItem[] => {
    return items.map(item => {
      // Skip separators - always show
      if (item.separator) {
        return item;
      }

      // Skip collapse menu - always show
      if (item.id === 'collapse') {
        return item;
      }

      // Check app status - if menu has appId, only hide when the app is genuinely inactive.
      // WO-O4O-ADMIN-APP-AVAILABILITY-READ-CONTRACT-FIX-V1:
      //   로딩 중이거나 상태 확인 실패(appStatusUnavailable)일 때는 비활성으로 확정하지 않는다.
      //   과거에는 /admin/apps 403 → apps=[] → 모든 appId 메뉴가 사라졌다.
      //   메뉴 노출은 인가 경계가 아니며, 실제 권한 검사는 기존 인증·인가 계약이 담당한다.
      if (
        (item as any).appId &&
        !appStatusLoading &&
        !appStatusUnavailable &&
        !isAppActive((item as any).appId)
      ) {
        if (process.env.NODE_ENV === 'development') {
          console.debug(`[Menu Filter] App inactive: ${item.id} (appId: ${(item as any).appId})`);
        }
        return null as unknown as MenuItem;
      }

      // Check if user has permission for this menu item
      const hasAccess = hasMenuPermission(userRoles, userPermissions, item.id);
      if (!hasAccess) {
        if (process.env.NODE_ENV === 'development') {
          console.debug(`[Menu Filter] No permission: ${item.id}`);
        }
        return null as unknown as MenuItem;
      }

      // Recursively filter children
      if (item.children && item.children.length > 0) {
        const filteredChildren = filterMenuItems(item.children).filter(Boolean);
        return {
          ...item,
          children: filteredChildren
        };
      }

      return item;
    }).filter(Boolean);
    // WO-O4O-ADMIN-APP-AVAILABILITY-READ-CONTRACT-FIX-V1: 상태 확정 여부도 의존성에 포함
  }, [isAppActive, appStatusLoading, appStatusUnavailable, userRoles, userPermissions]);

  const filteredMenuItems = filterMenuItems([...allMenuItems]);

  return {
    menuItems: filteredMenuItems,
    isLoading: apiLoading || cptLoading || appStatusLoading,
    userRoles,
    userPermissions,
  };
};
