/**
 * Supplier Candidate Promotion Service — 공급자 후보 → Promotion Core 승격 (운영자 실행)
 *
 * WO-O4O-SUPPLIER-PRODUCT-CANDIDATE-PROMOTION-ADAPTER-V1 §2.2
 *
 * 순서:
 *   load candidate → normalize(single ?? bulk) → buildSupplierPromotionPlan
 *   → dataSource.transaction(m => { outcome = core.promoteWithin(m, plan); assertSupplierPolicy(m, n, outcome) })
 *   → core.afterCommit(plan, outcome)   // 커밋 후에만 (DRUG extension · Landing)
 *
 * `core.promote()` 는 쓰지 않는다 — 정책 후검사가 Core 쓰기와 같은 TX 에 있어야 롤백이 성립한다.
 * Offer 는 만들지 않는다 (⑤ 범위). product_masters 직접 UPDATE 없음 (§2.2-A).
 *
 * WO-O4O-SUPPLIER-PRODUCT-REGISTRATION-AI-FIRST-CUTOVER-AND-LEGACY-MASTER-RESOLUTION-RETIREMENT-V1 §2.5:
 *   evidence.categoryId / brandId 는 TX 앞에서 read-only SELECT 로 존재(활성)만 확인하고(`resolveRefs`),
 *   확인된 값만 plan.master.metadata 로 넘긴다. 존재하지 않으면 버리고 approvalMeta.droppedRefs 에 남긴다(승격은 막지 않음).
 *   Adapter 가 category/brand 를 생성하지 않는다 — 공급자 입력 brandName(문자열)→brand 생성은 Offer 경로와 함께 은퇴했다.
 */

import type { DataSource, EntityManager } from 'typeorm';
import logger from '../../../../../utils/logger.js';
import { ProductCandidate } from '../../../entities/ProductCandidate.entity.js';
import { ProductPromotionCore } from '../../product-promotion-core.service.js';
import type { ProductPromotionPlan, PromotionOutcome } from '../../product-promotion.types.js';
import {
  normalizeSupplierCandidate,
  type NormalizedSupplierCandidate,
  type SupplierCandidateRecord,
} from './supplier-candidate.normalizer.js';
import { buildSupplierPromotionPlan, type SupplierResolvedRefs } from './supplier-promotion.plan.js';
import { assertSupplierPolicy, type PolicyQueryRunner } from './supplier-promotion.policy.js';

export class SupplierPromotionNotFoundError extends Error {
  readonly code = 'CANDIDATE_NOT_FOUND' as const;
  constructor(candidateId: string) {
    super('CANDIDATE_NOT_FOUND');
    this.name = 'SupplierPromotionNotFoundError';
    this.message = `CANDIDATE_NOT_FOUND:${candidateId}`;
  }
}

/** 테스트 fake 주입용 최소 표면 — 운영은 ProductPromotionCore 그대로 */
export interface SupplierPromotionCoreLike {
  promoteWithin(m: EntityManager, plan: ProductPromotionPlan): Promise<PromotionOutcome>;
  afterCommit(plan: ProductPromotionPlan, outcome: PromotionOutcome): Promise<void>;
}

export interface SupplierCandidatePromotionDeps {
  core?: SupplierPromotionCoreLike;
  loadCandidate?: (candidateId: string) => Promise<SupplierCandidateRecord | null>;
  /** evidence.categoryId / brandId 존재 확인 (read-only). 기본 = product_categories / brands SELECT */
  resolveRefs?: (n: NormalizedSupplierCandidate) => Promise<SupplierResolvedRefs>;
}

export interface SupplierPromotionContext {
  reviewedBy: string | null;
  note?: string | null;
}

export interface SupplierPromotionResult {
  outcome: PromotionOutcome;
  normalized: NormalizedSupplierCandidate;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class SupplierCandidatePromotionService {
  private readonly core: SupplierPromotionCoreLike;
  private readonly loadCandidate: (candidateId: string) => Promise<SupplierCandidateRecord | null>;
  private readonly resolveRefs: (n: NormalizedSupplierCandidate) => Promise<SupplierResolvedRefs>;

  constructor(private readonly dataSource: DataSource, deps: SupplierCandidatePromotionDeps = {}) {
    this.core = deps.core ?? new ProductPromotionCore(dataSource);
    this.loadCandidate = deps.loadCandidate ?? ((id) => this.loadFromDb(id));
    this.resolveRefs = deps.resolveRefs ?? ((n) => this.resolveRefsFromDb(n));
  }

  /** read-only: 활성 category / brand 만 통과. 없거나 비활성 → dropped */
  private async resolveRefsFromDb(n: NormalizedSupplierCandidate): Promise<SupplierResolvedRefs> {
    const out: SupplierResolvedRefs = { categoryId: null, brandId: null, dropped: [] };
    const { categoryId, brandId } = n.evidence;
    if (categoryId) {
      const rows = await this.dataSource.query(
        'SELECT id FROM product_categories WHERE id = $1 AND is_active = true LIMIT 1', [categoryId],
      ) as Array<{ id: string }>;
      if (rows.length > 0) out.categoryId = categoryId; else out.dropped.push('categoryId');
    }
    if (brandId) {
      const rows = await this.dataSource.query(
        'SELECT id FROM brands WHERE id = $1 AND is_active = true LIMIT 1', [brandId],
      ) as Array<{ id: string }>;
      if (rows.length > 0) out.brandId = brandId; else out.dropped.push('brandId');
    }
    return out;
  }

  private async loadFromDb(candidateId: string): Promise<SupplierCandidateRecord | null> {
    if (!UUID_RE.test(candidateId)) return null;
    // DeleteDateColumn → soft-deleted 는 findOne 이 제외한다
    return this.dataSource.getRepository(ProductCandidate).findOne({ where: { id: candidateId } });
  }

  async promote(candidateId: string, ctx: SupplierPromotionContext): Promise<SupplierPromotionResult> {
    const candidate = await this.loadCandidate(candidateId);
    if (!candidate) throw new SupplierPromotionNotFoundError(candidateId);

    const normalized = normalizeSupplierCandidate(candidate); // SupplierNormalizationError → 호출자 400
    const refs = await this.resolveRefs(normalized); // read-only · TX 밖
    if (refs.dropped.length > 0) {
      logger.warn(`[SupplierPromotion] candidate=${candidateId} dropped unresolved refs=${refs.dropped.join(',')}`);
    }
    const plan = buildSupplierPromotionPlan(normalized, { reviewedBy: ctx.reviewedBy, note: ctx.note ?? null, refs });

    const outcome = await this.dataSource.transaction(async (m) => {
      const o = await this.core.promoteWithin(m, plan);
      await assertSupplierPolicy(m as unknown as PolicyQueryRunner, normalized, o); // throw → 이 TX 전체 롤백
      return o;
    });

    logger.info(`[SupplierPromotion] candidate=${candidateId} origin=${normalized.origin} type=${normalized.regulatoryType} outcome=${outcome.kind}`);
    await this.core.afterCommit(plan, outcome); // 커밋 후 · create 이외 no-op
    return { outcome, normalized };
  }
}
