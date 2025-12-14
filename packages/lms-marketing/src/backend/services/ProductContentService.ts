/**
 * ProductContentService
 *
 * Manages product content for marketing delivery.
 * Links supplier product information to ContentBundle for targeted delivery.
 */

import type { DataSource, Repository } from 'typeorm';
import {
  ProductContent,
  type ProductContentTargeting,
  type TargetAudience,
} from '../entities/ProductContent.entity.js';

/**
 * DTO for creating product content
 */
export interface CreateProductContentDto {
  supplierId: string;
  bundleId: string;
  title: string;
  sku?: string;
  brand?: string;
  category?: string;
  targeting?: ProductContentTargeting;
  metadata?: Record<string, unknown>;
}

/**
 * DTO for updating product content
 */
export interface UpdateProductContentDto {
  title?: string;
  sku?: string;
  brand?: string;
  category?: string;
  targeting?: ProductContentTargeting;
  metadata?: Record<string, unknown>;
}

/**
 * User context for targeted content retrieval
 */
export interface UserContext {
  role: TargetAudience;
  region?: string;
  sellerType?: string;
  tags?: string[];
}

/**
 * List options for querying product content
 */
export interface ProductContentListOptions {
  supplierId?: string;
  isActive?: boolean;
  isPublished?: boolean;
  category?: string;
  brand?: string;
  limit?: number;
  offset?: number;
}

let productContentServiceInstance: ProductContentService | null = null;

export class ProductContentService {
  private repository: Repository<ProductContent>;

  constructor(private dataSource: DataSource) {
    this.repository = dataSource.getRepository(ProductContent);
  }

  /**
   * Create new product content
   */
  async create(dto: CreateProductContentDto): Promise<ProductContent> {
    const productContent = this.repository.create({
      supplierId: dto.supplierId,
      bundleId: dto.bundleId,
      title: dto.title,
      sku: dto.sku || null,
      brand: dto.brand || null,
      category: dto.category || null,
      targeting: dto.targeting || { targets: ['all'] },
      metadata: dto.metadata || {},
      isActive: true,
      isPublished: false,
    });

    return this.repository.save(productContent);
  }

  /**
   * Get product content by ID
   */
  async getById(id: string): Promise<ProductContent | null> {
    return this.repository.findOne({ where: { id } });
  }

  /**
   * Get all product contents for a supplier
   */
  async getBySupplier(
    supplierId: string,
    options?: { isActive?: boolean; isPublished?: boolean }
  ): Promise<ProductContent[]> {
    const where: Record<string, unknown> = { supplierId };

    if (options?.isActive !== undefined) {
      where.isActive = options.isActive;
    }
    if (options?.isPublished !== undefined) {
      where.isPublished = options.isPublished;
    }

    return this.repository.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get product contents targeted for a specific user
   */
  async getForUser(userContext: UserContext): Promise<ProductContent[]> {
    // Get all active, published contents
    const allContents = await this.repository.find({
      where: {
        isActive: true,
        isPublished: true,
      },
      order: { publishedAt: 'DESC' },
    });

    // Filter by targeting
    return allContents.filter((content) => {
      const targeting = content.targeting;

      // Check target audience
      if (
        !targeting.targets.includes('all') &&
        !targeting.targets.includes(userContext.role)
      ) {
        return false;
      }

      // Check region if specified
      if (
        targeting.regions &&
        targeting.regions.length > 0 &&
        userContext.region
      ) {
        if (!targeting.regions.includes(userContext.region)) {
          return false;
        }
      }

      // Check seller type if user is a seller
      if (
        userContext.role === 'seller' &&
        targeting.sellerTypes &&
        targeting.sellerTypes.length > 0 &&
        userContext.sellerType
      ) {
        if (!targeting.sellerTypes.includes(userContext.sellerType)) {
          return false;
        }
      }

      // Check tags if specified
      if (targeting.tags && targeting.tags.length > 0 && userContext.tags) {
        const hasMatchingTag = targeting.tags.some((tag) =>
          userContext.tags?.includes(tag)
        );
        if (!hasMatchingTag) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * List product contents with options
   */
  async list(options?: ProductContentListOptions): Promise<{
    items: ProductContent[];
    total: number;
  }> {
    const where: Record<string, unknown> = {};

    if (options?.supplierId) {
      where.supplierId = options.supplierId;
    }
    if (options?.isActive !== undefined) {
      where.isActive = options.isActive;
    }
    if (options?.isPublished !== undefined) {
      where.isPublished = options.isPublished;
    }
    if (options?.category) {
      where.category = options.category;
    }
    if (options?.brand) {
      where.brand = options.brand;
    }

    const [items, total] = await this.repository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      take: options?.limit || 20,
      skip: options?.offset || 0,
    });

    return { items, total };
  }

  /**
   * Update product content
   */
  async update(
    id: string,
    dto: UpdateProductContentDto
  ): Promise<ProductContent | null> {
    const existing = await this.getById(id);
    if (!existing) {
      return null;
    }

    if (dto.title !== undefined) existing.title = dto.title;
    if (dto.sku !== undefined) existing.sku = dto.sku || null;
    if (dto.brand !== undefined) existing.brand = dto.brand || null;
    if (dto.category !== undefined) existing.category = dto.category || null;
    if (dto.targeting !== undefined) existing.targeting = dto.targeting;
    if (dto.metadata !== undefined) existing.metadata = dto.metadata;

    return this.repository.save(existing);
  }

  /**
   * Publish product content (make visible to targets)
   */
  async publish(id: string): Promise<ProductContent | null> {
    const existing = await this.getById(id);
    if (!existing) {
      return null;
    }

    existing.isPublished = true;
    existing.publishedAt = new Date();

    return this.repository.save(existing);
  }

  /**
   * Unpublish product content (hide from targets)
   */
  async unpublish(id: string): Promise<ProductContent | null> {
    const existing = await this.getById(id);
    if (!existing) {
      return null;
    }

    existing.isPublished = false;

    return this.repository.save(existing);
  }

  /**
   * Deactivate product content
   */
  async deactivate(id: string): Promise<ProductContent | null> {
    const existing = await this.getById(id);
    if (!existing) {
      return null;
    }

    existing.isActive = false;
    existing.isPublished = false;

    return this.repository.save(existing);
  }

  /**
   * Reactivate product content
   */
  async activate(id: string): Promise<ProductContent | null> {
    const existing = await this.getById(id);
    if (!existing) {
      return null;
    }

    existing.isActive = true;

    return this.repository.save(existing);
  }

  /**
   * Delete product content (soft delete by deactivating)
   */
  async delete(id: string): Promise<boolean> {
    const result = await this.deactivate(id);
    return result !== null;
  }

  /**
   * Hard delete product content
   */
  async hardDelete(id: string): Promise<boolean> {
    const result = await this.repository.delete(id);
    return (result.affected ?? 0) > 0;
  }
}

/**
 * Get ProductContentService singleton instance
 */
export function getProductContentService(): ProductContentService {
  if (!productContentServiceInstance) {
    throw new Error(
      'ProductContentService not initialized. Call initProductContentService first.'
    );
  }
  return productContentServiceInstance;
}

/**
 * Initialize ProductContentService with DataSource
 */
export function initProductContentService(
  dataSource: DataSource
): ProductContentService {
  productContentServiceInstance = new ProductContentService(dataSource);
  return productContentServiceInstance;
}
