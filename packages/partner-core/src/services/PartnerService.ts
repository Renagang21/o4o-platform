/**
 * PartnerService
 *
 * 파트너 등록, 프로필 관리, 역량 지표 업데이트
 *
 * @package @o4o/partner-core
 */

import { Repository } from 'typeorm';
import {
  Partner,
  PartnerLevel,
  PartnerStatus,
} from '../entities/Partner.entity.js';

export interface CreatePartnerDto {
  userId: string;
  name: string;
  profileImage?: string;
  socialLinks?: Partner['socialLinks'];
  commissionRate?: number;
  bankInfo?: Partner['bankInfo'];
  metadata?: Record<string, any>;
}

export interface UpdatePartnerDto extends Partial<CreatePartnerDto> {
  status?: PartnerStatus;
  level?: PartnerLevel;
}

export interface PartnerFilter {
  status?: PartnerStatus;
  level?: PartnerLevel;
  searchTerm?: string;
  page?: number;
  limit?: number;
}

export class PartnerService {
  constructor(private partnerRepository: Repository<Partner>) {}

  /**
   * 파트너 등록
   */
  async create(data: CreatePartnerDto): Promise<Partner> {
    const partner = this.partnerRepository.create({
      ...data,
      role: 'partner',
      status: PartnerStatus.PENDING,
      level: PartnerLevel.NEWBIE,
      commissionRate: data.commissionRate ?? 5.0,
    });
    return this.partnerRepository.save(partner);
  }

  /**
   * 파트너 조회 (ID)
   */
  async findById(id: string): Promise<Partner | null> {
    return this.partnerRepository.findOne({
      where: { id },
    });
  }

  /**
   * 파트너 조회 (사용자 ID)
   */
  async findByUserId(userId: string): Promise<Partner | null> {
    return this.partnerRepository.findOne({
      where: { userId },
    });
  }

  /**
   * 파트너 목록 조회
   */
  async findAll(filter: PartnerFilter = {}): Promise<{
    items: Partner[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { page = 1, limit = 20, searchTerm, ...where } = filter;

    const qb = this.partnerRepository.createQueryBuilder('partner');

    if (where.status) {
      qb.andWhere('partner.status = :status', { status: where.status });
    }

    if (where.level) {
      qb.andWhere('partner.level = :level', { level: where.level });
    }

    if (searchTerm) {
      qb.andWhere('partner.name ILIKE :searchTerm', {
        searchTerm: `%${searchTerm}%`,
      });
    }

    qb.orderBy('partner.createdAt', 'DESC');
    qb.skip((page - 1) * limit).take(limit);

    const [items, total] = await qb.getManyAndCount();

    return { items, total, page, limit };
  }

  /**
   * 파트너 수정
   */
  async update(id: string, data: UpdatePartnerDto): Promise<Partner | null> {
    const partner = await this.findById(id);
    if (!partner) return null;

    Object.assign(partner, data);
    return this.partnerRepository.save(partner);
  }

  /**
   * 파트너 승인
   */
  async approve(id: string): Promise<Partner | null> {
    return this.update(id, { status: PartnerStatus.ACTIVE });
  }

  /**
   * 파트너 정지
   */
  async suspend(id: string): Promise<Partner | null> {
    return this.update(id, { status: PartnerStatus.SUSPENDED });
  }

  /**
   * 클릭/전환 카운트 증가
   */
  async incrementStats(
    id: string,
    stats: { clicks?: number; conversions?: number; commission?: number }
  ): Promise<Partner | null> {
    const partner = await this.findById(id);
    if (!partner) return null;

    if (stats.clicks) {
      partner.clickCount += stats.clicks;
    }
    if (stats.conversions) {
      partner.conversionCount += stats.conversions;
    }
    if (stats.commission) {
      partner.totalCommission = Number(partner.totalCommission) + stats.commission;
    }

    // 레벨 자동 조정
    partner.level = this.calculateLevel(partner);

    return this.partnerRepository.save(partner);
  }

  /**
   * 레벨 자동 계산
   */
  private calculateLevel(partner: Partner): PartnerLevel {
    const totalCommission = Number(partner.totalCommission);
    const conversionCount = partner.conversionCount;

    // Elite: 1000만원 이상 또는 1000 전환 이상
    if (totalCommission >= 10000000 || conversionCount >= 1000) {
      return PartnerLevel.ELITE;
    }
    // Pro: 100만원 이상 또는 100 전환 이상
    if (totalCommission >= 1000000 || conversionCount >= 100) {
      return PartnerLevel.PRO;
    }
    // Standard: 10만원 이상 또는 10 전환 이상
    if (totalCommission >= 100000 || conversionCount >= 10) {
      return PartnerLevel.STANDARD;
    }
    return PartnerLevel.NEWBIE;
  }

  /**
   * 파트너 통계
   */
  async getStats(): Promise<{
    total: number;
    active: number;
    pending: number;
    byLevel: Record<PartnerLevel, number>;
  }> {
    const total = await this.partnerRepository.count();
    const active = await this.partnerRepository.count({
      where: { status: PartnerStatus.ACTIVE },
    });
    const pending = await this.partnerRepository.count({
      where: { status: PartnerStatus.PENDING },
    });

    const levelCounts = await this.partnerRepository
      .createQueryBuilder('partner')
      .select('partner.level', 'level')
      .addSelect('COUNT(*)', 'count')
      .groupBy('partner.level')
      .getRawMany();

    const byLevel = {
      [PartnerLevel.NEWBIE]: 0,
      [PartnerLevel.STANDARD]: 0,
      [PartnerLevel.PRO]: 0,
      [PartnerLevel.ELITE]: 0,
    };

    levelCounts.forEach((row) => {
      byLevel[row.level as PartnerLevel] = parseInt(row.count, 10);
    });

    return { total, active, pending, byLevel };
  }
}
