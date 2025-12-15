/**
 * PartnerLinkService
 *
 * 파트너 추천 링크 관리 서비스
 */

import type { Repository } from 'typeorm';
import { PartnerLink, LinkType } from '../entities/partner-link.entity.js';

export interface CreatePartnerLinkDto {
  partnerId: string;
  urlSlug: string;
  linkType: LinkType;
  targetId: string;
  commissionRate?: number;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdatePartnerLinkDto {
  commissionRate?: number;
  description?: string;
  isActive?: boolean;
  metadata?: Record<string, unknown>;
}

export interface LinkFilter {
  partnerId?: string;
  linkType?: LinkType;
  isActive?: boolean;
}

export class PartnerLinkService {
  constructor(private readonly linkRepository: Repository<PartnerLink>) {}

  async createLink(dto: CreatePartnerLinkDto): Promise<PartnerLink> {
    // Check if slug is unique
    const existing = await this.linkRepository.findOne({
      where: { urlSlug: dto.urlSlug },
    });

    if (existing) {
      throw new Error('URL slug already in use');
    }

    const link = this.linkRepository.create({
      ...dto,
      totalClicks: 0,
      conversions: 0,
      totalEarnings: 0,
      commissionRate: dto.commissionRate ?? 10,
      isActive: true,
    });

    return this.linkRepository.save(link);
  }

  async findById(id: string): Promise<PartnerLink | null> {
    return this.linkRepository.findOne({ where: { id } });
  }

  async findBySlug(urlSlug: string): Promise<PartnerLink | null> {
    return this.linkRepository.findOne({ where: { urlSlug, isActive: true } });
  }

  async findByPartnerId(partnerId: string): Promise<PartnerLink[]> {
    return this.linkRepository.find({
      where: { partnerId, isActive: true },
      order: { totalClicks: 'DESC' },
    });
  }

  async findByFilter(filter: LinkFilter): Promise<PartnerLink[]> {
    const query = this.linkRepository.createQueryBuilder('link');

    if (filter.partnerId) {
      query.andWhere('link.partnerId = :partnerId', { partnerId: filter.partnerId });
    }
    if (filter.linkType) {
      query.andWhere('link.linkType = :linkType', { linkType: filter.linkType });
    }
    if (filter.isActive !== undefined) {
      query.andWhere('link.isActive = :isActive', { isActive: filter.isActive });
    }

    return query.orderBy('link.totalClicks', 'DESC').getMany();
  }

  async updateLink(id: string, dto: UpdatePartnerLinkDto): Promise<PartnerLink> {
    const link = await this.findById(id);
    if (!link) {
      throw new Error('Partner link not found');
    }

    Object.assign(link, dto);
    return this.linkRepository.save(link);
  }

  async incrementClicks(id: string): Promise<PartnerLink> {
    const link = await this.findById(id);
    if (!link) {
      throw new Error('Partner link not found');
    }

    link.totalClicks += 1;
    return this.linkRepository.save(link);
  }

  async incrementConversions(id: string, earnings: number): Promise<PartnerLink> {
    const link = await this.findById(id);
    if (!link) {
      throw new Error('Partner link not found');
    }

    link.conversions += 1;
    link.totalEarnings = Number(link.totalEarnings) + earnings;
    return this.linkRepository.save(link);
  }

  async getLinkStats(partnerId: string): Promise<{
    totalLinks: number;
    totalClicks: number;
    totalConversions: number;
    totalEarnings: number;
    conversionRate: number;
    byLinkType: Record<LinkType, { count: number; clicks: number; conversions: number }>;
  }> {
    const links = await this.findByPartnerId(partnerId);

    let totalClicks = 0;
    let totalConversions = 0;
    let totalEarnings = 0;

    const byLinkType: Record<LinkType, { count: number; clicks: number; conversions: number }> = {
      product: { count: 0, clicks: 0, conversions: 0 },
      routine: { count: 0, clicks: 0, conversions: 0 },
      collection: { count: 0, clicks: 0, conversions: 0 },
      campaign: { count: 0, clicks: 0, conversions: 0 },
    };

    for (const link of links) {
      totalClicks += link.totalClicks;
      totalConversions += link.conversions;
      totalEarnings += Number(link.totalEarnings);

      byLinkType[link.linkType].count++;
      byLinkType[link.linkType].clicks += link.totalClicks;
      byLinkType[link.linkType].conversions += link.conversions;
    }

    const conversionRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;

    return {
      totalLinks: links.length,
      totalClicks,
      totalConversions,
      totalEarnings,
      conversionRate,
      byLinkType,
    };
  }

  async getTopPerformingLinks(partnerId: string, limit: number = 10): Promise<PartnerLink[]> {
    return this.linkRepository.find({
      where: { partnerId, isActive: true },
      order: { totalEarnings: 'DESC' },
      take: limit,
    });
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.linkRepository.delete(id);
    return (result.affected ?? 0) > 0;
  }

  async softDelete(id: string): Promise<PartnerLink | null> {
    const link = await this.findById(id);
    if (!link) return null;

    link.isActive = false;
    return this.linkRepository.save(link);
  }
}
