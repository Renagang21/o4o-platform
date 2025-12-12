/**
 * PartnerProfileService
 *
 * 파트너 프로필 관리 서비스
 * - 프로필 생성/수정/조회
 * - 추천 코드 생성
 * - 파트너 승인/정지
 */

import type { Repository } from 'typeorm';
import { PartnerProfile, PartnerStatus, PartnerType } from '../entities/partner-profile.entity';

export interface CreatePartnerProfileDto {
  userId: string;
  displayName?: string;
  introduction?: string;
  partnerType: PartnerType;
  socialLinks?: Record<string, string>;
  profileImageUrl?: string;
}

export interface UpdatePartnerProfileDto {
  displayName?: string;
  introduction?: string;
  socialLinks?: Record<string, string>;
  profileImageUrl?: string;
  defaultCommissionRate?: number;
}

export class PartnerProfileService {
  constructor(private readonly repository: Repository<PartnerProfile>) {}

  /**
   * 파트너 프로필 생성
   */
  async createProfile(dto: CreatePartnerProfileDto): Promise<PartnerProfile> {
    const referralCode = await this.generateReferralCode();

    const profile = this.repository.create({
      ...dto,
      referralCode,
      status: 'pending',
      isActive: true,
    });

    return this.repository.save(profile);
  }

  /**
   * 고유 추천 코드 생성
   */
  private async generateReferralCode(): Promise<string> {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code: string;
    let exists: boolean;

    do {
      code = '';
      for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      const existing = await this.repository.findOne({ where: { referralCode: code } });
      exists = !!existing;
    } while (exists);

    return code;
  }

  /**
   * 사용자 ID로 프로필 조회
   */
  async findByUserId(userId: string): Promise<PartnerProfile | null> {
    return this.repository.findOne({ where: { userId } });
  }

  /**
   * ID로 프로필 조회
   */
  async findById(id: string): Promise<PartnerProfile | null> {
    return this.repository.findOne({ where: { id } });
  }

  /**
   * 추천 코드로 프로필 조회
   */
  async findByReferralCode(referralCode: string): Promise<PartnerProfile | null> {
    return this.repository.findOne({ where: { referralCode } });
  }

  /**
   * 프로필 업데이트
   */
  async updateProfile(id: string, dto: UpdatePartnerProfileDto): Promise<PartnerProfile | null> {
    await this.repository.update(id, dto);
    return this.findById(id);
  }

  /**
   * 파트너 상태 변경
   */
  async updateStatus(
    id: string,
    status: PartnerStatus,
    approvedBy?: string
  ): Promise<PartnerProfile | null> {
    if (status === 'active' && approvedBy) {
      await this.repository.update(id, {
        status,
        approvedAt: new Date(),
        approvedBy,
      });
    } else {
      await this.repository.update(id, { status });
    }
    return this.findById(id);
  }

  /**
   * 파트너 목록 조회
   */
  async findAll(options?: {
    status?: PartnerStatus;
    partnerType?: PartnerType;
    page?: number;
    limit?: number;
  }): Promise<{ items: PartnerProfile[]; total: number }> {
    const { status, partnerType, page = 1, limit = 20 } = options || {};

    const queryBuilder = this.repository.createQueryBuilder('profile');

    if (status) {
      queryBuilder.andWhere('profile.status = :status', { status });
    }

    if (partnerType) {
      queryBuilder.andWhere('profile.partnerType = :partnerType', { partnerType });
    }

    queryBuilder.orderBy('profile.createdAt', 'DESC');
    queryBuilder.skip((page - 1) * limit);
    queryBuilder.take(limit);

    const [items, total] = await queryBuilder.getManyAndCount();
    return { items, total };
  }

  /**
   * 통계 업데이트
   */
  async updateStats(
    id: string,
    stats: {
      conversions?: number;
      earnings?: number;
    }
  ): Promise<void> {
    if (stats.conversions !== undefined) {
      await this.repository.increment({ id }, 'totalConversions', stats.conversions);
    }
    if (stats.earnings !== undefined) {
      await this.repository.increment({ id }, 'totalEarnings', stats.earnings);
    }
  }

  /**
   * 프로필 삭제 (비활성화)
   */
  async delete(id: string): Promise<void> {
    await this.repository.update(id, { isActive: false, status: 'inactive' });
  }
}
