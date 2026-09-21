/**
 * Supplier Promotion Adapter — Normalizer (단건 · bulk → NormalizedSupplierCandidate)
 *
 * WO-O4O-SUPPLIER-PRODUCT-CANDIDATE-PROMOTION-ADAPTER-V1 §2.1
 *
 * 두 원천(단건 intake `supplier_web` · bulk `csv_import`)의 raw 차이는 **여기서만** 흡수한다.
 * 이후 Plan Builder 는 origin 으로 분기하지 않는다.
 *
 * 인식 규칙 (셋 다 맞아야 한다 — `csv_import` 만으로 bulk 로 판단하지 않는다.
 * 공공 seed 305,522 건이 같은 sourceType 을 쓴다):
 *   단건: sourceType='supplier_web' + sourceLabel='neture-supplier-single' + rawPayload.source='supplier_single'
 *   bulk: sourceType='csv_import'   + sourceLabel='공급자 대량 등록'        + rawPayload.source='supplier_bulk_upload'
 *
 * identityKey 는 이 데이터셋에 대한 Adapter 결정이다 (Core 는 type 으로 추론하지 않는다):
 *   바코드류(EAN13/GTIN/UPC/JAN) · 의약품표준코드(KOREA_DRUG_CODE) = true
 *   보험코드(KOREA_INSURANCE_CODE) · UNKNOWN = false
 *   mfdsPermitNumber / 품목신고번호 / 공급자상품코드 는 ProductIdentifier 가 아니다 → evidence 로만 보존
 *   (`MFDS_CODE` 는 식약처 데이터셋 seed 의 어휘 — 공급자 자기 신고값에 붙이지 않는다).
 */

import type { ProductCandidate } from '../../../entities/ProductCandidate.entity.js';
import type { ProductIdentifierType } from '../../../entities/ProductIdentifier.entity.js';
import {
  inferIdentifierTypeFromBarcode,
  isGtinLike,
  normalizeIdentifier,
  sanitizeIdentifierValue,
} from '../../../utils/product-identifier.util.js';
import { PROMOTION_REGULATORY_TYPES, type PromotionRegulatoryType } from '../../product-promotion.types.js';

export const SUPPLIER_SINGLE_SOURCE_TYPE = 'supplier_web';
export const SUPPLIER_SINGLE_SOURCE_LABEL = 'neture-supplier-single';
export const SUPPLIER_SINGLE_RAW_SOURCE = 'supplier_single';

export const SUPPLIER_BULK_SOURCE_TYPE = 'csv_import';
export const SUPPLIER_BULK_SOURCE_LABEL = '공급자 대량 등록';
export const SUPPLIER_BULK_RAW_SOURCE = 'supplier_bulk_upload';

export type SupplierCandidateOrigin = 'single' | 'bulk';
export type SupplierDrugCategory = 'otc' | 'rx';

export interface NormalizedSupplierIdentifier {
  type: ProductIdentifierType;
  value: string;
  identityKey: boolean;
  isPrimary: boolean;
}

export interface SupplierCandidateEvidence {
  regulatoryName: string | null;
  mfdsPermitNumber: string | null;
  reportNo: string | null;
  supplierSku: string | null;
  brandName: string | null;
  originCountry: string | null;
  categoryId: string | null;
}

export interface NormalizedSupplierCandidate {
  candidateId: string;
  supplierId: string;
  origin: SupplierCandidateOrigin;
  regulatoryType: PromotionRegulatoryType;
  drugCategory: SupplierDrugCategory | null;
  name: string | null;
  manufacturerName: string | null;
  specification: string | null;
  /** GTIN-like 일 때만. 합성 금지 */
  barcode: string | null;
  identifiers: NormalizedSupplierIdentifier[];
  evidence: SupplierCandidateEvidence;
}

export type SupplierNormalizationErrorCode =
  | 'SUPPLIER_ID_MISSING'
  | 'SUPPLIER_PRODUCT_TYPE_UNCLASSIFIED'
  | 'SUPPLIER_CANDIDATE_NOT_SUPPLIER_SOURCE';

export class SupplierNormalizationError extends Error {
  constructor(public readonly code: SupplierNormalizationErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'SupplierNormalizationError';
  }
}

export type SupplierCandidateRecord = Pick<ProductCandidate,
  'id' | 'sourceType' | 'sourceLabel' | 'rawPayload' | 'identifierType' | 'identifierValue'
  | 'candidateName' | 'candidateBrand' | 'candidateManufacturer' | 'candidateSpec' | 'candidateUnit'>;

const BARCODE_TYPES: ReadonlySet<string> = new Set(['EAN13', 'GTIN', 'UPC', 'JAN']);

