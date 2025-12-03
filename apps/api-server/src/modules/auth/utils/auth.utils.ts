import bcrypt from 'bcryptjs';
import { UserRole } from '../entities/User.js';

/**
 * Hash a plain text password
 * @param password - Plain text password
 * @returns Hashed password
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
  return await bcrypt.hash(password, saltRounds);
}

/**
 * Compare plain text password with hashed password
 * @param password - Plain text password
 * @param hashedPassword - Hashed password from database
 * @returns True if passwords match
 */
export async function comparePassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return await bcrypt.compare(password, hashedPassword);
}

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
