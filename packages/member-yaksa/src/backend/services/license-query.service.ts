import type { DataSource, Repository } from 'typeorm';

/**
 * LicenseQueryService
 *
 * 면허번호 조회 전용 서비스
 *
 * Policy (Phase 0에서 고정):
 * - 본인 면허번호만 조회 가능
 * - 수정 경로 제공 ❌
 * - 관리자/타인 조회 ❌
 *
 * @see manifest.ts - Policy Fixation #1
 */
export class LicenseQueryService {
  private memberRepository: Repository<any>;

  constructor(dataSource: DataSource) {
    // Use membership-yaksa's yaksa_members table
    this.memberRepository = dataSource.getRepository('yaksa_members');
  }

  /**
   * 본인 면허번호 조회
   *
   * @param userId - 요청한 사용자 ID (본인 확인용)
   * @returns 면허번호 정보 (READ-ONLY)
   * @throws Error if not found or unauthorized
   */
  async getMyLicenseNumber(userId: string): Promise<{
    licenseNumber: string;
    licenseIssuedAt: string | null;
    licenseRenewalAt: string | null;
    isVerified: boolean;
    message: string;
  }> {
    const member = await this.memberRepository.findOne({
      where: { userId },
      select: ['id', 'userId', 'licenseNumber', 'licenseIssuedAt', 'licenseRenewalAt', 'isVerified'],
    });

    if (!member) {
      throw new Error('회원 정보를 찾을 수 없습니다.');
    }

    return {
      licenseNumber: member.licenseNumber,
      licenseIssuedAt: member.licenseIssuedAt || null,
      licenseRenewalAt: member.licenseRenewalAt || null,
      isVerified: member.isVerified,
      message: '면허번호는 조회만 가능합니다. 수정이 필요한 경우 관리자에게 문의하세요.',
    };
  }

  /**
   * 면허번호 존재 여부 확인 (본인만)
   *
   * @param userId - 요청한 사용자 ID
   * @returns boolean
   */
  async hasLicense(userId: string): Promise<boolean> {
    const count = await this.memberRepository.count({
      where: { userId },
    });
    return count > 0;
  }

  // ⚠️ 수정 메서드 의도적으로 제공하지 않음
  // updateLicenseNumber() - 존재하지 않음
  // setLicenseNumber() - 존재하지 않음
}
