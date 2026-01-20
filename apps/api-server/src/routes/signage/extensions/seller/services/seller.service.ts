/**
 * Seller Extension - Service
 *
 * WO-SIGNAGE-PHASE3-DEV-SELLER
 *
 * Business logic layer for Seller Extension
 * Implements Global Content + Clone model (NO Force)
 */

import type { DataSource } from 'typeorm';
import { SellerRepository } from '../repositories/seller.repository.js';
import type {
  CreatePartnerDto,
  UpdatePartnerDto,
  PartnerQueryDto,
  PartnerResponseDto,
  CreateCampaignDto,
  UpdateCampaignDto,
  ApproveCampaignDto,
  CampaignQueryDto,
  CampaignResponseDto,
  CreateContentDto,
  UpdateContentDto,
  ApproveContentDto,
  ContentQueryDto,
  ContentResponseDto,
  CloneContentDto,
  CloneContentResponseDto,
  GlobalContentItemDto,
  GlobalContentResponseDto,
  RecordMetricDto,
  MetricsQueryDto,
  MetricsSummaryDto,
  ContentStatsDto,
} from '../dto/index.js';
import type {
  SellerPartner,
  SellerCampaign,
  SellerContent,
  SellerMetricEvent,
} from '../entities/index.js';

/**
 * Seller scope for multi-tenant operations
 */
interface SellerScope {
  organizationId: string;
}

/**
 * Paginated response
 */
interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * Seller Service
 */
export class SellerService {
  private repository: SellerRepository;

  constructor(dataSource: DataSource) {
    this.repository = new SellerRepository(dataSource);
  }

  // ========== PARTNER METHODS ==========

