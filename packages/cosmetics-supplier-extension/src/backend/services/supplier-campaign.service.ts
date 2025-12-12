/**
 * Supplier Campaign Service
 *
 * 공급사 캠페인 관리
 */

import { Repository, DataSource } from 'typeorm';
import {
  SupplierCampaign,
  CampaignType,
  CampaignStatus,
  CampaignTargetType,
} from '../entities/supplier-campaign.entity';

export interface CreateCampaignDto {
  supplierId: string;
  campaignName: string;
  description?: string;
  type?: CampaignType;
  targetType?: CampaignTargetType;
  targetSellerIds?: string[];
  targetPartnerIds?: string[];
  productIds?: string[];
  categoryIds?: string[];
  discountType?: 'percentage' | 'fixed';
  discountValue?: number;
  commissionBonus?: number;
  budget?: number;
  startDate: Date;
  endDate?: Date;
  bannerImageUrl?: string;
  thumbnailUrl?: string;
  content?: {
    headline?: string;
    body?: string;
    hashtags?: string[];
    callToAction?: string;
  };
  termsAndConditions?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateCampaignDto {
  campaignName?: string;
  description?: string;
  targetType?: CampaignTargetType;
  targetSellerIds?: string[];
  targetPartnerIds?: string[];
  productIds?: string[];
  categoryIds?: string[];
  discountType?: 'percentage' | 'fixed';
  discountValue?: number;
  commissionBonus?: number;
  budget?: number;
  startDate?: Date;
  endDate?: Date;
  bannerImageUrl?: string;
  thumbnailUrl?: string;
  content?: {
    headline?: string;
    body?: string;
    hashtags?: string[];
    callToAction?: string;
  };
  termsAndConditions?: string;
  metadata?: Record<string, unknown>;
}

export interface CampaignFilter {
  supplierId: string;
  status?: CampaignStatus;
  type?: CampaignType;
  activeOnly?: boolean;
}

export interface CampaignAnalytics {
  campaign: SupplierCampaign;
  dailyStats: Array<{
    date: string;
    views: number;
    clicks: number;
    conversions: number;
    revenue: number;
  }>;
  topPartners: Array<{
    partnerId: string;
    clicks: number;
    conversions: number;
    revenue: number;
  }>;
  roi: number;
}

export class SupplierCampaignService {
  private repository: Repository<SupplierCampaign>;

  constructor(private dataSource: DataSource) {
    this.repository = dataSource.getRepository(SupplierCampaign);
  }

  /**
   * Create campaign
   */
  async create(dto: CreateCampaignDto): Promise<SupplierCampaign> {
    const campaign = this.repository.create({
      ...dto,
      type: dto.type || 'product_launch',
      targetType: dto.targetType || 'all',
      status: 'draft',
    });

    return this.repository.save(campaign);
  }

  /**
   * Get campaign by ID
   */
  async findById(id: string): Promise<SupplierCampaign | null> {
    return this.repository.findOne({ where: { id } });
  }

  /**
   * List campaigns with filter
   */
  async findAll(filter: CampaignFilter): Promise<SupplierCampaign[]> {
    const qb = this.repository.createQueryBuilder('campaign');

    qb.where('campaign.supplierId = :supplierId', { supplierId: filter.supplierId });

    if (filter.status) {
      qb.andWhere('campaign.status = :status', { status: filter.status });
    }

    if (filter.type) {
      qb.andWhere('campaign.type = :type', { type: filter.type });
    }

    if (filter.activeOnly) {
      const now = new Date();
      qb.andWhere('campaign.status = :activeStatus', { activeStatus: 'active' });
      qb.andWhere('campaign.startDate <= :now', { now });
      qb.andWhere('(campaign.endDate IS NULL OR campaign.endDate >= :now)', { now });
    }

    qb.orderBy('campaign.createdAt', 'DESC');

    return qb.getMany();
  }

  /**
   * Update campaign
   */
  async update(id: string, dto: UpdateCampaignDto): Promise<SupplierCampaign | null> {
    const campaign = await this.findById(id);
    if (!campaign) {
      return null;
    }

    // Can only update draft or scheduled campaigns
    if (campaign.status !== 'draft' && campaign.status !== 'scheduled') {
      throw new Error('Cannot update active or completed campaigns');
    }

    Object.assign(campaign, dto);
    return this.repository.save(campaign);
  }

  /**
   * Schedule campaign
   */
  async schedule(id: string): Promise<SupplierCampaign | null> {
    const campaign = await this.findById(id);
    if (!campaign || campaign.status !== 'draft') {
      return null;
    }

    campaign.status = 'scheduled';
    return this.repository.save(campaign);
  }

  /**
   * Publish campaign
   */
  async publish(id: string): Promise<SupplierCampaign | null> {
    const campaign = await this.findById(id);
    if (!campaign) {
      return null;
    }

    if (campaign.status !== 'draft' && campaign.status !== 'scheduled') {
      throw new Error('Campaign must be in draft or scheduled status to publish');
    }

    campaign.status = 'active';
    campaign.publishedAt = new Date();

    return this.repository.save(campaign);
  }

  /**
   * Pause campaign
   */
  async pause(id: string): Promise<SupplierCampaign | null> {
    const campaign = await this.findById(id);
    if (!campaign || campaign.status !== 'active') {
      return null;
    }

    campaign.status = 'paused';
    return this.repository.save(campaign);
  }

