/**
 * Product Type / OTC 분류 유틸 — OTC Extension foundation (Phase: OTC)
 *
 * WO-O4O-PRODUCT-TYPE-OTC-EXTENSION-REGISTRATION-POLICY-V1
 * Baseline: docs/baseline/O4O-PRODUCT-CORE-BASELINE-V1.md §9 (Product Type / Drug Extension)
 *
 * 순수 분류/정책 helper. **DB 변경 없음.** 기존 활성 규제 모델
 * (ProductMaster.regulatoryType + assertPharmacyOnlyServiceKeys) 위에서
 * 비처방의약품(OTC)을 비의약품/처방의약품(Rx)과 구분하기 위한 기반.
 *
 * 중요한 현실 제약 (CHECK 참조):
 *   - api-server 활성 모델의 regulatoryType 은 'DRUG' 까지만 구분하며 OTC vs ETC(Rx) 를
 *     구분하지 못한다. OTC/ETC 구분은 dormant PharmaProductMaster.category 에만 존재.
 *   - 따라서 drugCategory(또는 candidate raw_payload 의 drug_category/product_type) 가
 *     명시되지 않으면 'drug_unspecified' 로 분류하고, 보수적(약국 전용·노출/판매 제한) 기본 정책을 적용한다.
 *   - Rx(처방의약품) 등록 루트는 본 WO 범위 밖 — 분류만 제공하고 등록/판매는 막는다.
 */

/** 제품 유형 분류 (application-level union, DB enum 아님) */
export type ProductTypeClass =
  | 'non_drug' // 비의약품 (GENERAL/COSMETIC 등)
  | 'otc_drug' // 비처방의약품 (일반의약품)
  | 'rx_drug' // 처방의약품 (전문의약품, ETC) — 본 WO 등록 범위 밖
  | 'quasi_drug' // 의약외품
  | 'health_functional' // 건강기능식품
  | 'drug_unspecified' // 의약품이나 OTC/ETC 미확정 — 보수적 처리
  | 'unknown';

/** 노출/광고/판매 기본 정책 (검토 전 기본값). 운영자/약사 검토 후 override 대상. */
export interface DrugDisplayPolicy {
  /** 약국 전용 서비스에만 연결 (assertPharmacyOnlyServiceKeys 와 정합) */
  pharmacyOnly: boolean;
  /** 고객 공개 노출 허용 */
  customerDisplayAllowed: boolean;
  /** 태블릿 노출 허용 ('limited' = 약국 내부 확인용 제한 노출) */
  tabletDisplayAllowed: boolean | 'limited';
  /** 온라인 판매 허용 */
  onlineSaleAllowed: boolean;
  /** 광고/홍보 검토 상태 */
  advertisingReviewStatus: 'not_reviewed' | 'needs_review' | 'approved_limited' | 'rejected' | 'blocked';
}

/** OTC 검증/검토 상태 (application-level union) — Drug Extension 활성 시 영속 대상 */
export type DrugVerificationStatus =
  | 'draft'
  | 'pending_review'
  | 'verified'
  | 'rejected'
  | 'deprecated';

/** 검토 주체 */
export type DrugReviewer =
  | 'operator'
  | 'pharmacist_reviewer'
  | 'system_import'
  | 'supplier_provided';

export interface ClassifyInput {
  /** ProductMaster.regulatoryType (DRUG/HEALTH_FUNCTIONAL/QUASI_DRUG/COSMETIC/GENERAL) 또는 한글/별칭 */
  regulatoryType?: string | null;
  /** 명시적 의약품 분류 (otc/etc/quasi_drug) — PharmaProductMaster.category 또는 입력 */
  drugCategory?: string | null;
  /** candidate raw_payload 등 부가 신호 (product_type / drug_category) */
  rawPayload?: Record<string, unknown> | null;
}

function norm(v?: string | null): string {
  return (v ?? '').toString().trim().toLowerCase();
}

