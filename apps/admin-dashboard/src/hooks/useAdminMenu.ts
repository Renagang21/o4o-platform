import { wordpressMenuItems } from '@/config/wordpressMenuFinal';
import { useDynamicCPTMenu, injectCPTMenuItems } from './useDynamicCPTMenu';
import { useAuth } from '@o4o/auth-context';
import { filterMenuByRole, UserRole } from '@/config/rolePermissions';

/**
 * Simplified admin menu hook that shows all menus for admin users
 * and applies filtering only for non-admin users
 */
export const useAdminMenu = () => {
  const { user } = useAuth();
  const { cptMenuItems, isLoading: cptLoading } = useDynamicCPTMenu();
  
  // Inject CPT menus into static menu
  const allMenuItems = injectCPTMenuItems([...wordpressMenuItems], cptMenuItems);
  
  // Get user role
  const userRole = (user?.role || 'customer') as UserRole;
  
  // For admin users, show everything without filtering
  if (userRole === 'admin') {
    return {
      menuItems: allMenuItems,
      isLoading: cptLoading
    };
  }
  
  // For non-admin users, apply role-based filtering
  const userPermissions = getUserPermissions(userRole);
  const filteredMenuItems = filterMenuByRole(allMenuItems, userRole, userPermissions);
  
  return {
    menuItems: filteredMenuItems,
    isLoading: cptLoading
  };
};

/**
 * Get permissions for non-admin roles
 */
function getUserPermissions(role: UserRole): string[] {
  const rolePermissionMap: Record<UserRole, string[]> = {
    admin: [], // Admin doesn't need permission checks
    manager: [
      'updates:read', 'content:read', 'content:write', 'categories:read',
      'media:read', 'media:write', 'pages:read', 'pages:write',
      'ecommerce:read', 'products:read', 'orders:read',
      'coupons:read', 'analytics:read', 'vendors:read', 'vendors:write',
      'affiliate:read', 'affiliate:write', 'forum:read',
      'signage:read', 'crowdfunding:read', 'mail:read', 'mail:write',
      'templates:read', 'templates:write', 'menus:write',
      'users:read', 'tools:read', 'shortcodes:read', 'monitoring:read'
    ],
    business: [
      'content:read', 'content:write', 'media:read', 'media:write',
      'ecommerce:read', 'products:read', 'orders:read',
      'coupons:read', 'analytics:read', 'forum:read',
      'signage:read', 'crowdfunding:read', 'shortcodes:read'
    ],
    seller: [
      'media:read', 'media:write', 'ecommerce:read',
      'products:read', 'orders:read', 'analytics:read', 'forum:read'
    ],
    supplier: [
      'media:read', 'media:write', 'ecommerce:read',
      'products:read', 'orders:read', 'analytics:read', 'forum:read'
    ],
    retailer: [
      'ecommerce:read', 'products:read', 'orders:read', 
      'analytics:read', 'forum:read', 'users:read'
    ],
    affiliate: [
      'affiliate:read', 'forum:read', 'users:read'
    ],
    customer: [
      'users:read'
    ]
  };
  
  return rolePermissionMap[role] || [];
}