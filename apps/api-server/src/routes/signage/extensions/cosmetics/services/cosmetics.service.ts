/**
 * Cosmetics Extension - Service
 *
 * WO-SIGNAGE-PHASE3-DEV-COSMETICS
 *
 * Business logic layer for Cosmetics Extension
 * Note: Cosmetics는 Force 불허 (FROZEN rule)
 */

import type { DataSource } from 'typeorm';
import { CosmeticsRepository } from '../repositories/cosmetics.repository.js';
import type {
  CreateBrandDto,
  UpdateBrandDto,
  BrandQueryDto,
  BrandResponseDto,
  CreateContentPresetDto,
  UpdateContentPresetDto,
  ContentPresetQueryDto,
  ContentPresetResponseDto,
  CreateBrandContentDto,
  UpdateBrandContentDto,
  BrandContentQueryDto,
  BrandContentResponseDto,
  CreateTrendCardDto,
  UpdateTrendCardDto,
  TrendCardQueryDto,
  TrendCardResponseDto,
  CloneContentDto,
  CloneContentResponseDto,
  GlobalContentItemDto,
  GlobalContentResponseDto,
  ContentStatsDto,
} from '../dto/index.js';
import type {
  CosmeticsBrand,
  CosmeticsContentPreset,
  CosmeticsBrandContent,
  CosmeticsTrendCard,
} from '../entities/index.js';

/**
 * Cosmetics scope for multi-tenant operations
 */
interface CosmeticsScope {
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
 * Cosmetics Service
 */
export class CosmeticsService {
  private repository: CosmeticsRepository;

  constructor(dataSource: DataSource) {
    this.repository = new CosmeticsRepository(dataSource);
  }

  // ========== BRAND METHODS ==========

