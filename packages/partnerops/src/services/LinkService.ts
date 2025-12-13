/**
 * Link Service
 *
 * 파트너 제휴 링크 관리 서비스 (Partner-Core 기반)
 *
 * @package @o4o/partnerops
 */

import type { Repository } from 'typeorm';
import {
  Partner,
  PartnerLink,
  PartnerLinkService,
  LinkTargetType,
  executeValidatePartnerVisibility,
} from '@o4o/partner-core';
import type { PartnerLinkStatsDto } from '../dto/index.js';

export interface CreateLinkDto {
  targetType: LinkTargetType;
  targetId: string;
  originalUrl: string;
  productType?: string;
  routineId?: string;
}

export interface LinkStats {
  totalClicks: number;
  uniqueClicks: number;
  conversions: number;
  conversionRate: number;
  clicksByDate: Array<{ date: string; count: number }>;
}

export class LinkService {
  private partnerLinkService: PartnerLinkService;

  constructor(
    private readonly linkRepository: Repository<PartnerLink>,
    private readonly partnerRepository: Repository<Partner>
  ) {
    this.partnerLinkService = new PartnerLinkService(
      linkRepository,
      partnerRepository
    );
  }

  /**
   * 링크 목록 조회 (Partner-Core 기반)
   */
  async list(
    partnerId: string,
    filters?: { productType?: string; targetType?: LinkTargetType }
  ): Promise<PartnerLink[]> {
    const result = await this.partnerLinkService.findAll({
      partnerId,
      productType: filters?.productType,
      targetType: filters?.targetType,
    });

    // pharmaceutical 필터링
    const filteredItems: PartnerLink[] = [];
    for (const item of result.items) {
      const visibility = await executeValidatePartnerVisibility({
        partnerId,
        productType: item.productType,
      });
      if (visibility.visible) {
        filteredItems.push(item);
      }
    }

    return filteredItems;
  }

  /**
   * 링크 생성 (Partner-Core 기반)
   */
  async create(partnerId: string, dto: CreateLinkDto): Promise<PartnerLink> {
    // pharmaceutical 제품 체크
    const visibility = await executeValidatePartnerVisibility({
      partnerId,
      productType: dto.productType,
    });

    if (!visibility.visible) {
      throw new Error(visibility.reason || 'Product type not allowed for partner links');
    }

    return this.partnerLinkService.create({
      partnerId,
      targetType: dto.targetType,
      targetId: dto.targetId,
      originalUrl: dto.originalUrl,
      productType: dto.productType,
    });
  }

  /**
   * 링크 통계 조회 (Partner-Core 기반)
   */
  async getStats(partnerId: string, linkId: string): Promise<PartnerLinkStatsDto | null> {
    const link = await this.partnerLinkService.findById(linkId);
    if (!link || link.partnerId !== partnerId) return null;

    const stats = await this.partnerLinkService.getStatsByPartnerId(partnerId);

    return {
      linkId: link.id,
      shortUrl: link.shortUrl,
      originalUrl: link.originalUrl,
      targetType: link.targetType,
      targetId: link.targetId,
      productType: link.productType,
      totalClicks: link.clickCount,
      uniqueClicks: link.clickCount, // Partner-Core doesn't track unique separately
      conversions: link.conversionCount,
      conversionRate:
        link.clickCount > 0
          ? (link.conversionCount / link.clickCount) * 100
          : 0,
      totalCommission: 0, // Would need commission service integration
      clicksByDate: [], // Would need daily breakdown query
    };
  }

  /**
   * 링크 삭제 (Partner-Core 기반)
   */
  async delete(partnerId: string, id: string): Promise<boolean> {
    const link = await this.partnerLinkService.findById(id);
    if (!link || link.partnerId !== partnerId) return false;
    return this.partnerLinkService.delete(id);
  }

  /**
   * 단축 코드로 링크 조회 (Partner-Core 기반)
   */
  async findByShortUrl(shortUrl: string): Promise<PartnerLink | null> {
    return this.partnerLinkService.findByShortUrl(shortUrl);
  }

  /**
   * 파트너별 링크 통계 요약
   */
  async getPartnerLinkStats(partnerId: string): Promise<{
    totalLinks: number;
    activeLinks: number;
    totalClicks: number;
    totalConversions: number;
  }> {
    return this.partnerLinkService.getStatsByPartnerId(partnerId);
  }
}

// Factory function
export function createLinkService(
  linkRepository: Repository<PartnerLink>,
  partnerRepository: Repository<Partner>
): LinkService {
  return new LinkService(linkRepository, partnerRepository);
}
