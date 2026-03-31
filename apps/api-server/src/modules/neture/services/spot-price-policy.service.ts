import type { DataSource, Repository } from 'typeorm';
import { SpotPricePolicy } from '../entities/SpotPricePolicy.entity.js';

/**
 * WO-NETURE-SPOT-PRICE-POLICY-FOUNDATION-V1
 *
 * 스팟 가격 정책 CRUD + 상태 관리 서비스.
 * 1차 foundation: 상품 1개당 ACTIVE 정책 최대 1개 제약.
 */
export class SpotPricePolicyService {
  private repo: Repository<SpotPricePolicy>;

  constructor(private dataSource: DataSource) {
    this.repo = dataSource.getRepository(SpotPricePolicy);
  }

  /** 정책 생성 (DRAFT 상태) */
  async create(input: {
    offerId: string;
    supplierId: string;
    policyName: string;
    spotPrice: number;
    startAt: string;
    endAt: string;
  }): Promise<SpotPricePolicy> {
    // 소유권 검증
    await this.verifyOwnership(input.offerId, input.supplierId);

    // 날짜 유효성
    const startAt = new Date(input.startAt);
    const endAt = new Date(input.endAt);
    if (isNaN(startAt.getTime()) || isNaN(endAt.getTime())) {
      throw new Error('INVALID_DATE');
    }
    if (endAt <= startAt) {
      throw new Error('END_BEFORE_START');
    }
    if (input.spotPrice <= 0) {
      throw new Error('INVALID_PRICE');
    }

    const policy = this.repo.create({
      offerId: input.offerId,
      supplierId: input.supplierId,
      policyName: input.policyName.trim(),
      spotPrice: input.spotPrice,
      status: 'DRAFT',
      startAt,
      endAt,
    });

    return this.repo.save(policy);
  }

  /** 상품별 정책 목록 (최신순) */
  async listByOffer(offerId: string, supplierId: string): Promise<SpotPricePolicy[]> {
    return this.repo.find({
      where: { offerId, supplierId },
      order: { createdAt: 'DESC' },
    });
  }

  /** 단건 조회 */
  async getById(id: string, supplierId: string): Promise<SpotPricePolicy | null> {
    return this.repo.findOne({ where: { id, supplierId } });
  }

  /** 정책 수정 (DRAFT 상태만) */
  async update(
    id: string,
    supplierId: string,
    updates: {
      policyName?: string;
      spotPrice?: number;
      startAt?: string;
      endAt?: string;
    },
  ): Promise<SpotPricePolicy> {
    const policy = await this.repo.findOne({ where: { id, supplierId } });
    if (!policy) throw new Error('NOT_FOUND');
    if (policy.status !== 'DRAFT') throw new Error('ONLY_DRAFT_EDITABLE');

    if (updates.policyName !== undefined) policy.policyName = updates.policyName.trim();
    if (updates.spotPrice !== undefined) {
      if (updates.spotPrice <= 0) throw new Error('INVALID_PRICE');
      policy.spotPrice = updates.spotPrice;
    }
    if (updates.startAt !== undefined) {
      const d = new Date(updates.startAt);
      if (isNaN(d.getTime())) throw new Error('INVALID_DATE');
      policy.startAt = d;
    }
    if (updates.endAt !== undefined) {
      const d = new Date(updates.endAt);
      if (isNaN(d.getTime())) throw new Error('INVALID_DATE');
      policy.endAt = d;
    }

    if (policy.endAt <= policy.startAt) throw new Error('END_BEFORE_START');

    return this.repo.save(policy);
  }

  /** 상태 변경 */
  async changeStatus(
    id: string,
    supplierId: string,
    newStatus: 'ACTIVE' | 'CANCELLED',
  ): Promise<SpotPricePolicy> {
    const policy = await this.repo.findOne({ where: { id, supplierId } });
    if (!policy) throw new Error('NOT_FOUND');

    // 상태 전이 규칙
    if (newStatus === 'ACTIVE') {
      if (policy.status !== 'DRAFT') throw new Error('ONLY_DRAFT_ACTIVATABLE');

      // 같은 상품에 이미 ACTIVE 정책이 있으면 거부
      const existing = await this.repo.findOne({
        where: { offerId: policy.offerId, status: 'ACTIVE' as const },
      });
      if (existing && existing.id !== id) {
        throw new Error('ALREADY_ACTIVE_EXISTS');
      }
    }

    if (newStatus === 'CANCELLED') {
      if (policy.status === 'CANCELLED') throw new Error('ALREADY_CANCELLED');
    }

    policy.status = newStatus;
    return this.repo.save(policy);
  }

  /** 상품의 현재 활성 스팟 정책 조회 (기간 내 ACTIVE) */
  async getActiveForOffer(offerId: string): Promise<SpotPricePolicy | null> {
    const now = new Date();
    const results = await this.repo
      .createQueryBuilder('p')
      .where('p.offerId = :offerId', { offerId })
      .andWhere('p.status = :status', { status: 'ACTIVE' })
      .andWhere('p.startAt <= :now', { now })
      .andWhere('p.endAt > :now', { now })
      .getOne();
    return results;
  }

  /** offer_id와 supplier_id 정합성 확인 */
  private async verifyOwnership(offerId: string, supplierId: string): Promise<void> {
    const rows = await this.dataSource.query(
      `SELECT id FROM supplier_product_offers WHERE id = $1 AND supplier_id = $2`,
      [offerId, supplierId],
    );
    if (rows.length === 0) throw new Error('OFFER_NOT_FOUND_OR_NOT_OWNED');
  }
}
