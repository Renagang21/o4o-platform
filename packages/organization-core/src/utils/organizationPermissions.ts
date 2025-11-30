import { DataSource } from 'typeorm';
import { PermissionService } from '../services/PermissionService';

/**
 * Organization Permission Utilities
 *
 * Forum/LMS/Dropshipping 등 모든 도메인에서 재사용 가능한 범용 권한 함수
 */

/**
 * 조직 관리 권한 확인
 *
 * @param dataSource TypeORM DataSource
 * @param userId 사용자 ID
 * @param organizationId 조직 ID
 * @returns 권한 여부
 */
export async function canManageOrganization(
  dataSource: DataSource,
  userId: string,
  organizationId: string
): Promise<boolean> {
  const permissionService = new PermissionService(dataSource);
  return await permissionService.hasPermissionWithInheritance(
    userId,
    'organization.manage',
    organizationId
  );
}

/**
 * 조직 멤버 관리 권한 확인
 *
 * @param dataSource TypeORM DataSource
 * @param userId 사용자 ID
 * @param organizationId 조직 ID
 * @returns 권한 여부
 */
export async function canManageMembers(
  dataSource: DataSource,
  userId: string,
  organizationId: string
): Promise<boolean> {
  const permissionService = new PermissionService(dataSource);
  return await permissionService.hasPermissionWithInheritance(
    userId,
    'organization.member.manage',
    organizationId
  );
}

/**
 * 조직 읽기 권한 확인
 *
 * @param dataSource TypeORM DataSource
 * @param userId 사용자 ID
 * @param organizationId 조직 ID (선택적)
 * @returns 권한 여부
 */
export async function canReadOrganization(
  dataSource: DataSource,
  userId: string,
  organizationId?: string
): Promise<boolean> {
  const permissionService = new PermissionService(dataSource);

  if (organizationId) {
    return await permissionService.hasPermissionWithInheritance(
      userId,
      'organization.read',
      organizationId
    );
  }

  // 조직 ID 없으면 전역 권한만 확인
  return await permissionService.hasPermission(userId, 'organization.read');
}

/**
 * 범용 리소스 권한 확인 (도메인 연동용)
 *
 * Forum/LMS/Dropshipping에서 사용
 *
 * @param dataSource TypeORM DataSource
 * @param userId 사용자 ID
 * @param permission 권한 ID (예: "forum.write", "lms.manage")
 * @param organizationId 조직 ID
 * @returns 권한 여부
 *
 * @example
 * ```typescript
 * // Forum 게시글 작성 권한
 * canManageResource(dataSource, "user-kim", "forum.write", "org-seoul")
 *
 * // LMS 강의 관리 권한
 * canManageResource(dataSource, "user-park", "lms.manage", "org-busan")
 * ```
 */
export async function canManageResource(
  dataSource: DataSource,
  userId: string,
  permission: string,
  organizationId: string
): Promise<boolean> {
  const permissionService = new PermissionService(dataSource);
  return await permissionService.hasPermissionWithInheritance(
    userId,
    permission,
    organizationId
  );
}

/**
 * 전역 관리자 여부 확인
 *
 * @param dataSource TypeORM DataSource
 * @param userId 사용자 ID
 * @returns super_admin 권한 보유 여부
 */
export async function isSuperAdmin(
  dataSource: DataSource,
  userId: string
): Promise<boolean> {
  const permissionService = new PermissionService(dataSource);
  return await permissionService.hasPermission(userId, '*');
}

/**
 * 조직 관리자 여부 확인
 *
 * @param dataSource TypeORM DataSource
 * @param userId 사용자 ID
 * @param organizationId 조직 ID
 * @returns 조직 관리자 권한 보유 여부
 */
export async function isOrganizationAdmin(
  dataSource: DataSource,
  userId: string,
  organizationId: string
): Promise<boolean> {
  const permissionService = new PermissionService(dataSource);
  const roles = await permissionService.getUserRolesForOrganization(
    userId,
    organizationId
  );
  return roles.some((r) => r.role === 'admin' && r.isActive);
}

/**
 * 조직 매니저 여부 확인
 *
 * @param dataSource TypeORM DataSource
 * @param userId 사용자 ID
 * @param organizationId 조직 ID
 * @returns 조직 매니저 권한 보유 여부
 */
export async function isOrganizationManager(
  dataSource: DataSource,
  userId: string,
  organizationId: string
): Promise<boolean> {
  const permissionService = new PermissionService(dataSource);
  const roles = await permissionService.getUserRolesForOrganization(
    userId,
    organizationId
  );
  return roles.some(
    (r) => (r.role === 'admin' || r.role === 'manager') && r.isActive
  );
}

/**
 * 사용자의 모든 조직 권한 조회
 *
 * @param dataSource TypeORM DataSource
 * @param userId 사용자 ID
 * @returns 조직 ID 목록 (권한이 있는 조직들)
 */
export async function getUserOrganizationIds(
  dataSource: DataSource,
  userId: string
): Promise<string[]> {
  const permissionService = new PermissionService(dataSource);
  const roles = await permissionService.getUserRoles(userId);

  return roles
    .filter((r) => r.scopeType === 'organization' && r.scopeId && r.isActive)
    .map((r) => r.scopeId!);
}
