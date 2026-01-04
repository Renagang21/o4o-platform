import { DataSource, Repository } from 'typeorm';
import { MembershipRoleAssignment } from '../entities/MembershipRoleAssignment.js';
import { OfficialRole } from '../entities/Member.js';

/**
 * MembershipRole Types
 *
 * Membership 앱 전용 역할
 */
export type MembershipRole =
  | 'membership_super_admin'   // 전체 운영자 (Global Operator)
  | 'membership_district_admin' // 지부 관리자
  | 'membership_branch_admin'   // 분회 관리자
  | 'membership_officer'        // 임원 (이사, 감사 등)
  | 'membership_verifier'       // 자격 검증 담당
  | 'membership_member';        // 일반 회원

/**
 * OfficialRole → MembershipRole 매핑
 *
 * Phase 2 규칙:
 * - president        → DISTRICT_ADMIN (지부장급)
 * - vice_president   → BRANCH_ADMIN (부회장급)
 * - general_manager  → OFFICER (총무)
 * - auditor          → OFFICER (감사)
 * - director         → OFFICER (이사)
 * - branch_head      → BRANCH_ADMIN (분회장)
 * - district_head    → DISTRICT_ADMIN (지부장)
 * - none             → MEMBER (일반 회원)
 */
export const OFFICIAL_ROLE_TO_MEMBERSHIP_ROLE: Record<OfficialRole, MembershipRole> = {
  president: 'membership_district_admin',
  vice_president: 'membership_branch_admin',
  general_manager: 'membership_officer',
  auditor: 'membership_officer',
  director: 'membership_officer',
  branch_head: 'membership_branch_admin',
  district_head: 'membership_district_admin',
  none: 'membership_member',
};

/**
 * 역할 권한 레벨 (높을수록 상위 권한)
 */
export const ROLE_LEVELS: Record<MembershipRole, number> = {
  membership_super_admin: 100,
  membership_district_admin: 80,
  membership_branch_admin: 60,
  membership_officer: 40,
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
   * Phase 2 핵심: 직책 기반 자동 역할 동기화
   * ==========================================
   *
   * officialRole 변경 시 호출되어 역할을 자동으로 재할당합니다.
   *
   * @param memberId 회원 ID
   * @param newOfficialRole 새로운 공식 직책
   * @param organizationId 소속 조직 ID (스코프 적용)
   * @param oldOfficialRole 이전 공식 직책 (있는 경우)
   * @param assignedBy 변경자 ID
   */
  async syncRoleFromOfficialRole(
    memberId: string,
    newOfficialRole: OfficialRole,
    organizationId: string,
    oldOfficialRole?: OfficialRole,
    assignedBy?: string
  ): Promise<{
    deactivated: number;
    newAssignment: MembershipRoleAssignment;
    previousRole?: MembershipRole;
    newRole: MembershipRole;
  }> {
    // 1. 새 역할 결정
    const newRole = OFFICIAL_ROLE_TO_MEMBERSHIP_ROLE[newOfficialRole] || 'membership_member';
    const previousRole = oldOfficialRole
      ? OFFICIAL_ROLE_TO_MEMBERSHIP_ROLE[oldOfficialRole]
      : undefined;

    // 2. 이전 직책 기반 역할이 있으면 비활성화
    let deactivated = 0;
    if (previousRole && previousRole !== 'membership_member') {
      deactivated = await this.deactivateRoleForMember(memberId, previousRole);
    }

    // 3. 새 역할 할당
    const scopeType = newRole === 'membership_member' ? 'organization' : this.getScopeTypeForRole(newRole);

    const newAssignment = await this.create({
      memberId,
      role: newRole,
      scopeType,
      scopeId: organizationId,
      assignedBy,
    });

    return {
      deactivated,
      newAssignment,
      previousRole,
      newRole,
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
