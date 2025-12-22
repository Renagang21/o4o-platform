// Role-based menu permissions configuration
// Dynamically handles roles from database

import { authClient } from '@o4o/auth-client';

export interface MenuPermission {
  menuId: string;
  roles?: string[]; // Dynamic roles from database
  permissions?: string[];
  requireAll?: boolean; // Requires all permissions if true
}

// Menu permission configuration without hardcoded roles
// Roles should be fetched from database and checked dynamically
export const menuPermissions: MenuPermission[] = [
  // Home - All authenticated users can access
  {
    menuId: 'home',
    // No specific roles - available to all authenticated users
  },
  // Dashboard - All authenticated users can access
  {
    menuId: 'dashboard',
    // No specific roles - available to all authenticated users
  },
  {
    menuId: 'dashboard-home',
    // No specific roles - available to all authenticated users
  },
  {
    menuId: 'dashboard-overview',
    // No permissions - available to all authenticated users
  },
  {
    menuId: 'dashboard-stats',
    // No permissions - available to all authenticated users
  },
  
  // User Management - Permission based
  {
    menuId: 'user-management',
    permissions: ['users.view']
  },
  {
    menuId: 'users',
    permissions: ['users.view']
  },
  {
    menuId: 'users-list',
    permissions: ['users.view']
  },
  {
    menuId: 'users-create',
    permissions: ['users.create']
  },
  {
    menuId: 'users-edit',
    permissions: ['users.edit']
  },
  {
    menuId: 'users-roles',
    permissions: ['users.view']
  },
  {
    menuId: 'users-permissions',
    permissions: ['users.view']
  },
  
  // Seller Management - No restriction (allow all)
  // These menus are visible to all authenticated users

  // E-commerce - No restriction (allow all)

  // Finance - No restriction (allow all)

  // Marketing - No restriction (allow all)

  // Support - No restriction (allow all)

  // Forum - No restriction (allow all)

  // Yaksa Tools - Permission based
  {
    menuId: 'yaksa-tools',
    roles: ['admin', 'super_admin', 'pharmacist'],
  },
  {
    menuId: 'yaksa-forum',
    // No restriction - accessible to all authenticated users
  },
  {
    menuId: 'pharmacy-ai-insight',
    roles: ['admin', 'super_admin', 'pharmacist'],
    permissions: ['pharmacy-ai-insight.read'],
  },

  // Crowdfunding - No restriction (allow all)

  // CMS - No restriction (allow all)
  // Posts, Pages, Media - All users can view
  
  // Reports & Analytics
  {
    menuId: 'reports',
    permissions: ['admin.analytics']
  },
  {
    menuId: 'analytics',
    permissions: ['admin.analytics']
  },
  {
    menuId: 'sales-reports',
    permissions: ['admin.analytics']
  },

  // Settings - Available to all authenticated users
  // Note: Individual settings pages may still have their own permission checks
  {
    menuId: 'settings'
    // No role restriction - menu visible to all authenticated users
    // Each settings page should handle its own permission checks
  },
  {
    menuId: 'general-settings'
    // No role restriction
  },
  {
    menuId: 'system-settings',
    roles: ['super_admin', 'admin', 'manager']
  },
  {
    menuId: 'integrations',
    roles: ['super_admin', 'admin', 'manager']
  },

  // Appearance - No restriction (allow all)

  // Tools - 관리자만 접근 가능 (앱 장터, 파일 교체 등)
  {
    menuId: 'tools',
    roles: ['super_admin', 'admin', 'manager']
  },
  {
    menuId: 'import-export',
    roles: ['super_admin', 'admin', 'manager']
  },
  {
    menuId: 'database',
    roles: ['super_admin', 'admin', 'manager']
  },
  {
    menuId: 'logs',
    permissions: ['admin.logs']
  },
  
  // Profile - All authenticated users
  {
    menuId: 'profile',
    // No specific permissions - available to all authenticated users
  },
  {
    menuId: 'users-profile',
    // No specific permissions - available to all authenticated users
  },
  
  // UI Elements - Development/Demo
  {
    menuId: 'ui-elements',
    permissions: ['ui:demo']
  },
  {
    menuId: 'ui-components',
    permissions: ['ui:demo']
  }
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