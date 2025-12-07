/**
 * Campaign Service
 *
 * Handles cosmetics campaign CRUD and auto-generation
 * Based on brand/category/concerns for marketing purposes
 */

import { DataSource, Repository } from 'typeorm';
import { CosmeticsCampaign, CampaignType } from '../entities/campaign.entity.js';
import { RecommendationEngineService } from './recommendation-engine.service.js';

// ====== DTOs ======

export interface CreateCampaignDTO {
  title: string;
  type: CampaignType;
  brandId?: string;
  category?: string;
  concerns?: string[];
  products?: Array<{ productId: string; order?: number; featured?: boolean }>;
  routines?: Array<{ routineId: string; order?: number }>;
  signagePlaylistId?: string;
  metadata?: Record<string, any>;
}

export interface UpdateCampaignDTO {
  title?: string;
  type?: CampaignType;
  brandId?: string;
  category?: string;
  concerns?: string[];
  products?: Array<{ productId: string; order?: number; featured?: boolean }>;
  routines?: Array<{ routineId: string; order?: number }>;
  signagePlaylistId?: string;
  metadata?: Record<string, any>;
}

export interface AutoCampaignFilters {
  brandId?: string;
  category?: string;
  concerns?: string[];
  includeRoutines?: boolean;
  maxProducts?: number;
  maxRoutines?: number;
  period?: {
    startDate?: string;
    endDate?: string;
  };
}

export interface CampaignListOptions {
  type?: CampaignType;
  status?: string;
  brandId?: string;
  category?: string;
  page?: number;
  limit?: number;
}

// ====== Service ======

export class CampaignService {
  private campaignRepo: Repository<CosmeticsCampaign>;
  private recommendationEngine: RecommendationEngineService;

  constructor(private dataSource: DataSource) {
    this.campaignRepo = dataSource.getRepository(CosmeticsCampaign);
    this.recommendationEngine = new RecommendationEngineService(dataSource);
  }

  /**
   * Create a new campaign
   */
  async createCampaign(dto: CreateCampaignDTO): Promise<CosmeticsCampaign> {
    const campaign = this.campaignRepo.create({
      title: dto.title,
      type: dto.type,
      brandId: dto.brandId,
      category: dto.category,
      concerns: dto.concerns || [],
      products: dto.products || [],
      routines: dto.routines || [],
      signagePlaylistId: dto.signagePlaylistId,
      metadata: dto.metadata || {},
    });

    return await this.campaignRepo.save(campaign);
  }

  /**
   * Get campaign by ID
   */
  async getCampaign(campaignId: string): Promise<CosmeticsCampaign | null> {
    return await this.campaignRepo.findOne({
      where: { id: campaignId },
    });
  }

