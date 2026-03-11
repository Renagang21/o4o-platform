import { DataSource, Repository, FindOptionsWhere } from 'typeorm';
import { ContentBundle, ContentBundleType, ContentItem } from '../entities/ContentBundle.js';

// DataSource is injected at runtime from api-server
let AppDataSource: DataSource;

/**
 * Initialize the ContentBundle service with required dependencies
 * Called by api-server during module loading
 */
export function initContentBundleService(dataSource: DataSource): void {
  AppDataSource = dataSource;
}

export interface ContentBundleSearchOptions {
  type?: ContentBundleType;
  organizationId?: string;
  isPublished?: boolean;
  query?: string;
  page?: number;
  limit?: number;
  sortBy?: 'latest' | 'oldest' | 'title';
}

export interface ContentBundleListResult {
  bundles: ContentBundle[];
  totalCount: number;
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
  };
}

export class ContentBundleService {
  private get repository(): Repository<ContentBundle> {
    return AppDataSource.getRepository(ContentBundle);
  }

  /**
   * Create a new content bundle
   */
  async create(data: Partial<ContentBundle>, creatorId?: string): Promise<ContentBundle> {
    const bundle = this.repository.create({
      ...data,
      createdBy: creatorId,
      contentItems: data.contentItems || [],
      metadata: data.metadata || {},
    });

    return await this.repository.save(bundle);
  }

  /**
   * Get a content bundle by ID
   */
  async findById(id: string): Promise<ContentBundle | null> {
    return await this.repository.findOne({
      where: { id },
    });
  }

  /**
   * Update a content bundle
   */
  async update(id: string, data: Partial<ContentBundle>): Promise<ContentBundle | null> {
    const bundle = await this.repository.findOne({ where: { id } });
    if (!bundle) return null;

    await this.repository.update(id, data);
    return await this.repository.findOne({ where: { id } });
  }

  /**
   * Delete a content bundle
   */
  async delete(id: string): Promise<boolean> {
    const result = await this.repository.delete(id);
    return (result.affected || 0) > 0;
  }

  /**
   * List content bundles with filtering and pagination
   */
  async list(options: ContentBundleSearchOptions = {}): Promise<ContentBundleListResult> {
    const page = options.page || 1;
    const limit = Math.min(options.limit || 20, 100);
    const skip = (page - 1) * limit;

    const queryBuilder = this.repository.createQueryBuilder('bundle');

    // Type filter
    if (options.type) {
      queryBuilder.andWhere('bundle.type = :type', { type: options.type });
    }

    // Organization filter
    if (options.organizationId) {
      queryBuilder.andWhere('bundle.organizationId = :organizationId', {
        organizationId: options.organizationId,
      });
    }

    // Published filter
    if (options.isPublished !== undefined) {
      queryBuilder.andWhere('bundle.isPublished = :isPublished', {
        isPublished: options.isPublished,
      });
    }

    // Search query
    if (options.query) {
      queryBuilder.andWhere(
        '(bundle.title ILIKE :query OR bundle.description ILIKE :query)',
        { query: `%${options.query}%` }
      );
    }

    // Sorting
    switch (options.sortBy) {
      case 'oldest':
        queryBuilder.orderBy('bundle.createdAt', 'ASC');
        break;
      case 'title':
        queryBuilder.orderBy('bundle.title', 'ASC');
        break;
      case 'latest':
      default:
        queryBuilder.orderBy('bundle.createdAt', 'DESC');
        break;
    }

    // Pagination
    queryBuilder.skip(skip).take(limit);

    const [bundles, totalCount] = await queryBuilder.getManyAndCount();

    return {
      bundles,
      totalCount,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  }

  /**
   * Publish a content bundle
   */
  async publish(id: string): Promise<ContentBundle | null> {
    const bundle = await this.repository.findOne({ where: { id } });
    if (!bundle) return null;

    bundle.publish();
    return await this.repository.save(bundle);
  }

  /**
   * Unpublish a content bundle
   */
  async unpublish(id: string): Promise<ContentBundle | null> {
    const bundle = await this.repository.findOne({ where: { id } });
    if (!bundle) return null;

    bundle.unpublish();
    return await this.repository.save(bundle);
  }

  /**
   * Add a content item to a bundle
   */
  async addContentItem(bundleId: string, item: Omit<ContentItem, 'order'>): Promise<ContentBundle | null> {
    const bundle = await this.repository.findOne({ where: { id: bundleId } });
    if (!bundle) return null;

    bundle.addContentItem(item);
    return await this.repository.save(bundle);
  }

  /**
   * Remove a content item from a bundle
   */
  async removeContentItem(bundleId: string, itemId: string): Promise<ContentBundle | null> {
    const bundle = await this.repository.findOne({ where: { id: bundleId } });
    if (!bundle) return null;

    bundle.removeContentItem(itemId);
    return await this.repository.save(bundle);
  }

  /**
   * Reorder content items in a bundle
   */
  async reorderContentItems(bundleId: string, itemIds: string[]): Promise<ContentBundle | null> {
    const bundle = await this.repository.findOne({ where: { id: bundleId } });
    if (!bundle) return null;

    bundle.reorderContentItems(itemIds);
    return await this.repository.save(bundle);
  }

  /**
   * Get bundles by type
   */
  async findByType(
    type: ContentBundleType,
    publishedOnly: boolean = true
  ): Promise<ContentBundle[]> {
    const where: FindOptionsWhere<ContentBundle> = { type };
    if (publishedOnly) {
      where.isPublished = true;
    }

    return await this.repository.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get bundles by organization
   */
  async findByOrganization(
    organizationId: string,
    publishedOnly: boolean = true
  ): Promise<ContentBundle[]> {
    const where: FindOptionsWhere<ContentBundle> = { organizationId };
    if (publishedOnly) {
      where.isPublished = true;
    }

    return await this.repository.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Count bundles by type
   */
  async countByType(type: ContentBundleType): Promise<number> {
    return await this.repository.count({ where: { type } });
  }
}

// Singleton instance
export const contentBundleService = new ContentBundleService();
