import { wordpressMenuItems } from '@/config/wordpressMenuFinal';
import { useDynamicCPTMenu, injectCPTMenuItems } from './useDynamicCPTMenu';
import { useAuth } from '@o4o/auth-context';
import { hasMenuPermission, getAccessibleMenus } from '@/config/rolePermissions';
import { useEffect, useState } from 'react';
import { authClient } from '@o4o/auth-client';

/**
 * Admin menu hook that dynamically filters menus based on user roles and permissions
 * Fetches user permissions from database/API
 */
export const useAdminMenu = () => {
  const { user } = useAuth();
  const { cptMenuItems, isLoading: cptLoading } = useDynamicCPTMenu();
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [permissionsLoading, setPermissionsLoading] = useState(true);
  
  // Fetch user permissions from API
  useEffect(() => {
    const fetchPermissions = async () => {
      if (!user?.id) {
        setUserPermissions([]);
        setPermissionsLoading(false);
        return;
      }

      try {
        // Fetch user permissions from API with authentication (authClient handles baseURL)
        const response = await authClient.api.get(`/userRole/${user.id}/permissions`);
        if (response.data?.success) {
          setUserPermissions(response.data.data?.permissions || []);
        } else {
          // Fallback to user's permissions property if API response is not successful
          setUserPermissions(user.permissions || []);
        }
      } catch (error) {
        console.error('Failed to fetch user permissions:', error);

        // Use user's permissions property as fallback
        // If user has no permissions, grant content.view by default to show basic menus
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
  
  // Inject CPT menus into static menu
  const allMenuItems = injectCPTMenuItems([...wordpressMenuItems], cptMenuItems);
  
  // Get user roles (support multiple roles)
  const userRoles = (user as any)?.roles || (user?.role ? [user.role] : []);
  
  // Filter menu items based on permissions
  const filterMenuItems = (items: any[]): any[] => {
    return items.map(item => {
      // Skip separators - always show
      if (item.separator) {
        return item;
      }

      // Skip collapse menu - always show
      if (item.id === 'collapse') {
        return item;
      }

      // Check if user has permission for this menu item
      const hasAccess = hasMenuPermission(userRoles, userPermissions, item.id || item.key);

      // Debug logging for menu filtering (can be removed in production)
      if (!hasAccess && process.env.NODE_ENV === 'development') {
        console.debug(`[Menu Filter] Hidden: ${item.id} - User roles:`, userRoles, 'Permissions:', userPermissions);
      }

      if (!hasAccess) {
        return null;
      }

      // Recursively filter children - create new object to avoid mutating original
      if (item.children && item.children.length > 0) {
        const filteredChildren = filterMenuItems(item.children).filter(Boolean);
        // Return new object with filtered children
        return {
          ...item,
          children: filteredChildren
        };
      }

      return item;
    }).filter(Boolean);
  };

  const filteredMenuItems = filterMenuItems([...allMenuItems]);

  // Debug log final menu count
  if (process.env.NODE_ENV === 'development') {
    console.debug(`[Menu] Showing ${filteredMenuItems.length}/${allMenuItems.length} menu items`);
  }
  
  return {
    menuItems: filteredMenuItems,
    isLoading: cptLoading || permissionsLoading,
    userRoles,
    userPermissions
  };
};

/**
 * Get default permissions for a role
 * This is a fallback when API is not available
 * In production, all permissions should come from database
 */
function getDefaultPermissions(role: string): string[] {
  // Basic fallback permissions
  // These should be replaced with API data
  switch (role) {
    case 'admin':
      // Admin gets all permissions
      return [
        'dashboard:view',
        'users:manage',
        'users:read',
        'users:create',
        'users:update',
        'roles:manage',
        'permissions:manage',
        'settings:manage',
        'appearance:manage',
        'cms:read',
        'cms:write',
        'ecommerce:read',
        'ecommerce:write',
        'forum:read',
        'forum:moderate',
        'reports:read',
        'analytics:read',
        'tools:access',
        'database:manage',
        'system:admin'
      ];
    case 'manager':
      return [
        'dashboard:view',
        'users:read',
        'ecommerce:read',
        'ecommerce:write',
        'products:manage',
        'orders:manage',
        'reports:read',
        'analytics:read'
      ];
    case 'vendor':
    case 'seller':
    case 'supplier':
      return [
        'dashboard:view',
        'products:read',
        'products:manage',
        'orders:read',
        'reports:sales'
      ];
    case 'customer':
      return [
        'dashboard:view',
        'orders:read'
      ];
    default:
      // Minimal permissions for unknown roles
      return ['dashboard:view'];
  }
}