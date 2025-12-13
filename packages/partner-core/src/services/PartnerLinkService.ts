/**
 * PartnerLinkService
 *
 * 파트너 링크 생성, 조회, shortUrl 해시 생성
 *
 * @package @o4o/partner-core
 */

import { Repository } from 'typeorm';
import {
  PartnerLink,
  LinkTargetType,
  PartnerLinkStatus,
} from '../entities/PartnerLink.entity.js';
import { Partner } from '../entities/Partner.entity.js';
import crypto from 'crypto';

export interface CreatePartnerLinkDto {
  partnerId: string;
  targetType: LinkTargetType;
  targetId: string;
  originalUrl: string;
  productType?: string;
  utmParams?: PartnerLink['utmParams'];
  expiresAt?: Date;
  metadata?: Record<string, any>;
}

export interface PartnerLinkFilter {
  partnerId?: string;
  targetType?: LinkTargetType;
  productType?: string;
  status?: PartnerLinkStatus;
  page?: number;
  limit?: number;
}

export class PartnerLinkService {
  constructor(
    private linkRepository: Repository<PartnerLink>,
    private partnerRepository: Repository<Partner>
  ) {}

  /**
   * 짧은 URL 해시 생성
   */
  private generateShortHash(): string {
    // 8자리 랜덤 해시 생성
    return crypto.randomBytes(4).toString('hex');
  }

  /**
   * 파트너 링크 생성
   */
  async create(data: CreatePartnerLinkDto): Promise<PartnerLink> {
    // 파트너 존재 확인
    const partner = await this.partnerRepository.findOne({
      where: { id: data.partnerId },
    });
    if (!partner) {
      throw new Error('Partner not found');
    }

    // 동일 타겟에 대한 기존 링크 확인
    const existingLink = await this.linkRepository.findOne({
      where: {
        partnerId: data.partnerId,
        targetType: data.targetType,
        targetId: data.targetId,
        status: PartnerLinkStatus.ACTIVE,
      },
    });

    if (existingLink) {
      return existingLink;
    }

    const shortUrl = this.generateShortHash();

    const link = this.linkRepository.create({
      ...data,
      shortUrl,
      status: PartnerLinkStatus.ACTIVE,
    });

    return this.linkRepository.save(link);
  }

  /**
   * 링크 조회 (ID)
   */
  async findById(id: string): Promise<PartnerLink | null> {
    return this.linkRepository.findOne({
      where: { id },
      relations: ['partner'],
    });
  }

  /**
   * 링크 조회 (shortUrl)
   */
  async findByShortUrl(shortUrl: string): Promise<PartnerLink | null> {
    return this.linkRepository.findOne({
      where: { shortUrl, status: PartnerLinkStatus.ACTIVE },
      relations: ['partner'],
    });
  }

  /**
   * 파트너별 링크 목록 조회
   */
  async findAll(filter: PartnerLinkFilter = {}): Promise<{
    items: PartnerLink[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { page = 1, limit = 20, ...where } = filter;

    const qb = this.linkRepository.createQueryBuilder('link');

    if (where.partnerId) {
      qb.andWhere('link.partnerId = :partnerId', {
        partnerId: where.partnerId,
      });
    }

    if (where.targetType) {
      qb.andWhere('link.targetType = :targetType', {
        targetType: where.targetType,
      });
    }

    if (where.productType) {
      qb.andWhere('link.productType = :productType', {
        productType: where.productType,
      });
    }

    if (where.status) {
      qb.andWhere('link.status = :status', { status: where.status });
    }

    qb.orderBy('link.createdAt', 'DESC');
    qb.skip((page - 1) * limit).take(limit);

    const [items, total] = await qb.getManyAndCount();

    return { items, total, page, limit };
  }

  /**
   * 클릭 카운트 증가
   */
  async incrementClickCount(id: string): Promise<PartnerLink | null> {
    const link = await this.findById(id);
    if (!link) return null;

    link.clickCount += 1;
    return this.linkRepository.save(link);
  }

  /**
   * 전환 카운트 증가
   */
  async incrementConversionCount(id: string): Promise<PartnerLink | null> {
    const link = await this.findById(id);
    if (!link) return null;

    link.conversionCount += 1;
    return this.linkRepository.save(link);
  }

  /**
   * 링크 비활성화
   */
  async deactivate(id: string): Promise<PartnerLink | null> {
    const link = await this.findById(id);
    if (!link) return null;

    link.status = PartnerLinkStatus.INACTIVE;
    return this.linkRepository.save(link);
  }

  /**
   * 링크 만료 처리
   */
  async expireLinks(): Promise<number> {
    const now = new Date();

    const result = await this.linkRepository
      .createQueryBuilder()
      .update(PartnerLink)
      .set({ status: PartnerLinkStatus.EXPIRED })
      .where('expiresAt <= :now', { now })
      .andWhere('status = :status', { status: PartnerLinkStatus.ACTIVE })
      .execute();

    return result.affected || 0;
  }

  /**
   * 링크 삭제
   */
  async delete(id: string): Promise<boolean> {
    const result = await this.linkRepository.delete(id);
    return (result.affected || 0) > 0;
  }

  /**
   * 파트너별 링크 통계
   */
  async getStatsByPartnerId(partnerId: string): Promise<{
    totalLinks: number;
    activeLinks: number;
    totalClicks: number;
    totalConversions: number;
    byTargetType: Record<LinkTargetType, number>;
  }> {
    const totalLinks = await this.linkRepository.count({
      where: { partnerId },
    });

    const activeLinks = await this.linkRepository.count({
      where: { partnerId, status: PartnerLinkStatus.ACTIVE },
    });

    // 클릭/전환 합계
    const sumResult = await this.linkRepository
      .createQueryBuilder('link')
      .select('SUM(link.clickCount)', 'totalClicks')
      .addSelect('SUM(link.conversionCount)', 'totalConversions')
      .where('link.partnerId = :partnerId', { partnerId })
      .getRawOne();

    // 타겟 타입별 통계
    const typeStats = await this.linkRepository
      .createQueryBuilder('link')
      .select('link.targetType', 'targetType')
      .addSelect('COUNT(*)', 'count')
      .where('link.partnerId = :partnerId', { partnerId })
      .groupBy('link.targetType')
      .getRawMany();

    const byTargetType = {
      [LinkTargetType.LISTING]: 0,
      [LinkTargetType.PRODUCT]: 0,
      [LinkTargetType.PAGE]: 0,
      [LinkTargetType.CAMPAIGN]: 0,
      [LinkTargetType.CATEGORY]: 0,
      [LinkTargetType.EXTERNAL]: 0,
    };

    typeStats.forEach((row) => {
      byTargetType[row.targetType as LinkTargetType] = parseInt(row.count, 10);
    });

    return {
      totalLinks,
      activeLinks,
      totalClicks: parseInt(sumResult?.totalClicks || '0', 10),
      totalConversions: parseInt(sumResult?.totalConversions || '0', 10),
      byTargetType,
    };
  }
}
