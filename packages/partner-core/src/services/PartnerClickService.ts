/**
 * PartnerClickService
 *
 * 클릭 기록, 세션 관리, productType 필터링
 *
 * @package @o4o/partner-core
 */

import { Repository } from 'typeorm';
import { PartnerClick } from '../entities/PartnerClick.entity.js';
import { PartnerLink, PartnerLinkStatus } from '../entities/PartnerLink.entity.js';
import { Partner, PartnerStatus } from '../entities/Partner.entity.js';
import crypto from 'crypto';

export interface RecordClickDto {
  linkId: string;
  sessionId?: string;
  userAgent?: string;
  referrer?: string;
  ipAddress?: string;
  deviceType?: string;
  browser?: string;
  os?: string;
  country?: string;
  metadata?: Record<string, any>;
}

export interface ClickFilter {
  partnerId?: string;
  linkId?: string;
  targetId?: string;
  productType?: string;
  converted?: boolean;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

export interface ClickValidationResult {
  valid: boolean;
  reason?: string;
  click?: PartnerClick;
}

export class PartnerClickService {
  constructor(
    private clickRepository: Repository<PartnerClick>,
    private linkRepository: Repository<PartnerLink>,
    private partnerRepository: Repository<Partner>
  ) {}

  /**
   * 세션 ID 생성
   */
  private generateSessionId(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * 클릭 기록 (Extension Hook 적용 지점)
   */
  async recordClick(data: RecordClickDto): Promise<ClickValidationResult> {
    // 링크 조회
    const link = await this.linkRepository.findOne({
      where: { id: data.linkId },
      relations: ['partner'],
    });

    if (!link) {
      return { valid: false, reason: 'Link not found' };
    }

    if (link.status !== PartnerLinkStatus.ACTIVE) {
      return { valid: false, reason: 'Link is not active' };
    }

    // 파트너 상태 확인
    const partner = await this.partnerRepository.findOne({
      where: { id: link.partnerId },
    });

    if (!partner || partner.status !== PartnerStatus.ACTIVE) {
      return { valid: false, reason: 'Partner is not active' };
    }

    // 세션 ID 처리
    const sessionId = data.sessionId || this.generateSessionId();

    // 동일 세션 중복 클릭 방지 (5분 내)
    const recentClick = await this.clickRepository
      .createQueryBuilder('click')
      .where('click.sessionId = :sessionId', { sessionId: data.sessionId })
      .andWhere('click.linkId = :linkId', { linkId: data.linkId })
      .andWhere('click.createdAt > :time', {
        time: new Date(Date.now() - 5 * 60 * 1000),
      })
      .getOne();

    if (recentClick && data.sessionId) {
      return { valid: true, click: recentClick, reason: 'Duplicate click (within 5 minutes)' };
    }

    // 클릭 기록 생성
    const click = this.clickRepository.create({
      partnerId: link.partnerId,
      linkId: link.id,
      targetId: link.targetId,
      productType: link.productType,
      sessionId,
      userAgent: data.userAgent,
      referrer: data.referrer,
      ipAddress: data.ipAddress,
      deviceType: data.deviceType,
      browser: data.browser,
      os: data.os,
      country: data.country,
      converted: false,
      metadata: data.metadata,
    });

    const savedClick = await this.clickRepository.save(click);

    // 링크 클릭 카운트 증가
    link.clickCount += 1;
    await this.linkRepository.save(link);

    // 파트너 클릭 카운트 증가
    partner.clickCount += 1;
    await this.partnerRepository.save(partner);

    return { valid: true, click: savedClick };
  }

  /**
   * 클릭 조회 (ID)
   */
  async findById(id: string): Promise<PartnerClick | null> {
    return this.clickRepository.findOne({
      where: { id },
      relations: ['partner', 'link'],
    });
  }

  /**
   * 세션 ID로 클릭 조회
   */
  async findBySessionId(sessionId: string): Promise<PartnerClick | null> {
    return this.clickRepository.findOne({
      where: { sessionId },
      order: { createdAt: 'DESC' },
      relations: ['partner', 'link'],
    });
  }

  /**
   * 클릭 목록 조회
   */
  async findAll(filter: ClickFilter = {}): Promise<{
    items: PartnerClick[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { page = 1, limit = 50, startDate, endDate, ...where } = filter;

    const qb = this.clickRepository.createQueryBuilder('click');

    if (where.partnerId) {
      qb.andWhere('click.partnerId = :partnerId', {
        partnerId: where.partnerId,
      });
    }

    if (where.linkId) {
      qb.andWhere('click.linkId = :linkId', { linkId: where.linkId });
    }

    if (where.targetId) {
      qb.andWhere('click.targetId = :targetId', { targetId: where.targetId });
    }

    if (where.productType) {
      qb.andWhere('click.productType = :productType', {
        productType: where.productType,
      });
    }

    if (where.converted !== undefined) {
      qb.andWhere('click.converted = :converted', {
        converted: where.converted,
      });
    }

    if (startDate) {
      qb.andWhere('click.createdAt >= :startDate', { startDate });
    }

    if (endDate) {
      qb.andWhere('click.createdAt <= :endDate', { endDate });
    }

    qb.orderBy('click.createdAt', 'DESC');
    qb.skip((page - 1) * limit).take(limit);

    const [items, total] = await qb.getManyAndCount();

    return { items, total, page, limit };
  }

  /**
   * 클릭을 전환됨으로 표시
   */
  async markAsConverted(
    id: string,
    conversionId: string
  ): Promise<PartnerClick | null> {
    const click = await this.findById(id);
    if (!click) return null;

    click.converted = true;
    click.conversionId = conversionId;
    return this.clickRepository.save(click);
  }

  /**
   * 파트너별 클릭 통계
   */
  async getStatsByPartnerId(
    partnerId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalClicks: number;
    convertedClicks: number;
    conversionRate: number;
    byProductType: Record<string, number>;
    byDeviceType: Record<string, number>;
  }> {
    const qb = this.clickRepository.createQueryBuilder('click');
    qb.where('click.partnerId = :partnerId', { partnerId });

    if (startDate) {
      qb.andWhere('click.createdAt >= :startDate', { startDate });
    }

    if (endDate) {
      qb.andWhere('click.createdAt <= :endDate', { endDate });
    }

    const totalClicks = await qb.getCount();

    const convertedClicks = await qb
      .clone()
      .andWhere('click.converted = true')
      .getCount();

    const conversionRate =
      totalClicks > 0 ? (convertedClicks / totalClicks) * 100 : 0;

    // 제품 타입별 통계
    const productTypeStats = await this.clickRepository
      .createQueryBuilder('click')
      .select('click.productType', 'productType')
      .addSelect('COUNT(*)', 'count')
      .where('click.partnerId = :partnerId', { partnerId })
      .andWhere('click.productType IS NOT NULL')
      .groupBy('click.productType')
      .getRawMany();

    const byProductType: Record<string, number> = {};
    productTypeStats.forEach((row) => {
      byProductType[row.productType] = parseInt(row.count, 10);
    });

    // 기기 타입별 통계
    const deviceTypeStats = await this.clickRepository
      .createQueryBuilder('click')
      .select('click.deviceType', 'deviceType')
      .addSelect('COUNT(*)', 'count')
      .where('click.partnerId = :partnerId', { partnerId })
      .andWhere('click.deviceType IS NOT NULL')
      .groupBy('click.deviceType')
      .getRawMany();

    const byDeviceType: Record<string, number> = {};
    deviceTypeStats.forEach((row) => {
      byDeviceType[row.deviceType] = parseInt(row.count, 10);
    });

    return {
      totalClicks,
      convertedClicks,
      conversionRate: Math.round(conversionRate * 100) / 100,
      byProductType,
      byDeviceType,
    };
  }

  /**
   * 일별 클릭 통계
   */
  async getDailyStats(
    partnerId: string,
    days: number = 30
  ): Promise<Array<{ date: string; clicks: number; conversions: number }>> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const result = await this.clickRepository
      .createQueryBuilder('click')
      .select("TO_CHAR(click.createdAt, 'YYYY-MM-DD')", 'date')
      .addSelect('COUNT(*)', 'clicks')
      .addSelect('SUM(CASE WHEN click.converted = true THEN 1 ELSE 0 END)', 'conversions')
      .where('click.partnerId = :partnerId', { partnerId })
      .andWhere('click.createdAt >= :startDate', { startDate })
      .groupBy("TO_CHAR(click.createdAt, 'YYYY-MM-DD')")
      .orderBy('date', 'ASC')
      .getRawMany();

    return result.map((row) => ({
      date: row.date,
      clicks: parseInt(row.clicks, 10),
      conversions: parseInt(row.conversions || '0', 10),
    }));
  }
}