  /**
   * Resume campaign
   */
  async resume(id: string): Promise<SupplierCampaign | null> {
    const campaign = await this.findById(id);
    if (!campaign || campaign.status !== 'paused') {
      return null;
    }

    campaign.status = 'active';
    return this.repository.save(campaign);
  }

  /**
   * Complete campaign
   */
  async complete(id: string): Promise<SupplierCampaign | null> {
    const campaign = await this.findById(id);
    if (!campaign) {
      return null;
    }

    campaign.status = 'completed';
    return this.repository.save(campaign);
  }

  /**
   * Cancel campaign
   */
  async cancel(id: string): Promise<SupplierCampaign | null> {
    const campaign = await this.findById(id);
    if (!campaign) {
      return null;
    }

    campaign.status = 'cancelled';
    return this.repository.save(campaign);
  }

  /**
   * Update campaign stats
   */
  async updateStats(
    id: string,
    stats: {
      views?: number;
      clicks?: number;
      conversions?: number;
      revenue?: number;
      spentAmount?: number;
      participantCount?: number;
    }
  ): Promise<SupplierCampaign | null> {
    const campaign = await this.findById(id);
    if (!campaign) {
      return null;
    }

    if (stats.views) campaign.totalViews += stats.views;
    if (stats.clicks) campaign.totalClicks += stats.clicks;
    if (stats.conversions) campaign.totalConversions += stats.conversions;
    if (stats.revenue) campaign.totalRevenue += stats.revenue;
    if (stats.spentAmount) campaign.spentAmount += stats.spentAmount;
    if (stats.participantCount) campaign.participantCount += stats.participantCount;

    return this.repository.save(campaign);
  }

  /**
   * Record view
   */
  async recordView(id: string): Promise<void> {
    await this.repository.increment({ id }, 'totalViews', 1);
  }

  /**
   * Record click
   */
  async recordClick(id: string): Promise<void> {
    await this.repository.increment({ id }, 'totalClicks', 1);
  }

  /**
   * Record conversion
   */
  async recordConversion(id: string, revenue: number): Promise<void> {
    const campaign = await this.findById(id);
    if (campaign) {
      campaign.totalConversions += 1;
      campaign.totalRevenue += revenue;
      await this.repository.save(campaign);
    }
  }

  /**
   * Get campaign analytics (mock for MVP)
   */
  async getAnalytics(id: string): Promise<CampaignAnalytics | null> {
    const campaign = await this.findById(id);
    if (!campaign) {
      return null;
    }

    // Generate mock daily stats for last 7 days
    const dailyStats: CampaignAnalytics['dailyStats'] = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);

      dailyStats.push({
        date: date.toISOString().split('T')[0],
        views: Math.floor(Math.random() * 100) + 10,
        clicks: Math.floor(Math.random() * 50) + 5,
        conversions: Math.floor(Math.random() * 10),
        revenue: Math.floor(Math.random() * 500000),
      });
    }

    // Mock top partners
    const topPartners: CampaignAnalytics['topPartners'] = [
      { partnerId: 'partner-1', clicks: 120, conversions: 15, revenue: 450000 },
      { partnerId: 'partner-2', clicks: 98, conversions: 12, revenue: 380000 },
      { partnerId: 'partner-3', clicks: 76, conversions: 8, revenue: 240000 },
    ];

    // Calculate ROI
    const roi =
      campaign.spentAmount > 0
        ? ((Number(campaign.totalRevenue) - Number(campaign.spentAmount)) /
            Number(campaign.spentAmount)) *
          100
        : 0;

    return {
      campaign,
      dailyStats,
      topPartners,
      roi,
    };
  }

  /**
   * Get active campaigns for partner
   */
  async getActiveCampaignsForPartner(
    supplierId: string,
    partnerId: string
  ): Promise<SupplierCampaign[]> {
    const now = new Date();

    const qb = this.repository.createQueryBuilder('campaign');

    qb.where('campaign.supplierId = :supplierId', { supplierId });
    qb.andWhere('campaign.status = :status', { status: 'active' });
    qb.andWhere('campaign.startDate <= :now', { now });
    qb.andWhere('(campaign.endDate IS NULL OR campaign.endDate >= :now)', { now });

    // Filter by target
    qb.andWhere(
      `(campaign.targetType = 'all' OR campaign.targetType = 'partners' OR campaign.targetPartnerIds @> :partnerId::jsonb)`,
      { partnerId: JSON.stringify([partnerId]) }
    );

    return qb.getMany();
  }

  /**
   * Get campaign stats summary
   */
  async getStatsSummary(supplierId: string): Promise<{
    total: number;
    active: number;
    draft: number;
    completed: number;
    totalBudget: number;
    totalSpent: number;
    totalRevenue: number;
  }> {
    const campaigns = await this.repository.find({
      where: { supplierId },
    });

    return {
      total: campaigns.length,
      active: campaigns.filter((c) => c.status === 'active').length,
      draft: campaigns.filter((c) => c.status === 'draft').length,
      completed: campaigns.filter((c) => c.status === 'completed').length,
      totalBudget: campaigns.reduce((sum, c) => sum + Number(c.budget || 0), 0),
      totalSpent: campaigns.reduce((sum, c) => sum + Number(c.spentAmount), 0),
      totalRevenue: campaigns.reduce((sum, c) => sum + Number(c.totalRevenue), 0),
    };
  }

  /**
   * Delete campaign
   */
  async delete(id: string): Promise<boolean> {
    const result = await this.repository.delete(id);
    return (result.affected ?? 0) > 0;
  }
}
