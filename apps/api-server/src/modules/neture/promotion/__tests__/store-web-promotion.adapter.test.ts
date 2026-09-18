/**
 * Unit tests — store_web Adapter (WO-O4O-PRODUCT-CANDIDATE-GENERAL-PROMOTION-CORE-FOUNDATION-V1 §2.2 · §6.1)
 *
 * Plan 생성(분류 → regulatory · 바코드/식별자 · identityKey · effects) 과 Core 결과 → P2 에러 매핑.
 */

import {
  STORE_REQUEST_LANDING_SOURCE,
  STORE_REQUEST_SOURCE_LABEL,
  StoreRequestPromotionError,
  assertStoreWebCreate,
  buildStoreWebPromotionPlan,
  classificationToRegulatory,
  holdToStoreRequestCode,
} from '../adapters/store-web-promotion.adapter.js';

const GTIN = '8801234567893';

function candidate(over: Record<string, unknown> = {}) {
  return {
    id: 'c-1', candidateCategory: null, rawPayload: null, identifierValue: null,
    candidateName: '테스트 상품', candidateManufacturer: '테스트 제조', candidateSpec: null, candidateUnit: null,
    ...over,
  } as Parameters<typeof buildStoreWebPromotionPlan>[0];
}

describe('classificationToRegulatory', () => {
  it.each([
    ['otc', 'DRUG', 'otc'],
    ['rx', 'DRUG', 'rx'],
    ['drug', 'DRUG', 'drug_unspecified'],
    ['quasi', 'QUASI_DRUG', null],
    ['health_functional', 'HEALTH_FUNCTIONAL', null],
    ['medical_device', 'MEDICAL_DEVICE', null],
    ['cosmetic', 'COSMETIC', null],
    ['general', 'GENERAL', null],
    ['???', 'GENERAL', null],
    [null, 'GENERAL', null],
  ])('%s → %s / %s', (code, rt, dc) => {
    expect(classificationToRegulatory(code)).toEqual({ regulatoryType: rt, drugCategory: dc });
  });
});

describe('buildStoreWebPromotionPlan', () => {
  it('GTIN 바코드 → master.barcode + EAN13 identifier(identityKey=true, primary)', () => {
    const p = buildStoreWebPromotionPlan(candidate({ identifierValue: ` ${GTIN} `, candidateSpec: '10정', candidateUnit: '1박스' }), { reviewedBy: 'u', note: 'n' });
    expect(p.candidateId).toBe('c-1');
    expect(p.master).toEqual({
      regulatoryType: 'GENERAL', drugCategory: null, name: '테스트 상품', manufacturerName: '테스트 제조', specification: '10정 1박스', barcode: GTIN,
    });
    expect(p.identifiers).toEqual([{
      type: 'EAN13', value: ` ${GTIN} `, isPrimary: true, identityKey: true,
      sourceType: 'store_web_request', sourceLabel: STORE_REQUEST_SOURCE_LABEL, verificationStatus: 'pharmacy_provided',
    }]);
    expect(p.dedupHints).toEqual({ nameManufacturerExact: true });
    expect(p.effects).toEqual({ ensureDrugExtension: false });
    expect(p.reviewedBy).toBe('u');
    expect(p.note).toBe('n');
    expect(p.approvalMeta).toEqual({ kind: 'new_master' });
    expect(p.landingSource).toBe(STORE_REQUEST_LANDING_SOURCE);
  });

  it('비 GTIN 문자열 → master.barcode NULL · UNKNOWN identifier(identityKey=false, non-primary)', () => {
    const p = buildStoreWebPromotionPlan(candidate({ identifierValue: 'ABC-001' }), {});
    expect(p.master.barcode).toBeNull();
    expect(p.identifiers).toHaveLength(1);
    expect(p.identifiers[0]).toMatchObject({ type: 'UNKNOWN', isPrimary: false, identityKey: false });
  });

  it('바코드 없음 → identifier 0 · barcode NULL (합성 없음)', () => {
    const p = buildStoreWebPromotionPlan(candidate(), {});
    expect(p.master.barcode).toBeNull();
    expect(p.identifiers).toEqual([]);
  });

  it('이름/제조사가 비어도 합성하지 않는다 (Core 가 hold)', () => {
    const p = buildStoreWebPromotionPlan(candidate({ candidateName: '  ', candidateManufacturer: null }), {});
    expect(p.master.name).toBe('');
    expect(p.master.manufacturerName).toBe('');
  });

  it('분류 otc → DRUG/otc + effects.ensureDrugExtension=true · rawPayload.classification fallback', () => {
    expect(buildStoreWebPromotionPlan(candidate({ candidateCategory: 'otc' }), {}).effects.ensureDrugExtension).toBe(true);
    const p = buildStoreWebPromotionPlan(candidate({ rawPayload: { classification: 'drug' } }), {});
    expect(p.master).toMatchObject({ regulatoryType: 'DRUG', drugCategory: 'drug_unspecified' });
    expect(p.effects.ensureDrugExtension).toBe(true);
    expect(buildStoreWebPromotionPlan(candidate({ candidateCategory: 'quasi' }), {}).effects.ensureDrugExtension).toBe(false);
  });
});

