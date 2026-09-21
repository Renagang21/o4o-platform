/**
 * WO-O4O-SUPPLIER-SINGLE-PRODUCT-CANDIDATE-INTAKE-V1
 *
 * 공급자 단건 제품 후보 intake — 순수 mapper.
 *   body(신뢰 불가) → 검증된 값 → CreateCandidateInput
 *
 * 원칙 (WO §1.3 · §2.3):
 *   - supplierId 는 body 에서 받지 않는다. requireActiveSupplier 가 확정한 값만 ctx 로 받아 rawPayload 에 기록.
 *   - 제조사 · 바코드는 선택. 비어 있으면 null — '미상' 류 합성 금지.
 *   - 비-GTIN 바코드는 identifierType='UNKNOWN' + 값 보존 (identityKey 판정은 ③ Adapter 책임).
 *   - 공급 정책(distributionType · serviceKeys) · 재고/lot/유효기간/일련번호는 금지 키 → 400.
 *   - ProductMaster / Identifier / Offer / Promotion Core 를 알지 못한다 (DB · Express 의존 0).
 */
import type { CreateCandidateInput } from './product-candidate.service.js';
import type { ProductIdentifierType } from '../entities/ProductIdentifier.entity.js';
import { inferIdentifierTypeFromBarcode, sanitizeIdentifierValue } from '../utils/product-identifier.util.js';

export const SUPPLIER_SINGLE_CANDIDATE_SOURCE_TYPE = 'supplier_web' as const;
export const SUPPLIER_SINGLE_CANDIDATE_SOURCE_LABEL = 'neture-supplier-single';
export const SUPPLIER_SINGLE_CANDIDATE_RAW_SOURCE = 'supplier_single';
export const SUPPLIER_SINGLE_CANDIDATE_SERVICE_KEY = 'neture';

/** Promotion Core 의 PROMOTION_REGULATORY_TYPES 와 같은 어휘 (영문 코드만 · 한글 별칭 불허) */
export const SUPPLIER_CANDIDATE_REGULATORY_TYPES = [
  'GENERAL',
  'COSMETIC',
  'HEALTH_FUNCTIONAL',
  'QUASI_DRUG',
  'MEDICAL_DEVICE',
  'DRUG',
] as const;
export type SupplierCandidateRegulatoryType = (typeof SUPPLIER_CANDIDATE_REGULATORY_TYPES)[number];

/** DRUG 의 하위 분류만. 의약외품은 regulatoryType=QUASI_DRUG 로 받는다 (③ WO §2.4 · 'quasi_drug' 제거) */
export const SUPPLIER_CANDIDATE_DRUG_CATEGORIES = ['otc', 'rx'] as const;
export type SupplierCandidateDrugCategory = (typeof SUPPLIER_CANDIDATE_DRUG_CATEGORIES)[number];

/**
 * O4O 범위 외 키(처방 lot/유효기간/일련번호/재고 등).
 * bulk 경로(`supplier-product.controller.ts` BULK_FORBIDDEN_KEYS)와 **같은 값**이어야 한다 —
 * 소스 계약 테스트(`supplier-product-candidate-intake-contract.spec.ts`)가 동일성을 고정한다.
 */
export const O4O_OUT_OF_SCOPE_KEYS: readonly string[] = [
  'lot', 'lot_no', 'lot_number', 'serial', 'serial_number', 'expiry', 'expiry_date',
  'expiration', 'expiration_date', 'stock', 'inventory', 'inbound_date', 'warehouse',
  'warehouse_location', 'traceability', 'traceability_status',
  '유효기간', '일련번호', '재고', '입고일', '로트', '재고수량', '창고',
];

/** Candidate 계약에서 제외한 키 — 소유축 주입 · 공급 정책 · 재고 (WO §2.1 금지 키 · §2.3 #4 #6) */
export const SUPPLIER_CANDIDATE_POLICY_FORBIDDEN_KEYS: readonly string[] = [
  'supplierid', 'supplier_id',
  'distributiontype', 'distribution_type',
  'servicekeys', 'service_keys',
  'stockqty', 'stock_qty', 'stockquantity', 'stock_quantity',
];

export const SUPPLIER_SINGLE_CANDIDATE_FORBIDDEN_KEYS: ReadonlySet<string> = new Set(
  [...O4O_OUT_OF_SCOPE_KEYS, ...SUPPLIER_CANDIDATE_POLICY_FORBIDDEN_KEYS].map((k) => k.toLowerCase()),
);

