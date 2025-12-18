/**
 * MembershipReadPort Implementation
 * Phase R1: Structural Stabilization
 *
 * MembershipReadPort 인터페이스의 구현체
 * 실제 데이터 접근은 이 구현체에서만 수행
 */

import type { EntityManager, Repository } from 'typeorm';
import { Member } from '../backend/entities/Member.js';
import { MembershipYear } from '../backend/entities/MembershipYear.js';
import type {
  MembershipReadPort,
  MemberBasicInfo,
  MemberStatusInfo,
  MemberNotificationInfo,
  FindMemberOptions,
  MemberFeeInfo,
} from './MembershipReadPort.js';

/**
 * MembershipReadPort 구현체
 */
export class MembershipReadPortImpl implements MembershipReadPort {
  private memberRepository: Repository<Member>;
  private membershipYearRepository: Repository<MembershipYear>;

  constructor(entityManager: EntityManager) {
    this.memberRepository = entityManager.getRepository(Member);
    this.membershipYearRepository = entityManager.getRepository(MembershipYear);
  }

  async getMemberById(memberId: string): Promise<MemberBasicInfo | null> {
    const member = await this.memberRepository.findOne({
      where: { id: memberId },
    });

    if (!member) return null;

    return this.toBasicInfo(member);
  }

  async getMemberByUserId(userId: string): Promise<MemberBasicInfo | null> {
    const member = await this.memberRepository.findOne({
      where: { userId },
    });

    if (!member) return null;

    return this.toBasicInfo(member);
  }

  async getMemberStatus(memberId: string): Promise<MemberStatusInfo | null> {
    const member = await this.memberRepository.findOne({
      where: { id: memberId },
      relations: ['category'],
    });

    if (!member) return null;

    return {
      id: member.id,
      isActive: member.isActive,
      isVerified: member.isVerified,
      categoryId: member.categoryId,
      categoryName: member.category?.name,
      requiresAnnualFee: member.category?.requiresAnnualFee ?? true,
    };
  }

  async getMemberForNotification(memberId: string): Promise<MemberNotificationInfo | null> {
    const member = await this.memberRepository.findOne({
      where: { id: memberId },
    });

    if (!member) return null;

    return {
      memberId: member.id,
      userId: member.userId,
      name: member.name,
      email: member.email,
      licenseNumber: member.licenseNumber,
    };
  }

  async getMembersByIds(memberIds: string[]): Promise<MemberBasicInfo[]> {
    if (memberIds.length === 0) return [];

    const members = await this.memberRepository
      .createQueryBuilder('member')
      .where('member.id IN (:...memberIds)', { memberIds })
      .getMany();

    return members.map(this.toBasicInfo);
  }

  async findMembers(options: FindMemberOptions): Promise<MemberBasicInfo[]> {
    const query = this.memberRepository.createQueryBuilder('member');

    if (options.organizationId) {
      query.andWhere('member.organizationId = :organizationId', {
        organizationId: options.organizationId,
      });
    }

    if (options.activeOnly) {
      query.andWhere('member.isActive = :isActive', { isActive: true });
    }

    if (options.verifiedOnly) {
      query.andWhere('member.isVerified = :isVerified', { isVerified: true });
    }

    if (options.categoryId) {
      query.andWhere('member.categoryId = :categoryId', {
        categoryId: options.categoryId,
      });
    }

    const members = await query.getMany();
    return members.map(this.toBasicInfo);
  }

  async isMemberPaidForYear(memberId: string, year: number): Promise<boolean> {
    const membershipYear = await this.membershipYearRepository.findOne({
      where: {
        memberId,
        year,
        paid: true,
      },
    });

    return membershipYear !== null;
  }

  async getMemberCountByOrganization(organizationId: string): Promise<number> {
    return this.memberRepository.count({
      where: {
        organizationId,
        isActive: true,
      },
    });
  }

  // ============================================
  // Phase R1.1: 회비 관련 메서드
  // ============================================

  async getMemberForFeeCalculation(memberId: string): Promise<MemberFeeInfo | null> {
    const member = await this.memberRepository.findOne({
      where: { id: memberId },
      relations: ['category'],
    });

    if (!member) return null;

    return this.toFeeInfo(member);
  }

  async getActiveMembersForFee(options?: {
    organizationId?: string;
  }): Promise<MemberFeeInfo[]> {
    const query = this.memberRepository
      .createQueryBuilder('member')
      .leftJoinAndSelect('member.category', 'category')
      .where('member.isActive = :isActive', { isActive: true })
      .andWhere('member.isVerified = :isVerified', { isVerified: true });

    if (options?.organizationId) {
      query.andWhere('member.organizationId = :organizationId', {
        organizationId: options.organizationId,
      });
    }

    const members = await query.getMany();
    return members.map(this.toFeeInfo.bind(this));
  }

  /**
   * Member 엔티티를 MemberBasicInfo DTO로 변환
   */
  private toBasicInfo(member: Member): MemberBasicInfo {
    return {
      id: member.id,
      userId: member.userId,
      organizationId: member.organizationId,
      name: member.name,
      email: member.email,
      phone: member.phone,
      licenseNumber: member.licenseNumber,
      registrationNumber: member.registrationNumber,
    };
  }

  /**
   * Phase R1.1: Member 엔티티를 MemberFeeInfo DTO로 변환
   */
  private toFeeInfo(member: Member): MemberFeeInfo {
    return {
      id: member.id,
      name: member.name,
      organizationId: member.organizationId,
      pharmacistType: member.pharmacistType,
      officialRole: member.officialRole,
      birthdate: member.birthdate,
      requiresAnnualFee: member.category?.requiresAnnualFee ?? true,
      yaksaJoinDate: member.yaksaJoinDate,
      isActive: member.isActive,
      isVerified: member.isVerified,
    };
  }
}

/**
 * MembershipReadPort 인스턴스 생성 팩토리
 */
export function createMembershipReadPort(entityManager: EntityManager): MembershipReadPort {
  return new MembershipReadPortImpl(entityManager);
}
