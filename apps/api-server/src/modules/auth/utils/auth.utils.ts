import { UserRole } from '../entities/User.js';

// WO-O4O-DEAD-CODE-CLEANUP-V1: 중복 제거 — 표준 구현 re-export
export { hashPassword, comparePassword } from '../../../utils/auth.utils.js';

/**
 * Get default permissions for a given role
 * @param role - User role
 * @returns Array of permission strings
 */
export function getDefaultPermissions(role: UserRole): string[] {
  const permissions: Record<string, string[]> = {
    customer: ['read:products', 'create:orders', 'read:own_orders'],
    seller: [
      'read:products',
      'create:products',
      'update:own_products',
      'read:own_orders',
      'read:analytics',
    ],
    supplier: [
      'create:products',
      'update:own_products',
      'read:inventory',
      'manage:inventory',
    ],
    manager: ['read:all', 'manage:store', 'read:analytics'],
    admin: ['*'], // All permissions
  };

  return permissions[role] || permissions.customer;
}
