/**
 * Cosmetics Extension - Repository
 *
 * WO-SIGNAGE-PHASE3-DEV-COSMETICS
 *
 * Database access layer for Cosmetics Extension
 * Schema: signage_cosmetics
 */

import type { DataSource, Repository } from 'typeorm';
import {
  CosmeticsBrand,
  CosmeticsContentPreset,
  CosmeticsBrandContent,
  CosmeticsTrendCard,
} from '../entities/index.js';
import type {
  CreateBrandDto,
  UpdateBrandDto,
  BrandQueryDto,
  CreateContentPresetDto,
  UpdateContentPresetDto,
  ContentPresetQueryDto,
  CreateBrandContentDto,
  UpdateBrandContentDto,
  BrandContentQueryDto,
  CreateTrendCardDto,
  UpdateTrendCardDto,
  TrendCardQueryDto,
} from '../dto/index.js';

/**
 * Scope filter for multi-tenant queries
 */
interface CosmeticsScope {
  organizationId: string;
}

/**
 * Cosmetics Repository
 */
export class CosmeticsRepository {
  private brandRepo: Repository<CosmeticsBrand>;
  private presetRepo: Repository<CosmeticsContentPreset>;
  private contentRepo: Repository<CosmeticsBrandContent>;
  private trendCardRepo: Repository<CosmeticsTrendCard>;

  constructor(dataSource: DataSource) {
    this.brandRepo = dataSource.getRepository(CosmeticsBrand);
    this.presetRepo = dataSource.getRepository(CosmeticsContentPreset);
    this.contentRepo = dataSource.getRepository(CosmeticsBrandContent);
    this.trendCardRepo = dataSource.getRepository(CosmeticsTrendCard);
  }

  // ========== BRAND METHODS ==========

  async findBrands(
    query: BrandQueryDto,
    scope: CosmeticsScope,
  ): Promise<{ data: CosmeticsBrand[]; total: number }> {
    const { page = 1, limit = 20, category, isActive, search } = query;

    const qb = this.brandRepo
      .createQueryBuilder('b')
      .where('b.organizationId = :organizationId', { organizationId: scope.organizationId });

    if (category) {
      qb.andWhere('b.category = :category', { category });
    }

    if (isActive !== undefined) {
      qb.andWhere('b.isActive = :isActive', { isActive });
    }

    if (search) {
      qb.andWhere('(b.name ILIKE :search OR b.code ILIKE :search)', {
        search: `%${search}%`,
      });
    }

    const total = await qb.getCount();

    const data = await qb
      .orderBy('b.displayOrder', 'ASC')
      .addOrderBy('b.name', 'ASC')
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return { data, total };
  }

  async findBrandById(id: string, scope: CosmeticsScope): Promise<CosmeticsBrand | null> {
    return this.brandRepo.findOne({
      where: { id, organizationId: scope.organizationId },
    });
  }

  async findBrandByCode(code: string): Promise<CosmeticsBrand | null> {
    return this.brandRepo.findOne({ where: { code } });
  }

  async createBrand(dto: CreateBrandDto, scope: CosmeticsScope): Promise<CosmeticsBrand> {
    const brand = this.brandRepo.create({
      ...dto,
      organizationId: scope.organizationId,
    });
    return this.brandRepo.save(brand);
  }

  async updateBrand(
    id: string,
    dto: UpdateBrandDto,
    scope: CosmeticsScope,
  ): Promise<CosmeticsBrand | null> {
    const brand = await this.findBrandById(id, scope);
    if (!brand) return null;

    if (dto.colorScheme) {
      brand.colorScheme = { ...brand.colorScheme, ...dto.colorScheme };
      delete (dto as any).colorScheme;
    }

    Object.assign(brand, dto);
    return this.brandRepo.save(brand);
  }

  async deleteBrand(id: string, scope: CosmeticsScope): Promise<boolean> {
    const result = await this.brandRepo.delete({
      id,
      organizationId: scope.organizationId,
    });
    return (result.affected ?? 0) > 0;
  }

  // ========== CONTENT PRESET METHODS ==========

  async findContentPresets(
    query: ContentPresetQueryDto,
    scope: CosmeticsScope,
  ): Promise<{ data: CosmeticsContentPreset[]; total: number }> {
    const { page = 1, limit = 20, type, brandId, isActive } = query;

    const qb = this.presetRepo
      .createQueryBuilder('p')
      .where('p.organizationId = :organizationId', { organizationId: scope.organizationId });

    if (type) {
      qb.andWhere('p.type = :type', { type });
    }

    if (brandId) {
      qb.andWhere('p.brandId = :brandId', { brandId });
    }

    if (isActive !== undefined) {
      qb.andWhere('p.isActive = :isActive', { isActive });
    }

    const total = await qb.getCount();

    const data = await qb
      .orderBy('p.name', 'ASC')
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return { data, total };
  }

