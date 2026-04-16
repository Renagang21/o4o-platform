/**
 * GlycopharmMemberService
 *
 * WO-GLYCOPHARM-MEMBER-REGISTER-FLOW-V1
 * 약사 회원 가입 신청 → 운영자 승인/거절 → 역할 부여 흐름
 */

import type { DataSource } from 'typeorm';
import { GlycopharmMember } from '../entities/glycopharm-member.entity.js';
import { RoleAssignmentService } from '../../../modules/auth/services/role-assignment.service.js';

export interface ApplyMemberDto {
  subRole: 'pharmacy_owner' | 'staff_pharmacist';
  licenseNumber?: string;
  organizationId?: string;
  pharmacyName?: string;
  pharmacyAddress?: string;
}

export class GlycopharmMemberService {
  private roleAssignmentService: RoleAssignmentService;

  constructor(private dataSource: DataSource) {
    this.roleAssignmentService = new RoleAssignmentService();
  }

  private get repo() {
    return this.dataSource.getRepository(GlycopharmMember);
  }

  /**
   * 가입 신청: pending 상태로 glycopharm_members 생성
   */
  async applyMembership(userId: string, dto: ApplyMemberDto): Promise<GlycopharmMember> {
    const existing = await this.repo.findOne({ where: { userId } });
    if (existing) {
      const err = new Error('ALREADY_APPLIED') as any;
      err.code = 'ALREADY_APPLIED';
      throw err;
    }

    if (dto.subRole === 'pharmacy_owner' && !dto.organizationId && !dto.pharmacyName) {
      const err = new Error('PHARMACY_INFO_REQUIRED') as any;
      err.code = 'PHARMACY_INFO_REQUIRED';
      throw err;
    }

    const member = this.repo.create({
      userId,
      membershipType: 'pharmacist',
      subRole: dto.subRole,
      organizationId: dto.organizationId ?? null,
      status: 'pending',
      metadata: {
        licenseNumber: dto.licenseNumber,
        pharmacyName: dto.pharmacyName,
        pharmacyAddress: dto.pharmacyAddress,
      },
    });

    return this.repo.save(member);
  }

  /**
   * 운영자 승인: status=approved + glycopharm:pharmacist 역할 부여
   */
  async approveMember(memberId: string, operatorId: string): Promise<GlycopharmMember> {
    const member = await this.repo.findOne({ where: { id: memberId } });
    if (!member) {
      const err = new Error('NOT_FOUND') as any;
      err.code = 'NOT_FOUND';
      throw err;
    }
    if (member.status !== 'pending') {
      const err = new Error('NOT_PENDING') as any;
      err.code = 'NOT_PENDING';
      throw err;
    }

    member.status = 'approved';
    member.approvedBy = operatorId;
    member.approvedAt = new Date();
    member.rejectionReason = null;
    await this.repo.save(member);

    // 역할 부여: glycopharm:pharmacist
    await this.roleAssignmentService.assignRole({
      userId: member.userId,
      role: 'glycopharm:pharmacist',
      assignedBy: operatorId,
    });

    return member;
  }

  /**
   * 운영자 거절: status=rejected + rejection_reason 저장
   */
  async rejectMember(memberId: string, operatorId: string, reason?: string): Promise<GlycopharmMember> {
    const member = await this.repo.findOne({ where: { id: memberId } });
    if (!member) {
      const err = new Error('NOT_FOUND') as any;
      err.code = 'NOT_FOUND';
      throw err;
    }
    if (member.status !== 'pending') {
      const err = new Error('NOT_PENDING') as any;
      err.code = 'NOT_PENDING';
      throw err;
    }

    member.status = 'rejected';
    member.rejectionReason = reason ?? null;
    await this.repo.save(member);

    return member;
  }

  /**
   * 현재 사용자 신청 상태 조회
   */
  async getMyMembership(userId: string): Promise<GlycopharmMember | null> {
    return this.repo.findOne({ where: { userId } });
  }

  /**
   * 운영자용 회원 목록 조회
   */
  async listMembers(opts: {
    status?: string;
    subRole?: string;
    page?: number;
    limit?: number;
  }): Promise<{ items: GlycopharmMember[]; total: number; page: number; totalPages: number }> {
    const page = opts.page ?? 1;
    const limit = opts.limit ?? 20;

    const qb = this.repo.createQueryBuilder('m');
    if (opts.status) qb.andWhere('m.status = :status', { status: opts.status });
    if (opts.subRole) qb.andWhere('m.sub_role = :subRole', { subRole: opts.subRole });
    qb.orderBy('m.created_at', 'DESC').skip((page - 1) * limit).take(limit);

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, totalPages: Math.ceil(total / limit) };
  }
}
