import { DataSource } from 'typeorm';
// TODO: Re-enable when organization-core exports these functions
// import {
//   canManageResource,
//   isSuperAdmin,
//   isOrganizationAdmin,
// } from '@o4o/organization-core';

// Temporary stub implementations until organization-core integration is complete
async function canManageResource(
  dataSource: DataSource,
  userId: string,
  permission: string,
  resourceId: string
): Promise<boolean> {
  // TODO: Implement actual permission check via organization-core
  return false;
}

async function isSuperAdmin(dataSource: DataSource, userId: string): Promise<boolean> {
  // TODO: Implement actual admin check via organization-core
  return false;
}

async function isOrganizationAdmin(
  dataSource: DataSource,
  userId: string,
  organizationId: string
): Promise<boolean> {
  // TODO: Implement actual organization admin check via organization-core
  return false;
}

/**
 * LMS Permission Helper
 *
 * Provides LMS-specific permission checking utilities
 * using organization-core RBAC system.
 */

/**
 * Check if user can create courses in an organization
 */
export async function canCreateCourse(
  dataSource: DataSource,
  userId: string,
  organizationId?: string
): Promise<boolean> {
  // Global courses - only super admin or instructors
  if (!organizationId) {
    return await isSuperAdmin(dataSource, userId);
  }

  // Organization courses - check organization.manage permission
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
 * Check if user can manage (edit/delete) courses in an organization
 */
export async function canManageCourse(
  dataSource: DataSource,
  userId: string,
  courseInstructorId: string,
  organizationId?: string
): Promise<boolean> {
  // Super admin can manage everything
  if (await isSuperAdmin(dataSource, userId)) {
    return true;
  }

  // Course instructor can manage their own course
  if (userId === courseInstructorId) {
    return true;
  }

  // No organization - only instructor can manage
  if (!organizationId) {
    return false;
  }

  // Organization courses - check organization.manage permission
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
 * Check if user can enroll in a course
 */
export async function canEnrollInCourse(
  dataSource: DataSource,
  userId: string,
  organizationId?: string
): Promise<boolean> {
  // Public courses (no organization) - anyone can enroll
  if (!organizationId) {
    return true;
  }

  // Organization courses - check if user is member
  return await canManageResource(
    dataSource,
    userId,
    'organization.read',
    organizationId
  );
}

/**
 * Check if user can view course content
 */
export async function canViewCourse(
  dataSource: DataSource,
  userId: string,
  isOrganizationExclusive: boolean,
  organizationId?: string
): Promise<boolean> {
  // Super admin can view everything
  if (await isSuperAdmin(dataSource, userId)) {
    return true;
  }

  // Public courses - anyone can view
  if (!isOrganizationExclusive || !organizationId) {
    return true;
  }

  // Organization-exclusive courses - check membership
  return await canManageResource(
    dataSource,
    userId,
    'organization.read',
    organizationId
  );
}

/**
 * Check if user can manage enrollments (approve/reject)
 */
export async function canManageEnrollments(
  dataSource: DataSource,
  userId: string,
  organizationId?: string
): Promise<boolean> {
  // Global enrollments - only super admin
  if (!organizationId) {
    return await isSuperAdmin(dataSource, userId);
  }

  // Organization enrollments - check organization.manage permission
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
 * Check if user can issue certificates
 */
export async function canIssueCertificate(
  dataSource: DataSource,
  userId: string,
  courseInstructorId: string,
  organizationId?: string
): Promise<boolean> {
  // Super admin can issue certificates
  if (await isSuperAdmin(dataSource, userId)) {
    return true;
  }

  // Course instructor can issue certificates
  if (userId === courseInstructorId) {
    return true;
  }

  // No organization - only instructor can issue
  if (!organizationId) {
    return false;
  }

  // Organization administrators can issue certificates
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
 * Check if user can create/manage LMS events
 */
export async function canManageEvents(
  dataSource: DataSource,
  userId: string,
  organizationId?: string
): Promise<boolean> {
  // Global events - only super admin
  if (!organizationId) {
    return await isSuperAdmin(dataSource, userId);
  }

  // Organization events - check organization.manage permission
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
 * Check if user can mark attendance
 */
export async function canMarkAttendance(
  dataSource: DataSource,
  userId: string,
  courseInstructorId?: string,
  organizationId?: string
): Promise<boolean> {
  // Super admin can mark attendance
  if (await isSuperAdmin(dataSource, userId)) {
    return true;
  }

  // Course instructor can mark attendance
  if (courseInstructorId && userId === courseInstructorId) {
    return true;
  }

  // No organization - only instructor can mark
  if (!organizationId) {
    return false;
  }

  // Organization administrators can mark attendance
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
 * Check if user can view organization LMS statistics
 */
export async function canViewLMSStatistics(
  dataSource: DataSource,
  userId: string,
  organizationId: string
): Promise<boolean> {
  // Super admin can view all statistics
  if (await isSuperAdmin(dataSource, userId)) {
    return true;
  }

  // Organization admin/manager can view statistics
  const isAdmin = await isOrganizationAdmin(dataSource, userId, organizationId);
  if (isAdmin) return true;

  return await canManageResource(
    dataSource,
    userId,
    'organization.read',
    organizationId
  );
}
