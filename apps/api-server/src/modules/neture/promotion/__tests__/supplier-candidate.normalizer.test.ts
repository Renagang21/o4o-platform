/**
 * Unit tests — Supplier Normalizer (WO-O4O-SUPPLIER-PRODUCT-CANDIDATE-PROMOTION-ADAPTER-V1 §2.1 · §6.1)
 *
 * 단건 · bulk 인식 3조건 · 식별자 규칙표 · evidence 보존 · 실패 코드.
 */

import { canonicalizeRegulatoryType } from '../adapters/supplier/supplier-regulatory-type.js';
import {
  SupplierNormalizationError,
  normalizeBulkSupplierCandidate,
  normalizeSingleSupplierCandidate,
  normalizeSupplierCandidate,
  type SupplierCandidateRecord,
} from '../adapters/supplier/supplier-candidate.normalizer.js';

const SUPPLIER_ID = '11111111-1111-4111-8111-111111111111';
const GTIN = '8801234567893';

function single(over: Partial<SupplierCandidateRecord> = {}, raw: Record<string, unknown> = {}): SupplierCandidateRecord {
  return {
    id: 'c-single', sourceType: 'supplier_web', sourceLabel: 'neture-supplier-single',
    identifierType: null, identifierValue: null,
    candidateName: '단건 상품', candidateBrand: null, candidateManufacturer: '단건 제조', candidateSpec: null, candidateUnit: null,
    rawPayload: { source: 'supplier_single', supplierId: SUPPLIER_ID, regulatoryType: 'GENERAL', drugCategory: null, ...raw },
    ...over,
  };
}

function bulk(fields: Record<string, string>, raw: Record<string, unknown> = {}, over: Partial<SupplierCandidateRecord> = {}): SupplierCandidateRecord {
  return {
    id: 'c-bulk', sourceType: 'csv_import', sourceLabel: '공급자 대량 등록',
    identifierType: null, identifierValue: null,
    candidateName: fields['제품명'] ?? null, candidateBrand: null, candidateManufacturer: fields['제조사'] ?? null,
    candidateSpec: null, candidateUnit: null,
    rawPayload: { source: 'supplier_bulk_upload', productType: 'non_drug', supplierId: SUPPLIER_ID, fields, ...raw },
    ...over,
  };
}

function code(fn: () => unknown): string | null {
  try { fn(); return null; } catch (e) { return e instanceof SupplierNormalizationError ? e.code : `other:${(e as Error).message}`; }
}

describe('canonicalizeRegulatoryType', () => {
  it.each([
    ['GENERAL', 'GENERAL'], ['general', 'GENERAL'], ['일반', 'GENERAL'],
    ['COSMETIC', 'COSMETIC'], ['화장품', 'COSMETIC'],
    ['HEALTH_FUNCTIONAL', 'HEALTH_FUNCTIONAL'], ['건강기능식품', 'HEALTH_FUNCTIONAL'], [' 건강기능식품 ', 'HEALTH_FUNCTIONAL'],
    ['QUASI_DRUG', 'QUASI_DRUG'], ['quasi', 'QUASI_DRUG'], ['의약외품', 'QUASI_DRUG'],
    ['MEDICAL_DEVICE', 'MEDICAL_DEVICE'], ['의료기기', 'MEDICAL_DEVICE'],
    ['DRUG', 'DRUG'], ['의약품', 'DRUG'],
    ['', null], ['   ', null], [null, null], [undefined, null], ['식품', null], ['GENERAL_X', null],
  ])('%s → %s', (raw, expected) => {
    expect(canonicalizeRegulatoryType(raw as string | null | undefined)).toBe(expected);
  });
});

