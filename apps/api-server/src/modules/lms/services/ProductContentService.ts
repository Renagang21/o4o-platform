import { Repository } from 'typeorm';
import { AppDataSource } from '../../../database/connection.js';
import { BaseService } from '../../../common/base.service.js';
import { ProductContent, ProductContentStatus } from '@o4o/lms-marketing';
import type { ProductTargeting } from '@o4o/lms-marketing';
import logger from '../../../utils/logger.js';

/**
 * ProductContentService
 * LMS Module - ProductContent Management (Phase 2 Refoundation)
 *
 * Marketing wrapper for ContentBundle (type=PRODUCT)
 * Core ID reference pattern - NOT entity duplication
 */

export interface CreateProductContentRequest {
  supplierId: string;
  bundleId: string;
  title: string;
  description?: string;
  targeting?: ProductTargeting;
  maxViews?: number;
  metadata?: Record<string, any>;
}

export interface UpdateProductContentRequest {
  title?: string;
  description?: string;
  bundleId?: string;
  targeting?: ProductTargeting;
  maxViews?: number;
  metadata?: Record<string, any>;
}

export interface ProductContentFilters {
  supplierId?: string;
  bundleId?: string;
  status?: ProductContentStatus;
  isPublished?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export class ProductContentService extends BaseService<ProductContent> {
  private static instance: ProductContentService;
  private productContentRepository: Repository<ProductContent>;

  constructor() {
    const repository = AppDataSource.getRepository(ProductContent);
    super(repository);
    this.productContentRepository = repository;
  }

  static getInstance(): ProductContentService {
    if (!ProductContentService.instance) {
      ProductContentService.instance = new ProductContentService();
    }
    return ProductContentService.instance;
  }

  // ============================================
  // CRUD
  // ============================================

  async createProductContent(data: CreateProductContentRequest): Promise<ProductContent> {
    const entity = this.productContentRepository.create({
      ...data,
      status: ProductContentStatus.DRAFT,
      isPublished: false,
      targeting: data.targeting || { targets: ['all'] },
      metadata: data.metadata || {},
    });
    return this.productContentRepository.save(entity);
  }

  async getProductContent(id: string): Promise<ProductContent | null> {
    return this.productContentRepository.findOne({ where: { id } });
  }

  async listProductContents(filters: ProductContentFilters): Promise<{ items: ProductContent[]; total: number }> {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const qb = this.productContentRepository.createQueryBuilder('pc');

    if (filters.supplierId) {
      qb.andWhere('pc.supplierId = :supplierId', { supplierId: filters.supplierId });
    }
    if (filters.bundleId) {
      qb.andWhere('pc.bundleId = :bundleId', { bundleId: filters.bundleId });
    }
    if (filters.status) {
      qb.andWhere('pc.status = :status', { status: filters.status });
    }
    if (filters.isPublished !== undefined) {
      qb.andWhere('pc.isPublished = :isPublished', { isPublished: filters.isPublished });
    }
    if (filters.search) {
      qb.andWhere('pc.title ILIKE :search', { search: `%${filters.search}%` });
    }

    qb.orderBy('pc.createdAt', 'DESC');
    qb.skip(skip).take(limit);

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  async updateProductContent(id: string, data: UpdateProductContentRequest): Promise<ProductContent | null> {
    const entity = await this.getProductContent(id);
    if (!entity) return null;

    Object.assign(entity, data);
    return this.productContentRepository.save(entity);
  }

  async deleteProductContent(id: string): Promise<boolean> {
    const result = await this.productContentRepository.delete(id);
    return (result.affected ?? 0) > 0;
  }

  // ============================================
  // Publishing
  // ============================================

  async publishProductContent(id: string): Promise<ProductContent | null> {
    const entity = await this.getProductContent(id);
    if (!entity) return null;

    entity.publish();
    return this.productContentRepository.save(entity);
  }

  async pauseProductContent(id: string): Promise<ProductContent | null> {
    const entity = await this.getProductContent(id);
    if (!entity) return null;

    entity.pause();
    return this.productContentRepository.save(entity);
  }

  async archiveProductContent(id: string): Promise<ProductContent | null> {
    const entity = await this.getProductContent(id);
    if (!entity) return null;

    entity.archive();
    return this.productContentRepository.save(entity);
  }

  // ============================================
  // Queries
  // ============================================

  async findPublished(): Promise<ProductContent[]> {
    return this.productContentRepository.find({
      where: { isPublished: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findBySupplier(supplierId: string): Promise<ProductContent[]> {
    return this.productContentRepository.find({
      where: { supplierId },
      order: { createdAt: 'DESC' },
    });
  }
}
