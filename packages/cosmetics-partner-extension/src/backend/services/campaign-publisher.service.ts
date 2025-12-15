/**
 * Partner Campaign Auto Publisher Service
 *
 * Phase 6-F: Influencer Tools Expansion
 * - 파트너 자동 캠페인 생성 및 발행
 * - 스케줄링 및 자동 포스팅
 * - 캠페인 성과 트래킹
 */

import { DataSource, Repository } from 'typeorm';
import { PartnerProfile } from '../entities/partner-profile.entity';
import { PartnerLink } from '../entities/partner-link.entity';

// Types for Campaign Publisher
export interface CampaignDto {
  partnerId: string;
  title: string;
  description?: string;
  type: 'product_launch' | 'seasonal' | 'flash_sale' | 'routine_share' | 'custom';
  status: 'draft' | 'scheduled' | 'active' | 'completed' | 'paused';
  products?: string[]; // Product IDs or Link IDs
  routineId?: string;
  schedule?: CampaignSchedule;
  platforms?: string[];
  content?: CampaignContent;
  goals?: CampaignGoals;
  metadata?: Record<string, unknown>;
}

export interface CampaignSchedule {
  startDate: Date;
  endDate?: Date;
  publishTimes?: string[]; // HH:MM format
  frequency?: 'once' | 'daily' | 'weekly' | 'custom';
  timezone?: string;
}

export interface CampaignContent {
  headline?: string;
  body?: string;
  images?: string[];
  hashtags?: string[];
  callToAction?: string;
  targetUrl?: string;
}

export interface CampaignGoals {
  targetClicks?: number;
  targetConversions?: number;
  targetRevenue?: number;
}

export interface Campaign extends CampaignDto {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  stats: CampaignStats;
}

export interface CampaignStats {
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
  engagement: number;
}

export interface CampaignTemplate {
  id: string;
  name: string;
  description: string;
  type: CampaignDto['type'];
  defaultContent: Partial<CampaignContent>;
  recommendedDuration: number; // days
}

// Campaign templates
const CAMPAIGN_TEMPLATES: CampaignTemplate[] = [
  {
    id: 'new-product',
    name: '신제품 런칭',
    description: '새로운 제품을 소개하는 캠페인',
    type: 'product_launch',
    defaultContent: {
      headline: '드디어 출시! 새로운 뷰티템',
      body: '오랫동안 기다려온 신제품을 소개합니다',
      callToAction: '지금 확인하기',
    },
    recommendedDuration: 14,
  },
  {
    id: 'spring-care',
    name: '봄맞이 스킨케어',
    description: '계절 변화에 맞춘 스킨케어 캠페인',
    type: 'seasonal',
    defaultContent: {
      headline: '봄맞이 피부 관리',
      body: '환절기 피부를 위한 특별 케어',
      hashtags: ['봄스킨케어', '환절기피부', '계절케어'],
      callToAction: '루틴 확인하기',
    },
    recommendedDuration: 30,
  },
  {
    id: 'flash-deal',
    name: '플래시 세일',
    description: '한정 시간 특가 캠페인',
    type: 'flash_sale',
    defaultContent: {
      headline: '🔥 24시간 한정 특가!',
      body: '놓치면 후회할 특별 혜택',
      callToAction: '지금 바로 구매',
    },
    recommendedDuration: 1,
  },
  {
    id: 'routine-share',
    name: '루틴 공유',
    description: '스킨케어 루틴을 공유하는 캠페인',
    type: 'routine_share',
    defaultContent: {
      headline: '내 스킨케어 루틴 공개!',
      body: '매일 실천하는 피부 관리 비법',
      hashtags: ['스킨케어루틴', '데일리케어', '피부관리'],
      callToAction: '루틴 따라하기',
    },
    recommendedDuration: 7,
  },
];

export class CampaignPublisherService {
  private campaigns: Map<string, Campaign> = new Map(); // In-memory storage for MVP

  constructor(private dataSource: DataSource) {}