describe('normalizeSingleSupplierCandidate — 인식', () => {
  it('sourceType + sourceLabel + rawPayload.source 셋 다 맞아야 인식', () => {
    expect(normalizeSingleSupplierCandidate(single())).not.toBeNull();
    expect(normalizeSingleSupplierCandidate(single({ sourceType: 'csv_import' }))).toBeNull();
    expect(normalizeSingleSupplierCandidate(single({ sourceLabel: 'other' }))).toBeNull();
    expect(normalizeSingleSupplierCandidate(single({}, { source: 'supplier_bulk_upload' }))).toBeNull();
    expect(normalizeSingleSupplierCandidate(single({ rawPayload: null }))).toBeNull();
  });

  it('supplierId 없음 → SUPPLIER_ID_MISSING', () => {
    expect(code(() => normalizeSingleSupplierCandidate(single({}, { supplierId: null })))).toBe('SUPPLIER_ID_MISSING');
    expect(code(() => normalizeSingleSupplierCandidate(single({}, { supplierId: '  ' })))).toBe('SUPPLIER_ID_MISSING');
  });

  it('regulatoryType 미지/누락 · DRUG 에 otc|rx 아님 → SUPPLIER_PRODUCT_TYPE_UNCLASSIFIED', () => {
    expect(code(() => normalizeSingleSupplierCandidate(single({}, { regulatoryType: '일반' })))).toBe('SUPPLIER_PRODUCT_TYPE_UNCLASSIFIED');
    expect(code(() => normalizeSingleSupplierCandidate(single({}, { regulatoryType: null })))).toBe('SUPPLIER_PRODUCT_TYPE_UNCLASSIFIED');
    expect(code(() => normalizeSingleSupplierCandidate(single({}, { regulatoryType: 'DRUG', drugCategory: 'quasi_drug' })))).toBe('SUPPLIER_PRODUCT_TYPE_UNCLASSIFIED');
    expect(code(() => normalizeSingleSupplierCandidate(single({}, { regulatoryType: 'DRUG', drugCategory: null })))).toBe('SUPPLIER_PRODUCT_TYPE_UNCLASSIFIED');
  });

  it('DRUG otc/rx → drugCategory 그대로 · 비 DRUG 는 drugCategory null', () => {
    expect(normalizeSingleSupplierCandidate(single({}, { regulatoryType: 'DRUG', drugCategory: 'otc' }))!.drugCategory).toBe('otc');
    expect(normalizeSingleSupplierCandidate(single({}, { regulatoryType: 'DRUG', drugCategory: 'RX' }))!.drugCategory).toBe('rx');
    expect(normalizeSingleSupplierCandidate(single({}, { regulatoryType: 'QUASI_DRUG', drugCategory: 'quasi_drug' }))!.drugCategory).toBeNull();
  });
});

