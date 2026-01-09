import { DataSource, Repository } from 'typeorm';
import { MembershipRoleAssignment } from '../entities/MembershipRoleAssignment.js';
import { OfficialRole } from '../entities/Member.js';

/**
 * MembershipRole Types
 *
 * Membership 앱 전용 역할
 *
 * WO-KPA-AUTH-RBAC-EXECUTIVE-REFORM-V1:
 * - membership_officer REMOVED (임원은 직책이며 권한이 아님)
 * - 임원 표시는 Member.officialRole로만 처리 (상태 데이터)
 * - 권한은 *_admin 계층만 가짐
 */
export type MembershipRole =
  | 'membership_super_admin'    // 전체 운영자 (Global Operator)
  | 'membership_district_admin' // 지부 관리자
  | 'membership_branch_admin'   // 분회 관리자
  | 'membership_verifier'       // 자격 검증 담당
  | 'membership_member';        // 일반 회원

/**
 * OfficialRole → MembershipRole 매핑
 *
 * WO-KPA-AUTH-RBAC-EXECUTIVE-REFORM-V1:
 * - 임원(general_manager, auditor, director)은 권한을 부여하지 않음
 * - 임원은 직책(표시)이며 권한이 아님
 * - 권한이 필요한 직책만 admin 계층에 매핑
 *
 * 권한 매핑 규칙:
 * - president        → DISTRICT_ADMIN (지부장급 - 관리 권한 필요)
 * - vice_president   → BRANCH_ADMIN (부회장급 - 관리 권한 필요)
 * - branch_head      → BRANCH_ADMIN (분회장 - 관리 권한 필요)
 * - district_head    → DISTRICT_ADMIN (지부장 - 관리 권한 필요)
 * - general_manager  → MEMBER (총무 - 직책만, 권한 별도 부여)
 * - auditor          → MEMBER (감사 - 직책만, 권한 별도 부여)
 * - director         → MEMBER (이사 - 직책만, 권한 별도 부여)
 * - none             → MEMBER (일반 회원)
 */
export const OFFICIAL_ROLE_TO_MEMBERSHIP_ROLE: Record<OfficialRole, MembershipRole> = {
  president: 'membership_district_admin',
  vice_president: 'membership_branch_admin',
  general_manager: 'membership_member',  // 직책만, 권한 아님
  auditor: 'membership_member',          // 직책만, 권한 아님
  director: 'membership_member',         // 직책만, 권한 아님
  branch_head: 'membership_branch_admin',
  district_head: 'membership_district_admin',
  none: 'membership_member',
};

/**
 * 역할 권한 레벨 (높을수록 상위 권한)
 *
 * WO-KPA-AUTH-RBAC-EXECUTIVE-REFORM-V1:
 * - membership_officer REMOVED (임원은 권한이 아님)
 */
export const ROLE_LEVELS: Record<MembershipRole, number> = {
  membership_super_admin: 100,
  membership_district_admin: 80,
  membership_branch_admin: 60,
  membership_verifier: 30,
  membership_member: 10,
};

/**
 * CreateRoleAssignmentDto
 */
export interface CreateRoleAssignmentDto {
  memberId: string;
  role: MembershipRole;
  scopeType: 'global' | 'organization';
  scopeId?: string;
  assignedBy?: string;
  validFrom?: Date;
  validUntil?: Date;
}

/**
 * RoleAssignmentService
 *
 * Phase 2: 직책(officialRole) 기반 자동 권한 부여 서비스
 *
 * 회원의 공식 직책이 변경되면 자동으로 적절한 역할이 할당됩니다.
 * 기존 역할은 비활성화되고 새 역할이 부여됩니다.
 */
export class RoleAssignmentService {
  private roleRepo: Repository<MembershipRoleAssignment>;

  constructor(private dataSource: DataSource) {
    this.roleRepo = dataSource.getRepository(MembershipRoleAssignment);
  }

  /**
   * 역할 할당 생성
   */
  async create(dto: CreateRoleAssignmentDto): Promise<MembershipRoleAssignment> {
    // 중복 확인
    const existing = await this.roleRepo.findOne({
      where: {
        memberId: dto.memberId,
        role: dto.role,
        scopeType: dto.scopeType,
        scopeId: dto.scopeId ?? undefined,
        isActive: true,
      },
    });

    if (existing) {
      // 이미 동일한 역할이 할당되어 있으면 기존 것 반환
      return existing;
    }

    const assignment = this.roleRepo.create({
      ...dto,
      validFrom: dto.validFrom || new Date(),
      isActive: true,
    });

    return await this.roleRepo.save(assignment);
  }