/** bulk `productType`(BULK_TYPE_MAP 키) → canonical. unclassified/unknown/미지 값은 null */
const BULK_PRODUCT_TYPE_MAP: Record<string, { regulatoryType: PromotionRegulatoryType; drugCategory: SupplierDrugCategory | null }> = {
  non_drug: { regulatoryType: 'GENERAL', drugCategory: null },
  quasi_drug: { regulatoryType: 'QUASI_DRUG', drugCategory: null },
  otc_drug: { regulatoryType: 'DRUG', drugCategory: 'otc' },
  otc: { regulatoryType: 'DRUG', drugCategory: 'otc' },
  rx_drug: { regulatoryType: 'DRUG', drugCategory: 'rx' },
  rx: { regulatoryType: 'DRUG', drugCategory: 'rx' },
};

// ── helpers ──

function str(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s ? s : null;
}

function record(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

function stringFields(v: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, val] of Object.entries(record(v))) {
    const s = str(val);
    if (s) out[k] = s;
  }
  return out;
}

/** ② mapper 의 compactBarcode 와 같은 규칙: 숫자+구분자만이면 구분자 제거, 그 외 원형(제어문자만 제거) */
function compactCode(raw: string | null): string | null {
  if (!raw) return null;
  const sanitized = sanitizeIdentifierValue(raw);
  if (!sanitized) return null;
  const compact = sanitized.replace(/[\s-]/g, '');
  return /^\d+$/.test(compact) ? compact : sanitized;
}

function joinSpec(parts: Array<string | null | undefined>): string | null {
  const xs = parts.map((s) => (s ?? '').trim()).filter(Boolean);
  return xs.length > 0 ? xs.join(' ') : null;
}

function requireSupplierId(raw: Record<string, unknown>): string {
  const id = str(raw.supplierId);
  if (!id) throw new SupplierNormalizationError('SUPPLIER_ID_MISSING', 'rawPayload.supplierId 가 없습니다.');
  return id;
}

/** (type, normalized) 로 dedupe 하며 누적. primary 는 collect 후 한 번에 정한다 */
class IdentifierCollector {
  private readonly seen = new Set<string>();
  readonly items: NormalizedSupplierIdentifier[] = [];
  barcode: string | null = null;

  add(type: ProductIdentifierType, value: string, identityKey: boolean): void {
    const normalized = normalizeIdentifier(type, value);
    if (!normalized) return;
    const key = `${type}|${normalized}`;
    if (this.seen.has(key)) return;
    this.seen.add(key);
    this.items.push({ type, value, identityKey, isPrimary: false });
  }

  /** 바코드 규칙: GTIN-like → EAN13/GTIN identityKey=true + master.barcode · 그 외 UNKNOWN identityKey=false */
  addBarcodeLike(value: string): void {
    const type = inferIdentifierTypeFromBarcode(value);
    if (BARCODE_TYPES.has(type)) {
      this.add(type, value, true);
      if (this.barcode == null && isGtinLike(value)) this.barcode = sanitizeIdentifierValue(value);
    } else {
      this.add('UNKNOWN', value, false);
    }
  }

  /** primary 1개: 바코드류 첫 항목 → 없으면 KOREA_DRUG_CODE 첫 항목 */
  finish(): NormalizedSupplierIdentifier[] {
    const primary = this.items.find((i) => BARCODE_TYPES.has(i.type)) ?? this.items.find((i) => i.type === 'KOREA_DRUG_CODE');
    if (primary) primary.isPrimary = true;
    return this.items;
  }
}

/** candidate 컬럼(identifierType/identifierValue) — 단건은 항상 여기, bulk 는 비어 있으나 있으면 우선 */
function addColumnIdentifier(c: SupplierCandidateRecord, col: IdentifierCollector): void {
  const value = str(c.identifierValue);
  if (!value || !c.identifierType) return;
  const type = c.identifierType as ProductIdentifierType;
  if (BARCODE_TYPES.has(type)) {
    col.addBarcodeLike(value);
  } else if (type === 'KOREA_DRUG_CODE') {
    col.add(type, value, true);
  } else {
    // UNKNOWN(비 GTIN 문자열) 등 — 전역 identity 가 아니다
    col.add(type === 'UNKNOWN' ? 'UNKNOWN' : type, value, false);
  }
}

// ── 단건 ──

