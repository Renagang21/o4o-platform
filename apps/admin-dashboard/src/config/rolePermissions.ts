// Role-based menu permissions configuration
// Dynamically handles roles from database

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
    permissions: ['dashboard:view']
  },
  {
    menuId: 'dashboard-stats',
    permissions: ['dashboard:stats']
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
  
  // Seller Management
  {
    menuId: 'sellers',
    permissions: ['sellers:read']
  },
  {
    menuId: 'sellers-list',
    permissions: ['sellers:read']
  },
  {
    menuId: 'sellers-add',
    permissions: ['sellers:create']
  },
  {
    menuId: 'sellers-analytics',
    permissions: ['sellers:analytics']
  },
  
  // E-commerce
  {
    menuId: 'ecommerce',
    permissions: ['content.view']
  },
  {
    menuId: 'products',
    permissions: ['content.view']
  },
  {
    menuId: 'orders',
    permissions: ['content.view']
  },
  {
    menuId: 'categories',
    permissions: ['content.view']
  },
  {
    menuId: 'inventory',
    permissions: ['inventory:read']
  },
  
  // Finance
  {
    menuId: 'finance',
    permissions: ['finance:read']
  },
  {
    menuId: 'payments',
    permissions: ['payments:read']
  },
  {
    menuId: 'invoices',
    permissions: ['invoices:read']
  },
  {
    menuId: 'transactions',
    permissions: ['transactions:read']
  },
  
  // Marketing
  {
    menuId: 'marketing',
    permissions: ['marketing:read']
  },
  {
    menuId: 'campaigns',
    permissions: ['campaigns:read']
  },
  {
    menuId: 'promotions',
    permissions: ['promotions:read']
  },
  {
    menuId: 'coupons',
    permissions: ['coupons:read']
  },
  
  // Support
  {
    menuId: 'support',
    permissions: ['support:read']
  },
  {
    menuId: 'tickets',
    permissions: ['tickets:read']
  },
  {
    menuId: 'faq',
    permissions: ['faq:read']
  },
  
  // Forum
  {
    menuId: 'forum',
    permissions: ['forum:read']
  },
  {
    menuId: 'forum-categories',
    permissions: ['forum:read']
  },
  {
    menuId: 'forum-topics',
    permissions: ['forum:read']
  },
  {
    menuId: 'forum-moderation',
    permissions: ['forum:moderate']
  },
  
  // Crowdfunding
  {
    menuId: 'crowdfunding',
    permissions: ['crowdfunding:read']
  },
  {
    menuId: 'projects',
    permissions: ['projects:read']
  },
  {
    menuId: 'backers',
    permissions: ['backers:read']
  },
  
  // CMS
  {
    menuId: 'cms',
    permissions: ['content.view']
  },
  {
    menuId: 'pages',
    permissions: ['content.view']
  },
  {
    menuId: 'posts',
    permissions: ['content.view']
  },
  {
    menuId: 'media',
    permissions: ['content.view']
  },
  
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

  // Settings - Admin only
  {
    menuId: 'settings',
    permissions: ['admin.settings']
  },
  {
    menuId: 'general-settings',
    permissions: ['admin.settings']
  },
  {
    menuId: 'system-settings',
    permissions: ['settings:system']
  },
  {
    menuId: 'integrations',
    permissions: ['integrations:manage']
  },
  
  // Appearance
  {
    menuId: 'appearance',
    permissions: ['appearance:manage']
  },
  {
    menuId: 'themes',
    permissions: ['themes:manage']
  },
  {
    menuId: 'widgets',
    permissions: ['widgets:manage']
  },
  {
    menuId: 'menus',
    permissions: ['menus:manage']
  },
  {
    menuId: 'customizer',
    permissions: ['customizer:manage']
  },
  
  // Tools
  {
    menuId: 'tools',
    permissions: ['tools:access']
  },
  {
    menuId: 'import-export',
    permissions: ['tools:import_export']
  },
  {
    menuId: 'database',
    permissions: ['database:manage']
  },
  {
    menuId: 'logs',
    permissions: ['logs:view']
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
  
  if (!menuConfig) {
    // Menu not found in configuration - deny by default
    return false;
  }
  
  // If no roles or permissions specified, allow all authenticated users
  if (!menuConfig.roles?.length && !menuConfig.permissions?.length) {
    return true;
  }
  
  // Check role-based access
  if (menuConfig.roles?.length) {
    const hasRole = menuConfig.roles.some(role => userRoles.includes(role));
    if (hasRole) return true;
  }
  
  // Check permission-based access
  if (menuConfig.permissions?.length) {
    if (menuConfig.requireAll) {
      // Requires all permissions
      return menuConfig.permissions.every(permission => 
        userPermissions.includes(permission)
      );
    } else {
      // Requires at least one permission
      return menuConfig.permissions.some(permission => 
        userPermissions.includes(permission)
      );
    }
  }
  
  return false;
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
    const response = await fetch('/api/v1/roles');
    if (!response.ok) {
      throw new Error('Failed to fetch roles');
    }
    return await response.json();
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
    const response = await fetch(`/api/v1/users/${userId}/permissions`);
    if (!response.ok) {
      throw new Error('Failed to fetch user permissions');
    }
    const data = await response.json();
    return data.permissions || [];
  } catch (error) {
    console.error('Error fetching user permissions:', error);
    return [];
  }
}

// Export for backward compatibility
export default menuPermissions;