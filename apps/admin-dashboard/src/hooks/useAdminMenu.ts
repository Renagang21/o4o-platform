/**
 * useAdminMenu - Dynamic Admin Navigation Hook
 *
 * Phase P0 Task A: Dynamic Navigation System
 *
 * This hook provides admin menu items by:
 * 1. Fetching from Navigation API (NavigationRegistry)
 * 2. Falling back to hardcoded menu if API fails
 * 3. Injecting CPT menus dynamically
 * 4. Filtering based on app status and permissions
 */

import React from 'react';
import { useEffect, useState, useCallback } from 'react';
import {
  LayoutDashboard as LayoutDashboardIcon,
  Database as DatabaseIcon,
  FileText as FileTextIcon,
  Package as PackageIcon,
  Settings as SettingsIcon,
  Menu as MenuIcon,
  Image as ImageIcon,
  Users as UsersIcon,
  Globe as GlobeIcon,
  Truck as TruckIcon,
  Activity as ActivityIcon,
  Monitor as MonitorIcon,
  Calendar as CalendarIcon,
  BarChart2 as BarChart2Icon,
} from 'lucide-react';
import { wordpressMenuItems, MenuItem } from '@/config/wordpressMenuFinal';
import { useDynamicCPTMenu, injectCPTMenuItems } from './useDynamicCPTMenu';
import { useAuth } from '@o4o/auth-context';
import { hasMenuPermission } from '@/config/rolePermissions';
import { unifiedApi } from '@/api/unified-client';
import { useAppStatus } from './useAppStatus';

interface NavigationApiResponse {
  success: boolean;
  data: MenuItem[];
  total: number;
  context?: {
    serviceGroup?: string;
    tenantId?: string;
    userRoles?: string[];
    authenticated?: boolean;
  };
}

/**
 * Admin menu hook that provides dynamic navigation
 * - Fetches from NavigationRegistry API
 * - Falls back to hardcoded menu during transition
 * - Injects CPT menus
 * - Filters by app status and permissions
 */