  async findContentPresetById(
    id: string,
    scope: CosmeticsScope,
  ): Promise<CosmeticsContentPreset | null> {
    return this.presetRepo.findOne({
      where: { id, organizationId: scope.organizationId },
    });
  }

  async createContentPreset(
    dto: CreateContentPresetDto,
    scope: CosmeticsScope,
  ): Promise<CosmeticsContentPreset> {
    const preset = this.presetRepo.create({
      ...dto,
      organizationId: scope.organizationId,
    });
    return this.presetRepo.save(preset);
  }

  async updateContentPreset(
    id: string,
    dto: UpdateContentPresetDto,
    scope: CosmeticsScope,
  ): Promise<CosmeticsContentPreset | null> {
    const preset = await this.findContentPresetById(id, scope);
    if (!preset) return null;

    if (dto.visualConfig) {
      preset.visualConfig = { ...preset.visualConfig, ...dto.visualConfig };
      delete (dto as any).visualConfig;
    }

    Object.assign(preset, dto);
    return this.presetRepo.save(preset);
  }

  // ========== BRAND CONTENT METHODS ==========

  async findBrandContents(
    query: BrandContentQueryDto,
    scope: CosmeticsScope,
  ): Promise<{ data: CosmeticsBrandContent[]; total: number }> {
    const { page = 1, limit = 20, brandId, contentType, scope: contentScope, status, season, search } = query;

    const qb = this.contentRepo
      .createQueryBuilder('c')
      .where('c.organizationId = :organizationId', { organizationId: scope.organizationId })
      .andWhere('c.deletedAt IS NULL');

    if (brandId) {
      qb.andWhere('c.brandId = :brandId', { brandId });
    }

    if (contentType) {
      qb.andWhere('c.contentType = :contentType', { contentType });
    }

    if (contentScope) {
      qb.andWhere('c.scope = :scope', { scope: contentScope });
    }

    if (status) {
      qb.andWhere('c.status = :status', { status });
    }

    if (season) {
      qb.andWhere('c.season = :season', { season });
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

  async findBrandContentById(
    id: string,
    scope: CosmeticsScope,
  ): Promise<CosmeticsBrandContent | null> {
    return this.contentRepo.findOne({
      where: { id, organizationId: scope.organizationId },
    });
  }

  async findGlobalContents(
    query: BrandContentQueryDto,
    scope: CosmeticsScope,
  ): Promise<{ data: CosmeticsBrandContent[]; total: number }> {
    const { page = 1, limit = 20, brandId, contentType, season, search } = query;

    const qb = this.contentRepo
      .createQueryBuilder('c')
      .where('c.organizationId = :organizationId', { organizationId: scope.organizationId })
      .andWhere('c.scope = :scope', { scope: 'global' })
      .andWhere('c.status = :status', { status: 'published' })
      .andWhere('c.isActive = true')
      .andWhere('c.deletedAt IS NULL');

    // Valid date range check
    const today = new Date().toISOString().slice(0, 10);
    qb.andWhere('(c.campaignStart IS NULL OR c.campaignStart <= :today)', { today });
    qb.andWhere('(c.campaignEnd IS NULL OR c.campaignEnd >= :today)', { today });

    if (brandId) {
      qb.andWhere('c.brandId = :brandId', { brandId });
    }

    if (contentType) {
      qb.andWhere('c.contentType = :contentType', { contentType });
    }

    if (season) {
      qb.andWhere('c.season = :season', { season });
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

  async createBrandContent(
    dto: CreateBrandContentDto,
    scope: CosmeticsScope,
  ): Promise<CosmeticsBrandContent> {
    const content = this.contentRepo.create({
      ...dto,
      organizationId: scope.organizationId,
      source: 'cosmetics-brand',
      isForced: false, // Cosmetics는 항상 false
    });
    return this.contentRepo.save(content);
  }

  async updateBrandContent(
    id: string,
    dto: UpdateBrandContentDto,
    scope: CosmeticsScope,
  ): Promise<CosmeticsBrandContent | null> {
    const content = await this.findBrandContentById(id, scope);
    if (!content) return null;

    if (dto.mediaAssets) {
      content.mediaAssets = { ...content.mediaAssets, ...dto.mediaAssets };
      delete (dto as any).mediaAssets;
    }

    if (dto.metadata) {
      content.metadata = { ...content.metadata, ...dto.metadata };
      delete (dto as any).metadata;
    }

    Object.assign(content, dto);
    return this.contentRepo.save(content);
  }

  async softDeleteBrandContent(id: string, scope: CosmeticsScope): Promise<boolean> {
    const result = await this.contentRepo.softDelete({
      id,
      organizationId: scope.organizationId,
    });
    return (result.affected ?? 0) > 0;
  }

  async cloneBrandContent(
    sourceId: string,
    scope: CosmeticsScope,
    options: { title?: string; targetOrganizationId?: string } = {},
  ): Promise<CosmeticsBrandContent | null> {
    const source = await this.findBrandContentById(sourceId, scope);
    if (!source) return null;

    const cloned = this.contentRepo.create({
      organizationId: options.targetOrganizationId || scope.organizationId,
      brandId: source.brandId,
      title: options.title || `Copy of ${source.title}`,
      description: source.description,
      contentType: source.contentType,
      mediaAssets: { ...source.mediaAssets },
      season: source.season,
      source: 'cosmetics-brand',
      scope: 'store', // Cloned content is always store scope
      isForced: false,
      parentContentId: sourceId,
      campaignStart: source.campaignStart,
      campaignEnd: source.campaignEnd,
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

  // ========== TREND CARD METHODS ==========

  async findTrendCards(
    query: TrendCardQueryDto,
    scope: CosmeticsScope,
  ): Promise<{ data: CosmeticsTrendCard[]; total: number }> {
    const { page = 1, limit = 20, trendType, season, year, isActive } = query;

    const qb = this.trendCardRepo
      .createQueryBuilder('t')
      .where('t.organizationId = :organizationId', { organizationId: scope.organizationId });

    if (trendType) {
      qb.andWhere('t.trendType = :trendType', { trendType });
    }

    if (season) {
      qb.andWhere('t.season = :season', { season });
    }

    if (year) {
      qb.andWhere('t.year = :year', { year });
    }

    if (isActive !== undefined) {
      qb.andWhere('t.isActive = :isActive', { isActive });
    }

    const total = await qb.getCount();

    const data = await qb
      .orderBy('t.year', 'DESC')
      .addOrderBy('t.displayOrder', 'ASC')
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return { data, total };
  }

  async findTrendCardById(id: string, scope: CosmeticsScope): Promise<CosmeticsTrendCard | null> {
    return this.trendCardRepo.findOne({
      where: { id, organizationId: scope.organizationId },
    });
  }

  async createTrendCard(dto: CreateTrendCardDto, scope: CosmeticsScope): Promise<CosmeticsTrendCard> {
    const card = this.trendCardRepo.create({
      ...dto,
      organizationId: scope.organizationId,
    });
    return this.trendCardRepo.save(card);
  }

  async updateTrendCard(
    id: string,
    dto: UpdateTrendCardDto,
    scope: CosmeticsScope,
  ): Promise<CosmeticsTrendCard | null> {
    const card = await this.findTrendCardById(id, scope);
    if (!card) return null;

    Object.assign(card, dto);
    return this.trendCardRepo.save(card);
  }

  async deleteTrendCard(id: string, scope: CosmeticsScope): Promise<boolean> {
    const result = await this.trendCardRepo.delete({
      id,
      organizationId: scope.organizationId,
    });
    return (result.affected ?? 0) > 0;
  }

  // ========== STATS METHODS ==========

  async getContentStats(scope: CosmeticsScope): Promise<{
    totalContents: number;
    byBrand: Record<string, number>;
    byStatus: Record<string, number>;
    byContentType: Record<string, number>;
    totalClones: number;
    totalViews: number;
  }> {
    const qb = this.contentRepo
      .createQueryBuilder('c')
      .where('c.organizationId = :organizationId', { organizationId: scope.organizationId })
      .andWhere('c.deletedAt IS NULL');

    const totalContents = await qb.getCount();

    // By brand
    const byBrandRaw = await this.contentRepo
      .createQueryBuilder('c')
      .select('c.brandId', 'brandId')
      .addSelect('COUNT(*)', 'count')
      .where('c.organizationId = :organizationId', { organizationId: scope.organizationId })
      .andWhere('c.deletedAt IS NULL')
      .groupBy('c.brandId')
      .getRawMany();

    const byBrand: Record<string, number> = {};
    byBrandRaw.forEach(r => {
      byBrand[r.brandId] = parseInt(r.count, 10);
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
      byBrand,
      byStatus,
      byContentType,
      totalClones: parseInt(aggregates?.totalClones || '0', 10),
      totalViews: parseInt(aggregates?.totalViews || '0', 10),
    };
  }
}