export type SupplierSingleCandidateErrorCode =
  | 'CANDIDATE_NAME_REQUIRED'
  | 'INVALID_REGULATORY_TYPE'
  | 'DRUG_CATEGORY_REQUIRED'
  | 'INVALID_PRICE'
  | 'INVALID_URL'
  | 'INVALID_CATEGORY_ID'
  | 'FORBIDDEN_FIELD'
  | 'FIELD_TOO_LONG';

export interface SupplierSingleCandidateOfferDraft {
  priceGeneral: number | null;
  consumerReferencePrice: number | null;
  consumerShortDescription: string | null;
  consumerDetailDescription: string | null;
  isFeatured: boolean;
}

export interface ValidatedSupplierSingleCandidate {
  name: string;
  barcode: string | null;
  brandName: string | null;
  manufacturerName: string | null;
  specification: string | null;
  categoryId: string | null;
  imageUrl: string | null;
  regulatoryType: SupplierCandidateRegulatoryType;
  drugCategory: SupplierCandidateDrugCategory | null;
  regulatoryName: string | null;
  mfdsPermitNumber: string | null;
  originCountry: string | null;
  offerDraft: SupplierSingleCandidateOfferDraft;
}

export type SupplierSingleCandidateValidation =
  | { ok: true; value: ValidatedSupplierSingleCandidate }
  | { ok: false; code: SupplierSingleCandidateErrorCode; message: string };

export interface SupplierSingleCandidateContext {
  /** requireActiveSupplier 가 확정한 neture_suppliers.id — body 값이 아니다 */
  supplierId: string;
  /** 감사 정보(누가 제출했는가). 소유권 판정에 쓰지 않는다 */
  submittedBy: string | null;
  now?: Date;
}

/**
 * rawPayload.product_type — bulk 의 BULK_TYPE_MAP 역방향 (운영자 콘솔 classifyProductType 호환).
 * ③ WO §2.4(b): HEALTH_FUNCTIONAL 은 'health_functional'(classifyProductType 이 additive 로 인식) ·
 * MEDICAL_DEVICE 는 null(ProductTypeClass 에 해당 값 없음 → 'unknown' 유지 · non_drug 임의 변환 금지).
 */
export type SupplierCandidateProductTypeKey = 'non_drug' | 'quasi_drug' | 'otc_drug' | 'rx_drug' | 'health_functional';

const LIMITS = {
  name: 200,
  barcode: 64,
  categoryId: 64,
  brandName: 200,
  manufacturerName: 200,
  specification: 500,
  regulatoryName: 200,
  mfdsPermitNumber: 100,
  originCountry: 100,
  imageUrl: 2048,
  consumerShortDescription: 500,
  consumerDetailDescription: 5000,
} as const;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

class ValidationFailure extends Error {
  constructor(public readonly code: SupplierSingleCandidateErrorCode, message: string) {
    super(message);
  }
}

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

/** 문자열 필드: null/undefined/공백 → null · 길이 초과 → FIELD_TOO_LONG. 합성 없음. */
function optStr(v: unknown, field: keyof typeof LIMITS): string | null {
  if (v == null) return null;
  const s = (typeof v === 'string' ? v : String(v)).trim();
  if (!s) return null;
  if (s.length > LIMITS[field]) {
    throw new ValidationFailure('FIELD_TOO_LONG', `${field} 은(는) ${LIMITS[field]}자를 넘을 수 없습니다.`);
  }
  return s;
}

/** 금액: null/undefined/'' → null · 숫자 또는 숫자 문자열(콤마·원 허용) · 0 이상만 */
function optPrice(v: unknown, field: string): number | null {
  if (v == null || v === '') return null;
  const num = typeof v === 'number' ? v : Number(String(v).replace(/[,\s원]/g, ''));
  if (!Number.isFinite(num) || num < 0) {
    throw new ValidationFailure('INVALID_PRICE', `${field} 은(는) 0 이상의 숫자여야 합니다.`);
  }
  return num;
}

