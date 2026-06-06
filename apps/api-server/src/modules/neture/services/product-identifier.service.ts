/**
 * ProductIdentifierService — Identifier Core (Phase 2)
 *
 * WO-O4O-PRODUCT-IDENTIFIER-CORE-V1
 * Baseline: docs/baseline/O4O-PRODUCT-CORE-BASELINE-V1.md §5
 *
 * Identifier Core 의 최소 내부 service. 이번 WO 에서는 API endpoint 를 공개하지 않고
 * 내부 service/repository 수준으로만 시작한다. (소비처 강제 전환 없음)
 *
 * 원칙:
 *   - ProductMaster.barcode 는 건드리지 않는다 (primary barcode mirror 유지).
 *   - 중복 방지는 (product_master_id, identifier_type, normalized_value, deleted_at IS NULL)
 *     기준 — addIdentifier 는 idempotent upsert-safe.
 *   - 전역 UNIQUE 가 아니므로 동일 normalized_value 가 서로 다른 master 에 존재할 수 있다.
 */

import type { DataSource, Repository } from 'typeorm';
import { IsNull } from 'typeorm';
import { ProductIdentifier } from '../entities/ProductIdentifier.entity.js';
import type {
  ProductIdentifierType,
  ProductIdentifierVerificationStatus,
} from '../entities/ProductIdentifier.entity.js';
import { normalizeIdentifier } from '../utils/product-identifier.util.js';

export interface AddIdentifierInput {
  identifierType: ProductIdentifierType;
  identifierValue: string;
  /** 미지정 시 normalizeIdentifier 로 자동 계산 */
  normalizedValue?: string;
  sourceType?: string | null;
  sourceId?: string | null;
  sourceLabel?: string | null;
  country?: string | null;
  isPrimary?: boolean;
  verificationStatus?: ProductIdentifierVerificationStatus;
  metadata?: Record<string, unknown> | null;
}

export class ProductIdentifierService {
  private readonly repo: Repository<ProductIdentifier>;

  constructor(private readonly dataSource: DataSource) {
    this.repo = dataSource.getRepository(ProductIdentifier);
  }

  /**
   * (type, value) 로 활성 식별자 조회. value 는 type 기준으로 normalize 하여 매칭.
   */
  async findByIdentifier(type: ProductIdentifierType, value: string): Promise<ProductIdentifier[]> {
    const normalized = normalizeIdentifier(type, value);
    if (!normalized) return [];
    return this.repo.find({
      where: { identifierType: type, normalizedValue: normalized, deletedAt: IsNull() },
    });
  }

  /**
   * normalized_value 로 활성 식별자 조회 (type 무관).
   * 전역 UNIQUE 가 아니므로 복수 master 가 반환될 수 있다.
   */
  async findByNormalizedValue(normalizedValue: string): Promise<ProductIdentifier[]> {
    const v = (normalizedValue || '').trim();
    if (!v) return [];
    return this.repo.find({ where: { normalizedValue: v, deletedAt: IsNull() } });
  }

  /**
   * 식별자 추가 (idempotent). 동일 (master, type, normalized) 활성 row 가 있으면 재사용.
   */
  async addIdentifier(productMasterId: string, input: AddIdentifierInput): Promise<ProductIdentifier> {
    const normalizedValue =
      input.normalizedValue ?? normalizeIdentifier(input.identifierType, input.identifierValue);

    const existing = await this.repo.findOne({
      where: {
        productMasterId,
        identifierType: input.identifierType,
        normalizedValue,
        deletedAt: IsNull(),
      },
    });
    if (existing) return existing;

    const entity = this.repo.create({
      productMasterId,
      identifierType: input.identifierType,
      identifierValue: input.identifierValue,
      normalizedValue,
      sourceType: input.sourceType ?? null,
      sourceId: input.sourceId ?? null,
      sourceLabel: input.sourceLabel ?? null,
      country: input.country ?? null,
      isPrimary: input.isPrimary ?? false,
      verificationStatus: input.verificationStatus ?? 'unverified',
      metadata: input.metadata ?? null,
    });
    return this.repo.save(entity);
  }

  /**
   * 지정 식별자를 master 의 primary 로 설정하고, 같은 master 의 다른 식별자는 primary 해제.
   * ProductMaster.barcode 컬럼은 변경하지 않는다 (별도 동기화 책임은 후속 WO).
   */
  async setPrimaryIdentifier(productMasterId: string, identifierId: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(ProductIdentifier);
      await repo.update(
        { productMasterId, isPrimary: true },
        { isPrimary: false },
      );
      await repo.update(
        { id: identifierId, productMasterId },
        { isPrimary: true },
      );
    });
  }
}
