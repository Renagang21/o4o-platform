import { DataSource, Repository, IsNull } from 'typeorm';
import type { RoleAssignment } from '../entities/RoleAssignment.js';
import { Organization } from '../entities/Organization.js';

/**
 * Permission Context
 *
 * 권한 검증 시 전달되는 컨텍스트
 */
export interface PermissionContext {
  /**
   * 조직 ID
   */
  organizationId?: string;

  /**
   * 리소스 타입 (예: 'forum_post', 'course', 'product')
   */
  resourceType?: string;

  /**
   * 리소스 ID
   */
  resourceId?: string;
}

/**
 * Role-Permission Mapping
 *
 * 역할별 권한 매핑 (간단한 RBAC)
 */
const ROLE_PERMISSIONS: Record<string, string[]> = {
  // 전역 관리자: 모든 권한
  super_admin: ['*'],

  // 조직 관리자: 조직 관리 + 멤버 관리
  admin: [
    'organization.read',
    'organization.manage',
    'organization.member.read',
    'organization.member.manage',
    'forum.read',
    'forum.write',
    'forum.manage',
    'lms.read',
    'lms.write',
    'lms.manage',
  ],

  // 조직 매니저: 멤버 관리 + 콘텐츠 관리
  manager: [
    'organization.read',
    'organization.member.read',
    'organization.member.manage',
    'forum.read',
    'forum.write',
    'forum.manage',
    'lms.read',
    'lms.write',
  ],

  // 일반 회원: 읽기 + 쓰기
  member: [
    'organization.read',
    'forum.read',
    'forum.write',
    'lms.read',
    'lms.write',
  ],

  // 중재자: 콘텐츠 관리
  moderator: ['organization.read', 'forum.read', 'forum.manage', 'lms.read'],

  // 강사: LMS 관리
  instructor: [
    'organization.read',
    'lms.read',
    'lms.write',
    'lms.manage',
    'forum.read',
  ],
};

/**
 * PermissionService
 *
 * 조직 기반 권한 관리 서비스 (Phase 2)
 */
export class PermissionService {
  private roleAssignmentRepo: Repository<RoleAssignment>;
  private organizationRepo: Repository<Organization>;

  constructor(private dataSource: DataSource) {
    // Auth module의 RoleAssignment Entity를 string name으로 참조
    // (organization-core는 Entity class를 소유하지 않음)
    this.roleAssignmentRepo = dataSource.getRepository('RoleAssignment') as Repository<RoleAssignment>;
    this.organizationRepo = dataSource.getRepository(Organization);
  }