describe('assertStoreWebCreate / holdToStoreRequestCode', () => {
  it('create → 통과', () => {
    expect(() => assertStoreWebCreate({ kind: 'create', masterId: 'm', identifiersCreated: 1 })).not.toThrow();
  });

  it('link → DUPLICATE_MASTER_EXISTS (자동 확정 안 함) · matchType 2값으로 축소', () => {
    const run = (matchType: 'barcode' | 'identifier' | 'name_manufacturer') => {
      try {
        assertStoreWebCreate({ kind: 'link', masterId: 'm', identifiersCreated: 0, matchType, existingMasterDiff: null });
      } catch (e) {
        return e as StoreRequestPromotionError;
      }
      throw new Error('expected throw');
    };
    expect(run('barcode')).toMatchObject({ message: 'DUPLICATE_MASTER_EXISTS', duplicates: [{ id: 'm', matchType: 'barcode' }] });
    expect(run('identifier').duplicates?.[0].matchType).toBe('barcode');
    expect(run('name_manufacturer').duplicates?.[0].matchType).toBe('name_manufacturer');
  });

  it('conflict → DUPLICATE_MASTER_EXISTS + duplicates 전체', () => {
    let err: StoreRequestPromotionError | undefined;
    try {
      assertStoreWebCreate({
        kind: 'conflict', reason: 'barcode_belongs_to_other_master',
        masters: [
          { id: 'a', name: 'A', barcode: GTIN, manufacturerName: 'A사', specification: null, regulatoryType: null, drugCategory: null, matchType: 'barcode' },
          { id: 'b', name: 'B', barcode: null, manufacturerName: 'B사', specification: null, regulatoryType: null, drugCategory: null, matchType: 'identifier' },
          { id: 'c', name: 'C', barcode: null, manufacturerName: 'C사', specification: null, regulatoryType: null, drugCategory: null, matchType: 'name_manufacturer' },
        ],
      });
    } catch (e) { err = e as StoreRequestPromotionError; }
    expect(err?.message).toBe('DUPLICATE_MASTER_EXISTS');
    expect(err?.duplicates).toEqual([
      { id: 'a', name: 'A', barcode: GTIN, manufacturerName: 'A사', matchType: 'barcode' },
      { id: 'b', name: 'B', barcode: null, manufacturerName: 'B사', matchType: 'barcode' },
      { id: 'c', name: 'C', barcode: null, manufacturerName: 'C사', matchType: 'name_manufacturer' },
    ]);
  });

  it.each([
    ['rx_not_promotable', 'RX_NEW_MASTER_BLOCKED'],
    ['candidate_not_reviewable', 'STATUS_NOT_REVIEWABLE'],
    ['candidate_already_linked', 'ALREADY_LINKED'],
    ['candidate_not_found', 'STORE_REQUEST_NOT_FOUND'],
    ['name_missing', 'CANDIDATE_FIELD_MISSING'],
    ['manufacturer_missing', 'CANDIDATE_FIELD_MISSING'],
    ['drug_category_required', 'PROMOTION_PLAN_INVALID'],
    ['regulatory_type_invalid', 'PROMOTION_PLAN_INVALID'],
    ['identifier_invalid', 'PROMOTION_PLAN_INVALID'],
  ] as const)('hold(%s) → %s', (reason, code) => {
    expect(holdToStoreRequestCode(reason)).toBe(code);
    expect(() => assertStoreWebCreate({ kind: 'hold', reason })).toThrow(code);
  });
});