/** 명시적 의약품 분류 문자열 → ProductTypeClass (otc/etc/quasi) */
function fromDrugCategory(raw: string): ProductTypeClass | null {
  switch (raw) {
    case 'otc':
    case 'otc_drug':
    case '일반의약품':
      return 'otc_drug';
    case 'etc':
    case 'rx':
    case 'rx_drug':
    case '전문의약품':
      return 'rx_drug';
    case 'quasi':
    case 'quasi_drug':
    case '의약외품':
      return 'quasi_drug';
    default:
      return null;
  }
}

/** regulatoryType → ProductTypeClass (DRUG 은 OTC/ETC 미구분 → drug_unspecified) */
function fromRegulatoryType(raw: string): ProductTypeClass | null {
  switch (raw) {
    case 'drug':
    case '의약품':
      return 'drug_unspecified';
    case 'quasi_drug':
    case '의약외품':
      return 'quasi_drug';
    case 'health_functional':
    case '건강기능식품':
      return 'health_functional';
    case 'cosmetic':
    case '화장품':
    case 'general':
    case '일반':
      return 'non_drug';
    default:
      return null;
  }
}

/**
 * 제품 유형 분류.
 *
 * 우선순위: 명시 drugCategory → rawPayload(drug_category/product_type) → regulatoryType → unknown.
 * 'DRUG' 인데 OTC/ETC 가 명시되지 않으면 drug_unspecified (보수적).
 */
export function classifyProductType(input: ClassifyInput): ProductTypeClass {
  const cat = norm(input.drugCategory);
  if (cat) {
    const c = fromDrugCategory(cat);
    if (c) return c;
  }

  const payload = input.rawPayload ?? {};
  const payloadCat = norm(
    (payload['drug_category'] as string) ?? (payload['drugCategory'] as string) ?? (payload['product_type'] as string) ?? (payload['productType'] as string),
  );
  if (payloadCat) {
    const c = fromDrugCategory(payloadCat);
    if (c) return c;
  }

  const reg = norm(input.regulatoryType);
  if (reg) {
    const c = fromRegulatoryType(reg);
    if (c) return c;
  }

  return 'unknown';
}

/** 의약품(OTC/Rx/미확정) 여부 */
export function isDrugClass(cls: ProductTypeClass): boolean {
  return cls === 'otc_drug' || cls === 'rx_drug' || cls === 'drug_unspecified';
}

/** OTC 로 등록 가능한가 (otc 또는 미확정 의약품 — 미확정은 검토에서 OTC 확정 필요) */
export function isOtcRegistrable(cls: ProductTypeClass): boolean {
  return cls === 'otc_drug' || cls === 'drug_unspecified';
}

/** Rx(처방의약품) 여부 — 본 WO 등록/판매 차단 대상 */
export function isRxClass(cls: ProductTypeClass): boolean {
  return cls === 'rx_drug';
}

/**
 * 분류별 검토 전 기본 노출/판매 정책.
 * 의약품 계열은 보수적(약국 전용 + 고객노출/온라인판매 차단 + 광고 needs_review).
 * Rx 는 전면 차단(blocked). 비의약품은 제한 없음.
 */
export function getDefaultDrugDisplayPolicy(cls: ProductTypeClass): DrugDisplayPolicy {
  switch (cls) {
    case 'rx_drug':
      return {
        pharmacyOnly: true,
        customerDisplayAllowed: false,
        tabletDisplayAllowed: 'limited', // 약국 내부 확인/업무 보조용
        onlineSaleAllowed: false,
        advertisingReviewStatus: 'blocked',
      };
    case 'otc_drug':
    case 'drug_unspecified':
      return {
        pharmacyOnly: true,
        customerDisplayAllowed: false,
        tabletDisplayAllowed: 'limited',
        onlineSaleAllowed: false,
        advertisingReviewStatus: 'needs_review',
      };
    case 'quasi_drug':
    case 'health_functional':
      return {
        pharmacyOnly: false,
        customerDisplayAllowed: true,
        tabletDisplayAllowed: true,
        onlineSaleAllowed: false, // 판매는 별도 검토
        advertisingReviewStatus: 'needs_review',
      };
    case 'non_drug':
    default:
      return {
        pharmacyOnly: false,
        customerDisplayAllowed: true,
        tabletDisplayAllowed: true,
        onlineSaleAllowed: true,
        advertisingReviewStatus: 'not_reviewed',
      };
  }
}
