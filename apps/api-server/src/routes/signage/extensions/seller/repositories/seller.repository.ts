/**
 * Seller Extension - Repository
 *
 * WO-SIGNAGE-PHASE3-DEV-SELLER
 *
 * Data access layer for Seller Extension
 */

import type { DataSource, Repository } from 'typeorm';
import {
  SellerPartner,
  SellerCampaign,
  SellerContent,
  SellerContentMetric,
  SellerMetricEvent,
} from '../entities/index.js';
import type {
  CreatePartnerDto,
  UpdatePartnerDto,
  PartnerQueryDto,
  CreateCampaignDto,
  UpdateCampaignDto,
  CampaignQueryDto,
  CreateContentDto,
  UpdateContentDto,
  ContentQueryDto,
  CloneContentDto,
  RecordMetricDto,
  MetricsQueryDto,
} from '../dto/index.js';

/**
 * Seller scope for multi-tenant operations
 */
interface SellerScope {
  organizationId: string;
}

/**
 * Paginated result
 */
interface PaginatedResult<T> {
  data: T[];
  total: number;
}

/**
 * Seller Repository
 */
export class SellerRepository {
  private partnerRepo: Repository<SellerPartner>;
  private campaignRepo: Repository<SellerCampaign>;
  private contentRepo: Repository<SellerContent>;
  private metricRepo: Repository<SellerContentMetric>;
  private eventRepo: Repository<SellerMetricEvent>;

  constructor(dataSource: DataSource) {
    this.partnerRepo = dataSource.getRepository(SellerPartner);
    this.campaignRepo = dataSource.getRepository(SellerCampaign);
    this.contentRepo = dataSource.getRepository(SellerContent);
    this.metricRepo = dataSource.getRepository(SellerContentMetric);
    this.eventRepo = dataSource.getRepository(SellerMetricEvent);
  }

  // ========== PARTNER METHODS ==========

  async findPartners(
    query: PartnerQueryDto,
    scope: SellerScope,
  ): Promise<PaginatedResult<SellerPartner>> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const qb = this.partnerRepo
      .createQueryBuilder('partner')
      .where('partner.organizationId = :orgId', { orgId: scope.organizationId })
      .andWhere('partner.deletedAt IS NULL');

    if (query.status) {
      qb.andWhere('partner.status = :status', { status: query.status });
    }

    if (query.category) {
      qb.andWhere('partner.category = :category', { category: query.category });
    }

    if (query.tier) {
      qb.andWhere('partner.tier = :tier', { tier: query.tier });
    }

