/**
 * Brand Service
 *
 * Handles CRUD operations for cosmetics brands
 */

import { DataSource, Repository } from 'typeorm';
import { CosmeticsBrand } from '../entities/brand.entity.js';

export interface CreateBrandDTO {
  name: string;
  logoUrl?: string;
  description?: string;
  metadata?: {
    country?: string;
    founded?: string;
    tags?: string[];
  };
}

export interface UpdateBrandDTO {
  name?: string;
  logoUrl?: string;
  description?: string;
  metadata?: {
    country?: string;
    founded?: string;
    tags?: string[];
  };
}

export interface BrandListOptions {
  page?: number;
  limit?: number;
  search?: string;
  country?: string;
  tags?: string[];
}

export class BrandService {
  private brandRepo: Repository<CosmeticsBrand>;

  constructor(private dataSource: DataSource) {
    this.brandRepo = dataSource.getRepository(CosmeticsBrand);
  }

  /**
   * Create a new brand
   */
  async createBrand(dto: CreateBrandDTO): Promise<CosmeticsBrand> {
    const brand = this.brandRepo.create({
      name: dto.name,
      logoUrl: dto.logoUrl,
      description: dto.description,
      metadata: dto.metadata || {},
    });

    return await this.brandRepo.save(brand);
  }

  /**
   * Get brand by ID
   */
  async getBrandById(brandId: string): Promise<CosmeticsBrand | null> {
    const brand = await this.brandRepo.findOne({
      where: { id: brandId },
    });

    return brand;
  }

  /**
   * Get brand by name (case-insensitive)
   */
  async getBrandByName(name: string): Promise<CosmeticsBrand | null> {
    const brand = await this.brandRepo
      .createQueryBuilder('brand')
      .where('LOWER(brand.name) = LOWER(:name)', { name })
      .getOne();

    return brand;
  }

  /**
   * List brands with filtering and pagination
   */
  async listBrands(options: BrandListOptions = {}): Promise<{
    brands: CosmeticsBrand[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const queryBuilder = this.brandRepo.createQueryBuilder('brand');

    // Apply search filter
    if (options.search) {
      queryBuilder.where(
        'LOWER(brand.name) LIKE LOWER(:search) OR LOWER(brand.description) LIKE LOWER(:search)',
        { search: `%${options.search}%` }
      );
    }

    // Apply country filter
    if (options.country) {
      queryBuilder.andWhere("brand.metadata->>'country' = :country", {
        country: options.country,
      });
    }

    // Apply tags filter (any tag matches)
    if (options.tags && options.tags.length > 0) {
      queryBuilder.andWhere("brand.metadata->'tags' ?| ARRAY[:...tags]", {
        tags: options.tags,
      });
    }

    // Order by name alphabetically
    queryBuilder.orderBy('brand.name', 'ASC');

    // Pagination
    queryBuilder.skip(skip).take(limit);

    const [brands, total] = await queryBuilder.getManyAndCount();
    const totalPages = Math.ceil(total / limit);

    return {
      brands,
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Update brand
   */
  async updateBrand(
    brandId: string,
    dto: UpdateBrandDTO
  ): Promise<CosmeticsBrand | null> {
    const brand = await this.brandRepo.findOne({
      where: { id: brandId },
    });

    if (!brand) {
      return null;
    }

    // Update fields
    if (dto.name !== undefined) {
      brand.name = dto.name;
    }
    if (dto.logoUrl !== undefined) {
      brand.logoUrl = dto.logoUrl;
    }
    if (dto.description !== undefined) {
      brand.description = dto.description;
    }
    if (dto.metadata !== undefined) {
      brand.metadata = { ...brand.metadata, ...dto.metadata };
    }

    return await this.brandRepo.save(brand);
  }

  /**
   * Delete brand
   */
  async deleteBrand(brandId: string): Promise<boolean> {
    const result = await this.brandRepo.delete({ id: brandId });
    return (result.affected || 0) > 0;
  }

  /**
   * Get all brands (no pagination, for dropdown/select use)
   */
  async getAllBrands(): Promise<CosmeticsBrand[]> {
    return await this.brandRepo.find({
      order: { name: 'ASC' },
    });
  }
}