  /**
   * 회원의 모든 역할 조회
   */
  async findByMember(memberId: string, activeOnly = true): Promise<MembershipRoleAssignment[]> {
    const where: any = { memberId };
    if (activeOnly) {
      where.isActive = true;
    }

    return await this.roleRepo.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * 특정 역할을 가진 회원 조회
   */
  async findByRole(role: MembershipRole, scopeId?: string): Promise<MembershipRoleAssignment[]> {
    const where: any = {
      role,
      isActive: true,
    };

    if (scopeId) {
      where.scopeId = scopeId;
    }

    return await this.roleRepo.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * 역할 비활성화
   */
  async deactivate(id: string): Promise<void> {
    await this.roleRepo.update(id, {
      isActive: false,
      validUntil: new Date(),
    });
  }

  /**
   * 회원의 모든 역할 비활성화
   */
  async deactivateAllForMember(memberId: string): Promise<number> {
    const result = await this.roleRepo.update(
      { memberId, isActive: true },
      {
        isActive: false,
        validUntil: new Date(),
      }
    );
    return result.affected || 0;
  }

  /**
   * 회원의 특정 역할 비활성화
   */
  async deactivateRoleForMember(memberId: string, role: MembershipRole): Promise<number> {
    const result = await this.roleRepo.update(
      { memberId, role, isActive: true },
      {
        isActive: false,
        validUntil: new Date(),
      }
    );
    return result.affected || 0;
  }

  /**
   * ==========================================
   * WO-KPA-AUTH-RBAC-EXECUTIVE-REFORM-V1: DEPRECATED
   * ==========================================
   *
   * 이 함수는 더 이상 사용되지 않습니다.
   *
   * 핵심 원칙:
   * - 임원(officialRole)은 직책(표시 데이터)이며 권한이 아님
   * - 직책 변경이 권한에 영향을 주지 않음
   * - 권한 부여는 수동으로 관리자가 RoleAssignment를 직접 할당
   *
   * 관리자 직책(president, vice_president, branch_head, district_head)도
   * 자동으로 권한을 부여하지 않습니다.
   * 권한이 필요하면 관리자가 별도로 할당해야 합니다.
   *
   * @deprecated WO-KPA-AUTH-RBAC-EXECUTIVE-REFORM-V1에 의해 비활성화됨
   */
  async syncRoleFromOfficialRole(
    _memberId: string,
    _newOfficialRole: OfficialRole,
    _organizationId: string,
    _oldOfficialRole?: OfficialRole,
    _assignedBy?: string
  ): Promise<{
    deactivated: number;
    newAssignment: MembershipRoleAssignment | null;
    previousRole?: MembershipRole;
    newRole: MembershipRole;
    skipped: boolean;
    reason: string;
  }> {
    // WO-KPA-AUTH-RBAC-EXECUTIVE-REFORM-V1: 자동 역할 동기화 비활성화
    // 직책 변경은 권한에 영향을 주지 않음
    return {
      deactivated: 0,
      newAssignment: null,
      previousRole: undefined,
      newRole: 'membership_member',
      skipped: true,
      reason: 'WO-KPA-AUTH-RBAC-EXECUTIVE-REFORM-V1: 직책 변경은 권한에 영향 없음. 임원은 직책이며 권한이 아닙니다.',
    };
  }

  /**
   * 역할에 따른 스코프 타입 결정
   */
  private getScopeTypeForRole(role: MembershipRole): 'global' | 'organization' {
    switch (role) {
      case 'membership_super_admin':
        return 'global';
      default:
        return 'organization';
    }
  }

  /**
   * 회원이 특정 역할을 가지고 있는지 확인
   */
  async hasRole(memberId: string, role: MembershipRole, scopeId?: string): Promise<boolean> {
    const where: any = {
      memberId,
      role,
      isActive: true,
    };

    if (scopeId) {
      where.scopeId = scopeId;
    }

    const count = await this.roleRepo.count({ where });
    return count > 0;
  }

  /**
   * 회원의 최고 권한 역할 조회
   */
  async getHighestRole(memberId: string): Promise<{
    role: MembershipRole;
    level: number;
    assignment: MembershipRoleAssignment;
  } | null> {
    const assignments = await this.findByMember(memberId);

    if (assignments.length === 0) {
      return null;
    }

    let highest: MembershipRoleAssignment = assignments[0];
    let highestLevel = ROLE_LEVELS[assignments[0].role as MembershipRole] || 0;

    for (const assignment of assignments) {
      const level = ROLE_LEVELS[assignment.role as MembershipRole] || 0;
      if (level > highestLevel) {
        highestLevel = level;
        highest = assignment;
      }
    }

    return {
      role: highest.role as MembershipRole,
      level: highestLevel,
      assignment: highest,
    };
  }

  /**
   * 조직 내 특정 역할을 가진 회원 수 조회
   */
  async countByRoleInOrganization(role: MembershipRole, organizationId: string): Promise<number> {
    return await this.roleRepo.count({
      where: {
        role,
        scopeId: organizationId,
        isActive: true,
      },
    });
  }

  /**
   * 역할 변경 이력 조회 (비활성화된 역할 포함)
   */
  async getRoleHistory(memberId: string): Promise<MembershipRoleAssignment[]> {
    return await this.roleRepo.find({
      where: { memberId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * 일괄 역할 할당 (여러 회원에게 동일 역할 부여)
   */
  async bulkAssignRole(
    memberIds: string[],
    role: MembershipRole,
    scopeId: string,
    assignedBy?: string
  ): Promise<{
    success: number;
    failed: number;
    errors: string[];
  }> {
    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const memberId of memberIds) {
      try {
        await this.create({
          memberId,
          role,
          scopeType: 'organization',
          scopeId,
          assignedBy,
        });
        success++;
      } catch (error: any) {
        failed++;
        errors.push(`Member ${memberId}: ${error.message}`);
      }
    }

    return { success, failed, errors };
  }

  /**
   * 일괄 역할 비활성화 (여러 회원의 특정 역할 비활성화)
   */
  async bulkDeactivateRole(
    memberIds: string[],
    role: MembershipRole
  ): Promise<{
    success: number;
    failed: number;
    errors: string[];
  }> {
    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const memberId of memberIds) {
      try {
        const affected = await this.deactivateRoleForMember(memberId, role);
        if (affected > 0) {
          success++;
        }
      } catch (error: any) {
        failed++;
        errors.push(`Member ${memberId}: ${error.message}`);
      }
    }

    return { success, failed, errors };
  }
}
