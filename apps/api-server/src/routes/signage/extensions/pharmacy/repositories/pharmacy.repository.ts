/**
 * Pharmacy Extension - Repository
 *
 * WO-SIGNAGE-PHASE3-DEV-PHARMACY
 *
 * Database access layer for Pharmacy Extension
 * Schema: signage_pharmacy
 */

import type { DataSource, Repository } from 'typeorm';
import {
  PharmacyCategory,
  PharmacySeasonalCampaign,
  PharmacyTemplatePreset,
  PharmacyContent,
} from '../entities/index.js';
import type {
  CreateCategoryDto,
  UpdateCategoryDto,
  CategoryQueryDto,
  CreateCampaignDto,
  UpdateCampaignDto,
  CampaignQueryDto,
  CreateTemplatePresetDto,
  UpdateTemplatePresetDto,
  CreateContentDto,
  UpdateContentDto,
  ContentQueryDto,
} from '../dto/index.js';

/**
 * Scope filter for multi-tenant queries
 */
interface PharmacyScope {
  organizationId: string;
}

/**
 * Pharmacy Repository
 */
export class PharmacyRepository {
  private categoryRepo: Repository<PharmacyCategory>;
  private campaignRepo: Repository<PharmacySeasonalCampaign>;
  private templatePresetRepo: Repository<PharmacyTemplatePreset>;
  private contentRepo: Repository<PharmacyContent>;

  constructor(dataSource: DataSource) {
    this.categoryRepo = dataSource.getRepository(PharmacyCategory);
    this.campaignRepo = dataSource.getRepository(PharmacySeasonalCampaign);
    this.templatePresetRepo = dataSource.getRepository(PharmacyTemplatePreset);
    this.contentRepo = dataSource.getRepository(PharmacyContent);
  }

  // ========== CATEGORY METHODS ==========

  async findCategories(
    query: CategoryQueryDto,
    scope: PharmacyScope,
  ): Promise<{ data: PharmacyCategory[]; total: number }> {
    const { page = 1, limit = 20, parentId, isActive } = query;

    const qb = this.categoryRepo
      .createQueryBuilder('c')
      .where('c.organizationId = :organizationId', { organizationId: scope.organizationId });

    if (parentId !== undefined) {
      if (parentId === null || parentId === 'null') {
        qb.andWhere('c.parentId IS NULL');
      } else {
        qb.andWhere('c.parentId = :parentId', { parentId });
      }
    }

    if (isActive !== undefined) {
      qb.andWhere('c.isActive = :isActive', { isActive });
    }

    const total = await qb.getCount();

    const data = await qb
      .orderBy('c.displayOrder', 'ASC')
      .addOrderBy('c.name', 'ASC')
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return { data, total };
  }

  async findCategoryById(id: string, scope: PharmacyScope): Promise<PharmacyCategory | null> {
    return this.categoryRepo.findOne({
      where: { id, organizationId: scope.organizationId },
    });
  }

  async findCategoryByCode(code: string): Promise<PharmacyCategory | null> {
    return this.categoryRepo.findOne({ where: { code } });
  }

  async createCategory(dto: CreateCategoryDto, scope: PharmacyScope): Promise<PharmacyCategory> {
    const category = this.categoryRepo.create({
      ...dto,
      organizationId: scope.organizationId,
    });
    return this.categoryRepo.save(category);
  }

  async updateCategory(
    id: string,
    dto: UpdateCategoryDto,
    scope: PharmacyScope,
  ): Promise<PharmacyCategory | null> {
    const category = await this.findCategoryById(id, scope);
    if (!category) return null;

    Object.assign(category, dto);
    return this.categoryRepo.save(category);
  }

  async deleteCategory(id: string, scope: PharmacyScope): Promise<boolean> {
    const result = await this.categoryRepo.delete({
      id,
      organizationId: scope.organizationId,
    });
    return (result.affected ?? 0) > 0;
  }

  // ========== CAMPAIGN METHODS ==========