export const useAdminMenu = () => {
  const { user } = useAuth();
  const { cptMenuItems, isLoading: cptLoading } = useDynamicCPTMenu();
  const { isActive: isAppActive, isLoading: appStatusLoading } = useAppStatus();

  const [dynamicMenuItems, setDynamicMenuItems] = useState<MenuItem[] | null>(null);
  const [apiLoading, setApiLoading] = useState(true);
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [permissionsLoading, setPermissionsLoading] = useState(true);

  // Get user roles (support multiple roles)
  const rawRoles = (user as any)?.roles || (user?.role ? [{ name: user.role }] : []);
  const userRoles: string[] = rawRoles.map((r: any) => typeof r === 'string' ? r : r.name).filter(Boolean);

  // Fetch navigation from API
  useEffect(() => {
    const fetchNavigation = async () => {
      setApiLoading(true);

      try {
        // Fetch from Navigation API
        const response = await unifiedApi.raw.get<NavigationApiResponse>('/v1/navigation/admin');

        if (response.data?.success && response.data.data?.length > 0) {
          // Transform API response to MenuItem format with icons
          const menuItems = transformApiMenuItems(response.data.data);
          setDynamicMenuItems(menuItems);

          if (process.env.NODE_ENV === 'development') {
            console.debug('[useAdminMenu] Loaded from API:', menuItems.length, 'items');
          }
        } else {
          // API returned empty or failed - use fallback
          setDynamicMenuItems(null);

          if (process.env.NODE_ENV === 'development') {
            console.debug('[useAdminMenu] API returned empty, using fallback menu');
          }
        }
      } catch (error) {
        // API call failed - use fallback
        setDynamicMenuItems(null);

        if (process.env.NODE_ENV === 'development') {
          console.debug('[useAdminMenu] API failed, using fallback menu:', error);
        }
      } finally {
        setApiLoading(false);
      }
    };

    fetchNavigation();
  }, [user?.id]);

  // Fetch user permissions from API
  useEffect(() => {
    const fetchPermissions = async () => {
      if (!user?.id) {
        setUserPermissions([]);
        setPermissionsLoading(false);
        return;
      }

      try {
        const response = await unifiedApi.raw.get(`/v1/userRole/${user.id}/permissions`);
        if (response.data?.success) {
          setUserPermissions(response.data.data?.permissions || []);
        } else {
          setUserPermissions(user.permissions || []);
        }
      } catch (error) {
        // Use fallback permissions
        const fallbackPermissions = user.permissions?.length
          ? user.permissions
          : ['content.view', 'dashboard:view'];
        setUserPermissions(fallbackPermissions);
      } finally {
        setPermissionsLoading(false);
      }
    };

    fetchPermissions();
  }, [user]);

  // Determine base menu items - API or fallback
  const baseMenuItems = dynamicMenuItems || [...wordpressMenuItems];

  // Inject CPT menus into base menu
  const allMenuItems = injectCPTMenuItems(baseMenuItems, cptMenuItems);

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

      // Check app status - if menu has appId, only show if app is active
      if ((item as any).appId && !isAppActive((item as any).appId)) {
        if (process.env.NODE_ENV === 'development') {
          console.debug(`[Menu Filter] App inactive: ${item.id} (appId: ${(item as any).appId})`);
        }
        return null as unknown as MenuItem;
      }

      // Check if user has permission for this menu item
      // Only apply local permission filtering if using fallback menu
      // API-sourced menus are already filtered by the server
      if (!dynamicMenuItems) {
        const hasAccess = hasMenuPermission(userRoles, userPermissions, item.id);

        if (!hasAccess) {
          if (process.env.NODE_ENV === 'development') {
            console.debug(`[Menu Filter] No permission: ${item.id}`);
          }
          return null as unknown as MenuItem;
        }
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
  }, [isAppActive, userRoles, userPermissions, dynamicMenuItems]);

  const filteredMenuItems = filterMenuItems([...allMenuItems]);

  // Debug log
  if (process.env.NODE_ENV === 'development') {
    console.debug(
      `[Menu] Source: ${dynamicMenuItems ? 'API' : 'Fallback'}, ` +
      `Showing ${filteredMenuItems.length}/${allMenuItems.length} items`
    );
  }

  return {
    menuItems: filteredMenuItems,
    isLoading: apiLoading || cptLoading || permissionsLoading || appStatusLoading,
    userRoles,
    userPermissions,
    isUsingFallback: !dynamicMenuItems
  };
};

/**
 * Transform API menu items to MenuItem format with React icons
 * API returns icon as string name, needs to be converted to React element
 */
function transformApiMenuItems(items: any[]): MenuItem[] {
  return items.map(item => {
    const menuItem: MenuItem = {
      id: item.id,
      label: item.label,
      icon: getIconComponent(item.icon),
      path: item.path,
      roles: item.roles,
      children: item.children ? transformApiMenuItems(item.children) : undefined
    };

    // Preserve appId for app status filtering
    if (item.appId) {
      (menuItem as any).appId = item.appId;
    }

    return menuItem;
  });
}

/**
 * Convert icon string name to Lucide React icon component
 * Falls back to a default icon if not found
 */
function getIconComponent(iconName?: string): React.ReactElement {
  // Icon map using React.createElement (no JSX in .ts file)
  const iconMap: Record<string, React.ComponentType> = {
    'layout': LayoutDashboardIcon,
    'dashboard': LayoutDashboardIcon,
    'database': DatabaseIcon,
    'document': FileTextIcon,
    'collection': PackageIcon,
    'adjustments': SettingsIcon,
    'menu': MenuIcon,
    'photograph': ImageIcon,
    'users': UsersIcon,
    'settings': SettingsIcon,
    'package': PackageIcon,
    'globe': GlobeIcon,
    'truck': TruckIcon,
    'activity': ActivityIcon,
    'monitor': MonitorIcon,
    'calendar': CalendarIcon,
    'chart': BarChart2Icon,
  };

  const IconComponent = iconMap[iconName || ''] || FileTextIcon;
  return React.createElement(IconComponent, { className: 'w-5 h-5' });
}
