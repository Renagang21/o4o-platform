/**
 * PharmaProductService
 *
 * 의약품 상품 관리 서비스
 *
 * @package @o4o/pharmaceutical-core
 */

import { Repository } from 'typeorm';
import {
  PharmaProductMaster,
  PharmaProductCategory,
  PharmaProductStatus,
} from '../entities/PharmaProductMaster.entity.js';

export interface CreatePharmaProductDto {
  name: string;
  drugCode?: string;
  insuranceCode?: string;
  atcCode?: string;
  description?: string;
  sku?: string;
  barcode?: string;
  manufacturer?: string;
  category?: PharmaProductCategory;
  unit?: string;
  packageSize?: number;
  expiryMonths?: number;
  storageCondition?: string;
  therapeuticCategory?: string;
  activeIngredients?: Array<{ name: string; amount: string; unit: string }>;
  indications?: string;
  dosage?: string;
  warnings?: string;
  images?: string[];
  attributes?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface UpdatePharmaProductDto extends Partial<CreatePharmaProductDto> {
  status?: PharmaProductStatus;
}

export interface PharmaProductFilter {
  category?: PharmaProductCategory;
  status?: PharmaProductStatus;
  manufacturer?: string;
  therapeuticCategory?: string;
  searchTerm?: string;
  page?: number;
  limit?: number;
}

export class PharmaProductService {
  constructor(private productRepository: Repository<PharmaProductMaster>) {}

  /**
   * 의약품 생성
   */
  async create(data: CreatePharmaProductDto): Promise<PharmaProductMaster> {
    const product = this.productRepository.create({
      ...data,
      status: PharmaProductStatus.DRAFT,
    });
    return this.productRepository.save(product);
  }

  /**
   * 의약품 조회 (ID)
   */
  async findById(id: string): Promise<PharmaProductMaster | null> {
    return this.productRepository.findOne({
      where: { id },
      relations: ['offers'],
    });
  }

  /**
   * 의약품 조회 (약품코드)
   */
  async findByDrugCode(drugCode: string): Promise<PharmaProductMaster | null> {
    return this.productRepository.findOne({
      where: { drugCode },
      relations: ['offers'],
    });
  }

  /**
   * 의약품 목록 조회
   */
  async findAll(filter: PharmaProductFilter = {}): Promise<{
    items: PharmaProductMaster[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { page = 1, limit = 20, searchTerm, ...where } = filter;

    const qb = this.productRepository.createQueryBuilder('product');

    if (where.category) {
      qb.andWhere('product.category = :category', { category: where.category });
    }

    if (where.status) {
      qb.andWhere('product.status = :status', { status: where.status });
    }

    if (where.manufacturer) {
      qb.andWhere('product.manufacturer = :manufacturer', {
        manufacturer: where.manufacturer,
      });
    }

    if (where.therapeuticCategory) {
      qb.andWhere('product.therapeuticCategory LIKE :therapeuticCategory', {
        therapeuticCategory: `%${where.therapeuticCategory}%`,
      });
    }

    if (searchTerm) {
      qb.andWhere(
        '(product.name ILIKE :searchTerm OR product.drugCode ILIKE :searchTerm OR product.insuranceCode ILIKE :searchTerm)',
        { searchTerm: `%${searchTerm}%` }
      );
    }

    qb.orderBy('product.createdAt', 'DESC');
    qb.skip((page - 1) * limit).take(limit);

    const [items, total] = await qb.getManyAndCount();

    return { items, total, page, limit };
  }

  /**
   * 의약품 수정
   */
  async update(
    id: string,
    data: UpdatePharmaProductDto
  ): Promise<PharmaProductMaster | null> {
    const product = await this.findById(id);
    if (!product) return null;

    Object.assign(product, data);
    return this.productRepository.save(product);
  }

  /**
   * 의약품 상태 변경
   */
  async updateStatus(
    id: string,
    status: PharmaProductStatus
  ): Promise<PharmaProductMaster | null> {
    return this.update(id, { status });
  }

  /**
   * 의약품 삭제 (soft delete - DISCONTINUED로 변경)
   */
  async delete(id: string): Promise<boolean> {
    const result = await this.productRepository.update(id, {
      status: PharmaProductStatus.DISCONTINUED,
    });
    return (result.affected ?? 0) > 0;
  }

  /**
   * 카테고리별 통계
   */
  async getStatsByCategory(): Promise<
    Array<{ category: PharmaProductCategory; count: number }>
  > {
    const result = await this.productRepository
      .createQueryBuilder('product')
      .select('product.category', 'category')
      .addSelect('COUNT(*)', 'count')
      .groupBy('product.category')
      .getRawMany();

    return result.map((r) => ({
      category: r.category as PharmaProductCategory,
      count: parseInt(r.count, 10),
    }));
  }
}