describe('normalizeSingleSupplierCandidate — 식별자 · evidence', () => {
  it('EAN13 컬럼 → identityKey true · primary · barcode 채움', () => {
    const n = normalizeSingleSupplierCandidate(single({ identifierType: 'EAN13', identifierValue: GTIN }))!;
    expect(n.barcode).toBe(GTIN);
    expect(n.identifiers).toEqual([{ type: 'EAN13', value: GTIN, identityKey: true, isPrimary: true }]);
  });

  it('GTIN(14자리) 컬럼 → GTIN identityKey true · barcode 채움', () => {
    const n = normalizeSingleSupplierCandidate(single({ identifierType: 'GTIN', identifierValue: '18801234567890' }))!;
    expect(n.barcode).toBe('18801234567890');
    expect(n.identifiers[0]).toMatchObject({ type: 'GTIN', identityKey: true, isPrimary: true });
  });

  it('UNKNOWN 컬럼(비 GTIN 문자열) → identityKey false · primary false · barcode null (합성 금지)', () => {
    const n = normalizeSingleSupplierCandidate(single({ identifierType: 'UNKNOWN', identifierValue: 'ABC-001' }))!;
    expect(n.barcode).toBeNull();
    expect(n.identifiers).toEqual([{ type: 'UNKNOWN', value: 'ABC-001', identityKey: false, isPrimary: false }]);
  });

  it('식별자 없음 → identifiers [] · barcode null', () => {
    const n = normalizeSingleSupplierCandidate(single())!;
    expect(n.identifiers).toEqual([]);
    expect(n.barcode).toBeNull();
  });

  it('mfdsPermitNumber · regulatoryName · brandName · originCountry · categoryId 는 evidence 로만 (식별자 아님)', () => {
    const n = normalizeSingleSupplierCandidate(single({ candidateBrand: '컬럼브랜드' }, {
      regulatoryType: 'HEALTH_FUNCTIONAL', mfdsPermitNumber: '2020-123', regulatoryName: '규제명', brandName: '브랜드',
      originCountry: 'KR', categoryId: '22222222-2222-4222-8222-222222222222',
    }))!;
    expect(n.identifiers).toEqual([]);
    expect(n.evidence).toEqual({
      regulatoryName: '규제명', mfdsPermitNumber: '2020-123', reportNo: null, supplierSku: null,
      brandName: '브랜드', originCountry: 'KR', categoryId: '22222222-2222-4222-8222-222222222222',
    });
    expect(n.origin).toBe('single');
    expect(n.supplierId).toBe(SUPPLIER_ID);
    expect(n.regulatoryType).toBe('HEALTH_FUNCTIONAL');
  });

  it('이름 · 제조사 비면 null (합성 없음) · spec 은 spec+unit 결합', () => {
    const n = normalizeSingleSupplierCandidate(single({ candidateName: '  ', candidateManufacturer: null, candidateSpec: '10정', candidateUnit: '1박스' }))!;
    expect(n.name).toBeNull();
    expect(n.manufacturerName).toBeNull();
    expect(n.specification).toBe('10정 1박스');
  });
});

describe('normalizeBulkSupplierCandidate — 인식 · 분류', () => {
  it('csv_import 만으로는 bulk 가 아니다 — sourceLabel + rawPayload.source 까지 셋 다 필요', () => {
    expect(normalizeBulkSupplierCandidate(bulk({ 제품명: 'A' }))).not.toBeNull();
    // 공공 seed 형태: csv_import + 다른 label + source 객체
    expect(normalizeBulkSupplierCandidate(bulk({ 제품명: 'A' }, {}, { sourceLabel: '식약처 건강기능식품' }))).toBeNull();
    expect(normalizeBulkSupplierCandidate(bulk({ 제품명: 'A' }, { source: { ITEM_SEQ: '1' } }))).toBeNull();
    expect(normalizeBulkSupplierCandidate(bulk({ 제품명: 'A' }, {}, { sourceType: 'xlsx_import' }))).toBeNull();
  });

  it.each([
    ['non_drug', 'GENERAL', null],
    ['quasi_drug', 'QUASI_DRUG', null],
    ['otc_drug', 'DRUG', 'otc'],
    ['otc', 'DRUG', 'otc'],
    ['rx_drug', 'DRUG', 'rx'],
    ['rx', 'DRUG', 'rx'],
  ])('productType %s → %s / %s', (pt, rt, dc) => {
    const n = normalizeBulkSupplierCandidate(bulk({ 제품명: 'A' }, { productType: pt }))!;
    expect(n.regulatoryType).toBe(rt);
    expect(n.drugCategory).toBe(dc);
    expect(n.origin).toBe('bulk');
  });

  it('unclassified / unknown / 누락 → SUPPLIER_PRODUCT_TYPE_UNCLASSIFIED · supplierId 없음 → SUPPLIER_ID_MISSING', () => {
    expect(code(() => normalizeBulkSupplierCandidate(bulk({ 제품명: 'A' }, { productType: 'unclassified' })))).toBe('SUPPLIER_PRODUCT_TYPE_UNCLASSIFIED');
    expect(code(() => normalizeBulkSupplierCandidate(bulk({ 제품명: 'A' }, { productType: 'unknown' })))).toBe('SUPPLIER_PRODUCT_TYPE_UNCLASSIFIED');
    expect(code(() => normalizeBulkSupplierCandidate(bulk({ 제품명: 'A' }, { productType: undefined })))).toBe('SUPPLIER_PRODUCT_TYPE_UNCLASSIFIED');
    expect(code(() => normalizeBulkSupplierCandidate(bulk({ 제품명: 'A' }, { supplierId: undefined })))).toBe('SUPPLIER_ID_MISSING');
  });

  it('이름/제조사/규격: 컬럼 우선 · 없으면 fields[제품명|제조사|규격|포장단위]', () => {
    const n = normalizeBulkSupplierCandidate(bulk({ 제품명: '필드명', 제조사: '필드제조', 포장단위: '30정' }, {}, { candidateName: null, candidateManufacturer: null }))!;
    expect(n.name).toBe('필드명');
    expect(n.manufacturerName).toBe('필드제조');
    expect(n.specification).toBe('30정');
    const n2 = normalizeBulkSupplierCandidate(bulk({ 제품명: '필드명', 규격: '규격값', 포장단위: '30정' }, {}, { candidateName: '컬럼명', candidateSpec: null }))!;
    expect(n2.name).toBe('컬럼명');
    expect(n2.specification).toBe('규격값');
  });
});

