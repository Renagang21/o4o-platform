/**
 * Product Promotion Core — 실행 계층
 *
 * WO-O4O-PRODUCT-CANDIDATE-GENERAL-PROMOTION-CORE-FOUNDATION-V1 §2.1 · §2.2
 *
 * 두 진입점:
 *   - promoteWithin(m, plan) : 호출자 TX 안에서 실행. 커밋하지 않는다.
 *       P2(store_web) 는 **반드시 이것만** 쓴다 — Master + 매장 listing + candidate 상태가 한 TX 로 묶여야
 *       link/conflict 를 DUPLICATE_MASTER_EXISTS 로 되돌릴 때 candidate 가 이미 matched 로 남는 일이 없다.
 *   - promote(plan)          : 자체 TX 외피 + afterCommit. 향후 Supplier 등 다른 호출자용.
 *
 * afterCommit(plan, outcome): 커밋 **후** 실행하는 best-effort 효과.
 *   - effects.ensureDrugExtension → ProductDrugExtensionService.ensureForProductMaster
 *     (이 서비스는 dataSource repository 로 Master 를 다시 읽으므로 미커밋 TX 안에서는 Master 를 못 본다.
 *      그래서 "같은 TX" 가 아니라 "커밋 직후" 를 택했다 — WO §2.1 #8 허용 범위)
 *   - Landing 발급 (P2 현행 위치와 동일하게 커밋 후)
 *   - effects.images → ProductImage 연결 (create 만 · 커밋 후 · best-effort)
 *     WO-O4O-SUPPLIER-PRODUCT-REGISTRATION-AI-FIRST-CUTOVER-AND-LEGACY-MASTER-RESOLUTION-RETIREMENT-V1 §2.5
 *
 * conflict / hold 는 아무것도 쓰지 않는다 (§2.1 #12).
 */

import type { DataSource, EntityManager } from 'typeorm';
import logger from '../../../utils/logger.js';
import { ProductDrugExtensionService } from '../services/product-drug-extension.service.js';
import { ensureProductLandingForMaster } from '../services/product-landing.service.js';
import {
  buildExistingMasterDiff,
  decideFromDedup,
  validateCandidateState,
  validatePlan,
  type DedupMatches,
} from './product-promotion.decide.js';
import { DbPromotionStore } from './product-promotion.store.js';
import {
  identifierKey,
  type NormalizedIdentifier,
  type ProductPromotionPlan,
  type PromotionImageInput,
  type PromotionMasterRef,
  type PromotionOutcome,
  type PromotionStore,
} from './product-promotion.types.js';

export class ProductPromotionCore {
  constructor(private readonly dataSource: DataSource) {}

  /** 호출자 TX 안에서 실행 (커밋하지 않음). P2 는 이것만 사용한다. */
  async promoteWithin(m: EntityManager, plan: ProductPromotionPlan): Promise<PromotionOutcome> {
    return promoteWithStore(new DbPromotionStore(m), plan);
  }

  /** 자체 TX 외피 + 커밋 후 효과. (P2 사용 금지 — §2.2) */
  async promote(plan: ProductPromotionPlan): Promise<PromotionOutcome> {
    const outcome = await this.dataSource.transaction((m) => this.promoteWithin(m, plan));
    await this.afterCommit(plan, outcome);
    return outcome;
  }

  /** 커밋 후 best-effort 효과. 호출자가 자기 TX 를 커밋한 뒤 호출한다. 실패해도 throw 하지 않는다. */
  async afterCommit(plan: ProductPromotionPlan, outcome: PromotionOutcome): Promise<void> {
    if (outcome.kind !== 'create') return;
    if (plan.effects.ensureDrugExtension) {
      try {
        await new ProductDrugExtensionService(this.dataSource).ensureForProductMaster(outcome.masterId);
      } catch (e) {
        logger.warn(`[PromotionCore] ensureDrugExtension failed master=${outcome.masterId}: ${(e as Error).message}`);
      }
    }
    if (plan.effects.images && plan.effects.images.length > 0) {
      try {
        await linkPromotionImages(this.dataSource, outcome.masterId, plan.effects.images);
      } catch (e) {
        logger.warn(`[PromotionCore] linkImages failed master=${outcome.masterId}: ${(e as Error).message}`);
      }
    }
    await ensureProductLandingForMaster(this.dataSource, outcome.masterId, plan.landingSource ?? 'promotion-core');
  }
}

export const PROMOTION_IMAGE_SOURCE = 'candidate_promotion';

/**
 * create 된 Master 에 후보 이미지를 ProductImage 로 연결한다 (커밋 후 · create 전용).
 * - URL 은 이미 media asset(공용 미디어 라이브러리 등)으로 올라간 외부 참조 → gcs_path='' (from-url 등록과 같은 규약).
 * - thumbnail 은 1장만 is_primary=true. 나머지는 sort_order 순.
 * - Master 가 방금 생성되었으므로 기존 이미지 교체 로직은 필요 없다.
 */
