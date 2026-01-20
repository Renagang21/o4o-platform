/**
 * Pharmacy Extension - Service
 *
 * WO-SIGNAGE-PHASE3-DEV-PHARMACY
 *
 * Business logic layer for Pharmacy Extension
 * Implements Global Content + Force model
 */

import type { DataSource } from 'typeorm';
import { PharmacyRepository } from '../repositories/pharmacy.repository.js';
import type {
  CreateCategoryDto,
  UpdateCategoryDto,
  CategoryQueryDto,
  CategoryResponseDto,
  CreateCampaignDto,
  UpdateCampaignDto,
  CampaignQueryDto,
  CampaignResponseDto,
  CreateTemplatePresetDto,
  UpdateTemplatePresetDto,
  TemplatePresetResponseDto,
  CreateContentDto,
  UpdateContentDto,
  ContentQueryDto,
  ContentResponseDto,
  CloneContentDto,
  CloneContentResponseDto,
  GlobalContentItemDto,
  GlobalContentResponseDto,
  ContentStatsDto,
} from '../dto/index.js';
import type {
  PharmacyCategory,
  PharmacySeasonalCampaign,
  PharmacyTemplatePreset,
  PharmacyContent,
} from '../entities/index.js';

/**
 * Pharmacy scope for multi-tenant operations
 */
interface PharmacyScope {
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
 * Pharmacy Service
 */
export class PharmacyService {
  private repository: PharmacyRepository;

  constructor(dataSource: DataSource) {
    this.repository = new PharmacyRepository(dataSource);
  }

  // ========== CATEGORY METHODS ==========

