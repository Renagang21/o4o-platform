/**
 * Profile Service
 *
 * 파트너 프로필 관리 서비스 (Partner-Core 기반)
 *
 * @package @o4o/partnerops
 */

import type { Repository } from 'typeorm';
import {
  Partner,
  PartnerService,
  PartnerLevel,
} from '@o4o/partner-core';
import type { PartnerProfileDto } from '../dto/index.js';

export interface CreateProfileDto {
  userId: string;
  name: string;
  profileImage?: string;
  socialLinks?: Partner['socialLinks'];
  bankInfo?: Partner['bankInfo'];
}

export interface UpdateProfileDto {
  name?: string;
  profileImage?: string;
  socialLinks?: Partner['socialLinks'];
  bankInfo?: Partner['bankInfo'];
}

export class ProfileService {
  private partnerService: PartnerService;

  constructor(private readonly partnerRepository: Repository<Partner>) {
    this.partnerService = new PartnerService(partnerRepository);
  }

  /**
   * 파트너 프로필 조회 (Partner ID)
   */
  async getProfile(partnerId: string): Promise<PartnerProfileDto | null> {
    const partner = await this.partnerService.findById(partnerId);
    if (!partner) return null;
    return this.toProfileDto(partner);
  }

  /**
   * 파트너 프로필 조회 (User ID)
   */
  async getProfileByUserId(userId: string): Promise<PartnerProfileDto | null> {
    const partner = await this.partnerService.findByUserId(userId);
    if (!partner) return null;
    return this.toProfileDto(partner);
  }

  /**
   * 파트너 신청
   */
  async applyAsPartner(dto: CreateProfileDto): Promise<PartnerProfileDto> {
    // 이미 파트너인지 확인
    const existing = await this.partnerService.findByUserId(dto.userId);
    if (existing) {
      throw new Error('Already registered as partner');
    }

    const partner = await this.partnerService.create({
      userId: dto.userId,
      name: dto.name,
      profileImage: dto.profileImage,
      socialLinks: dto.socialLinks,
      bankInfo: dto.bankInfo,
    });

    return this.toProfileDto(partner);
  }

  /**
   * 프로필 업데이트
   */
  async updateProfile(
    partnerId: string,
    dto: UpdateProfileDto
  ): Promise<PartnerProfileDto | null> {
    const partner = await this.partnerService.update(partnerId, {
      name: dto.name,
      profileImage: dto.profileImage,
      socialLinks: dto.socialLinks,
      bankInfo: dto.bankInfo,
    });

    if (!partner) return null;
    return this.toProfileDto(partner);
  }

  /**
   * 레벨 정보 조회
   */
  async getLevelInfo(partnerId: string): Promise<{
    currentLevel: PartnerLevel;
    nextLevel?: PartnerLevel;
    progress: number;
    requirements: {
      totalCommission: number;
      conversionCount: number;
    };
  } | null> {
    const partner = await this.partnerService.findById(partnerId);
    if (!partner) return null;

    const levelThresholds: Record<PartnerLevel, { totalCommission: number; conversionCount: number }> = {
      [PartnerLevel.NEWBIE]: { totalCommission: 0, conversionCount: 0 },
      [PartnerLevel.STANDARD]: { totalCommission: 100000, conversionCount: 10 },
      [PartnerLevel.PRO]: { totalCommission: 1000000, conversionCount: 100 },
      [PartnerLevel.ELITE]: { totalCommission: 10000000, conversionCount: 1000 },
    };

    const levels = [
      PartnerLevel.NEWBIE,
      PartnerLevel.STANDARD,
      PartnerLevel.PRO,
      PartnerLevel.ELITE,
    ];

    const currentIndex = levels.indexOf(partner.level);
    const nextLevel = currentIndex < levels.length - 1 ? levels[currentIndex + 1] : undefined;

    // 진행률 계산
    let progress = 100;
    if (nextLevel) {
      const nextThreshold = levelThresholds[nextLevel];
      const commissionProgress =
        nextThreshold.totalCommission > 0
          ? (Number(partner.totalCommission) / nextThreshold.totalCommission) * 100
          : 100;
      const conversionProgress =
        nextThreshold.conversionCount > 0
          ? (partner.conversionCount / nextThreshold.conversionCount) * 100
          : 100;
      progress = Math.min(100, Math.max(commissionProgress, conversionProgress));
    }

    return {
      currentLevel: partner.level,
      nextLevel,
      progress: Math.round(progress),
      requirements: nextLevel
        ? levelThresholds[nextLevel]
        : { totalCommission: 0, conversionCount: 0 },
    };
  }

  /**
   * Partner → ProfileDto 변환
   */
  private toProfileDto(partner: Partner): PartnerProfileDto {
    return {
      id: partner.id,
      userId: partner.userId,
      name: partner.name,
      profileImage: partner.profileImage,
      socialLinks: partner.socialLinks,
      level: partner.level,
      status: partner.status,
      commissionRate: Number(partner.commissionRate),
      clickCount: partner.clickCount,
      conversionCount: partner.conversionCount,
      totalCommission: Number(partner.totalCommission),
      createdAt: partner.createdAt,
      updatedAt: partner.updatedAt,
    };
  }
}

// Factory function
export function createProfileService(
  partnerRepository: Repository<Partner>
): ProfileService {
  return new ProfileService(partnerRepository);
}