describe('normalizeBulkSupplierCandidate — 식별자 규칙표', () => {
  it('바코드(GTIN-like) → EAN13 identityKey true · primary · barcode', () => {
    const n = normalizeBulkSupplierCandidate(bulk({ 제품명: 'A', 바코드: GTIN }))!;
    expect(n.barcode).toBe(GTIN);
    expect(n.identifiers).toEqual([{ type: 'EAN13', value: GTIN, identityKey: true, isPrimary: true }]);
  });

  it('바코드(구분자 포함 숫자) 는 compact 후 GTIN 판정 · 비 GTIN 문자열 → UNKNOWN identityKey false', () => {
    const n = normalizeBulkSupplierCandidate(bulk({ 제품명: 'A', 바코드: '880-1234-567893' }))!;
    expect(n.barcode).toBe(GTIN);
    expect(n.identifiers[0]).toMatchObject({ type: 'EAN13', value: GTIN, identityKey: true });
    const n2 = normalizeBulkSupplierCandidate(bulk({ 제품명: 'A', 바코드: 'SKU-77' }))!;
    expect(n2.barcode).toBeNull();
    expect(n2.identifiers).toEqual([{ type: 'UNKNOWN', value: 'SKU-77', identityKey: false, isPrimary: false }]);
  });

  it('의약품표준코드 → KOREA_DRUG_CODE identityKey true · 바코드 없으면 primary', () => {
    const n = normalizeBulkSupplierCandidate(bulk({ 제품명: 'A', 의약품표준코드: '8806421012345' }, { productType: 'otc_drug' }))!;
    expect(n.identifiers).toEqual([{ type: 'KOREA_DRUG_CODE', value: '8806421012345', identityKey: true, isPrimary: true }]);
    expect(n.barcode).toBeNull(); // 표준코드는 master.barcode 가 아니다
  });

  it('바코드 + 의약품표준코드 동시 → 바코드만 primary · 둘 다 identityKey true', () => {
    const n = normalizeBulkSupplierCandidate(bulk({ 제품명: 'A', 바코드: GTIN, 의약품표준코드: '8806421012345' }, { productType: 'otc_drug' }))!;
    expect(n.identifiers.map((i) => [i.type, i.identityKey, i.isPrimary])).toEqual([
      ['EAN13', true, true],
      ['KOREA_DRUG_CODE', true, false],
    ]);
  });

  it('보험코드 → KOREA_INSURANCE_CODE identityKey false · primary 아님', () => {
    const n = normalizeBulkSupplierCandidate(bulk({ 제품명: 'A', 보험코드: '642100010' }, { productType: 'otc_drug' }))!;
    expect(n.identifiers).toEqual([{ type: 'KOREA_INSURANCE_CODE', value: '642100010', identityKey: false, isPrimary: false }]);
  });

  it('바코드또는표준코드: GTIN-like → 바코드 규칙 · DRUG 면 KOREA_DRUG_CODE · 그 외 UNKNOWN', () => {
    const g = normalizeBulkSupplierCandidate(bulk({ 제품명: 'A', 바코드또는표준코드: GTIN }, { productType: 'quasi_drug' }))!;
    expect(g.barcode).toBe(GTIN);
    expect(g.identifiers[0]).toMatchObject({ type: 'EAN13', identityKey: true, isPrimary: true });

    const d = normalizeBulkSupplierCandidate(bulk({ 제품명: 'A', 바코드또는표준코드: 'KD-12345' }, { productType: 'otc_drug' }))!;
    expect(d.identifiers).toEqual([{ type: 'KOREA_DRUG_CODE', value: 'KD-12345', identityKey: true, isPrimary: true }]);

    const q = normalizeBulkSupplierCandidate(bulk({ 제품명: 'A', 바코드또는표준코드: 'QD-1' }, { productType: 'quasi_drug' }))!;
    expect(q.identifiers).toEqual([{ type: 'UNKNOWN', value: 'QD-1', identityKey: false, isPrimary: false }]);
  });

  it('품목신고번호 → evidence.reportNo · 공급자상품코드 → evidence.supplierSku (ProductIdentifier 아님)', () => {
    const n = normalizeBulkSupplierCandidate(bulk({ 제품명: 'A', 품목신고번호: '제2020-1호', 공급자상품코드: 'SUP-001', 브랜드: '브' }, { productType: 'quasi_drug' }))!;
    expect(n.identifiers).toEqual([]);
    expect(n.evidence).toEqual({
      regulatoryName: null, mfdsPermitNumber: null, reportNo: '제2020-1호', supplierSku: 'SUP-001',
      brandName: '브', originCountry: null, categoryId: null,
    });
  });

  it('(type, normalized) 중복은 한 번만 · 컬럼 식별자가 fields 보다 우선', () => {
    const n = normalizeBulkSupplierCandidate(bulk(
      { 제품명: 'A', 바코드: GTIN, 바코드또는표준코드: `${GTIN} ` },
      {},
      { identifierType: 'EAN13', identifierValue: GTIN },
    ))!;
    expect(n.identifiers).toHaveLength(1);
    expect(n.identifiers[0]).toMatchObject({ type: 'EAN13', value: GTIN, isPrimary: true });
  });
});