export function normalizeSingleSupplierCandidate(c: SupplierCandidateRecord): NormalizedSupplierCandidate | null {
  const raw = record(c.rawPayload);
  if (c.sourceType !== SUPPLIER_SINGLE_SOURCE_TYPE || c.sourceLabel !== SUPPLIER_SINGLE_SOURCE_LABEL || raw.source !== SUPPLIER_SINGLE_RAW_SOURCE) {
    return null;
  }
  const supplierId = requireSupplierId(raw);

  const rt = str(raw.regulatoryType)?.toUpperCase() ?? null;
  if (!rt || !(PROMOTION_REGULATORY_TYPES as readonly string[]).includes(rt)) {
    throw new SupplierNormalizationError('SUPPLIER_PRODUCT_TYPE_UNCLASSIFIED', `regulatoryType '${rt ?? ''}' 은(는) 승격 대상 분류가 아닙니다.`);
  }
  const regulatoryType = rt as PromotionRegulatoryType;
  let drugCategory: SupplierDrugCategory | null = null;
  if (regulatoryType === 'DRUG') {
    const dc = str(raw.drugCategory)?.toLowerCase();
    if (dc !== 'otc' && dc !== 'rx') {
      throw new SupplierNormalizationError('SUPPLIER_PRODUCT_TYPE_UNCLASSIFIED', `의약품 후보의 drugCategory '${dc ?? ''}' 은(는) otc | rx 가 아닙니다.`);
    }
    drugCategory = dc;
  }

  const col = new IdentifierCollector();
  addColumnIdentifier(c, col);

  return {
    candidateId: c.id,
    supplierId,
    origin: 'single',
    regulatoryType,
    drugCategory,
    name: str(c.candidateName),
    manufacturerName: str(c.candidateManufacturer),
    specification: joinSpec([c.candidateSpec, c.candidateUnit]),
    barcode: col.barcode,
    identifiers: col.finish(),
    evidence: {
      regulatoryName: str(raw.regulatoryName),
      mfdsPermitNumber: str(raw.mfdsPermitNumber),
      reportNo: null,
      supplierSku: null,
      brandName: str(raw.brandName) ?? str(c.candidateBrand),
      originCountry: str(raw.originCountry),
      categoryId: str(raw.categoryId),
    },
  };
}

// ── bulk ──

export function normalizeBulkSupplierCandidate(c: SupplierCandidateRecord): NormalizedSupplierCandidate | null {
  const raw = record(c.rawPayload);
  if (c.sourceType !== SUPPLIER_BULK_SOURCE_TYPE || c.sourceLabel !== SUPPLIER_BULK_SOURCE_LABEL || raw.source !== SUPPLIER_BULK_RAW_SOURCE) {
    return null;
  }
  const supplierId = requireSupplierId(raw);

  const typeKey = str(raw.productType)?.toLowerCase() ?? '';
  const mapped = BULK_PRODUCT_TYPE_MAP[typeKey];
  if (!mapped) {
    throw new SupplierNormalizationError('SUPPLIER_PRODUCT_TYPE_UNCLASSIFIED', `bulk productType '${typeKey}' 은(는) 승격 대상 분류가 아닙니다 (unclassified/unknown 은 운영자 분류 후 승격).`);
  }
  const { regulatoryType, drugCategory } = mapped;
  const fields = stringFields(raw.fields);

  const col = new IdentifierCollector();
  addColumnIdentifier(c, col); // 컬럼 우선

  const barcode = compactCode(fields['바코드'] ?? null);
  if (barcode) col.addBarcodeLike(barcode);

  const kdCode = compactCode(fields['의약품표준코드'] ?? null);
  if (kdCode) col.add('KOREA_DRUG_CODE', kdCode, true);

  const insurance = compactCode(fields['보험코드'] ?? null);
  if (insurance) col.add('KOREA_INSURANCE_CODE', insurance, false);

  const either = compactCode(fields['바코드또는표준코드'] ?? null);
  if (either) {
    if (isGtinLike(either)) col.addBarcodeLike(either);
    else if (regulatoryType === 'DRUG') col.add('KOREA_DRUG_CODE', either, true);
    else col.add('UNKNOWN', either, false);
  }

  return {
    candidateId: c.id,
    supplierId,
    origin: 'bulk',
    regulatoryType,
    drugCategory,
    name: str(c.candidateName) ?? fields['제품명'] ?? null,
    manufacturerName: str(c.candidateManufacturer) ?? fields['제조사'] ?? null,
    specification: joinSpec([str(c.candidateSpec) ?? fields['규격'] ?? fields['포장단위'] ?? null, c.candidateUnit]),
    barcode: col.barcode,
    identifiers: col.finish(),
    evidence: {
      regulatoryName: null,
      mfdsPermitNumber: null,
      reportNo: fields['품목신고번호'] ?? null,
      supplierSku: fields['공급자상품코드'] ?? null,
      brandName: str(c.candidateBrand) ?? fields['브랜드'] ?? null,
      originCountry: null,
      categoryId: null,
    },
  };
}

/** 단건 → bulk 순으로 인식. 둘 다 아니면 SUPPLIER_CANDIDATE_NOT_SUPPLIER_SOURCE */
export function normalizeSupplierCandidate(c: SupplierCandidateRecord): NormalizedSupplierCandidate {
  const n = normalizeSingleSupplierCandidate(c) ?? normalizeBulkSupplierCandidate(c);
  if (!n) {
    throw new SupplierNormalizationError(
      'SUPPLIER_CANDIDATE_NOT_SUPPLIER_SOURCE',
      `candidate ${c.id} 는 공급자 원천(단건 intake · 공급자 대량 등록)이 아닙니다 (sourceType=${c.sourceType} · sourceLabel=${c.sourceLabel ?? ''}).`,
    );
  }
  return n;
}