  /**
   * Create a new campaign
   */
  async createCampaign(dto: CampaignDto): Promise<Campaign> {
    const id = this.generateId();
    const now = new Date();

    const campaign: Campaign = {
      ...dto,
      id,
      createdAt: now,
      updatedAt: now,
      stats: {
        impressions: 0,
        clicks: 0,
        conversions: 0,
        revenue: 0,
        engagement: 0,
      },
    };

    this.campaigns.set(id, campaign);

    return campaign;
  }

  /**
   * Get campaign by ID
   */
  async getCampaign(campaignId: string): Promise<Campaign | null> {
    return this.campaigns.get(campaignId) || null;
  }

  /**
   * Get campaigns by partner ID
   */
  async getCampaignsByPartner(partnerId: string): Promise<Campaign[]> {
    return Array.from(this.campaigns.values()).filter(
      (campaign) => campaign.partnerId === partnerId
    );
  }

  /**
   * Update campaign
   */
  async updateCampaign(
    campaignId: string,
    updates: Partial<CampaignDto>
  ): Promise<Campaign | null> {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign) {
      return null;
    }

    const updated: Campaign = {
      ...campaign,
      ...updates,
      updatedAt: new Date(),
    };

    this.campaigns.set(campaignId, updated);
    return updated;
  }

  /**
   * Delete campaign
   */
  async deleteCampaign(campaignId: string): Promise<boolean> {
    return this.campaigns.delete(campaignId);
  }

  /**
   * Publish campaign (change status to active)
   */
  async publishCampaign(campaignId: string): Promise<Campaign | null> {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign) {
      return null;
    }

    if (campaign.status !== 'draft' && campaign.status !== 'scheduled') {
      throw new Error('Campaign must be in draft or scheduled status to publish');
    }

    return this.updateCampaign(campaignId, { status: 'active' });
  }

  /**
   * Pause campaign
   */
  async pauseCampaign(campaignId: string): Promise<Campaign | null> {
    return this.updateCampaign(campaignId, { status: 'paused' });
  }

  /**
   * Complete campaign
   */
  async completeCampaign(campaignId: string): Promise<Campaign | null> {
    return this.updateCampaign(campaignId, { status: 'completed' });
  }

  /**
   * Update campaign stats
   */
  async updateStats(
    campaignId: string,
    stats: Partial<CampaignStats>
  ): Promise<Campaign | null> {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign) {
      return null;
    }

    const updatedStats: CampaignStats = {
      ...campaign.stats,
      ...stats,
    };

    campaign.stats = updatedStats;
    campaign.updatedAt = new Date();
    this.campaigns.set(campaignId, campaign);

    return campaign;
  }

  /**
   * Get campaign templates
   */
  async getTemplates(): Promise<CampaignTemplate[]> {
    return CAMPAIGN_TEMPLATES;
  }

  /**
   * Get template by ID
   */
  async getTemplateById(templateId: string): Promise<CampaignTemplate | null> {
    return CAMPAIGN_TEMPLATES.find((t) => t.id === templateId) || null;
  }

  /**
   * Create campaign from template
   */
  async createFromTemplate(
    partnerId: string,
    templateId: string,
    overrides?: Partial<CampaignDto>
  ): Promise<Campaign> {
    const template = await this.getTemplateById(templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + template.recommendedDuration);

    const dto: CampaignDto = {
      partnerId,
      title: template.name,
      description: template.description,
      type: template.type,
      status: 'draft',
      content: template.defaultContent,
      schedule: {
        startDate,
        endDate,
      },
      ...overrides,
    };

    return this.createCampaign(dto);
  }

  /**
   * Generate auto content for campaign
   */
  async generateContent(
    campaignId: string,
    options?: { tone?: string; platform?: string }
  ): Promise<CampaignContent> {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign) {
      throw new Error('Campaign not found');
    }

    const tone = options?.tone || 'casual';
    const platform = options?.platform || 'instagram';

    // Get linked products/routines info
    const productInfo = await this.getProductInfo(campaign.products || []);

    // Generate content based on campaign type
    const content = this.generateContentByType(campaign.type, productInfo, tone, platform);

    return content;
  }

  /**
   * Get product info for content generation
   */
  private async getProductInfo(
    productIds: string[]
  ): Promise<Array<{ title: string; description?: string }>> {
    if (productIds.length === 0) {
      return [];
    }

    const linkRepo = this.dataSource.getRepository(PartnerLink);
    const links = await linkRepo.findByIds(productIds);

    return links
      .filter((link) => link.title)
      .map((link) => ({
        title: link.title!,
        description: link.description || undefined,
      }));
  }

  /**
   * Generate content by campaign type
   */
  private generateContentByType(
    type: CampaignDto['type'],
    products: Array<{ title: string; description?: string }>,
    tone: string,
    platform: string
  ): CampaignContent {
    const productNames = products.map((p) => p.title).join(', ');

    const contentMap: Record<string, CampaignContent> = {
      product_launch: {
        headline: '✨ 신제품 런칭!',
        body: `드디어 공개합니다! ${productNames}\n\n기대하셨던 분들, 지금 바로 확인해보세요!`,
        hashtags: ['신제품', '뷰티신상', '화장품추천', '스킨케어'],
        callToAction: '지금 확인하기',
      },
      seasonal: {
        headline: '🌸 계절 맞춤 케어',
        body: `환절기 피부 관리, 이렇게 하세요!\n\n${productNames}로 완벽한 케어를 경험하세요.`,
        hashtags: ['환절기피부', '계절케어', '스킨케어루틴'],
        callToAction: '루틴 확인하기',
      },
      flash_sale: {
        headline: '🔥 긴급 특가!',
        body: `한정 시간 특별 할인!\n\n${productNames}\n\n놓치면 후회할 기회, 지금 바로!`,
        hashtags: ['특가', '할인', '뷰티세일', '한정수량'],
        callToAction: '지금 바로 구매',
      },
      routine_share: {
        headline: '💫 내 피부 루틴 공개',
        body: `매일 실천하는 스킨케어 루틴을 공유합니다!\n\n${productNames}\n\n함께 예뻐져요!`,
        hashtags: ['스킨케어루틴', '데일리케어', '피부관리비법'],
        callToAction: '루틴 따라하기',
      },
      custom: {
        headline: '특별한 소식',
        body: `${productNames}\n\n자세한 내용은 링크에서 확인하세요!`,
        hashtags: ['뷰티', '화장품', '스킨케어'],
        callToAction: '자세히 보기',
      },
    };

    return contentMap[type] || contentMap.custom;
  }

  /**
   * Schedule campaign posts
   */
  async schedulePost(
    campaignId: string,
    platform: string,
    scheduledTime: Date
  ): Promise<{ scheduledId: string; scheduledTime: Date }> {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign) {
      throw new Error('Campaign not found');
    }

    // In production, this would integrate with a job scheduler
    const scheduledId = this.generateId();

    return {
      scheduledId,
      scheduledTime,
    };
  }

  /**
   * Get campaign analytics
   */
  async getAnalytics(campaignId: string): Promise<{
    campaign: Campaign;
    dailyStats: Array<{ date: string; clicks: number; conversions: number }>;
    platformBreakdown: Array<{ platform: string; clicks: number }>;
  }> {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign) {
      throw new Error('Campaign not found');
    }

    // Generate mock analytics for MVP
    const dailyStats = this.generateMockDailyStats(7);
    const platformBreakdown = [
      { platform: 'instagram', clicks: Math.floor(campaign.stats.clicks * 0.5) },
      { platform: 'facebook', clicks: Math.floor(campaign.stats.clicks * 0.3) },
      { platform: 'twitter', clicks: Math.floor(campaign.stats.clicks * 0.2) },
    ];

    return {
      campaign,
      dailyStats,
      platformBreakdown,
    };
  }

  /**
   * Generate mock daily stats
   */
  private generateMockDailyStats(
    days: number
  ): Array<{ date: string; clicks: number; conversions: number }> {
    const stats: Array<{ date: string; clicks: number; conversions: number }> = [];
    const today = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);

      stats.push({
        date: date.toISOString().split('T')[0],
        clicks: Math.floor(Math.random() * 100),
        conversions: Math.floor(Math.random() * 10),
      });
    }

    return stats;
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `campaign_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