export async function linkPromotionImages(
  dataSource: Pick<DataSource, 'query'>,
  masterId: string,
  images: PromotionImageInput[],
): Promise<number> {
  const sorted = [...images]
    .filter((i) => typeof i.url === 'string' && i.url.trim())
    .sort((a, b) => a.sortOrder - b.sortOrder);
  let primaryAssigned = false;
  let inserted = 0;
  for (let i = 0; i < sorted.length; i += 1) {
    const img = sorted[i];
    const isPrimary = img.type === 'thumbnail' && !primaryAssigned;
    if (isPrimary) primaryAssigned = true;
    await dataSource.query(
      `INSERT INTO product_images
         (id, master_id, image_url, gcs_path, sort_order, is_primary, type, source, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, '', $3, $4, $5, $6, NOW(), NOW())`,
      [masterId, img.url.trim(), i, isPrimary, img.type, PROMOTION_IMAGE_SOURCE],
    );
    inserted += 1;
  }
  return inserted;
}

/**
 * store 추상 위의 승격 본체. InMemory store 로 단위테스트한다.
 * 순서: #1 Plan 검증 → #2 candidate 상태 → #3 dedup 3종 → #4 판정 → #5/#6 → #7 identifier 멱등 → #9 candidate 갱신
 */
export async function promoteWithStore(store: PromotionStore, plan: ProductPromotionPlan): Promise<PromotionOutcome> {
  const v = validatePlan(plan);
  if (v.ok === false) return { kind: 'hold', reason: v.reason }; // strictNullChecks off — 부정 narrowing 불가

  const stateHold = validateCandidateState(await store.loadCandidateState(plan.candidateId));
  if (stateHold) return { kind: 'hold', reason: stateHold };

  // #3 dedup — identityKey=true 식별자만 ② 축에 참여한다
  const dedup: DedupMatches = { byBarcode: [], byIdentifier: [], byNameManufacturer: [] };
  if (plan.master.barcode) dedup.byBarcode = await store.findMastersByBarcode(plan.master.barcode);
  for (const id of v.identifiers) {
    if (!id.identityKey) continue;
    const rows = await store.findMastersByIdentifier(id.type, id.normalized);
    for (const r of rows) if (!dedup.byIdentifier.some((x) => x.id === r.id)) dedup.byIdentifier.push(r);
  }
  if (plan.dedupHints.nameManufacturerExact) {
    dedup.byNameManufacturer = await store.findMastersByNameManufacturer(plan.master.name, plan.master.manufacturerName);
  }

  const decision = decideFromDedup(dedup);
  if (decision.kind === 'conflict') return { kind: 'conflict', reason: decision.reason, masters: decision.masters };

  const approvalBase = { ...plan.approvalMeta, note: plan.note ?? null };

  if (decision.kind === 'create') {
    const masterId = await store.createMaster(plan.master);
    const identifiersCreated = await ensureIdentifiers(store, masterId, v.identifiers);
    await store.updateCandidate(plan.candidateId, {
      matchedProductMasterId: masterId,
      candidateStatus: 'approved_new_master',
      reviewedBy: plan.reviewedBy,
      approval: { ...approvalBase, outcome: 'create', masterId, identifiersCreated },
    });
    logger.info(`[PromotionCore] create candidate=${plan.candidateId} -> master=${masterId} identifiers=${identifiersCreated}`);
    return { kind: 'create', masterId, identifiersCreated };
  }

  // link — 기존 Master 불변 · identifier 보강만 · 차이는 report
  const existing: PromotionMasterRef = decision.master;
  const identifiersCreated = await ensureIdentifiers(store, existing.id, v.identifiers);
  const existingMasterDiff = buildExistingMasterDiff(existing, plan);
  await store.updateCandidate(plan.candidateId, {
    matchedProductMasterId: existing.id,
    candidateStatus: 'matched',
    reviewedBy: plan.reviewedBy,
    approval: { ...approvalBase, outcome: 'link', masterId: existing.id, matchType: decision.matchType, identifiersCreated },
  });
  logger.info(`[PromotionCore] link candidate=${plan.candidateId} -> master=${existing.id} via=${decision.matchType} identifiers=${identifiersCreated}`);
  return { kind: 'link', masterId: existing.id, identifiersCreated, matchType: decision.matchType, existingMasterDiff };
}

/** #7 Identifier 멱등 생성 — 대상 Master 에 (type, normalized) 가 있으면 skip. identityKey 무관 · 타 Master 중복 검사 없음 */
async function ensureIdentifiers(store: PromotionStore, masterId: string, identifiers: NormalizedIdentifier[]): Promise<number> {
  if (identifiers.length === 0) return 0;
  const have = await store.findIdentifierKeysOfMaster(masterId);
  let created = 0;
  for (const id of identifiers) {
    const key = identifierKey(id.type, id.normalized);
    if (have.has(key)) continue;
    await store.createIdentifier(masterId, id);
    have.add(key);
    created += 1;
  }
  return created;
}