  async getCategories(
    query: CategoryQueryDto,
    scope: PharmacyScope,
  ): Promise<PaginatedResponse<CategoryResponseDto>> {
    const { data, total } = await this.repository.findCategories(query, scope);
    const page = query.page || 1;
    const limit = query.limit || 20;
    const totalPages = Math.ceil(total / limit);

    return {
      data: data.map(c => this.toCategoryResponse(c)),
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

  async getCategory(id: string, scope: PharmacyScope): Promise<CategoryResponseDto | null> {
    const category = await this.repository.findCategoryById(id, scope);
    if (!category) return null;
    return this.toCategoryResponse(category);
  }

  async createCategory(
    dto: CreateCategoryDto,
    scope: PharmacyScope,
  ): Promise<CategoryResponseDto> {
    // Check for duplicate code
    const existing = await this.repository.findCategoryByCode(dto.code);
    if (existing) {
      throw new Error(`Category code '${dto.code}' already exists`);
    }

    const category = await this.repository.createCategory(dto, scope);
    return this.toCategoryResponse(category);
  }

  async updateCategory(
    id: string,
    dto: UpdateCategoryDto,
    scope: PharmacyScope,
  ): Promise<CategoryResponseDto | null> {
    const category = await this.repository.updateCategory(id, dto, scope);
    if (!category) return null;
    return this.toCategoryResponse(category);
  }

  async deleteCategory(id: string, scope: PharmacyScope): Promise<boolean> {
    return this.repository.deleteCategory(id, scope);
  }

  // ========== CAMPAIGN METHODS ==========

  async getCampaigns(
    query: CampaignQueryDto,
    scope: PharmacyScope,
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

  async getCampaign(id: string, scope: PharmacyScope): Promise<CampaignResponseDto | null> {
    const campaign = await this.repository.findCampaignById(id, scope);
    if (!campaign) return null;
    return this.toCampaignResponse(campaign);
  }

  async createCampaign(
    dto: CreateCampaignDto,
    scope: PharmacyScope,
  ): Promise<CampaignResponseDto> {
    const campaign = await this.repository.createCampaign(dto, scope);
    return this.toCampaignResponse(campaign);
  }

  async updateCampaign(
    id: string,
    dto: UpdateCampaignDto,
    scope: PharmacyScope,
  ): Promise<CampaignResponseDto | null> {
    const campaign = await this.repository.updateCampaign(id, dto, scope);
    if (!campaign) return null;
    return this.toCampaignResponse(campaign);
  }

  async deleteCampaign(id: string, scope: PharmacyScope): Promise<boolean> {
    return this.repository.deleteCampaign(id, scope);
  }

  // ========== TEMPLATE PRESET METHODS ==========

  async getTemplatePresets(
    scope: PharmacyScope,
    type?: string,
  ): Promise<TemplatePresetResponseDto[]> {
    const presets = await this.repository.findTemplatePresets(scope, type);
    return presets.map(p => this.toTemplatePresetResponse(p));
  }

  async getTemplatePreset(
    id: string,
    scope: PharmacyScope,
  ): Promise<TemplatePresetResponseDto | null> {
    const preset = await this.repository.findTemplatePresetById(id, scope);
    if (!preset) return null;
    return this.toTemplatePresetResponse(preset);
  }

  async createTemplatePreset(
    dto: CreateTemplatePresetDto,
    scope: PharmacyScope,
  ): Promise<TemplatePresetResponseDto> {
    const preset = await this.repository.createTemplatePreset(dto, scope);
    return this.toTemplatePresetResponse(preset);
  }

  async updateTemplatePreset(
    id: string,
    dto: UpdateTemplatePresetDto,
    scope: PharmacyScope,
  ): Promise<TemplatePresetResponseDto | null> {
    const preset = await this.repository.updateTemplatePreset(id, dto, scope);
    if (!preset) return null;
    return this.toTemplatePresetResponse(preset);
  }

  // ========== CONTENT METHODS (HQ/Operator) ==========

  async getContents(
    query: ContentQueryDto,
    scope: PharmacyScope,
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

  async getContent(id: string, scope: PharmacyScope): Promise<ContentResponseDto | null> {
    const content = await this.repository.findContentById(id, scope);
    if (!content) return null;

    // Increment view count
    await this.repository.incrementViewCount(id);

    return this.toContentResponse(content);
  }

  async createContent(dto: CreateContentDto, scope: PharmacyScope): Promise<ContentResponseDto> {
    // Validate Force permission
    // Phase 3 Design FROZEN: Only pharmacy-hq can set isForced = true
    if (dto.isForced && dto.source !== 'pharmacy-hq') {
      throw new Error('Only pharmacy-hq source can set isForced to true');
    }

    const content = await this.repository.createContent(dto, scope);
    return this.toContentResponse(content);
  }

  async updateContent(
    id: string,
    dto: UpdateContentDto,
    scope: PharmacyScope,
  ): Promise<ContentResponseDto | null> {
    // Get existing content to check Force rules
    const existing = await this.repository.findContentById(id, scope);
    if (!existing) return null;

    // Validate Force permission change
    if (dto.isForced !== undefined && dto.isForced !== existing.isForced) {
      if (dto.isForced && existing.source !== 'pharmacy-hq') {
        throw new Error('Only pharmacy-hq source can set isForced to true');
      }
    }

    const content = await this.repository.updateContent(id, dto, scope);
    if (!content) return null;
    return this.toContentResponse(content);
  }

  async deleteContent(id: string, scope: PharmacyScope): Promise<boolean> {
    // Check if content is forced
    const content = await this.repository.findContentById(id, scope);
    if (content?.isForced) {
      throw new Error('Forced content cannot be deleted');
    }

    return this.repository.softDeleteContent(id, scope);
  }

  // ========== GLOBAL CONTENT METHODS (Store) ==========

  async getGlobalContents(
    query: ContentQueryDto,
    scope: PharmacyScope,
  ): Promise<GlobalContentResponseDto> {
    const { data, total } = await this.repository.findGlobalContents(query, scope);
    const page = query.page || 1;
    const limit = query.limit || 20;

    const hasForced = data.some(c => c.isForced);
    const sources = [...new Set(data.map(c => c.source))];

    return {
      data: data.map(c => this.toGlobalContentItem(c)),
      meta: {
        page,
        limit,
        total,
        hasForced,
        sources,
      },
    };
  }

  async cloneContent(
    id: string,
    dto: CloneContentDto,
    scope: PharmacyScope,
  ): Promise<CloneContentResponseDto> {
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

  // ========== STATS METHODS ==========

  async getContentStats(scope: PharmacyScope): Promise<ContentStatsDto> {
    return this.repository.getContentStats(scope) as Promise<ContentStatsDto>;
  }

  // ========== RESPONSE TRANSFORMERS ==========

  private toCategoryResponse(category: PharmacyCategory): CategoryResponseDto {
    return {
      id: category.id,
      organizationId: category.organizationId,
      name: category.name,
      code: category.code,
      parentId: category.parentId,
      iconUrl: category.iconUrl,
      displayOrder: category.displayOrder,
      isActive: category.isActive,
      createdAt: category.createdAt?.toISOString(),
      updatedAt: category.updatedAt?.toISOString(),
    };
  }

  private toCampaignResponse(campaign: PharmacySeasonalCampaign): CampaignResponseDto {
    return {
      id: campaign.id,
      organizationId: campaign.organizationId,
      name: campaign.name,
      season: campaign.season,
      healthCondition: campaign.healthCondition,
      categoryId: campaign.categoryId,
      productKeywords: campaign.productKeywords,
      startDate: campaign.startDate,
      endDate: campaign.endDate,
      priority: campaign.priority,
      scope: campaign.scope,
      isForced: campaign.isForced,
      isActive: campaign.isActive,
      createdAt: campaign.createdAt?.toISOString(),
      updatedAt: campaign.updatedAt?.toISOString(),
    };
  }

  private toTemplatePresetResponse(preset: PharmacyTemplatePreset): TemplatePresetResponseDto {
    return {
      id: preset.id,
      organizationId: preset.organizationId,
      name: preset.name,
      type: preset.type,
      coreTemplateId: preset.coreTemplateId,
      config: preset.config,
      thumbnailUrl: preset.thumbnailUrl,
      isActive: preset.isActive,
      createdAt: preset.createdAt?.toISOString(),
      updatedAt: preset.updatedAt?.toISOString(),
    };
  }

  private toContentResponse(content: PharmacyContent): ContentResponseDto {
    return {
      id: content.id,
      organizationId: content.organizationId,
      supplierId: content.supplierId,
      title: content.title,
      description: content.description,
      contentType: content.contentType,
      categoryId: content.categoryId,
      campaignId: content.campaignId,
      templatePresetId: content.templatePresetId,
      mediaData: content.mediaData,
      source: content.source,
      scope: content.scope,
      isForced: content.isForced,
      parentContentId: content.parentContentId,
      validFrom: content.validFrom,
      validUntil: content.validUntil,
      status: content.status,
      isActive: content.isActive,
      cloneCount: content.cloneCount,
      viewCount: content.viewCount,
      createdAt: content.createdAt?.toISOString(),
      updatedAt: content.updatedAt?.toISOString(),
    };
  }

  private toGlobalContentItem(content: PharmacyContent): GlobalContentItemDto {
    return {
      id: content.id,
      title: content.title,
      description: content.description,
      contentType: content.contentType,
      source: content.source,
      scope: 'global',
      isForced: content.isForced,
      canClone: !content.isForced,
      thumbnailUrl: content.mediaData?.imageUrl || null,
      createdAt: content.createdAt?.toISOString(),
    };
  }
}
