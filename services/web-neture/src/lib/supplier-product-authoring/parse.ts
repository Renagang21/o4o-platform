/**
 * parseSupplierProductCandidateDraft — 외부 LLM 결과 텍스트 → 검증된 Draft (순수 함수)
 *
 * WO-O4O-SUPPLIER-PRODUCT-AI-ASSISTED-CANDIDATE-AUTHORING-V1 §2.3
 *
 * 규칙:
 *   - 코드펜스 제거 → JSON.parse → 객체 검증. 실패 시 ok:false (화면은 어떤 값도 적용하지 않는다 · write 0).
 *   - 금지 키(supplierId · masterId · distributionType · serviceKeys · stock* · O4O 범위 밖 키)는 제거 + 경고.
 *   - 알 수 없는 키는 제거 + 경고.
 *   - AI 값 불신 키(categoryId · brandId · drugCategory · imageUrl · contentImageUrls)는 값이 와도 무시 + 경고.
 *     화면의 기존 값(사용자 선택 · O4O 업로드 URL)이 유지된다.
 *   - 문자열은 trim · 빈 값 → null · 서버 상한 초과는 잘라내고 경고(제출 시 서버 FIELD_TOO_LONG 방지).
 *   - regulatoryType 은 enum 외 값 → null + 경고. 숫자는 0 이상만.
 */

import type {
  ParseSupplierProductCandidateDraftResult,
  SupplierCandidateRegulatoryType,
  SupplierProductCandidateDraft,
} from './types';
import { SUPPLIER_CANDIDATE_REGULATORY_TYPES } from './types';

/** 소유축·정책·범위 밖 키 — 서버 mapper 의 FORBIDDEN 집합 + masterId 계열(AI 가 Master 를 지정하지 못한다) */
export const SUPPLIER_DRAFT_FORBIDDEN_KEYS: ReadonlySet<string> = new Set(
  [
    'supplierid', 'supplier_id',
    'masterid', 'master_id', 'productmasterid', 'product_master_id',
    'distributiontype', 'distribution_type',
    'servicekeys', 'service_keys',
    'stockqty', 'stock_qty', 'stockquantity', 'stock_quantity', 'stock', 'inventory',
    'lot', 'lot_no', 'lot_number', 'serial', 'serial_number', 'expiry', 'expiry_date',
    'expiration', 'expiration_date', 'inbound_date', 'warehouse', 'warehouse_location',
    'traceability', 'traceability_status',
    '유효기간', '일련번호', '재고', '입고일', '로트', '재고수량', '창고',
  ].map((k) => k.toLowerCase()),
);

/** AI 값을 신뢰하지 않는 키 — 계약에는 있지만 화면 값이 우선 */
export const SUPPLIER_DRAFT_IGNORED_KEYS: readonly string[] = [
  'categoryId', 'brandId', 'drugCategory', 'imageUrl', 'contentImageUrls',
];

const TOP_LEVEL_KEYS: readonly string[] = [
  'name', 'barcode', 'categoryId', 'brandId', 'brandName', 'manufacturerName', 'specification',
  'originCountry', 'regulatoryType', 'drugCategory', 'regulatoryName', 'mfdsPermitNumber',
  'imageUrl', 'contentImageUrls', 'offerDraft',
];
const OFFER_KEYS: readonly string[] = [
  'priceGeneral', 'consumerReferencePrice', 'consumerShortDescription', 'consumerDetailDescription', 'isFeatured',
];

/** 서버 supplier-single-candidate.mapper LIMITS 와 동일 */
const LIMITS: Record<string, number> = {
  name: 200,
  barcode: 64,
  brandName: 200,
  manufacturerName: 200,
  specification: 500,
  regulatoryName: 200,
  mfdsPermitNumber: 100,
  originCountry: 100,
  consumerShortDescription: 500,
  consumerDetailDescription: 5000,
};

function stripCodeFence(text: string): string {
  const t = text.trim();
  const fenced = t.match(/^```(?:json|JSON)?\s*([\s\S]*?)\s*```$/);
  if (fenced) return fenced[1].trim();
  return t;
}

/** 앞뒤에 설명 문장이 붙은 경우 첫 '{' ~ 마지막 '}' 만 시도한다(여러 JSON 을 이어 붙인 경우는 실패로 둔다). */
function extractObjectText(text: string): string | null {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  return text.slice(start, end + 1);
}

function tryParse(text: string): unknown | undefined {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function toStr(v: unknown, field: string, warnings: string[]): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v !== 'string' && typeof v !== 'number') {
    warnings.push(`${field}: 문자열이 아니어서 비웠습니다.`);
    return null;
  }
  let s = String(v).trim();
  if (!s) return null;
  const limit = LIMITS[field];
  if (limit && s.length > limit) {
    s = s.slice(0, limit);
    warnings.push(`${field}: ${limit}자를 넘어 잘라냈습니다.`);
  }
  return s;
}

