/**
 * Price Policy Service
 *
 * 가격 정책 관리
 */

import { Repository, DataSource, LessThanOrEqual, MoreThanOrEqual, IsNull, Or } from 'typeorm';
import { PricePolicy, PolicyScope, PolicyStatus } from '../entities/price-policy.entity';

export interface CreatePricePolicyDto {
  supplierId: string;
  policyName: string;
  description?: string;
  scope?: PolicyScope;
  productId?: string;
  categoryId?: string;
  wholesalePrice: number;
  minSalePrice: number;
  maxSalePrice?: number;
  recommendedPrice?: number;
  violationPenaltyRate?: number;
  violationWarningThreshold?: number;
  activeFrom?: Date;
  activeTo?: Date;
  applyToAllSellers?: boolean;
  sellerIds?: string[];
  metadata?: Record<string, unknown>;
}

export interface UpdatePricePolicyDto {
  policyName?: string;
  description?: string;
  wholesalePrice?: number;
  minSalePrice?: number;
  maxSalePrice?: number;
  recommendedPrice?: number;
  violationPenaltyRate?: number;
  violationWarningThreshold?: number;
  activeFrom?: Date;
  activeTo?: Date;
  applyToAllSellers?: boolean;
  sellerIds?: string[];
  status?: PolicyStatus;
  metadata?: Record<string, unknown>;
}

export interface PricePolicyFilter {
  supplierId: string;
  status?: PolicyStatus;
  scope?: PolicyScope;
  productId?: string;
  categoryId?: string;
  activeOnly?: boolean;
}

export interface PriceViolation {
  policyId: string;
  productId?: string;
  sellerId: string;
  sellerPrice: number;
  minSalePrice: number;
  maxSalePrice?: number;
  violationType: 'below_min' | 'above_max';
  violationAmount: number;
}

export class PricePolicyService {
  private repository: Repository<PricePolicy>;

  constructor(private dataSource: DataSource) {
    this.repository = dataSource.getRepository(PricePolicy);
  }

  /**
   * Create price policy
   */
  async create(dto: CreatePricePolicyDto): Promise<PricePolicy> {
    // Validate prices
    if (dto.minSalePrice < dto.wholesalePrice) {
      throw new Error('Minimum sale price cannot be less than wholesale price');
    }

    if (dto.maxSalePrice && dto.maxSalePrice < dto.minSalePrice) {
      throw new Error('Maximum sale price cannot be less than minimum sale price');
    }

    const policy = this.repository.create({
      ...dto,
      scope: dto.scope || 'product',
      status: 'draft',
      applyToAllSellers: dto.applyToAllSellers ?? true,
    });

    return this.repository.save(policy);
  }

  /**
   * Get policy by ID
   */
  async findById(id: string): Promise<PricePolicy | null> {
    return this.repository.findOne({ where: { id } });
  }

  /**
   * List policies with filter
   */
  async findAll(filter: PricePolicyFilter): Promise<PricePolicy[]> {
    const qb = this.repository.createQueryBuilder('policy');

    qb.where('policy.supplierId = :supplierId', { supplierId: filter.supplierId });

    if (filter.status) {
      qb.andWhere('policy.status = :status', { status: filter.status });
    }

    if (filter.scope) {
      qb.andWhere('policy.scope = :scope', { scope: filter.scope });
    }

    if (filter.productId) {
      qb.andWhere('policy.productId = :productId', { productId: filter.productId });
    }

    if (filter.categoryId) {
      qb.andWhere('policy.categoryId = :categoryId', { categoryId: filter.categoryId });
    }

    if (filter.activeOnly) {
      const now = new Date();
      qb.andWhere('policy.status = :activeStatus', { activeStatus: 'active' });
      qb.andWhere('(policy.activeFrom IS NULL OR policy.activeFrom <= :now)', { now });
      qb.andWhere('(policy.activeTo IS NULL OR policy.activeTo >= :now)', { now });
    }

    qb.orderBy('policy.createdAt', 'DESC');

    return qb.getMany();
  }

  /**
   * Update policy
   */
  async update(id: string, dto: UpdatePricePolicyDto): Promise<PricePolicy | null> {
    const policy = await this.findById(id);
    if (!policy) {
      return null;
    }

    // Validate prices if updated
    const wholesalePrice = dto.wholesalePrice ?? policy.wholesalePrice;
    const minSalePrice = dto.minSalePrice ?? policy.minSalePrice;
    const maxSalePrice = dto.maxSalePrice ?? policy.maxSalePrice;

    if (minSalePrice < wholesalePrice) {
      throw new Error('Minimum sale price cannot be less than wholesale price');
    }

    if (maxSalePrice && maxSalePrice < minSalePrice) {
      throw new Error('Maximum sale price cannot be less than minimum sale price');
    }

    Object.assign(policy, dto);
    return this.repository.save(policy);
  }

  /**
   * Activate policy
   */
  async activate(id: string): Promise<PricePolicy | null> {
    return this.update(id, { status: 'active' });
  }

  /**
   * Suspend policy
   */
  async suspend(id: string): Promise<PricePolicy | null> {
    return this.update(id, { status: 'suspended' });
  }

  /**
   * Delete policy
   */
  async delete(id: string): Promise<boolean> {
    const result = await this.repository.delete(id);
    return (result.affected ?? 0) > 0;
  }

  /**
   * Get active policy for product
   */
  async getActivePolicyForProduct(
    supplierId: string,
    productId: string
  ): Promise<PricePolicy | null> {
    const now = new Date();

    return this.repository.findOne({
      where: {
        supplierId,
        productId,
        status: 'active',
      },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Check price violation
   */
  async checkPriceViolation(
    supplierId: string,
    productId: string,
    sellerId: string,
    sellerPrice: number
  ): Promise<PriceViolation | null> {
    const policy = await this.getActivePolicyForProduct(supplierId, productId);

    if (!policy) {
      return null;
    }

    // Check if seller is covered by this policy
    if (!policy.applyToAllSellers && policy.sellerIds && !policy.sellerIds.includes(sellerId)) {
      return null;
    }

    // Check min price violation
    if (sellerPrice < policy.minSalePrice) {
      return {
        policyId: policy.id,
        productId: policy.productId,
        sellerId,
        sellerPrice,
        minSalePrice: policy.minSalePrice,
        maxSalePrice: policy.maxSalePrice,
        violationType: 'below_min',
        violationAmount: policy.minSalePrice - sellerPrice,
      };
    }

    // Check max price violation
    if (policy.maxSalePrice && sellerPrice > policy.maxSalePrice) {
      return {
        policyId: policy.id,
        productId: policy.productId,
        sellerId,
        sellerPrice,
        minSalePrice: policy.minSalePrice,
        maxSalePrice: policy.maxSalePrice,
        violationType: 'above_max',
        violationAmount: sellerPrice - policy.maxSalePrice,
      };
    }

    return null;
  }

  /**
   * Get policy statistics
   */
  async getStats(supplierId: string): Promise<{
    total: number;
    active: number;
    draft: number;
    expired: number;
  }> {
    const policies = await this.repository.find({
      where: { supplierId },
      select: ['status'],
    });

    return {
      total: policies.length,
      active: policies.filter((p) => p.status === 'active').length,
      draft: policies.filter((p) => p.status === 'draft').length,
      expired: policies.filter((p) => p.status === 'expired').length,
    };
  }
}