  async getBrands(
    query: BrandQueryDto,
    scope: CosmeticsScope,
  ): Promise<PaginatedResponse<BrandResponseDto>> {
    const { data, total } = await this.repository.findBrands(query, scope);
    const page = query.page || 1;
    const limit = query.limit || 20;
    const totalPages = Math.ceil(total / limit);

    return {
      data: data.map(b => this.toBrandResponse(b)),
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

  async getBrand(id: string, scope: CosmeticsScope): Promise<BrandResponseDto | null> {
    const brand = await this.repository.findBrandById(id, scope);
    if (!brand) return null;
    return this.toBrandResponse(brand);
  }

  async createBrand(dto: CreateBrandDto, scope: CosmeticsScope): Promise<BrandResponseDto> {
    // Check for duplicate code
    const existing = await this.repository.findBrandByCode(dto.code);
    if (existing) {
      throw new Error(`Brand code '${dto.code}' already exists`);
    }

    const brand = await this.repository.createBrand(dto, scope);
    return this.toBrandResponse(brand);
  }

  async updateBrand(
    id: string,
    dto: UpdateBrandDto,
    scope: CosmeticsScope,
  ): Promise<BrandResponseDto | null> {
    const brand = await this.repository.updateBrand(id, dto, scope);
    if (!brand) return null;
    return this.toBrandResponse(brand);
  }

  async deleteBrand(id: string, scope: CosmeticsScope): Promise<boolean> {
    return this.repository.deleteBrand(id, scope);
  }

  // ========== CONTENT PRESET METHODS ==========

  async getContentPresets(
    query: ContentPresetQueryDto,
    scope: CosmeticsScope,
  ): Promise<PaginatedResponse<ContentPresetResponseDto>> {
    const { data, total } = await this.repository.findContentPresets(query, scope);
    const page = query.page || 1;
    const limit = query.limit || 20;
    const totalPages = Math.ceil(total / limit);

    return {
      data: data.map(p => this.toContentPresetResponse(p)),
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

  async getContentPreset(
    id: string,
    scope: CosmeticsScope,
  ): Promise<ContentPresetResponseDto | null> {
    const preset = await this.repository.findContentPresetById(id, scope);
    if (!preset) return null;
    return this.toContentPresetResponse(preset);
  }

  async createContentPreset(
    dto: CreateContentPresetDto,
    scope: CosmeticsScope,
  ): Promise<ContentPresetResponseDto> {
    const preset = await this.repository.createContentPreset(dto, scope);
    return this.toContentPresetResponse(preset);
  }

  async updateContentPreset(
    id: string,
    dto: UpdateContentPresetDto,
    scope: CosmeticsScope,
  ): Promise<ContentPresetResponseDto | null> {
    const preset = await this.repository.updateContentPreset(id, dto, scope);
    if (!preset) return null;
    return this.toContentPresetResponse(preset);
  }

  // ========== BRAND CONTENT METHODS ==========

  async getBrandContents(
    query: BrandContentQueryDto,
    scope: CosmeticsScope,
  ): Promise<PaginatedResponse<BrandContentResponseDto>> {
    const { data, total } = await this.repository.findBrandContents(query, scope);
    const page = query.page || 1;
    const limit = query.limit || 20;
    const totalPages = Math.ceil(total / limit);

    return {
      data: data.map(c => this.toBrandContentResponse(c)),
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

  async getBrandContent(
    id: string,
    scope: CosmeticsScope,
  ): Promise<BrandContentResponseDto | null> {
    const content = await this.repository.findBrandContentById(id, scope);
    if (!content) return null;

    // Increment view count
    await this.repository.incrementViewCount(id);

    return this.toBrandContentResponse(content);
  }

  async createBrandContent(
    dto: CreateBrandContentDto,
    scope: CosmeticsScope,
  ): Promise<BrandContentResponseDto> {
    const content = await this.repository.createBrandContent(dto, scope);
    return this.toBrandContentResponse(content);
  }

  async updateBrandContent(
    id: string,
    dto: UpdateBrandContentDto,
    scope: CosmeticsScope,
  ): Promise<BrandContentResponseDto | null> {
    const content = await this.repository.updateBrandContent(id, dto, scope);
    if (!content) return null;
    return this.toBrandContentResponse(content);
  }

  async deleteBrandContent(id: string, scope: CosmeticsScope): Promise<boolean> {
    return this.repository.softDeleteBrandContent(id, scope);
  }

  // ========== GLOBAL CONTENT METHODS (Store) ==========

  async getGlobalContents(
    query: BrandContentQueryDto,
    scope: CosmeticsScope,
  ): Promise<GlobalContentResponseDto> {
    const { data, total } = await this.repository.findGlobalContents(query, scope);
    const page = query.page || 1;
    const limit = query.limit || 20;

    const brands = [...new Set(data.map(c => c.brandId))];

    return {
      data: data.map(c => this.toGlobalContentItem(c)),
      meta: {
        page,
        limit,
        total,
        brands,
      },
    };
  }

  async cloneContent(
    id: string,
    dto: CloneContentDto,
    scope: CosmeticsScope,
  ): Promise<CloneContentResponseDto> {
    const cloned = await this.repository.cloneBrandContent(id, scope, dto);
    if (!cloned) {
      throw new Error('Content not found');
    }

    return {
      content: this.toBrandContentResponse(cloned),
      originalId: id,
      clonedAt: new Date().toISOString(),
    };
  }

  // ========== TREND CARD METHODS ==========

  async getTrendCards(
    query: TrendCardQueryDto,
    scope: CosmeticsScope,
  ): Promise<PaginatedResponse<TrendCardResponseDto>> {
    const { data, total } = await this.repository.findTrendCards(query, scope);
    const page = query.page || 1;
    const limit = query.limit || 20;
    const totalPages = Math.ceil(total / limit);

    return {
      data: data.map(t => this.toTrendCardResponse(t)),
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

  async getTrendCard(id: string, scope: CosmeticsScope): Promise<TrendCardResponseDto | null> {
    const card = await this.repository.findTrendCardById(id, scope);
    if (!card) return null;
    return this.toTrendCardResponse(card);
  }

  async createTrendCard(
    dto: CreateTrendCardDto,
    scope: CosmeticsScope,
  ): Promise<TrendCardResponseDto> {
    const card = await this.repository.createTrendCard(dto, scope);
    return this.toTrendCardResponse(card);
  }

  async updateTrendCard(
    id: string,
    dto: UpdateTrendCardDto,
    scope: CosmeticsScope,
  ): Promise<TrendCardResponseDto | null> {
    const card = await this.repository.updateTrendCard(id, dto, scope);
    if (!card) return null;
    return this.toTrendCardResponse(card);
  }

  async deleteTrendCard(id: string, scope: CosmeticsScope): Promise<boolean> {
    return this.repository.deleteTrendCard(id, scope);
  }

  // ========== STATS METHODS ==========

  async getContentStats(scope: CosmeticsScope): Promise<ContentStatsDto> {
    return this.repository.getContentStats(scope);
  }

  // ========== RESPONSE TRANSFORMERS ==========

  private toBrandResponse(brand: CosmeticsBrand): BrandResponseDto {
    return {
      id: brand.id,
      organizationId: brand.organizationId,
      name: brand.name,
      code: brand.code,
      description: brand.description,
      logoUrl: brand.logoUrl,
      colorScheme: brand.colorScheme,
      category: brand.category,
      displayOrder: brand.displayOrder,
      isActive: brand.isActive,
      createdAt: brand.createdAt?.toISOString(),
      updatedAt: brand.updatedAt?.toISOString(),
    };
  }

  private toContentPresetResponse(preset: CosmeticsContentPreset): ContentPresetResponseDto {
    return {
      id: preset.id,
      organizationId: preset.organizationId,
      name: preset.name,
      type: preset.type,
      brandId: preset.brandId,
      coreTemplateId: preset.coreTemplateId,
      visualConfig: preset.visualConfig,
      thumbnailUrl: preset.thumbnailUrl,
      isActive: preset.isActive,
      createdAt: preset.createdAt?.toISOString(),
      updatedAt: preset.updatedAt?.toISOString(),
    };
  }

  private toBrandContentResponse(content: CosmeticsBrandContent): BrandContentResponseDto {
    return {
      id: content.id,
      organizationId: content.organizationId,
      brandId: content.brandId,
      title: content.title,
      description: content.description,
      contentType: content.contentType,
      mediaAssets: content.mediaAssets,
      season: content.season,
      source: content.source,
      scope: content.scope,
      isForced: content.isForced,
      parentContentId: content.parentContentId,
      campaignStart: content.campaignStart,
      campaignEnd: content.campaignEnd,
      status: content.status,
      isActive: content.isActive,
      cloneCount: content.cloneCount,
      viewCount: content.viewCount,
      createdAt: content.createdAt?.toISOString(),
      updatedAt: content.updatedAt?.toISOString(),
    };
  }

  private toTrendCardResponse(card: CosmeticsTrendCard): TrendCardResponseDto {
    return {
      id: card.id,
      organizationId: card.organizationId,
      title: card.title,
      description: card.description,
      trendType: card.trendType,
      colorPalette: card.colorPalette,
      productReferences: card.productReferences,
      thumbnailUrl: card.thumbnailUrl,
      season: card.season,
      year: card.year,
      displayOrder: card.displayOrder,
      isActive: card.isActive,
      createdAt: card.createdAt?.toISOString(),
      updatedAt: card.updatedAt?.toISOString(),
    };
  }

  private toGlobalContentItem(content: CosmeticsBrandContent): GlobalContentItemDto {
    return {
      id: content.id,
      title: content.title,
      description: content.description,
      contentType: content.contentType,
      brandId: content.brandId,
      source: 'cosmetics-brand',
      scope: 'global',
      isForced: false, // Cosmetics는 항상 false
      canClone: true, // Cosmetics는 항상 Clone 가능
      thumbnailUrl: content.mediaAssets?.mainImage || null,
      createdAt: content.createdAt?.toISOString(),
    };
  }
}
