import type { DataSource, Repository } from 'typeorm';

/**
 * MemberProfileService
 *
 * 회원 프로필 통합 서비스
 *
 * Policy (Phase 0에서 고정):
 * - 본인 프로필만 조회/수정 가능
 * - 면허번호: READ-ONLY
 * - 약국정보: 본인만 수정 가능
 *
 * @see manifest.ts - Policy Fixation
 */

export interface MemberProfileData {
  // 기본 정보
  id: string;
  userId: string;
  name: string;

  // 면허 정보 (READ-ONLY)
  licenseNumber: string;
  licenseIssuedAt: string | null;
  licenseRenewalAt: string | null;
  isVerified: boolean;

  // 약사 유형
  pharmacistType: string | null;

  // 조직 정보
  organizationId: string;

  // 상태
  isActive: boolean;
}

export class MemberProfileService {
  private memberRepository: Repository<any>;

  constructor(dataSource: DataSource) {
    // Use membership-yaksa's yaksa_members table
    this.memberRepository = dataSource.getRepository('yaksa_members');
  }

  /**
   * 본인 프로필 조회
   *
   * @param userId - 요청한 사용자 ID (본인 확인용)
   * @returns 프로필 정보
   * @throws Error if not found
   */
  async getMyProfile(userId: string): Promise<{
    profile: MemberProfileData;
    policies: {
      licenseNumberEditable: boolean;
      pharmacyInfoEditableBy: string;
    };
  }> {
    const member = await this.memberRepository.findOne({
      where: { userId },
    });

    if (!member) {
      throw new Error('회원 정보를 찾을 수 없습니다.');
    }

    return {
      profile: {
        id: member.id,
        userId: member.userId,
        name: member.name,
        licenseNumber: member.licenseNumber,
        licenseIssuedAt: member.licenseIssuedAt || null,
        licenseRenewalAt: member.licenseRenewalAt || null,
        isVerified: member.isVerified,
        pharmacistType: member.pharmacistType || null,
        organizationId: member.organizationId,
        isActive: member.isActive,
      },
      policies: {
        licenseNumberEditable: false, // 면허번호: READ-ONLY
        pharmacyInfoEditableBy: 'member_only', // 약국정보: 본인만 수정
      },
    };
  }

  /**
   * 회원 존재 여부 확인
   *
   * @param userId - 사용자 ID
   * @returns boolean
   */
  async hasMembership(userId: string): Promise<boolean> {
    const count = await this.memberRepository.count({
      where: { userId },
    });
    return count > 0;
  }

  /**
   * 회원 ID 조회 (내부 용도)
   *
   * @param userId - 사용자 ID
   * @returns 회원 ID 또는 null
   */
  async getMemberIdByUserId(userId: string): Promise<string | null> {
    const member = await this.memberRepository.findOne({
      where: { userId },
      select: ['id'],
    });
    return member?.id || null;
  }

  /**
   * 조직 스코프 확인
   *
   * @param userId - 사용자 ID
   * @param organizationId - 확인할 조직 ID
   * @returns boolean
   */
  async isInOrganization(userId: string, organizationId: string): Promise<boolean> {
    const count = await this.memberRepository.count({
      where: { userId, organizationId },
    });
    return count > 0;
  }
}
