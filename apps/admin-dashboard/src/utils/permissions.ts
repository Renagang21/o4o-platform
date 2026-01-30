import type { User, Permission } from '@o4o/types';

/**
 * Check if user has a specific permission
 */
export const hasPermission = (user: User | null, permission: Permission): boolean => {
  if (!user) return false;

  // Super admin and admin have all permissions
  if (user.role === 'admin') return true;

  // Check if user has the specific permission
  return user.permissions?.includes(permission) ?? false;
};

/**
 * Check if user has any of the specified permissions
 */
export const hasAnyPermission = (user: User | null, permissions: Permission[]): boolean => {
  if (!user) return false;

  // Super admin and admin have all permissions
  if (user.role === 'admin') return true;

  // Check if user has any of the permissions
  return permissions.some(permission =>
    user.permissions?.includes(permission) ?? false
  );
};

/**
 * Check if user can write content (posts, pages)
 */
export const canWriteContent = (user: User | null): boolean => {
  return hasPermission(user, 'content:write' as any);
};

/**
 * Check if user can edit categories
 */
export const canEditCategories = (user: User | null): boolean => {
  return hasPermission(user, 'categories:write' as any);
};

/**
 * Check if user can set featured image
 * Users with content:write permission can set featured images
 */
export const canSetFeaturedImage = (user: User | null): boolean => {
  return hasPermission(user, 'content:write' as any);
};

/**
 * Check if user can publish content
 */
export const canPublish = (user: User | null): boolean => {
  return hasAnyPermission(user, ['content:write' as any, 'system:admin' as any]);
};