  async getPartners(
    query: PartnerQueryDto,
    scope: SellerScope,
  ): Promise<PaginatedResponse<PartnerResponseDto>> {
    const { data, total } = await this.repository.findPartners(query, scope);
    const page = query.page || 1;
    const limit = query.limit || 20;
    const totalPages = Math.ceil(total / limit);

    return {
      data: data.map(p => this.toPartnerResponse(p)),
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  async getPartner(id: string, scope: SellerScope): Promise<PartnerResponseDto | null> {
    const partner = await this.repository.findPartnerById(id, scope);
    if (!partner) return null;
    return this.toPartnerResponse(partner);
  }

  async createPartner(
    dto: CreatePartnerDto,
    scope: SellerScope,
  ): Promise<PartnerResponseDto> {
    // Check for duplicate code
    const existing = await this.repository.findPartnerByCode(dto.code);
    if (existing) {
      throw new Error(`Partner code '${dto.code}' already exists`);
    }

    const partner = await this.repository.createPartner(dto, scope);
    return this.toPartnerResponse(partner);
  }

  async updatePartner(
    id: string,
    dto: UpdatePartnerDto,
    scope: SellerScope,
  ): Promise<PartnerResponseDto | null> {
    const partner = await this.repository.updatePartner(id, dto, scope);
    if (!partner) return null;
    return this.toPartnerResponse(partner);
  }

  async deletePartner(id: string, scope: SellerScope): Promise<boolean> {
    return this.repository.deletePartner(id, scope);
  }

  // ========== CAMPAIGN METHODS ==========

  async getCampaigns(
    query: CampaignQueryDto,
    scope: SellerScope,
  ): Promise<PaginatedResponse<CampaignResponseDto>> {
    const { data, total } = await this.repository.findCampaigns(query, scope);
    const page = query.page || 1;
    const limit = query.limit || 20;
    const totalPages = Math.ceil(total / limit);

    return {
      data: data.map(c => this.toCampaignResponse(c)),
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  async getCampaign(id: string, scope: SellerScope): Promise<CampaignResponseDto | null> {
    const campaign = await this.repository.findCampaignById(id, scope);
    if (!campaign) return null;
    return this.toCampaignResponse(campaign);
  }

  async createCampaign(
    dto: CreateCampaignDto,
    scope: SellerScope,
  ): Promise<CampaignResponseDto> {
    // Validate partner exists
    const partner = await this.repository.findPartnerById(dto.partnerId, scope);
    if (!partner) {
      throw new Error('Partner not found');
    }

    if (partner.status !== 'active') {
      throw new Error('Partner must be active to create campaigns');
    }

    const campaign = await this.repository.createCampaign(dto, scope);
    return this.toCampaignResponse(campaign);
  }

  async updateCampaign(
    id: string,
    dto: UpdateCampaignDto,
    scope: SellerScope,
  ): Promise<CampaignResponseDto | null> {
    const campaign = await this.repository.updateCampaign(id, dto, scope);
    if (!campaign) return null;
    return this.toCampaignResponse(campaign);
  }

  async approveCampaign(
    id: string,
    dto: ApproveCampaignDto,
    approverId: string,
    scope: SellerScope,
  ): Promise<CampaignResponseDto | null> {
    const updateDto: UpdateCampaignDto = dto.approved
      ? { status: 'approved' }
      : { status: 'rejected' };

    const campaign = await this.repository.findCampaignById(id, scope);
    if (!campaign) return null;

    // Update with approval info
    const updated = await this.repository.updateCampaign(id, {
      ...updateDto,
    }, scope);

    if (!updated) return null;

    // Set approval fields directly
    updated.approvedBy = approverId;
    updated.approvedAt = new Date();
    if (!dto.approved && dto.rejectionReason) {
      updated.rejectionReason = dto.rejectionReason;
    }

    return this.toCampaignResponse(updated);
  }

  async deleteCampaign(id: string, scope: SellerScope): Promise<boolean> {
    return this.repository.deleteCampaign(id, scope);
  }

  // ========== CONTENT METHODS ==========

  async getContents(
    query: ContentQueryDto,
    scope: SellerScope,
  ): Promise<PaginatedResponse<ContentResponseDto>> {
    const { data, total } = await this.repository.findContents(query, scope);
    const page = query.page || 1;
    const limit = query.limit || 20;
    const totalPages = Math.ceil(total / limit);

    return {
      data: data.map(c => this.toContentResponse(c)),
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  async getContent(id: string, scope: SellerScope): Promise<ContentResponseDto | null> {
    const content = await this.repository.findContentById(id, scope);
    if (!content) return null;
    return this.toContentResponse(content);
  }

  async createContent(
    dto: CreateContentDto,
    scope: SellerScope,
  ): Promise<ContentResponseDto> {
    // Validate partner exists
    const partner = await this.repository.findPartnerById(dto.partnerId, scope);
    if (!partner) {
      throw new Error('Partner not found');
    }

    if (partner.status !== 'active') {
      throw new Error('Partner must be active to create content');
    }

    // Validate campaign if provided
    if (dto.campaignId) {
      const campaign = await this.repository.findCampaignById(dto.campaignId, scope);
      if (!campaign) {
        throw new Error('Campaign not found');
      }
      if (campaign.partnerId !== dto.partnerId) {
        throw new Error('Campaign does not belong to the specified partner');
      }
    }

    // IMPORTANT: Seller content NEVER has Force
    // This is enforced at repository level, but double-check here
    const content = await this.repository.createContent(dto, scope);
    return this.toContentResponse(content);
  }

  async updateContent(
    id: string,
    dto: UpdateContentDto,
    scope: SellerScope,
  ): Promise<ContentResponseDto | null> {
    const content = await this.repository.updateContent(id, dto, scope);
    if (!content) return null;
    return this.toContentResponse(content);
  }

  async approveContent(
    id: string,
    dto: ApproveContentDto,
    approverId: string,
    scope: SellerScope,
  ): Promise<ContentResponseDto | null> {
    const content = await this.repository.findContentById(id, scope);
    if (!content) return null;

    const updateDto: UpdateContentDto = dto.approved
      ? { status: 'approved' }
      : { status: 'rejected' };

    const updated = await this.repository.updateContent(id, updateDto, scope);
    if (!updated) return null;

    // Set approval fields
    updated.approvedBy = approverId;
    updated.approvedAt = new Date();
    if (!dto.approved && dto.rejectionReason) {
      updated.rejectionReason = dto.rejectionReason;
    }

    return this.toContentResponse(updated);
  }

  async deleteContent(id: string, scope: SellerScope): Promise<boolean> {
    return this.repository.softDeleteContent(id, scope);
  }

  // ========== GLOBAL CONTENT METHODS (Store) ==========

  async getGlobalContents(
    query: ContentQueryDto,
    scope: SellerScope,
  ): Promise<GlobalContentResponseDto> {
    const { data, total } = await this.repository.findGlobalContents(query, scope);
    const page = query.page || 1;
    const limit = query.limit || 20;

    // Get unique partners and active campaigns count
    const partners = [...new Set(data.map(c => c.partnerId))];

    return {
      data: await Promise.all(data.map(c => this.toGlobalContentItem(c, scope))),
      meta: {
        page,
        limit,
        total,
        partners,
        activeCampaigns: 0, // TODO: Calculate from campaigns
      },
    };
  }

  async cloneContent(
    id: string,
    dto: CloneContentDto,
    scope: SellerScope,
  ): Promise<CloneContentResponseDto> {
    // All Seller content can be cloned (no Force restriction)
    const cloned = await this.repository.cloneContent(id, scope, dto);
    if (!cloned) {
      throw new Error('Content not found');
    }

    return {
      content: this.toContentResponse(cloned),
      originalId: id,
      clonedAt: new Date().toISOString(),
    };
  }

  // ========== METRICS METHODS ==========

  async recordMetric(
    dto: RecordMetricDto,
    scope: SellerScope,
  ): Promise<SellerMetricEvent> {
    const event = await this.repository.recordMetricEvent(dto, scope);

    // Update aggregated metrics on content
    if (dto.eventType === 'impression') {
      await this.repository.incrementContentMetrics(dto.contentId, 'totalImpressions', dto.eventValue || 1);
    } else if (dto.eventType === 'click') {
      await this.repository.incrementContentMetrics(dto.contentId, 'totalClicks', dto.eventValue || 1);
    }

    return event;
  }

  async getMetricsSummary(
    query: MetricsQueryDto,
    scope: SellerScope,
  ): Promise<MetricsSummaryDto> {
    const summary = await this.repository.getMetricsSummary(query, scope);

    const impressions = parseInt(summary?.impressions || '0', 10);
    const clicks = parseInt(summary?.clicks || '0', 10);
    const videoStarts = parseInt(summary?.videoStarts || '0', 10);
    const videoCompletes = parseInt(summary?.videoCompletes || '0', 10);

    return {
      contentId: query.contentId || '',
      partnerId: query.partnerId || '',
      campaignId: query.campaignId || null,
      period: {
        startDate: query.startDate,
        endDate: query.endDate,
      },
      totals: {
        impressions,
        clicks,
        qrScans: parseInt(summary?.qrScans || '0', 10),
        videoStarts,
        videoCompletes,
        totalDurationSeconds: parseInt(summary?.totalDuration || '0', 10),
      },
      ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
      vtr: videoStarts > 0 ? (videoCompletes / videoStarts) * 100 : 0,
    };
  }

  // ========== STATS METHODS ==========

  async getContentStats(scope: SellerScope): Promise<ContentStatsDto> {
    return this.repository.getContentStats(scope) as Promise<ContentStatsDto>;
  }

  // ========== RESPONSE TRANSFORMERS ==========

  private toPartnerResponse(partner: SellerPartner): PartnerResponseDto {
    return {
      id: partner.id,
      organizationId: partner.organizationId,
      displayName: partner.displayName,
      code: partner.code,
      description: partner.description,
      logoUrl: partner.logoUrl,
      category: partner.category,
      tier: partner.tier,
      status: partner.status,
      contactInfo: partner.contactInfo,
      contractInfo: partner.contractInfo,
      isActive: partner.isActive,
      createdAt: partner.createdAt?.toISOString(),
      updatedAt: partner.updatedAt?.toISOString(),
    };
  }

  private toCampaignResponse(campaign: SellerCampaign): CampaignResponseDto {
    return {
      id: campaign.id,
      organizationId: campaign.organizationId,
      partnerId: campaign.partnerId,
      title: campaign.title,
      description: campaign.description,
      campaignType: campaign.campaignType,
      status: campaign.status,
      startAt: campaign.startAt?.toISOString(),
      endAt: campaign.endAt?.toISOString(),
      targeting: campaign.targeting,
      budget: campaign.budget,
      approvedBy: campaign.approvedBy,
      approvedAt: campaign.approvedAt?.toISOString() || null,
      rejectionReason: campaign.rejectionReason,
      priority: campaign.priority,
      isActive: campaign.isActive,
      createdAt: campaign.createdAt?.toISOString(),
      updatedAt: campaign.updatedAt?.toISOString(),
    };
  }

  private toContentResponse(content: SellerContent): ContentResponseDto {
    return {
      id: content.id,
      organizationId: content.organizationId,
      partnerId: content.partnerId,
      campaignId: content.campaignId,
      title: content.title,
      description: content.description,
      contentType: content.contentType,
      mediaAssets: content.mediaAssets,
      source: content.source,
      scope: content.scope,
      isForced: false, // Always false for Seller
      parentContentId: content.parentContentId,
      status: content.status,
      metricsEnabled: content.metricsEnabled,
      approvedBy: content.approvedBy,
      approvedAt: content.approvedAt?.toISOString() || null,
      rejectionReason: content.rejectionReason,
      displayOrder: content.displayOrder,
      cloneCount: content.cloneCount,
      totalImpressions: content.totalImpressions,
      totalClicks: content.totalClicks,
      isActive: content.isActive,
      createdAt: content.createdAt?.toISOString(),
      updatedAt: content.updatedAt?.toISOString(),
    };
  }

  private async toGlobalContentItem(
    content: SellerContent,
    scope: SellerScope,
  ): Promise<GlobalContentItemDto> {
    // Get partner name
    const partner = await this.repository.findPartnerById(content.partnerId, scope);

    // Get campaign info if exists
    let campaignTitle: string | null = null;
    let campaignStartAt: string | null = null;
    let campaignEndAt: string | null = null;

    if (content.campaignId) {
      const campaign = await this.repository.findCampaignById(content.campaignId, scope);
      if (campaign) {
        campaignTitle = campaign.title;
        campaignStartAt = campaign.startAt?.toISOString() || null;
        campaignEndAt = campaign.endAt?.toISOString() || null;
      }
    }

    return {
      id: content.id,
      title: content.title,
      description: content.description,
      contentType: content.contentType,
      partnerId: content.partnerId,
      partnerName: partner?.displayName || 'Unknown',
      campaignId: content.campaignId,
      campaignTitle,
      source: 'seller-partner',
      scope: 'global',
      isForced: false, // Seller는 항상 false
      canClone: true,  // Seller는 항상 Clone 가능
      thumbnailUrl: content.mediaAssets?.thumbnailUrl || content.mediaAssets?.imageUrl || null,
      campaignStartAt,
      campaignEndAt,
      createdAt: content.createdAt?.toISOString(),
    };
  }
}
