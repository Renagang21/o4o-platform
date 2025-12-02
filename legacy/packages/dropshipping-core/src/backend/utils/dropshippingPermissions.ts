import { DataSource } from 'typeorm';
import {
  canManageResource,
  isSuperAdmin,
  isOrganizationAdmin,
} from '@o4o/organization-core';

/**
 * Dropshipping Permission Helper
 *
 * Provides dropshipping-specific permission checking utilities
 * using organization-core RBAC system.
 */

/**
 * Check if user can create products in an organization
 */
export async function canCreateProduct(
  dataSource: DataSource,
  userId: string,
  organizationId?: string
): Promise<boolean> {
  // Global products - only super admin or suppliers
  if (!organizationId) {
    return await isSuperAdmin(dataSource, userId);
  }

  // Organization products - check organization.manage permission
  const isAdmin = await isOrganizationAdmin(dataSource, userId, organizationId);
  if (isAdmin) return true;

  return await canManageResource(
    dataSource,
    userId,
    'organization.manage',
    organizationId
  );
}

/**
 * Check if user can manage (edit/delete) products in an organization
 */
export async function canManageProduct(
  dataSource: DataSource,
  userId: string,
  productOwnerId: string,
  organizationId?: string
): Promise<boolean> {
  // Super admin can manage everything
  if (await isSuperAdmin(dataSource, userId)) {
    return true;
  }

  // Product owner can manage their own product
  if (userId === productOwnerId) {
    return true;
  }

  // No organization - only owner can manage
  if (!organizationId) {
    return false;
  }

  // Organization products - check organization.manage permission
  const isAdmin = await isOrganizationAdmin(dataSource, userId, organizationId);
  if (isAdmin) return true;

  return await canManageResource(
    dataSource,
    userId,
    'organization.manage',
    organizationId
  );
}

/**
 * Check if user can view organization-exclusive products
 */
export async function canViewOrganizationProduct(
  dataSource: DataSource,
  userId: string,
  organizationId: string
): Promise<boolean> {
  // Super admin can view everything
  if (await isSuperAdmin(dataSource, userId)) {
    return true;
  }

  // Check if user has any role in the organization
  return await canManageResource(
    dataSource,
    userId,
    'organization.read',
    organizationId
  );
}

/**
 * Check if user can participate in organization groupbuy
 */
export async function canParticipateInGroupbuy(
  dataSource: DataSource,
  userId: string,
  organizationId: string
): Promise<boolean> {
  // Check if user is a member of the organization
  return await canManageResource(
    dataSource,
    userId,
    'organization.read',
    organizationId
  );
}

/**
 * Check if user can manage settlements in an organization
 */
export async function canManageSettlement(
  dataSource: DataSource,
  userId: string,
  organizationId?: string
): Promise<boolean> {
  // Global settlements - only super admin
  if (!organizationId) {
    return await isSuperAdmin(dataSource, userId);
  }

  // Organization settlements - check organization.manage permission
  const isAdmin = await isOrganizationAdmin(dataSource, userId, organizationId);
  if (isAdmin) return true;

  return await canManageResource(
    dataSource,
    userId,
    'organization.manage',
    organizationId
  );
}

/**
 * Check if user can view settlement reports in an organization
 */
export async function canViewSettlement(
  dataSource: DataSource,
  userId: string,
  organizationId?: string
): Promise<boolean> {
  // Global settlements - only super admin
  if (!organizationId) {
    return await isSuperAdmin(dataSource, userId);
  }

  // Organization settlements - check organization.read permission
  return await canManageResource(
    dataSource,
    userId,
    'organization.read',
    organizationId
  );
}

/**
 * Check if user can create groupbuy campaigns in an organization
 */
export async function canCreateGroupbuy(
  dataSource: DataSource,
  userId: string,
  organizationId: string
): Promise<boolean> {
  // Super admin can create everywhere
  if (await isSuperAdmin(dataSource, userId)) {
    return true;
  }

  // Organization admin/manager can create groupbuys
  const isAdmin = await isOrganizationAdmin(dataSource, userId, organizationId);
  if (isAdmin) return true;

  // Check if user has organization.manage permission
  return await canManageResource(
    dataSource,
    userId,
    'organization.manage',
    organizationId
  );
}
