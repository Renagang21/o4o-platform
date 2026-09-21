/**
 * Supplier Promotion Adapter — Plan Builder (NormalizedSupplierCandidate → ProductPromotionPlan)
 *
 * WO-O4O-SUPPLIER-PRODUCT-CANDIDATE-PROMOTION-ADAPTER-V1 §2.2
 *
 * origin(single/bulk) 으로 **업무 분기하지 않는다** — sourceLabel 표기만 다르다.
 * 이름 · 제조사는 합성하지 않는다 (비면 Core 가 hold: name_missing / manufacturer_missing).
 *
 * §2.2-A 신규 Master 저장 범위: Core createMaster 가 쓰는 필드뿐이다
 * (barcode · regulatory_type · drug_category · regulatory_name · name · manufacturer_name · specification
 *  + optional metadata: category_id · brand_id · origin_country).
 * mfdsPermitNumber · brandName(문자열) 은 Master 에 저장되지 않고 candidate.raw_payload.approval.evidence 로만 남는다.
 * Adapter 는 product_masters 를 직접 UPDATE 하지 않는다 — metadata 는 Core create INSERT 를 통해서만 도달한다.
 *
 * WO-O4O-SUPPLIER-PRODUCT-REGISTRATION-AI-FIRST-CUTOVER-AND-LEGACY-MASTER-RESOLUTION-RETIREMENT-V1 §2.5:
 *   categoryId · brandId 는 호출자(promotion service)가 존재 여부를 확인한 값(`refs`)만 metadata 로 넣는다.
 *   확인되지 않은 참조는 evidence 에 남고 approvalMeta.droppedRefs 로 기록된다. 이미지는 effects.images (create 만).
 */

import type { ProductPromotionPlan } from '../../product-promotion.types.js';
import type { NormalizedSupplierCandidate } from './supplier-candidate.normalizer.js';
import { SUPPLIER_BULK_SOURCE_LABEL, SUPPLIER_SINGLE_SOURCE_LABEL } from './supplier-candidate.normalizer.js';

export const SUPPLIER_IDENTIFIER_SOURCE_TYPE = 'supplier_candidate';
export const SUPPLIER_IDENTIFIER_VERIFICATION_STATUS = 'supplier_provided';
export const SUPPLIER_LANDING_SOURCE = 'supplier-candidate';
export const SUPPLIER_APPROVAL_KIND = 'supplier';

/** 존재가 확인된 참조만. 확인하지 않았으면(null) metadata 에서 뺀다 */
export interface SupplierResolvedRefs {
  categoryId: string | null;
  brandId: string | null;
  /** evidence 에는 있었지만 존재 확인에 실패해 metadata 에서 제외한 키 */
  dropped: Array<'categoryId' | 'brandId'>;
}

export function buildSupplierPromotionPlan(
  n: NormalizedSupplierCandidate,
  input: { reviewedBy?: string | null; note?: string | null; refs?: SupplierResolvedRefs | null },
): ProductPromotionPlan {
  const sourceLabel = n.origin === 'single' ? SUPPLIER_SINGLE_SOURCE_LABEL : SUPPLIER_BULK_SOURCE_LABEL;
  const refs = input.refs ?? { categoryId: null, brandId: null, dropped: [] };
  return {
    candidateId: n.candidateId,
    master: {
      regulatoryType: n.regulatoryType,
      drugCategory: n.drugCategory,
      name: n.name ?? '',
      manufacturerName: n.manufacturerName ?? '',
      specification: n.specification,
      barcode: n.barcode,
      metadata: {
        categoryId: refs.categoryId,
        brandId: refs.brandId,
        originCountry: n.evidence.originCountry,
        regulatoryName: n.evidence.regulatoryName,
      },
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
    effects: {
      ensureDrugExtension: n.regulatoryType === 'DRUG',
      images: n.images.map((i) => ({ url: i.url, type: i.type, sortOrder: i.sortOrder })),
    },
    reviewedBy: input.reviewedBy ?? null,
    note: input.note ?? null,
    approvalMeta: {
      kind: SUPPLIER_APPROVAL_KIND,
      origin: n.origin,
      supplierId: n.supplierId,
      evidence: { ...n.evidence },
      imageCount: n.images.length,
      ...(refs.dropped.length > 0 ? { droppedRefs: [...refs.dropped] } : {}),
    },
    landingSource: SUPPLIER_LANDING_SOURCE,
  };
}
