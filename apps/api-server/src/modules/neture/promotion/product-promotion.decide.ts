/**
 * Product Promotion Core — 순수 결정 계층 (DB 없음)
 *
 * WO-O4O-PRODUCT-CANDIDATE-GENERAL-PROMOTION-CORE-FOUNDATION-V1 §2.1 #1~#4 · #6
 *
 * 결정 순서 (P1 drug promoteOne 의 골격만 빌림 · 필드 매핑은 없음):
 *   Plan 구조 검증 → candidate 상태 검증 → dedup 3종 → create | link | conflict
 *
 * 여기에는 regulatoryType 분기가 없다. DRUG 관련 검사는 "구조 검증"(drugCategory 필수 · Rx 는
 * 범용 승격 불가 — baseline §10)뿐이며 제품군 적격성 판단이 아니다.
 */

import { isGtinLike, normalizeIdentifier } from '../utils/product-identifier.util.js';
import {
  PROMOTION_DRUG_CATEGORIES,
  PROMOTION_REGULATORY_TYPES,
  type ExistingMasterDiff,
  type NormalizedIdentifier,
  type ProductPromotionPlan,
  type PromotionCandidateState,
  type PromotionConflictReason,
  type PromotionHoldReason,
  type PromotionMasterRef,
  type PromotionMatchedMaster,
  type PromotionMatchType,
} from './product-promotion.types.js';

export type PlanValidation =
  | { ok: true; identifiers: NormalizedIdentifier[] }
  | { ok: false; reason: PromotionHoldReason };

/** #1 Plan 구조 검증. 통과하면 정규화된 식별자 목록을 돌려준다. */
export function validatePlan(plan: ProductPromotionPlan): PlanValidation {
  const m = plan.master;
  if (!(PROMOTION_REGULATORY_TYPES as readonly string[]).includes(m.regulatoryType)) {
    return { ok: false, reason: 'regulatory_type_invalid' };
  }
  if (m.drugCategory != null && !(PROMOTION_DRUG_CATEGORIES as readonly string[]).includes(m.drugCategory)) {
    return { ok: false, reason: 'drug_category_required' };
  }
  if (m.regulatoryType === 'DRUG' && m.drugCategory == null) return { ok: false, reason: 'drug_category_required' };
  if (m.regulatoryType === 'DRUG' && m.drugCategory === 'rx') return { ok: false, reason: 'rx_not_promotable' };
  if (!m.name || !m.name.trim()) return { ok: false, reason: 'name_missing' };
  if (!m.manufacturerName || !m.manufacturerName.trim()) return { ok: false, reason: 'manufacturer_missing' };
  if (m.barcode != null && !isGtinLike(m.barcode)) return { ok: false, reason: 'identifier_invalid' };

  const identifiers: NormalizedIdentifier[] = [];
  const seen = new Set<string>();
  for (const id of plan.identifiers) {
    const normalized = normalizeIdentifier(id.type, id.value);
    if (!normalized) return { ok: false, reason: 'identifier_invalid' };
    const key = `${id.type}|${normalized}`;
    if (seen.has(key)) continue; // Plan 안 중복은 무해 — 한 번만
    seen.add(key);
    identifiers.push({ ...id, normalized });
  }
  return { ok: true, identifiers };
}

/** #2 candidate 상태 검증 */
export function validateCandidateState(state: PromotionCandidateState | null): PromotionHoldReason | null {
  if (!state) return 'candidate_not_found';
  if (state.matchedProductMasterId) return 'candidate_already_linked';
  if (!(state.candidateStatus === 'pending' || state.candidateStatus === 'reviewing')) return 'candidate_not_reviewable';
  return null;
}

/** dedup 3종의 조회 결과 (조회는 store 가, 판정은 여기서) */
export interface DedupMatches {
  byBarcode: PromotionMasterRef[];
  /** identityKey=true 식별자로 찾은 Master 만 */
  byIdentifier: PromotionMasterRef[];
  byNameManufacturer: PromotionMasterRef[];
}

export type DedupDecision =
  | { kind: 'create' }
  | { kind: 'link'; master: PromotionMasterRef; matchType: PromotionMatchType }
  | { kind: 'conflict'; reason: PromotionConflictReason; masters: PromotionMatchedMaster[] };

/** #4 dedup 결과 판정: 0 → create / 정확히 1 Master → link / 2+ 또는 축 간 불일치 → conflict */
export function decideFromDedup(d: DedupMatches): DedupDecision {
  const matched = new Map<string, PromotionMatchedMaster>();
  const add = (rows: PromotionMasterRef[], matchType: PromotionMatchType) => {
    for (const r of rows) if (!matched.has(r.id)) matched.set(r.id, { ...r, matchType });
  };
  // 우선순위: barcode > identifier > name_manufacturer (같은 Master 가 여러 축에 걸리면 앞 축으로 표기)
  add(d.byBarcode, 'barcode');
  add(d.byIdentifier, 'identifier');
  add(d.byNameManufacturer, 'name_manufacturer');

  if (matched.size === 0) return { kind: 'create' };
  if (matched.size === 1) {
    const only = [...matched.values()][0];
    return { kind: 'link', master: only, matchType: only.matchType };
  }

  const masters = [...matched.values()];
  const barcodeIds = new Set(d.byBarcode.map((r) => r.id));
  const identifierIds = new Set(d.byIdentifier.map((r) => r.id));
  const nameIds = new Set(d.byNameManufacturer.map((r) => r.id));
  const disagree = (a: Set<string>, b: Set<string>) =>
    a.size > 0 && b.size > 0 && ([...a].some((x) => !b.has(x)) || [...b].some((x) => !a.has(x)));

  let reason: PromotionConflictReason = 'multiple_masters_match';
  if (disagree(barcodeIds, identifierIds)) reason = 'identifier_belongs_to_other_master';
  else if (disagree(barcodeIds, nameIds)) reason = 'barcode_belongs_to_other_master';
  return { kind: 'conflict', reason, masters };
}

/** #6 link 시 기존 Master 와의 차이 — report 만, 덮어쓰지 않는다 */
export function buildExistingMasterDiff(existing: PromotionMasterRef, plan: ProductPromotionPlan): ExistingMasterDiff | null {
  const norm = (s: string | null | undefined) => (s ?? '').trim().toLowerCase();
  const diff: ExistingMasterDiff = {
    nameDiffers: norm(existing.name) !== norm(plan.master.name),
    manufacturerDiffers: norm(existing.manufacturerName) !== norm(plan.master.manufacturerName),
    specificationDiffers: norm(existing.specification) !== norm(plan.master.specification),
    existing: { name: existing.name, manufacturerName: existing.manufacturerName, specification: existing.specification },
    plan: { name: plan.master.name, manufacturerName: plan.master.manufacturerName, specification: plan.master.specification },
  };
  return diff.nameDiffers || diff.manufacturerDiffers || diff.specificationDiffers ? diff : null;
}