function toNum(v: unknown, field: string, warnings: string[]): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(String(v).replace(/[,\s원]/g, ''));
  if (!Number.isFinite(n) || n < 0) {
    warnings.push(`${field}: 0 이상의 숫자가 아니어서 비웠습니다.`);
    return null;
  }
  return n;
}

function hasValue(v: unknown): boolean {
  if (v === null || v === undefined) return false;
  if (typeof v === 'string') return v.trim() !== '';
  if (Array.isArray(v)) return v.length > 0;
  return true;
}

export function parseSupplierProductCandidateDraft(text: string): ParseSupplierProductCandidateDraftResult {
  const raw = (text ?? '').trim();
  if (!raw) return { ok: false, code: 'EMPTY', error: '붙여넣은 결과가 비어 있습니다.' };

  const unfenced = stripCodeFence(raw);
  let parsed = tryParse(unfenced);
  if (parsed === undefined) {
    const extracted = extractObjectText(unfenced);
    parsed = extracted ? tryParse(extracted) : undefined;
  }
  if (parsed === undefined) {
    return { ok: false, code: 'INVALID_JSON', error: 'JSON 으로 읽을 수 없습니다. ChatGPT 에 "JSON 객체 1개만 출력"을 다시 요청해 주세요.' };
  }
  if (!isPlainObject(parsed)) {
    return { ok: false, code: 'NOT_OBJECT', error: 'JSON 객체 1개가 아닙니다(배열·문자열 불가).' };
  }

  const warnings: string[] = [];
  const input: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(parsed)) {
    const lower = key.toLowerCase();
    if (SUPPLIER_DRAFT_FORBIDDEN_KEYS.has(lower)) {
      warnings.push(`${key}: 허용되지 않는 항목이라 제거했습니다.`);
      continue;
    }
    if (!TOP_LEVEL_KEYS.includes(key)) {
      warnings.push(`${key}: 계약에 없는 항목이라 제거했습니다.`);
      continue;
    }
    input[key] = value;
  }
  for (const key of SUPPLIER_DRAFT_IGNORED_KEYS) {
    if (hasValue(input[key])) warnings.push(`${key}: AI 값은 사용하지 않습니다(화면에서 직접 선택).`);
  }

  let regulatoryType: SupplierCandidateRegulatoryType | null = null;
  if (hasValue(input.regulatoryType)) {
    const s = String(input.regulatoryType).trim().toUpperCase();
    if ((SUPPLIER_CANDIDATE_REGULATORY_TYPES as readonly string[]).includes(s)) {
      regulatoryType = s as SupplierCandidateRegulatoryType;
    } else {
      warnings.push(`regulatoryType: 알 수 없는 값(${String(input.regulatoryType)})이라 비웠습니다.`);
    }
  }

  const offerInput: Record<string, unknown> = {};
  if (input.offerDraft !== undefined && input.offerDraft !== null) {
    if (!isPlainObject(input.offerDraft)) {
      warnings.push('offerDraft: 객체가 아니어서 비웠습니다.');
    } else {
      for (const [key, value] of Object.entries(input.offerDraft)) {
        const lower = key.toLowerCase();
        if (SUPPLIER_DRAFT_FORBIDDEN_KEYS.has(lower)) {
          warnings.push(`offerDraft.${key}: 허용되지 않는 항목이라 제거했습니다.`);
          continue;
        }
        if (!OFFER_KEYS.includes(key)) {
          warnings.push(`offerDraft.${key}: 계약에 없는 항목이라 제거했습니다.`);
          continue;
        }
        offerInput[key] = value;
      }
    }
  }

  const draft: SupplierProductCandidateDraft = {
    name: toStr(input.name, 'name', warnings),
    barcode: toStr(input.barcode, 'barcode', warnings),
    categoryId: null,
    brandId: null,
    brandName: toStr(input.brandName, 'brandName', warnings),
    manufacturerName: toStr(input.manufacturerName, 'manufacturerName', warnings),
    specification: toStr(input.specification, 'specification', warnings),
    originCountry: toStr(input.originCountry, 'originCountry', warnings),
    regulatoryType,
    drugCategory: null,
    regulatoryName: toStr(input.regulatoryName, 'regulatoryName', warnings),
    mfdsPermitNumber: toStr(input.mfdsPermitNumber, 'mfdsPermitNumber', warnings),
    imageUrl: null,
    contentImageUrls: [],
    offerDraft: {
      priceGeneral: toNum(offerInput.priceGeneral, 'offerDraft.priceGeneral', warnings),
      consumerReferencePrice: toNum(offerInput.consumerReferencePrice, 'offerDraft.consumerReferencePrice', warnings),
      consumerShortDescription: toStr(offerInput.consumerShortDescription, 'consumerShortDescription', warnings),
      consumerDetailDescription: toStr(offerInput.consumerDetailDescription, 'consumerDetailDescription', warnings),
      isFeatured: offerInput.isFeatured === true,
    },
  };

  if (!draft.name) warnings.push('name: 제품명이 없습니다. 화면에서 직접 입력해 주세요.');

  return { ok: true, draft, warnings };
}