  /**
   * 권한 검증 (기본)
   *
   * 전역 권한 또는 조직 권한을 확인합니다.
   */
  async hasPermission(
    userId: string,
    permission: string,
    context?: PermissionContext
  ): Promise<boolean> {
    const assignments = await this.roleAssignmentRepo.find({
      where: { userId, isActive: true },
    });

    for (const assignment of assignments) {
      // 1. 전역 권한 체크
      if (assignment.scopeType === 'global') {
        if (this.roleHasPermission(assignment.role, permission)) {
          return true;
        }
      }

      // 2. 조직 권한 체크 (직접 권한)
      if (
        assignment.scopeType === 'organization' &&
        context?.organizationId &&
        assignment.scopeId === context.organizationId
      ) {
        if (this.roleHasPermission(assignment.role, permission)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * 권한 검증 (계층적 상속 포함)
   *
   * 상위 조직 권한이 하위 조직에 자동 상속됩니다.
   *
   * @example
   * ```typescript
   * // 서울지부 관리자 → 강남분회 자동 권한
   * hasPermissionWithInheritance("user-kim", "organization.manage", "org-gangnam")
   * // → org-seoul 권한 보유 시 true
   * ```
   */
  async hasPermissionWithInheritance(
    userId: string,
    permission: string,
    organizationId: string
  ): Promise<boolean> {
    const assignments = await this.roleAssignmentRepo.find({
      where: { userId, isActive: true },
    });

    for (const assignment of assignments) {
      // 1. 전역 권한 체크
      if (assignment.scopeType === 'global') {
        if (this.roleHasPermission(assignment.role, permission)) {
          return true;
        }
      }

      // 2. 조직 권한 체크
      if (assignment.scopeType === 'organization' && assignment.scopeId) {
        // 2-1. 직접 권한
        if (assignment.scopeId === organizationId) {
          if (this.roleHasPermission(assignment.role, permission)) {
            return true;
          }
        }

        // 2-2. 상위 조직 권한 (상속)
        const hasInheritedPermission = await this.checkInheritedPermission(
          assignment.scopeId,
          organizationId,
          assignment.role,
          permission
        );
        if (hasInheritedPermission) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * 상위 조직 권한 확인 (계층적 상속)
   *
   * assignmentOrgId가 targetOrgId의 상위 조직인지 확인하고,
   * 그렇다면 권한을 상속합니다.
   */
  private async checkInheritedPermission(
    assignmentOrgId: string,
    targetOrgId: string,
    role: string,
    permission: string
  ): Promise<boolean> {
    // 1. 대상 조직 조회
    const targetOrg = await this.organizationRepo.findOne({
      where: { id: targetOrgId },
    });
    if (!targetOrg) {
      return false;
    }

    // 2. 권한 보유 조직 조회
    const assignmentOrg = await this.organizationRepo.findOne({
      where: { id: assignmentOrgId },
    });
    if (!assignmentOrg) {
      return false;
    }

    // 3. targetOrg.path가 assignmentOrg.path로 시작하면 하위 조직
    // 예: assignmentOrg.path = "/national/seoul"
    //     targetOrg.path = "/national/seoul/gangnam"
    //     → targetOrg.path.startsWith("/national/seoul/") = true
    if (targetOrg.path.startsWith(`${assignmentOrg.path}/`)) {
      return this.roleHasPermission(role, permission);
    }

    return false;
  }

  /**
   * 역할이 특정 권한을 가지고 있는지 확인
   */
  private roleHasPermission(role: string, permission: string): boolean {
    const permissions = ROLE_PERMISSIONS[role] || [];

    // super_admin은 모든 권한
    if (permissions.includes('*')) {
      return true;
    }

    // 직접 권한 확인
    return permissions.includes(permission);
  }

  /**
   * 사용자의 모든 역할 조회
   */
  async getUserRoles(userId: string): Promise<RoleAssignment[]> {
    return await this.roleAssignmentRepo.find({
      where: { userId, isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * 사용자의 조직별 역할 조회
   */
  async getUserRolesForOrganization(
    userId: string,
    organizationId: string
  ): Promise<RoleAssignment[]> {
    return await this.roleAssignmentRepo.find({
      where: {
        userId,
        scopeType: 'organization',
        scopeId: organizationId,
        isActive: true,
      },
    });
  }

  /**
   * 역할 할당
   *
   * 중복 권한 방지 (userId, role, scopeType, scopeId 조합은 고유)
   */
  async assignRole(
    userId: string,
    role: string,
    scopeType: 'global' | 'organization',
    scopeId?: string
  ): Promise<RoleAssignment> {
    // 1. 제약 조건 검증
    if (scopeType === 'global' && scopeId) {
      throw new Error('Global scope cannot have scopeId');
    }
    if (scopeType === 'organization' && !scopeId) {
      throw new Error('Organization scope requires scopeId');
    }

    // 2. 중복 확인
    const existing = await this.roleAssignmentRepo.findOne({
      where: {
        userId,
        role,
        scopeType,
        scopeId: scopeId || IsNull(),
      },
    });
    if (existing) {
      throw new Error(
        `Role assignment already exists: ${role} (${scopeType}${scopeId ? `:${scopeId}` : ''})`
      );
    }

    // 3. 조직 존재 확인 (organization scope인 경우)
    if (scopeType === 'organization' && scopeId) {
      const org = await this.organizationRepo.findOne({
        where: { id: scopeId },
      });
      if (!org) {
        throw new Error(`Organization "${scopeId}" not found`);
      }
    }

    // 4. 역할 할당
    const assignment = this.roleAssignmentRepo.create({
      userId,
      role,
      scopeType,
      scopeId,
      isActive: true,
    } as Partial<RoleAssignment>);

    return await this.roleAssignmentRepo.save(assignment);
  }

  /**
   * 역할 취소
   */
  async revokeRole(
    userId: string,
    role: string,
    scopeType: 'global' | 'organization',
    scopeId?: string
  ): Promise<void> {
    await this.roleAssignmentRepo.delete({
      userId,
      role,
      scopeType,
      scopeId: scopeId || IsNull(),
    });
  }

  /**
   * 사용자의 모든 역할 취소
   */
  async revokeAllRoles(userId: string): Promise<void> {
    await this.roleAssignmentRepo.delete({ userId });
  }

  /**
   * 조직의 모든 역할 취소
   */
  async revokeAllRolesForOrganization(organizationId: string): Promise<void> {
    await this.roleAssignmentRepo.delete({
      scopeType: 'organization',
      scopeId: organizationId,
    });
  }

  /**
   * 역할 활성화/비활성화
   */
  async setRoleActive(
    userId: string,
    role: string,
    scopeType: 'global' | 'organization',
    scopeId: string | undefined,
    isActive: boolean
  ): Promise<void> {
    await this.roleAssignmentRepo.update(
      {
        userId,
        role,
        scopeType,
        scopeId: scopeId || IsNull(),
      },
      { isActive }
    );
  }
}
