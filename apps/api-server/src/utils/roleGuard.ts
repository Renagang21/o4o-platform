import { Request, Response, NextFunction } from 'express';
import { createForbiddenError, createUnauthorizedError } from './errorUtils';
import { AuthRequest, UserRole } from '../types/auth';

/**
 * Role-based access control middleware
 * @param allowedRoles Array of roles that are allowed to access the route
 */
export function roleGuard(allowedRoles: string[] | UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw createUnauthorizedError('Authentication required');
    }

    const userRole = req.user.role;
    if (!allowedRoles.includes(userRole as any)) {
      throw createForbiddenError(`Access denied. Required roles: ${allowedRoles.join(', ')}`);
    }

    next();
  };
}

/**
 * Check if user has admin role
 */
export function isAdmin(user: any): boolean {
  return user?.role === UserRole.ADMIN;
}

/**
 * Check if user has manager role or higher
 */
export function isManagerOrHigher(user: any): boolean {
  return [UserRole.ADMIN, UserRole.MANAGER].includes(user?.role);
}

/**
 * Check if user has vendor role
 */
export function isVendor(user: any): boolean {
  return user?.role === UserRole.VENDOR || user?.role === UserRole.VENDOR_MANAGER;
}

/**
 * Check if user has supplier role
 */
export function isSupplier(user: any): boolean {
  return user?.role === UserRole.SUPPLIER;
}

/**
 * Check if user is customer or regular user
 */
export function isCustomer(user: any): boolean {
  return [UserRole.CUSTOMER, 'user'].includes(user?.role);
}

/**
 * Get user's vendor ID (for vendor users)
 */
export function getUserVendorId(user: any): string | null {
  if (isVendor(user)) {
    return user.vendorId || null;
  }
  return null;
}

/**
 * Get user's supplier ID (for supplier users)
 */
export function getUserSupplierId(user: any): string | null {
  if (isSupplier(user)) {
    return user.supplierId || null;
  }
  return null;
}

/**
 * Check if user can access vendor data
 * @param user The authenticated user
 * @param vendorId The vendor ID to check access for
 */
export function canAccessVendorData(user: any, vendorId: string): boolean {
  // Admin and managers can access any vendor data
  if (isManagerOrHigher(user)) {
    return true;
  }

  // Vendors can only access their own data
  if (isVendor(user)) {
    return getUserVendorId(user) === vendorId;
  }

  return false;
}

/**
 * Check if user can access supplier data
 * @param user The authenticated user
 * @param supplierId The supplier ID to check access for
 */
export function canAccessSupplierData(user: any, supplierId: string): boolean {
  // Admin and managers can access any supplier data
  if (isManagerOrHigher(user)) {
    return true;
  }

  // Suppliers can only access their own data
  if (isSupplier(user)) {
    return getUserSupplierId(user) === supplierId;
  }

  return false;
}

/**
 * Middleware to ensure user is authenticated
 */
export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    throw createUnauthorizedError('Authentication required');
  }
  next();
}

/**
 * Middleware to ensure user has admin role
 */
export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    if (!isAdmin(req.user)) {
      throw createForbiddenError('Admin access required');
    }
    next();
  });
}

/**
 * Middleware to ensure user has manager role or higher
 */
export function requireManager(req: AuthRequest, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    if (!isManagerOrHigher(req.user)) {
      throw createForbiddenError('Manager access required');
    }
    next();
  });
}