  /**
   * List campaigns with filtering and pagination
   */
  async listCampaigns(options: CampaignListOptions = {}): Promise<{
    campaigns: CosmeticsCampaign[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const queryBuilder = this.campaignRepo.createQueryBuilder('campaign');

    // Filter by type
    if (options.type) {
      queryBuilder.where('campaign.type = :type', { type: options.type });
    }

    // Filter by brand
    if (options.brandId) {
      queryBuilder.andWhere('campaign.brandId = :brandId', { brandId: options.brandId });
    }

    // Filter by category
    if (options.category) {
      queryBuilder.andWhere('campaign.category = :category', { category: options.category });
    }

    // Filter by status
    if (options.status) {
      queryBuilder.andWhere("campaign.metadata->>'status' = :status", { status: options.status });
    }

    // Order by most recent first
    queryBuilder.orderBy('campaign.createdAt', 'DESC');

    // Pagination
    queryBuilder.skip(skip).take(limit);

    const [campaigns, total] = await queryBuilder.getManyAndCount();
    const totalPages = Math.ceil(total / limit);

    return {
      campaigns,
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Update campaign
   */
  async updateCampaign(
    campaignId: string,
    dto: UpdateCampaignDTO
  ): Promise<CosmeticsCampaign | null> {
    const campaign = await this.campaignRepo.findOne({
      where: { id: campaignId },
    });

    if (!campaign) {
      return null;
    }

    // Update fields
    if (dto.title !== undefined) campaign.title = dto.title;
    if (dto.type !== undefined) campaign.type = dto.type;
    if (dto.brandId !== undefined) campaign.brandId = dto.brandId;
    if (dto.category !== undefined) campaign.category = dto.category;
    if (dto.concerns !== undefined) campaign.concerns = dto.concerns;
    if (dto.products !== undefined) campaign.products = dto.products;
    if (dto.routines !== undefined) campaign.routines = dto.routines;
    if (dto.signagePlaylistId !== undefined) campaign.signagePlaylistId = dto.signagePlaylistId;
    if (dto.metadata !== undefined) {
      campaign.metadata = { ...campaign.metadata, ...dto.metadata };
    }

    return await this.campaignRepo.save(campaign);
  }

  /**
   * Delete campaign
   */
  async deleteCampaign(campaignId: string): Promise<boolean> {
    const result = await this.campaignRepo.delete({ id: campaignId });
    return (result.affected || 0) > 0;
  }

  /**
   * Generate auto campaign based on filters
   */
  async generateAutoCampaign(filters: AutoCampaignFilters): Promise<CosmeticsCampaign> {
    const maxProducts = filters.maxProducts || 10;
    const maxRoutines = filters.maxRoutines || 3;

    // Determine campaign type and title
    let type: CampaignType = 'custom';
    let title = 'Auto-generated Campaign';

    if (filters.brandId) {
      type = 'brand';
      title = `Brand Campaign - ${filters.brandId}`;
    } else if (filters.category) {
      type = 'category';
      title = `${filters.category} Campaign`;
    } else if (filters.concerns && filters.concerns.length > 0) {
      type = 'concern';
      title = `${filters.concerns.join(', ')} Campaign`;
    }

    // Collect products from different sources
    const allProducts: Array<{ productId: string; order: number; featured?: boolean }> = [];

    // 1. Brand-based products
    if (filters.brandId) {
      const brandProducts = await this.getBrandProducts(filters.brandId, maxProducts);
      brandProducts.forEach((productId, idx) => {
        allProducts.push({ productId, order: idx, featured: idx === 0 });
      });
    }

    // 2. Category-based products
    if (filters.category) {
      const categoryProducts = await this.getCategoryProducts(filters.category, maxProducts);
      categoryProducts.forEach((productId, idx) => {
        if (!allProducts.find(p => p.productId === productId)) {
          allProducts.push({ productId, order: allProducts.length + idx });
        }
      });
    }

    // 3. Recommendation-based products
    if (filters.concerns && filters.concerns.length > 0) {
      const recommendedProducts = await this.getRecommendedProducts(filters.concerns, maxProducts);
      recommendedProducts.forEach((productId, idx) => {
        if (!allProducts.find(p => p.productId === productId)) {
          allProducts.push({ productId, order: allProducts.length + idx });
        }
      });
    }

    // Limit to maxProducts
    const products = allProducts.slice(0, maxProducts);

    // Get routines if requested
    let routines: Array<{ routineId: string; order: number }> = [];
    if (filters.includeRoutines) {
      const routineIds = await this.getMatchingRoutines(filters.concerns, maxRoutines);
      routines = routineIds.map((routineId, idx) => ({ routineId, order: idx }));
    }

    // Create campaign
    const campaign = await this.createCampaign({
      title,
      type,
      brandId: filters.brandId,
      category: filters.category,
      concerns: filters.concerns,
      products,
      routines,
      metadata: {
        autoGenerated: true,
        colorTheme: type,
        tags: [type, filters.category, ...(filters.concerns || [])].filter(Boolean),
        period: filters.period,
        status: 'active',
      },
    });

    return campaign;
  }

  // ====== Helper Methods ======

  private async getBrandProducts(brandId: string, limit: number): Promise<string[]> {
    try {
      const query = `
        SELECT id FROM custom_post_types
        WHERE type = 'cosmetics_product'
        AND metadata->>'brand' = $1
        AND metadata->>'enabled' = 'true'
        ORDER BY RANDOM()
        LIMIT $2
      `;

      const results = await this.dataSource.query(query, [brandId, limit]);
      return results.map((r: any) => r.id);
    } catch (error) {
      console.error('Error fetching brand products:', error);
      return [];
    }
  }

  private async getCategoryProducts(category: string, limit: number): Promise<string[]> {
    try {
      const query = `
        SELECT id FROM custom_post_types
        WHERE type = 'cosmetics_product'
        AND metadata->>'category' = $1
        AND metadata->>'enabled' = 'true'
        ORDER BY RANDOM()
        LIMIT $2
      `;

      const results = await this.dataSource.query(query, [category, limit]);
      return results.map((r: any) => r.id);
    } catch (error) {
      console.error('Error fetching category products:', error);
      return [];
    }
  }

  private async getRecommendedProducts(concerns: string[], limit: number): Promise<string[]> {
    try {
      const recommendations = await this.recommendationEngine.recommendProducts({
        concerns,
        limit,
      });

      return recommendations.map((rec) => rec.productId);
    } catch (error) {
      console.error('Error getting recommended products:', error);
      return [];
    }
  }

  private async getMatchingRoutines(concerns?: string[], limit: number = 3): Promise<string[]> {
    try {
      let query = `
        SELECT id FROM cosmetics_routines
        WHERE "isPublished" = true
      `;

      const params: any[] = [];

      if (concerns && concerns.length > 0) {
        query += ` AND metadata->'concerns' ?| ARRAY[$1]`;
        params.push(concerns);
      }

      query += ` ORDER BY "viewCount" DESC, "recommendCount" DESC LIMIT $${params.length + 1}`;
      params.push(limit);

      const results = await this.dataSource.query(query, params);
      return results.map((r: any) => r.id);
    } catch (error) {
      console.error('Error fetching matching routines:', error);
      return [];
    }
  }
}
