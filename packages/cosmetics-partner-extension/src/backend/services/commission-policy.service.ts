/**
 * CommissionPolicyService
 *
 * 커미션 정책 CRUD 및 관리 서비스
 */

import type { Repository, FindOptionsWhere } from 'typeorm';
import { CommissionPolicy, PolicyType, PolicyMetadata } from '../entities/commission-policy.entity.js';

export interface CreateCommissionPolicyDto {
  name: string;
  policyType?: PolicyType;
  commissionRate?: number;
  fixedAmount?: number;
  partnerId?: string;
  productId?: string;
  campaignId?: string;
  effectiveFrom?: Date;
  effectiveTo?: Date;
  priority?: number;
  isActive?: boolean;
  metadata?: PolicyMetadata;
  createdBy?: string;
}

export interface UpdateCommissionPolicyDto {
  name?: string;
  policyType?: PolicyType;
  commissionRate?: number;
  fixedAmount?: number;
  partnerId?: string;
  productId?: string;
  campaignId?: string;
  effectiveFrom?: Date;
  effectiveTo?: Date;
  priority?: number;
  isActive?: boolean;
  metadata?: PolicyMetadata;
}

export interface PolicyFilter {
  partnerId?: string;
  productId?: string;
  campaignId?: string;
  isActive?: boolean;
  policyType?: PolicyType;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class CommissionPolicyService {
  constructor(
    private readonly policyRepository: Repository<CommissionPolicy>
  ) {}

  /**
   * 정책 생성
   */
  async create(dto: CreateCommissionPolicyDto): Promise<CommissionPolicy> {
    const policy = this.policyRepository.create({
      name: dto.name,
      policyType: dto.policyType || 'PERCENT',
      commissionRate: dto.commissionRate || 0,
      fixedAmount: dto.fixedAmount || 0,
      partnerId: dto.partnerId,
      productId: dto.productId,
      campaignId: dto.campaignId,
      effectiveFrom: dto.effectiveFrom,
      effectiveTo: dto.effectiveTo,
      priority: dto.priority || 0,
      isActive: dto.isActive !== false,
      metadata: dto.metadata,
      createdBy: dto.createdBy,
    });

    return this.policyRepository.save(policy);
  }

  /**
   * ID로 정책 조회
   */
  async findById(id: string): Promise<CommissionPolicy | null> {
    return this.policyRepository.findOne({ where: { id } });
  }

  /**
   * 필터링된 정책 목록 조회
   */
  async findByFilter(filter: PolicyFilter): Promise<CommissionPolicy[]> {
    const where: FindOptionsWhere<CommissionPolicy> = {};

    if (filter.partnerId !== undefined) {
      where.partnerId = filter.partnerId;
    }
    if (filter.productId !== undefined) {
      where.productId = filter.productId;
    }
    if (filter.campaignId !== undefined) {
      where.campaignId = filter.campaignId;
    }
    if (filter.isActive !== undefined) {
      where.isActive = filter.isActive;
    }
    if (filter.policyType !== undefined) {
      where.policyType = filter.policyType;
    }

    return this.policyRepository.find({
      where,
      order: { priority: 'DESC', createdAt: 'DESC' },
    });
  }

  /**
   * 페이지네이션된 정책 목록 조회
   */
  async findAll(
    page: number = 1,
    limit: number = 20,
    filter?: PolicyFilter
  ): Promise<PaginatedResult<CommissionPolicy>> {
    const queryBuilder = this.policyRepository.createQueryBuilder('policy');

    if (filter?.partnerId) {
      queryBuilder.andWhere('policy.partnerId = :partnerId', { partnerId: filter.partnerId });
    }
    if (filter?.productId) {
      queryBuilder.andWhere('policy.productId = :productId', { productId: filter.productId });
    }
    if (filter?.campaignId) {
      queryBuilder.andWhere('policy.campaignId = :campaignId', { campaignId: filter.campaignId });
    }
    if (filter?.isActive !== undefined) {
      queryBuilder.andWhere('policy.isActive = :isActive', { isActive: filter.isActive });
    }
    if (filter?.policyType) {
      queryBuilder.andWhere('policy.policyType = :policyType', { policyType: filter.policyType });
    }

    const total = await queryBuilder.getCount();

    const items = await queryBuilder
      .orderBy('policy.priority', 'DESC')
      .addOrderBy('policy.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * 정책 업데이트
   */
  async update(id: string, dto: UpdateCommissionPolicyDto): Promise<CommissionPolicy | null> {
    const policy = await this.findById(id);
    if (!policy) {
      return null;
    }

    Object.assign(policy, dto);
    return this.policyRepository.save(policy);
  }

  /**
   * 정책 활성화/비활성화
   */
  async setActive(id: string, isActive: boolean): Promise<CommissionPolicy | null> {
    return this.update(id, { isActive });
  }

  /**
   * 정책 삭제
   */
  async delete(id: string): Promise<boolean> {
    const result = await this.policyRepository.delete(id);
    return (result.affected ?? 0) > 0;
  }

  /**
   * 정책 복제
   */
  async duplicate(id: string, newName?: string): Promise<CommissionPolicy | null> {
    const original = await this.findById(id);
    if (!original) {
      return null;
    }

    const duplicateDto: CreateCommissionPolicyDto = {
      name: newName || `${original.name} (복사본)`,
      policyType: original.policyType,
      commissionRate: Number(original.commissionRate),
      fixedAmount: Number(original.fixedAmount),
      partnerId: original.partnerId,
      productId: original.productId,
      campaignId: original.campaignId,
      effectiveFrom: original.effectiveFrom,
      effectiveTo: original.effectiveTo,
      priority: original.priority,
      isActive: false, // 복제본은 비활성 상태로 생성
      metadata: original.metadata,
    };

    return this.create(duplicateDto);
  }

  /**
   * 기본 정책 조회 (파트너/상품/캠페인 지정 없는 전체 적용 정책)
   */
  async getDefaultPolicy(): Promise<CommissionPolicy | null> {
    return this.policyRepository.findOne({
      where: {
        partnerId: undefined,
        productId: undefined,
        campaignId: undefined,
        isActive: true,
      },
      order: { priority: 'DESC' },
    });
  }

  /**
   * 특정 파트너의 전용 정책 목록
   */
  async getPartnerPolicies(partnerId: string): Promise<CommissionPolicy[]> {
    return this.policyRepository.find({
      where: { partnerId },
      order: { priority: 'DESC', createdAt: 'DESC' },
    });
  }

  /**
   * 특정 상품의 정책 목록
   */
  async getProductPolicies(productId: string): Promise<CommissionPolicy[]> {
    return this.policyRepository.find({
      where: { productId },
      order: { priority: 'DESC', createdAt: 'DESC' },
    });
  }

  /**
   * 특정 캠페인의 정책 목록
   */
  async getCampaignPolicies(campaignId: string): Promise<CommissionPolicy[]> {
    return this.policyRepository.find({
      where: { campaignId },
      order: { priority: 'DESC', createdAt: 'DESC' },
    });
  }

  /**
   * 활성 정책 개수
   */
  async countActivePolicies(): Promise<number> {
    return this.policyRepository.count({ where: { isActive: true } });
  }

  /**
   * 정책 통계
   */
  async getStatistics(): Promise<{
    totalPolicies: number;
    activePolicies: number;
    byType: Record<PolicyType, number>;
  }> {
    const totalPolicies = await this.policyRepository.count();
    const activePolicies = await this.policyRepository.count({ where: { isActive: true } });

    const percentCount = await this.policyRepository.count({ where: { policyType: 'PERCENT' } });
    const fixedCount = await this.policyRepository.count({ where: { policyType: 'FIXED' } });

    return {
      totalPolicies,
      activePolicies,
      byType: {
        PERCENT: percentCount,
        FIXED: fixedCount,
      },
    };
  }
}
