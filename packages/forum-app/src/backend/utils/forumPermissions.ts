import { DataSource } from 'typeorm';
import {
  canManageResource,
  isSuperAdmin,
  isOrganizationAdmin,
} from '@o4o/organization-core';

/**
 * Forum Permission Helper
 *
 * Provides forum-specific permission checking utilities
 * using organization-core RBAC system.
 */

/**
 * Check if user can create posts in an organization
 */
export async function canCreatePost(
  dataSource: DataSource,
  userId: string,
  organizationId?: string
): Promise<boolean> {
  // Global posts (no organization) - any authenticated user can create
  if (!organizationId) {
    return true;
  }

  // Organization posts - check forum.write permission
  return await canManageResource(
    dataSource,
    userId,
    'forum.write',
    organizationId
  );
}

/**
 * Check if user can manage (edit/delete) posts in an organization
 */
export async function canManagePost(
  dataSource: DataSource,
  userId: string,
  postAuthorId: string,
  organizationId?: string
): Promise<boolean> {
  // Super admin can manage everything
  if (await isSuperAdmin(dataSource, userId)) {
    return true;
  }

  // Post author can manage their own post
  if (userId === postAuthorId) {
    return true;
  }

  // No organization - only author can manage
  if (!organizationId) {
    return false;
  }

  // Organization posts - check forum.manage permission
  return await canManageResource(
    dataSource,
    userId,
    'forum.manage',
    organizationId
  );
}

/**
 * Check if user can create categories in an organization
 */
export async function canCreateCategory(
  dataSource: DataSource,
  userId: string,
  organizationId?: string
): Promise<boolean> {
  // Global categories - only super admin
  if (!organizationId) {
    return await isSuperAdmin(dataSource, userId);
  }

  // Organization categories - check organization.manage permission
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
 * Check if user can manage (edit/delete) categories in an organization
 */
export async function canManageCategory(
  dataSource: DataSource,
  userId: string,
  organizationId?: string
): Promise<boolean> {
  // Global categories - only super admin
  if (!organizationId) {
    return await isSuperAdmin(dataSource, userId);
  }

  // Organization categories - check organization.manage permission
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
 * Check if user can create comments in an organization
 */
export async function canCreateComment(
  dataSource: DataSource,
  userId: string,
  organizationId?: string
): Promise<boolean> {
  // Global comments (no organization) - any authenticated user can create
  if (!organizationId) {
    return true;
  }

  // Organization comments - check forum.write permission
  return await canManageResource(
    dataSource,
    userId,
    'forum.write',
    organizationId
  );
}

/**
 * Check if user can manage (edit/delete) comments in an organization
 */
export async function canManageComment(
  dataSource: DataSource,
  userId: string,
  commentAuthorId: string,
  organizationId?: string
): Promise<boolean> {
  // Super admin can manage everything
  if (await isSuperAdmin(dataSource, userId)) {
    return true;
  }

  // Comment author can manage their own comment
  if (userId === commentAuthorId) {
    return true;
  }

  // No organization - only author can manage
  if (!organizationId) {
    return false;
  }

  // Organization comments - check forum.manage permission
  return await canManageResource(
    dataSource,
    userId,
    'forum.manage',
    organizationId
  );
}

/**
 * Check if user can view organization-exclusive content
 */
export async function canViewOrganizationContent(
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