  async findCampaigns(
    query: CampaignQueryDto,
    scope: PharmacyScope,
  ): Promise<{ data: PharmacySeasonalCampaign[]; total: number }> {
    const { page = 1, limit = 20, season, scopeFilter, isActive, current } = query as any;

    const qb = this.campaignRepo
      .createQueryBuilder('c')
      .where('c.organizationId = :organizationId', { organizationId: scope.organizationId });

    if (season) {
      qb.andWhere('c.season = :season', { season });
    }

    if (scopeFilter) {
      qb.andWhere('c.scope = :scope', { scope: scopeFilter });
    }

    if (isActive !== undefined) {
      qb.andWhere('c.isActive = :isActive', { isActive });
    }

    if (current) {
      const today = new Date().toISOString().slice(0, 10);
      qb.andWhere('c.startDate <= :today', { today });
      qb.andWhere('c.endDate >= :today', { today });
    }

    const total = await qb.getCount();

    const data = await qb
      .orderBy('c.priority', 'DESC')
      .addOrderBy('c.startDate', 'ASC')
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return { data, total };
  }

  async findCampaignById(id: string, scope: PharmacyScope): Promise<PharmacySeasonalCampaign | null> {
    return this.campaignRepo.findOne({
      where: { id, organizationId: scope.organizationId },
    });
  }

  async createCampaign(
    dto: CreateCampaignDto,
    scope: PharmacyScope,
  ): Promise<PharmacySeasonalCampaign> {
    const campaign = this.campaignRepo.create({
      ...dto,
      organizationId: scope.organizationId,
    });
    return this.campaignRepo.save(campaign);
  }

  async updateCampaign(
    id: string,
    dto: UpdateCampaignDto,
    scope: PharmacyScope,
  ): Promise<PharmacySeasonalCampaign | null> {
    const campaign = await this.findCampaignById(id, scope);
    if (!campaign) return null;

    Object.assign(campaign, dto);
    return this.campaignRepo.save(campaign);
  }

  async deleteCampaign(id: string, scope: PharmacyScope): Promise<boolean> {
    const result = await this.campaignRepo.delete({
      id,
      organizationId: scope.organizationId,
    });
    return (result.affected ?? 0) > 0;
  }

  // ========== TEMPLATE PRESET METHODS ==========

  async findTemplatePresets(
    scope: PharmacyScope,
    type?: string,
  ): Promise<PharmacyTemplatePreset[]> {
    const qb = this.templatePresetRepo
      .createQueryBuilder('t')
      .where('t.organizationId = :organizationId', { organizationId: scope.organizationId })
      .andWhere('t.isActive = true');

    if (type) {
      qb.andWhere('t.type = :type', { type });
    }

    return qb.orderBy('t.name', 'ASC').getMany();
  }

  async findTemplatePresetById(
    id: string,
    scope: PharmacyScope,
  ): Promise<PharmacyTemplatePreset | null> {
    return this.templatePresetRepo.findOne({
      where: { id, organizationId: scope.organizationId },
    });
  }

  async createTemplatePreset(
    dto: CreateTemplatePresetDto,
    scope: PharmacyScope,
  ): Promise<PharmacyTemplatePreset> {
    const preset = this.templatePresetRepo.create({
      ...dto,
      organizationId: scope.organizationId,
    });
    return this.templatePresetRepo.save(preset);
  }

  async updateTemplatePreset(
    id: string,
    dto: UpdateTemplatePresetDto,
    scope: PharmacyScope,
  ): Promise<PharmacyTemplatePreset | null> {
    const preset = await this.findTemplatePresetById(id, scope);
    if (!preset) return null;

    if (dto.config) {
      preset.config = { ...preset.config, ...dto.config };
      delete (dto as any).config;
    }

    Object.assign(preset, dto);
    return this.templatePresetRepo.save(preset);
  }

  // ========== CONTENT METHODS ==========