describe('normalizeSupplierCandidate (single ?? bulk)', () => {
  it('둘 다 아니면 SUPPLIER_CANDIDATE_NOT_SUPPLIER_SOURCE (공공 csv_import seed 포함)', () => {
    const seed: SupplierCandidateRecord = {
      ...bulk({ 제품명: 'A' }), sourceLabel: '식약처 건강기능식품', rawPayload: { sourceAgency: 'MFDS', regulatoryType: 'HEALTH_FUNCTIONAL', source: { PRDUCT: 'x' } },
    };
    expect(code(() => normalizeSupplierCandidate(seed))).toBe('SUPPLIER_CANDIDATE_NOT_SUPPLIER_SOURCE');
    const store: SupplierCandidateRecord = { ...single(), sourceType: 'store_web', sourceLabel: 'kpa-store-product-request', rawPayload: { classification: 'general' } };
    expect(code(() => normalizeSupplierCandidate(store))).toBe('SUPPLIER_CANDIDATE_NOT_SUPPLIER_SOURCE');
  });

  it('단건 · bulk 는 각각 origin 으로 정규화', () => {
    expect(normalizeSupplierCandidate(single()).origin).toBe('single');
    expect(normalizeSupplierCandidate(bulk({ 제품명: 'A' })).origin).toBe('bulk');
  });
});