/**
 * 바코드 입력 정리.
 *   - 숫자와 구분자(공백·하이픈)만이면 구분자를 제거해 GTIN 판정이 가능하게 한다 ('880-1234-567890' → EAN13).
 *   - 그 외(영숫자 코드)는 제어문자만 제거하고 원형 보존 — 정규화(구분자 제거·대문자)는 createCandidate 의 normalizeIdentifier 책임.
 *   - sanitizeIdentifierValue 는 하이픈을 제거하지 않는다(type 별 normalize 책임) — 여기서 숫자 코드만 compact 한다.
 */
function compactBarcode(raw: string | null): string | null {
  if (!raw) return null;
  const sanitized = sanitizeIdentifierValue(raw);
  if (!sanitized) return null;
  const compact = sanitized.replace(/[\s-]/g, '');
  return /^\d+$/.test(compact) ? compact : sanitized;
}

function findForbiddenKey(obj: Record<string, unknown>): string | null {
  for (const k of Object.keys(obj)) {
    if (SUPPLIER_SINGLE_CANDIDATE_FORBIDDEN_KEYS.has(k.trim().toLowerCase())) return k;
  }
  return null;
}

export function deriveSupplierCandidateProductType(
  regulatoryType: SupplierCandidateRegulatoryType,
  drugCategory: SupplierCandidateDrugCategory | null,
): SupplierCandidateProductTypeKey | null {
  if (regulatoryType === 'DRUG') return drugCategory === 'rx' ? 'rx_drug' : 'otc_drug';
  if (regulatoryType === 'QUASI_DRUG') return 'quasi_drug';
  if (regulatoryType === 'HEALTH_FUNCTIONAL') return 'health_functional';
  if (regulatoryType === 'MEDICAL_DEVICE') return null;
  return 'non_drug';
}

/**
 * body 검증. frontend 와 독립적으로 서버가 재검증한다.
 * 순서: 금지 키 → 상품명 → 규제 유형/약품 분류 → 나머지 필드.
 */
export function validateSupplierSingleCandidateBody(body: unknown): SupplierSingleCandidateValidation {
  try {
    const b = asRecord(body);
    const offerDraftRaw = asRecord(b.offerDraft);

    const forbidden = findForbiddenKey(b) ?? findForbiddenKey(offerDraftRaw);
    if (forbidden) {
      throw new ValidationFailure(
        'FORBIDDEN_FIELD',
        `허용되지 않는 필드 "${forbidden}" 이(가) 포함되어 있습니다. 공급자 ID · 공급 방식 · 서비스 선택 · 재고 · 유효기간 · 일련번호 · lot 정보는 제품 후보에서 받지 않습니다.`,
      );
    }

    const name = optStr(b.name, 'name');
    if (!name) throw new ValidationFailure('CANDIDATE_NAME_REQUIRED', '상품명을 입력해 주세요.');

    let regulatoryType: SupplierCandidateRegulatoryType = 'GENERAL';
    if (b.regulatoryType != null && String(b.regulatoryType).trim() !== '') {
      const rt = String(b.regulatoryType).trim().toUpperCase();
      if (!(SUPPLIER_CANDIDATE_REGULATORY_TYPES as readonly string[]).includes(rt)) {
        throw new ValidationFailure(
          'INVALID_REGULATORY_TYPE',
          `regulatoryType 은 ${SUPPLIER_CANDIDATE_REGULATORY_TYPES.join(' | ')} 중 하나여야 합니다.`,
        );
      }
      regulatoryType = rt as SupplierCandidateRegulatoryType;
    }

    let drugCategory: SupplierCandidateDrugCategory | null = null;
    if (regulatoryType === 'DRUG') {
      const dc = b.drugCategory == null ? '' : String(b.drugCategory).trim().toLowerCase();
      if (!(SUPPLIER_CANDIDATE_DRUG_CATEGORIES as readonly string[]).includes(dc)) {
        throw new ValidationFailure(
          'DRUG_CATEGORY_REQUIRED',
          `의약품은 drugCategory(${SUPPLIER_CANDIDATE_DRUG_CATEGORIES.join(' | ')}) 가 필요합니다. 의약외품은 regulatoryType=QUASI_DRUG 로 등록해 주세요.`,
        );
      }
      drugCategory = dc as SupplierCandidateDrugCategory;
    }

    const categoryId = optStr(b.categoryId, 'categoryId');
    if (categoryId && !UUID_RE.test(categoryId)) {
      throw new ValidationFailure('INVALID_CATEGORY_ID', 'categoryId 형식이 올바르지 않습니다.');
    }

    const imageUrl = optStr(b.imageUrl, 'imageUrl');
    if (imageUrl) {
      let ok = false;
      try {
        const u = new URL(imageUrl);
        ok = u.protocol === 'http:' || u.protocol === 'https:';
      } catch {
        ok = false;
      }
      if (!ok) throw new ValidationFailure('INVALID_URL', 'imageUrl 은 http(s) URL 이어야 합니다.');
    }

    const barcode = compactBarcode(optStr(b.barcode, 'barcode'));

    const value: ValidatedSupplierSingleCandidate = {
      name,
      barcode,
      brandName: optStr(b.brandName, 'brandName'),
      manufacturerName: optStr(b.manufacturerName, 'manufacturerName'),
      specification: optStr(b.specification, 'specification'),
      categoryId,
      imageUrl,
      regulatoryType,
      drugCategory,
      regulatoryName: optStr(b.regulatoryName, 'regulatoryName'),
      mfdsPermitNumber: optStr(b.mfdsPermitNumber, 'mfdsPermitNumber'),
      originCountry: optStr(b.originCountry, 'originCountry'),
      offerDraft: {
        priceGeneral: optPrice(offerDraftRaw.priceGeneral, 'priceGeneral'),
        consumerReferencePrice: optPrice(offerDraftRaw.consumerReferencePrice, 'consumerReferencePrice'),
        consumerShortDescription: optStr(offerDraftRaw.consumerShortDescription, 'consumerShortDescription'),
        consumerDetailDescription: optStr(offerDraftRaw.consumerDetailDescription, 'consumerDetailDescription'),
        isFeatured: offerDraftRaw.isFeatured === true,
      },
    };
    return { ok: true, value };
  } catch (e) {
    if (e instanceof ValidationFailure) return { ok: false, code: e.code, message: e.message };
    throw e;
  }
}