  async findContents(
    query: ContentQueryDto,
    scope: PharmacyScope,
  ): Promise<{ data: PharmacyContent[]; total: number }> {
    const {
      page = 1,
      limit = 20,
      source,
      scope: contentScope,
      status,
      contentType,
      categoryId,
      campaignId,
      isForced,
      search,
    } = query;

    const qb = this.contentRepo
      .createQueryBuilder('c')
      .where('c.organizationId = :organizationId', { organizationId: scope.organizationId })
      .andWhere('c.deletedAt IS NULL');

    if (source) {
      qb.andWhere('c.source = :source', { source });
    }

    if (contentScope) {
      qb.andWhere('c.scope = :scope', { scope: contentScope });
    }

    if (status) {
      qb.andWhere('c.status = :status', { status });
    }

    if (contentType) {
      qb.andWhere('c.contentType = :contentType', { contentType });
    }

    if (categoryId) {
      qb.andWhere('c.categoryId = :categoryId', { categoryId });
    }

    if (campaignId) {
      qb.andWhere('c.campaignId = :campaignId', { campaignId });
    }

    if (isForced !== undefined) {
      qb.andWhere('c.isForced = :isForced', { isForced });
    }

    if (search) {
      qb.andWhere('(c.title ILIKE :search OR c.description ILIKE :search)', {
        search: `%${search}%`,
      });
    }

    const total = await qb.getCount();

    const data = await qb
      .orderBy('c.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return { data, total };
  }

  async findContentById(id: string, scope: PharmacyScope): Promise<PharmacyContent | null> {
    return this.contentRepo.findOne({
      where: { id, organizationId: scope.organizationId },
    });
  }

  async findGlobalContents(
    query: ContentQueryDto,
    scope: PharmacyScope,
  ): Promise<{ data: PharmacyContent[]; total: number }> {
    const { page = 1, limit = 20, source, contentType, categoryId, isForced, search } = query;

    const qb = this.contentRepo
      .createQueryBuilder('c')
      .where('c.organizationId = :organizationId', { organizationId: scope.organizationId })
      .andWhere('c.scope = :scope', { scope: 'global' })
      .andWhere('c.status = :status', { status: 'published' })
      .andWhere('c.isActive = true')
      .andWhere('c.deletedAt IS NULL');

    // Valid date range check
    const today = new Date().toISOString().slice(0, 10);
    qb.andWhere('(c.validFrom IS NULL OR c.validFrom <= :today)', { today });
    qb.andWhere('(c.validUntil IS NULL OR c.validUntil >= :today)', { today });

    if (source) {
      qb.andWhere('c.source = :source', { source });
    }

    if (contentType) {
      qb.andWhere('c.contentType = :contentType', { contentType });
    }

    if (categoryId) {
      qb.andWhere('c.categoryId = :categoryId', { categoryId });
    }

    if (isForced !== undefined) {
      qb.andWhere('c.isForced = :isForced', { isForced });
    }

    if (search) {
      qb.andWhere('(c.title ILIKE :search OR c.description ILIKE :search)', {
        search: `%${search}%`,
      });
    }

    const total = await qb.getCount();

    // Order: forced first, then by created date
    const data = await qb
      .orderBy('c.isForced', 'DESC')
      .addOrderBy('c.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return { data, total };
  }

  async createContent(dto: CreateContentDto, scope: PharmacyScope): Promise<PharmacyContent> {
    const content = this.contentRepo.create({
      ...dto,
      organizationId: scope.organizationId,
    });
    return this.contentRepo.save(content);
  }

  async updateContent(
    id: string,
    dto: UpdateContentDto,
    scope: PharmacyScope,
  ): Promise<PharmacyContent | null> {
    const content = await this.findContentById(id, scope);
    if (!content) return null;

    if (dto.mediaData) {
      content.mediaData = { ...content.mediaData, ...dto.mediaData };
      delete (dto as any).mediaData;
    }

    if (dto.metadata) {
      content.metadata = { ...content.metadata, ...dto.metadata };
      delete (dto as any).metadata;
    }

    Object.assign(content, dto);
    return this.contentRepo.save(content);
  }

  async softDeleteContent(id: string, scope: PharmacyScope): Promise<boolean> {
    const result = await this.contentRepo.softDelete({
      id,
      organizationId: scope.organizationId,
    });
    return (result.affected ?? 0) > 0;
  }

  async cloneContent(
    sourceId: string,
    scope: PharmacyScope,
    options: { title?: string; targetOrganizationId?: string } = {},
  ): Promise<PharmacyContent | null> {
    const source = await this.findContentById(sourceId, scope);
    if (!source) return null;

    // Forced content cannot be cloned
    if (source.isForced) {
      throw new Error('Forced content cannot be cloned');
    }

    const cloned = this.contentRepo.create({
      organizationId: options.targetOrganizationId || scope.organizationId,
      title: options.title || `Copy of ${source.title}`,
      description: source.description,
      contentType: source.contentType,
      categoryId: source.categoryId,
      campaignId: source.campaignId,
      templatePresetId: source.templatePresetId,
      mediaData: { ...source.mediaData },
      source: source.source,
      scope: 'store', // Cloned content is always store scope
      isForced: false, // Cloned content is never forced
      parentContentId: sourceId,
      validFrom: source.validFrom,
      validUntil: source.validUntil,
      status: 'draft',
      isActive: true,
      metadata: { ...source.metadata, clonedFrom: sourceId },
    });

    const saved = await this.contentRepo.save(cloned);

    // Increment clone count on source
    await this.contentRepo.increment({ id: sourceId }, 'cloneCount', 1);

    return saved;
  }

  async incrementViewCount(id: string): Promise<void> {
    await this.contentRepo.increment({ id }, 'viewCount', 1);
  }

  // ========== STATS METHODS ==========

  async getContentStats(scope: PharmacyScope): Promise<{
    totalContents: number;
    bySource: Record<string, number>;
    byStatus: Record<string, number>;
    byContentType: Record<string, number>;
    forcedCount: number;
    totalClones: number;
    totalViews: number;
  }> {
    const qb = this.contentRepo
      .createQueryBuilder('c')
      .where('c.organizationId = :organizationId', { organizationId: scope.organizationId })
      .andWhere('c.deletedAt IS NULL');

    const totalContents = await qb.getCount();

    // By source
    const bySourceRaw = await this.contentRepo
      .createQueryBuilder('c')
      .select('c.source', 'source')
      .addSelect('COUNT(*)', 'count')
      .where('c.organizationId = :organizationId', { organizationId: scope.organizationId })
      .andWhere('c.deletedAt IS NULL')
      .groupBy('c.source')
      .getRawMany();

    const bySource: Record<string, number> = {};
    bySourceRaw.forEach(r => {
      bySource[r.source] = parseInt(r.count, 10);
    });

    // By status
    const byStatusRaw = await this.contentRepo
      .createQueryBuilder('c')
      .select('c.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('c.organizationId = :organizationId', { organizationId: scope.organizationId })
      .andWhere('c.deletedAt IS NULL')
      .groupBy('c.status')
      .getRawMany();

    const byStatus: Record<string, number> = {};
    byStatusRaw.forEach(r => {
      byStatus[r.status] = parseInt(r.count, 10);
    });

    // By content type
    const byContentTypeRaw = await this.contentRepo
      .createQueryBuilder('c')
      .select('c.contentType', 'contentType')
      .addSelect('COUNT(*)', 'count')
      .where('c.organizationId = :organizationId', { organizationId: scope.organizationId })
      .andWhere('c.deletedAt IS NULL')
      .groupBy('c.contentType')
      .getRawMany();

    const byContentType: Record<string, number> = {};
    byContentTypeRaw.forEach(r => {
      byContentType[r.contentType] = parseInt(r.count, 10);
    });

    // Forced count
    const forcedCount = await this.contentRepo.count({
      where: { organizationId: scope.organizationId, isForced: true },
    });

    // Total clones and views
    const aggregates = await this.contentRepo
      .createQueryBuilder('c')
      .select('SUM(c.cloneCount)', 'totalClones')
      .addSelect('SUM(c.viewCount)', 'totalViews')
      .where('c.organizationId = :organizationId', { organizationId: scope.organizationId })
      .andWhere('c.deletedAt IS NULL')
      .getRawOne();

    return {
      totalContents,
      bySource,
      byStatus,
      byContentType,
      forcedCount,
      totalClones: parseInt(aggregates?.totalClones || '0', 10),
      totalViews: parseInt(aggregates?.totalViews || '0', 10),
    };
  }
}
