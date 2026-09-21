/**
 * Supplier Promotion Adapter — Plan Builder (NormalizedSupplierCandidate → ProductPromotionPlan)
 *
 * WO-O4O-SUPPLIER-PRODUCT-CANDIDATE-PROMOTION-ADAPTER-V1 §2.2
 *
 * origin(single/bulk) 으로 **업무 분기하지 않는다** — sourceLabel 표기만 다르다.
 * 이름 · 제조사는 합성하지 않는다 (비면 Core 가 hold: name_missing / manufacturer_missing).
 *
 * §2.2-A 신규 Master 저장 범위: Core createMaster 가 쓰는 필드뿐이다
 * (barcode · regulatory_type · drug_category · regulatory_name(=name) · name · manufacturer_name · specification).
 * regulatoryName · mfdsPermitNumber · categoryId · brandName · originCountry 는 Master 에 저장되지 않고
 * candidate.raw_payload.approval.evidence 로만 남는다. Adapter 는 product_masters 를 직접 UPDATE 하지 않는다.
 */

import type { ProductPromotionPlan } from '../../product-promotion.types.js';
import type { NormalizedSupplierCandidate } from './supplier-candidate.normalizer.js';
import { SUPPLIER_BULK_SOURCE_LABEL, SUPPLIER_SINGLE_SOURCE_LABEL } from './supplier-candidate.normalizer.js';

export const SUPPLIER_IDENTIFIER_SOURCE_TYPE = 'supplier_candidate';
export const SUPPLIER_IDENTIFIER_VERIFICATION_STATUS = 'supplier_provided';
export const SUPPLIER_LANDING_SOURCE = 'supplier-candidate';
export const SUPPLIER_APPROVAL_KIND = 'supplier';

export function buildSupplierPromotionPlan(
  n: NormalizedSupplierCandidate,
  input: { reviewedBy?: string | null; note?: string | null },
): ProductPromotionPlan {
  const sourceLabel = n.origin === 'single' ? SUPPLIER_SINGLE_SOURCE_LABEL : SUPPLIER_BULK_SOURCE_LABEL;
  return {
    candidateId: n.candidateId,
    master: {
      regulatoryType: n.regulatoryType,
      drugCategory: n.drugCategory,
      name: n.name ?? '',
      manufacturerName: n.manufacturerName ?? '',
      specification: n.specification,
      barcode: n.barcode,
    },
    identifiers: n.identifiers.map((i) => ({
      type: i.type,
      value: i.value,
      isPrimary: i.isPrimary,
      identityKey: i.identityKey,
      sourceType: SUPPLIER_IDENTIFIER_SOURCE_TYPE,
      sourceLabel,
      verificationStatus: SUPPLIER_IDENTIFIER_VERIFICATION_STATUS,
    })),
    dedupHints: { nameManufacturerExact: true },
    effects: { ensureDrugExtension: n.regulatoryType === 'DRUG' },
    reviewedBy: input.reviewedBy ?? null,
    note: input.note ?? null,
    approvalMeta: {
      kind: SUPPLIER_APPROVAL_KIND,
      origin: n.origin,
      supplierId: n.supplierId,
      evidence: { ...n.evidence },
    },
    landingSource: SUPPLIER_LANDING_SOURCE,
  };
}