    if (query.search) {
      qb.andWhere(
        '(partner.displayName ILIKE :search OR partner.code ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    const [data, total] = await qb
      .orderBy('partner.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return { data, total };
  }

  async findPartnerById(id: string, scope: SellerScope): Promise<SellerPartner | null> {
    return this.partnerRepo.findOne({
      where: {
        id,
        organizationId: scope.organizationId,
      },
    });
  }

  async findPartnerByCode(code: string): Promise<SellerPartner | null> {
    return this.partnerRepo.findOne({
      where: { code },
    });
  }

  async createPartner(dto: CreatePartnerDto, scope: SellerScope): Promise<SellerPartner> {
    const partner = this.partnerRepo.create({
      ...dto,
      organizationId: scope.organizationId,
    });
    return this.partnerRepo.save(partner);
  }

  async updatePartner(
    id: string,
    dto: UpdatePartnerDto,
    scope: SellerScope,
  ): Promise<SellerPartner | null> {
    const partner = await this.findPartnerById(id, scope);
    if (!partner) return null;

    Object.assign(partner, dto);
    return this.partnerRepo.save(partner);
  }

  async deletePartner(id: string, scope: SellerScope): Promise<boolean> {
    const result = await this.partnerRepo.softDelete({
      id,
      organizationId: scope.organizationId,
    });
    return (result.affected ?? 0) > 0;
  }

  // ========== CAMPAIGN METHODS ==========

  async findCampaigns(
    query: CampaignQueryDto,
    scope: SellerScope,
  ): Promise<PaginatedResult<SellerCampaign>> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const qb = this.campaignRepo
      .createQueryBuilder('campaign')
      .where('campaign.organizationId = :orgId', { orgId: scope.organizationId })
      .andWhere('campaign.deletedAt IS NULL');

    if (query.partnerId) {
      qb.andWhere('campaign.partnerId = :partnerId', { partnerId: query.partnerId });
    }

    if (query.status) {
      qb.andWhere('campaign.status = :status', { status: query.status });
    }

    if (query.campaignType) {
      qb.andWhere('campaign.campaignType = :type', { type: query.campaignType });
    }

    if (query.activeOnly) {
      const now = new Date().toISOString();
      qb.andWhere('campaign.startAt <= :now', { now })
        .andWhere('campaign.endAt >= :now', { now })
        .andWhere('campaign.status = :activeStatus', { activeStatus: 'active' });
    }

    const [data, total] = await qb
      .orderBy('campaign.startAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return { data, total };
  }

  async findCampaignById(id: string, scope: SellerScope): Promise<SellerCampaign | null> {
    return this.campaignRepo.findOne({
      where: {
        id,
        organizationId: scope.organizationId,
      },
    });
  }

  async createCampaign(dto: CreateCampaignDto, scope: SellerScope): Promise<SellerCampaign> {
    const campaign = this.campaignRepo.create({
      ...dto,
      organizationId: scope.organizationId,
      startAt: new Date(dto.startAt),
      endAt: new Date(dto.endAt),
    });
    return this.campaignRepo.save(campaign);
  }

  async updateCampaign(
    id: string,
    dto: UpdateCampaignDto,
    scope: SellerScope,
  ): Promise<SellerCampaign | null> {
    const campaign = await this.findCampaignById(id, scope);
    if (!campaign) return null;

    if (dto.startAt) {
      (dto as any).startAt = new Date(dto.startAt);
    }
    if (dto.endAt) {
      (dto as any).endAt = new Date(dto.endAt);
    }

    Object.assign(campaign, dto);
    return this.campaignRepo.save(campaign);
  }

  async deleteCampaign(id: string, scope: SellerScope): Promise<boolean> {
    const result = await this.campaignRepo.softDelete({
      id,
      organizationId: scope.organizationId,
    });
    return (result.affected ?? 0) > 0;
  }

  // ========== CONTENT METHODS ==========

  async findContents(
    query: ContentQueryDto,
    scope: SellerScope,
  ): Promise<PaginatedResult<SellerContent>> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const qb = this.contentRepo
      .createQueryBuilder('content')
      .where('content.organizationId = :orgId', { orgId: scope.organizationId })
      .andWhere('content.deletedAt IS NULL');

    if (query.partnerId) {
      qb.andWhere('content.partnerId = :partnerId', { partnerId: query.partnerId });
    }

    if (query.campaignId) {
      qb.andWhere('content.campaignId = :campaignId', { campaignId: query.campaignId });
    }

    if (query.contentType) {
      qb.andWhere('content.contentType = :type', { type: query.contentType });
    }

    if (query.status) {
      qb.andWhere('content.status = :status', { status: query.status });
    }

    if (query.scope) {
      qb.andWhere('content.scope = :scope', { scope: query.scope });
    }

    if (query.search) {
      qb.andWhere(
        '(content.title ILIKE :search OR content.description ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    const [data, total] = await qb
      .orderBy('content.displayOrder', 'ASC')
      .addOrderBy('content.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return { data, total };
  }

  async findContentById(id: string, scope: SellerScope): Promise<SellerContent | null> {
    return this.contentRepo.findOne({
      where: {
        id,
        organizationId: scope.organizationId,
      },
    });
  }

  async createContent(dto: CreateContentDto, scope: SellerScope): Promise<SellerContent> {
    const content = this.contentRepo.create({
      ...dto,
      organizationId: scope.organizationId,
      source: 'seller-partner',
      scope: 'global',
      isForced: false, // Always false for Seller
    });
    return this.contentRepo.save(content);
  }

  async updateContent(
    id: string,
    dto: UpdateContentDto,
    scope: SellerScope,
  ): Promise<SellerContent | null> {
    const content = await this.findContentById(id, scope);
    if (!content) return null;

    Object.assign(content, dto);
    return this.contentRepo.save(content);
  }

  async softDeleteContent(id: string, scope: SellerScope): Promise<boolean> {
    const result = await this.contentRepo.softDelete({
      id,
      organizationId: scope.organizationId,
    });
    return (result.affected ?? 0) > 0;
  }

  // ========== GLOBAL CONTENT METHODS (Store) ==========

  async findGlobalContents(
    query: ContentQueryDto,
    scope: SellerScope,
  ): Promise<PaginatedResult<SellerContent>> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;
    const now = new Date();

    const qb = this.contentRepo
      .createQueryBuilder('content')
      .where('content.organizationId = :orgId', { orgId: scope.organizationId })
      .andWhere('content.scope = :scope', { scope: 'global' })
      .andWhere('content.status = :status', { status: 'approved' })
      .andWhere('content.isActive = :isActive', { isActive: true })
      .andWhere('content.deletedAt IS NULL');

    // Only show contents with active campaigns or no campaign
    qb.andWhere(
      `(content.campaignId IS NULL OR EXISTS (
        SELECT 1 FROM signage_seller.seller_campaigns c
        WHERE c.id = content.campaignId
        AND c.status = 'active'
        AND c.startAt <= :now
        AND c.endAt >= :now
        AND c.deletedAt IS NULL
      ))`,
      { now },
    );

    if (query.partnerId) {
      qb.andWhere('content.partnerId = :partnerId', { partnerId: query.partnerId });
    }

    if (query.contentType) {
      qb.andWhere('content.contentType = :type', { type: query.contentType });
    }

    if (query.search) {
      qb.andWhere(
        '(content.title ILIKE :search OR content.description ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    const [data, total] = await qb
      .orderBy('content.displayOrder', 'ASC')
      .addOrderBy('content.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return { data, total };
  }

  async cloneContent(
    sourceId: string,
    scope: SellerScope,
    options?: CloneContentDto,
  ): Promise<SellerContent | null> {
    const source = await this.findContentById(sourceId, scope);
    if (!source) return null;

    // All seller content can be cloned (no Force restriction)
    const cloned = this.contentRepo.create({
      organizationId: scope.organizationId,
      partnerId: source.partnerId,
      campaignId: source.campaignId,
      title: options?.title || `${source.title} (Clone)`,
      description: source.description,
      contentType: source.contentType,
      mediaAssets: { ...source.mediaAssets },
      source: 'seller-partner',
      scope: 'store', // Cloned content is store scope
      isForced: false, // Always false for Seller
      parentContentId: sourceId,
      status: 'approved', // Cloned content is pre-approved
      metricsEnabled: source.metricsEnabled,
      displayOrder: source.displayOrder,
      metadata: { ...source.metadata, clonedFrom: sourceId },
    });

    const saved = await this.contentRepo.save(cloned);

    // Increment clone count on source
    await this.contentRepo.increment({ id: sourceId }, 'cloneCount', 1);

    return saved;
  }

  async incrementContentMetrics(
    id: string,
    field: 'totalImpressions' | 'totalClicks',
    value: number = 1,
  ): Promise<void> {
    await this.contentRepo.increment({ id }, field, value);
  }

  // ========== METRICS METHODS ==========

  async recordMetricEvent(dto: RecordMetricDto, scope: SellerScope): Promise<SellerMetricEvent> {
    const content = await this.findContentById(dto.contentId, scope);
    if (!content) {
      throw new Error('Content not found');
    }

    const event = this.eventRepo.create({
      organizationId: scope.organizationId,
      contentId: dto.contentId,
      campaignId: content.campaignId,
      partnerId: content.partnerId,
      storeId: dto.storeId || null,
      playerId: dto.playerId || null,
      eventType: dto.eventType,
      eventValue: dto.eventValue || 1,
      eventMetadata: dto.eventMetadata || {},
    });

    return this.eventRepo.save(event);
  }

  async getMetricsSummary(
    query: MetricsQueryDto,
    scope: SellerScope,
  ): Promise<Record<string, any>> {
    const qb = this.metricRepo
      .createQueryBuilder('metric')
      .select([
        'SUM(metric.impressions) as impressions',
        'SUM(metric.clicks) as clicks',
        'SUM(metric.qrScans) as qrScans',
        'SUM(metric.videoStarts) as videoStarts',
        'SUM(metric.videoCompletes) as videoCompletes',
        'SUM(metric.totalDurationSeconds) as totalDuration',
      ])
      .where('metric.organizationId = :orgId', { orgId: scope.organizationId })
      .andWhere('metric.date >= :startDate', { startDate: query.startDate })
      .andWhere('metric.date <= :endDate', { endDate: query.endDate });

    if (query.contentId) {
      qb.andWhere('metric.contentId = :contentId', { contentId: query.contentId });
    }

    if (query.partnerId) {
      qb.andWhere('metric.partnerId = :partnerId', { partnerId: query.partnerId });
    }

    if (query.campaignId) {
      qb.andWhere('metric.campaignId = :campaignId', { campaignId: query.campaignId });
    }

    if (query.storeId) {
      qb.andWhere('metric.storeId = :storeId', { storeId: query.storeId });
    }

    const result = await qb.getRawOne();
    return result;
  }

  // ========== STATS METHODS ==========

  async getContentStats(scope: SellerScope): Promise<Record<string, any>> {
    const partnersCount = await this.partnerRepo.count({
      where: { organizationId: scope.organizationId },
    });

    const activePartnersCount = await this.partnerRepo.count({
      where: { organizationId: scope.organizationId, status: 'active' },
    });

    const campaignsCount = await this.campaignRepo.count({
      where: { organizationId: scope.organizationId },
    });

    const now = new Date();
    const activeCampaignsCount = await this.campaignRepo
      .createQueryBuilder('c')
      .where('c.organizationId = :orgId', { orgId: scope.organizationId })
      .andWhere('c.status = :status', { status: 'active' })
      .andWhere('c.startAt <= :now', { now })
      .andWhere('c.endAt >= :now', { now })
      .andWhere('c.deletedAt IS NULL')
      .getCount();

    const contentsCount = await this.contentRepo.count({
      where: { organizationId: scope.organizationId },
    });

    const approvedContentsCount = await this.contentRepo.count({
      where: { organizationId: scope.organizationId, status: 'approved' },
    });

    const pendingContentsCount = await this.contentRepo.count({
      where: { organizationId: scope.organizationId, status: 'pending' },
    });

    // Get counts by content type
    const byContentType = await this.contentRepo
      .createQueryBuilder('c')
      .select('c.contentType', 'type')
      .addSelect('COUNT(*)', 'count')
      .where('c.organizationId = :orgId', { orgId: scope.organizationId })
      .andWhere('c.deletedAt IS NULL')
      .groupBy('c.contentType')
      .getRawMany();

    // Get counts by status
    const byStatus = await this.contentRepo
      .createQueryBuilder('c')
      .select('c.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('c.organizationId = :orgId', { orgId: scope.organizationId })
      .andWhere('c.deletedAt IS NULL')
      .groupBy('c.status')
      .getRawMany();

    // Get total metrics
    const totalMetrics = await this.contentRepo
      .createQueryBuilder('c')
      .select([
        'SUM(c.totalImpressions) as impressions',
        'SUM(c.totalClicks) as clicks',
        'SUM(c.cloneCount) as clones',
      ])
      .where('c.organizationId = :orgId', { orgId: scope.organizationId })
      .andWhere('c.deletedAt IS NULL')
      .getRawOne();

    return {
      totalPartners: partnersCount,
      activePartners: activePartnersCount,
      totalCampaigns: campaignsCount,
      activeCampaigns: activeCampaignsCount,
      totalContents: contentsCount,
      approvedContents: approvedContentsCount,
      pendingContents: pendingContentsCount,
      byContentType: byContentType.reduce((acc, item) => {
        acc[item.type] = parseInt(item.count, 10);
        return acc;
      }, {}),
      byStatus: byStatus.reduce((acc, item) => {
        acc[item.status] = parseInt(item.count, 10);
        return acc;
      }, {}),
      totalImpressions: parseInt(totalMetrics?.impressions || '0', 10),
      totalClicks: parseInt(totalMetrics?.clicks || '0', 10),
      totalClones: parseInt(totalMetrics?.clones || '0', 10),
    };
  }
}
