/**
 * ProductContentService
 *
 * ProductContent CRUD 및 발행 관리
 */

import type { Repository, DataSource } from 'typeorm';
import { ProductContent, ProductContentStatus } from '../entities/ProductContent.js';
import type { ProductTargeting } from '../entities/ProductContent.js';

export interface CreateProductContentRequest {
  supplierId: string;
  bundleId: string;
  title: string;
  sku?: string;
  brand?: string;
  category?: string;
  targeting?: ProductTargeting;
  metadata?: Record<string, any>;
}

export interface UpdateProductContentRequest {
  title?: string;
  sku?: string;
  brand?: string;
  category?: string;
  targeting?: ProductTargeting;
  metadata?: Record<string, any>;
}

export interface ProductContentFilters {
  supplierId?: string;
  status?: ProductContentStatus;
  isPublished?: boolean;
  category?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export class ProductContentService {
  private repository: Repository<ProductContent>;

  constructor(dataSource: DataSource) {
    this.repository = dataSource.getRepository(ProductContent);
  }

  async create(data: CreateProductContentRequest): Promise<ProductContent> {
    const entity = this.repository.create({
      ...data,
      status: ProductContentStatus.DRAFT,
      isPublished: false,
      targeting: data.targeting || { targets: ['all'] },
      metadata: data.metadata || {},
    });
    return this.repository.save(entity);
  }

  async findById(id: string): Promise<ProductContent | null> {
    return this.repository.findOne({ where: { id } });
  }

  async findAll(filters: ProductContentFilters): Promise<{ items: ProductContent[]; total: number }> {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const qb = this.repository.createQueryBuilder('pc');

    if (filters.supplierId) {
      qb.andWhere('pc.supplierId = :supplierId', { supplierId: filters.supplierId });
    }
    if (filters.status) {
      qb.andWhere('pc.status = :status', { status: filters.status });
    }
    if (filters.isPublished !== undefined) {
      qb.andWhere('pc.isPublished = :isPublished', { isPublished: filters.isPublished });
    }
    if (filters.category) {
      qb.andWhere('pc.category = :category', { category: filters.category });
    }
    if (filters.search) {
      qb.andWhere('(pc.title ILIKE :search OR pc.brand ILIKE :search)', {
        search: `%${filters.search}%`,
      });
    }

    qb.orderBy('pc.createdAt', 'DESC');
    qb.skip(skip).take(limit);

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  async update(id: string, data: UpdateProductContentRequest): Promise<ProductContent | null> {
    const entity = await this.findById(id);
    if (!entity) return null;

    Object.assign(entity, data);
    return this.repository.save(entity);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.repository.delete(id);
    return (result.affected ?? 0) > 0;
  }

  async publish(id: string): Promise<ProductContent | null> {
    const entity = await this.findById(id);
    if (!entity) return null;

    entity.publish();
    return this.repository.save(entity);
  }

  async pause(id: string): Promise<ProductContent | null> {
    const entity = await this.findById(id);
    if (!entity) return null;

    entity.pause();
    return this.repository.save(entity);
  }

  async archive(id: string): Promise<ProductContent | null> {
    const entity = await this.findById(id);
    if (!entity) return null;

    entity.archive();
    return this.repository.save(entity);
  }

  async findPublished(): Promise<ProductContent[]> {
    return this.repository.find({
      where: { isPublished: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findBySupplier(supplierId: string): Promise<ProductContent[]> {
    return this.repository.find({
      where: { supplierId },
      order: { createdAt: 'DESC' },
    });
  }
}
