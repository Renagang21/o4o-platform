/**
 * PartnerLinkService
 *
 * 파트너 링크 관리 서비스
 * - 링크 생성/수정/조회
 * - 클릭/전환 추적
 * - 수익 계산
 */

import type { Repository } from 'typeorm';
import { PartnerLink, LinkType, LinkStatus } from '../entities/partner-link.entity';

export interface CreatePartnerLinkDto {
  partnerId: string;
  linkType: LinkType;
  targetId?: string;
  title?: string;
  description?: string;
  customCommissionRate?: number;
  expiresAt?: Date;
}

export interface UpdatePartnerLinkDto {
  title?: string;
  description?: string;
  customCommissionRate?: number;
  status?: LinkStatus;
  expiresAt?: Date;
}

export class PartnerLinkService {
  constructor(private readonly repository: Repository<PartnerLink>) {}

  /**
   * 링크 생성
   */
  async createLink(dto: CreatePartnerLinkDto): Promise<PartnerLink> {
    const urlSlug = await this.generateUrlSlug();

    const link = this.repository.create({
      ...dto,
      urlSlug,
      status: 'active',
      isActive: true,
    });

    return this.repository.save(link);
  }

  /**
   * 고유 URL Slug 생성
   */
  private async generateUrlSlug(): Promise<string> {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let slug: string;
    let exists: boolean;

    do {
      slug = '';
      for (let i = 0; i < 10; i++) {
        slug += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      const existing = await this.repository.findOne({ where: { urlSlug: slug } });
      exists = !!existing;
    } while (exists);

    return slug;
  }

  /**
   * ID로 링크 조회
   */
  async findById(id: string): Promise<PartnerLink | null> {
    return this.repository.findOne({ where: { id } });
  }

  /**
   * URL Slug로 링크 조회
   */
  async findBySlug(urlSlug: string): Promise<PartnerLink | null> {
    return this.repository.findOne({ where: { urlSlug } });
  }

  /**
   * 파트너 ID로 링크 목록 조회
   */
  async findByPartnerId(
    partnerId: string,
    options?: {
      linkType?: LinkType;
      status?: LinkStatus;
      page?: number;
      limit?: number;
    }
  ): Promise<{ items: PartnerLink[]; total: number }> {
    const { linkType, status, page = 1, limit = 20 } = options || {};

    const queryBuilder = this.repository
      .createQueryBuilder('link')
      .where('link.partnerId = :partnerId', { partnerId });

    if (linkType) {
      queryBuilder.andWhere('link.linkType = :linkType', { linkType });
    }

    if (status) {
      queryBuilder.andWhere('link.status = :status', { status });
    }

    queryBuilder.orderBy('link.createdAt', 'DESC');
    queryBuilder.skip((page - 1) * limit);
    queryBuilder.take(limit);

    const [items, total] = await queryBuilder.getManyAndCount();
    return { items, total };
  }

  /**
   * 링크 업데이트
   */
  async updateLink(id: string, dto: UpdatePartnerLinkDto): Promise<PartnerLink | null> {
    await this.repository.update(id, dto);
    return this.findById(id);
  }

  /**
   * 클릭 카운트 증가
   */
  async incrementClicks(
    id: string,
    isUnique: boolean = false
  ): Promise<void> {
    await this.repository.increment({ id }, 'totalClicks', 1);
    if (isUnique) {
      await this.repository.increment({ id }, 'uniqueClicks', 1);
    }
    await this.updateConversionRate(id);
  }

  /**
   * 전환 카운트 증가
   */
  async incrementConversions(id: string, earnings: number): Promise<void> {
    await this.repository.increment({ id }, 'conversions', 1);
    await this.repository.increment({ id }, 'totalEarnings', earnings);
    await this.updateConversionRate(id);
  }

  /**
   * 전환율 업데이트
   */
  private async updateConversionRate(id: string): Promise<void> {
    const link = await this.findById(id);
    if (link && link.uniqueClicks > 0) {
      const conversionRate = (link.conversions / link.uniqueClicks) * 100;
      await this.repository.update(id, { conversionRate });
    }
  }

  /**
   * 링크 통계 조회
   */
  async getLinkStats(partnerId: string): Promise<{
    totalLinks: number;
    activeLinks: number;
    totalClicks: number;
    totalConversions: number;
    totalEarnings: number;
    avgConversionRate: number;
  }> {
    const result = await this.repository
      .createQueryBuilder('link')
      .select([
        'COUNT(*) as totalLinks',
        'SUM(CASE WHEN link.status = :active THEN 1 ELSE 0 END) as activeLinks',
        'SUM(link.totalClicks) as totalClicks',
        'SUM(link.conversions) as totalConversions',
        'SUM(link.totalEarnings) as totalEarnings',
        'AVG(link.conversionRate) as avgConversionRate',
      ])
      .where('link.partnerId = :partnerId', { partnerId })
      .setParameter('active', 'active')
      .getRawOne();

    return {
      totalLinks: parseInt(result.totalLinks) || 0,
      activeLinks: parseInt(result.activeLinks) || 0,
      totalClicks: parseInt(result.totalClicks) || 0,
      totalConversions: parseInt(result.totalConversions) || 0,
      totalEarnings: parseFloat(result.totalEarnings) || 0,
      avgConversionRate: parseFloat(result.avgConversionRate) || 0,
    };
  }

  /**
   * 링크 삭제 (비활성화)
   */
  async delete(id: string): Promise<void> {
    await this.repository.update(id, { isActive: false, status: 'inactive' });
  }
}