/**
 * 검증된 값 + 서버 컨텍스트 → CreateCandidateInput.
 * supplierId 는 ctx 에서만 온다. organizationId · sourceId 는 항상 null (WO §2.3 #3).
 */
export function buildSupplierSingleCandidateInput(
  value: ValidatedSupplierSingleCandidate,
  ctx: SupplierSingleCandidateContext,
): CreateCandidateInput {
  const now = ctx.now ?? new Date();

  let identifierType: ProductIdentifierType | null = null;
  let identifierValue: string | null = null;
  if (value.barcode) {
    identifierType = inferIdentifierTypeFromBarcode(value.barcode);
    identifierValue = value.barcode;
  }

  const productType = deriveSupplierCandidateProductType(value.regulatoryType, value.drugCategory);
  // classifyProductType 가 읽는 drug_category — bulk 와 같은 어휘 (QUASI_DRUG 는 'quasi_drug')
  const drugCategoryKey =
    value.drugCategory ?? (value.regulatoryType === 'QUASI_DRUG' ? 'quasi_drug' : null);

  return {
    serviceKey: SUPPLIER_SINGLE_CANDIDATE_SERVICE_KEY,
    organizationId: null,
    sourceType: SUPPLIER_SINGLE_CANDIDATE_SOURCE_TYPE,
    sourceId: null,
    sourceLabel: SUPPLIER_SINGLE_CANDIDATE_SOURCE_LABEL,
    submittedBy: ctx.submittedBy ?? null,
    identifierType,
    identifierValue,
    candidateName: value.name,
    candidateBrand: value.brandName,
    candidateManufacturer: value.manufacturerName,
    candidateCategory: null,
    candidateSpec: value.specification,
    candidateUnit: null,
    candidateImageUrl: value.imageUrl,
    candidatePrice: value.offerDraft.priceGeneral,
    rawPayload: {
      source: SUPPLIER_SINGLE_CANDIDATE_RAW_SOURCE,
      supplierId: ctx.supplierId,
      regulatoryType: value.regulatoryType,
      drugCategory: value.drugCategory,
      product_type: productType,
      drug_category: drugCategoryKey,
      rx: value.drugCategory === 'rx',
      categoryId: value.categoryId,
      brandName: value.brandName,
      regulatoryName: value.regulatoryName,
      mfdsPermitNumber: value.mfdsPermitNumber,
      originCountry: value.originCountry,
      offerDraft: { ...value.offerDraft },
      submittedAt: now.toISOString(),
    },
  };
}
