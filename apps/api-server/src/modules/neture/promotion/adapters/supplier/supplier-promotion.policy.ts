/**
 * Supplier Promotion Adapter — 정책 후검사 (같은 TX 안 · throw = 롤백)
 *
 * WO-O4O-SUPPLIER-PRODUCT-CANDIDATE-PROMOTION-ADAPTER-V1 §2.2
 *
 * Core 는 제품군 적격성을 판단하지 않는다. 공급자 정책은 Core 결과를 받은 뒤 **같은 트랜잭션에서** 검사하고,
 * 위반이면 throw 해 Core 가 쓴 Master/Identifier/candidate 전이를 전부 되돌린다.
 *
 *   create : GENERAL · COSMETIC 만 허용. 규제 제품군(DRUG · HEALTH_FUNCTIONAL · QUASI_DRUG · MEDICAL_DEVICE) 의
 *            신규 Master 는 공급자 자기 신고만으로 만들지 않는다 → SUPPLIER_REGULATED_CREATE_BLOCKED
 *   link   : 기존 Master 의 regulatory_type(한글 별칭 포함) 을 canonical 로 맞춘 뒤 후보 분류와 정확 일치해야 한다
 *            → 불일치 SUPPLIER_REGULATORY_TYPE_MISMATCH · 기존 Rx(drug_category='rx') 연결 SUPPLIER_RX_LINK_BLOCKED
 *   conflict · hold : 통과 (Core 가 아무것도 쓰지 않았다)
 */

import type { PromotionOutcome, PromotionRegulatoryType } from '../../product-promotion.types.js';
import type { NormalizedSupplierCandidate } from './supplier-candidate.normalizer.js';
import { canonicalizeRegulatoryType } from './supplier-regulatory-type.js';

export const SUPPLIER_CREATE_ALLOWED_TYPES: readonly PromotionRegulatoryType[] = ['GENERAL', 'COSMETIC'];

export type SupplierPolicyErrorCode =
  | 'SUPPLIER_REGULATED_CREATE_BLOCKED'
  | 'SUPPLIER_REGULATORY_TYPE_MISMATCH'
  | 'SUPPLIER_RX_LINK_BLOCKED';

export interface SupplierPolicyErrorData {
  regulatoryType: PromotionRegulatoryType;
  existingMaster?: { id: string; regulatoryType: string | null; drugCategory?: string | null };
}

export class SupplierPolicyError extends Error {
  constructor(public readonly code: SupplierPolicyErrorCode, public readonly data: SupplierPolicyErrorData) {
    super(code);
    this.name = 'SupplierPolicyError';
  }
}

/** 같은 TX 의 EntityManager 로 충분한 최소 표면 (테스트 fake 주입용) */
export interface PolicyQueryRunner {
  query(sql: string, params?: unknown[]): Promise<unknown>;
}

export async function assertSupplierPolicy(
  m: PolicyQueryRunner,
  n: NormalizedSupplierCandidate,
  outcome: PromotionOutcome,
): Promise<void> {
  if (outcome.kind === 'create') {
    if (!SUPPLIER_CREATE_ALLOWED_TYPES.includes(n.regulatoryType)) {
      throw new SupplierPolicyError('SUPPLIER_REGULATED_CREATE_BLOCKED', { regulatoryType: n.regulatoryType });
    }
    return;
  }
  if (outcome.kind !== 'link') return;

  const rows = (await m.query(
    `SELECT id, regulatory_type, drug_category FROM product_masters WHERE id = $1 LIMIT 1`,
    [outcome.masterId],
  )) as Array<{ id: string; regulatory_type: string | null; drug_category: string | null }>;
  const row = rows[0] ?? { id: outcome.masterId, regulatory_type: null, drug_category: null };
  const existingMaster = { id: row.id, regulatoryType: row.regulatory_type, drugCategory: row.drug_category };

  const canonical = canonicalizeRegulatoryType(row.regulatory_type);
  if (canonical !== n.regulatoryType) {
    throw new SupplierPolicyError('SUPPLIER_REGULATORY_TYPE_MISMATCH', { regulatoryType: n.regulatoryType, existingMaster });
  }
  if (n.regulatoryType === 'DRUG' && (row.drug_category ?? '').trim().toLowerCase() === 'rx') {
    throw new SupplierPolicyError('SUPPLIER_RX_LINK_BLOCKED', { regulatoryType: n.regulatoryType, existingMaster });
  }
}
