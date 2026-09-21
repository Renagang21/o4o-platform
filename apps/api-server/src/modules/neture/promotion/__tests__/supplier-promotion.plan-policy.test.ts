/**
 * Unit tests — Supplier Plan Builder + 정책 후검사 (WO-O4O-SUPPLIER-PRODUCT-CANDIDATE-PROMOTION-ADAPTER-V1 §2.2 · §6.1)
 *
 * InMemoryPromotionStore 위에서 promoteWithStore 로 Core 결과를 받고 assertSupplierPolicy 를 적용한다.
 * (실 TX 롤백은 supplier-candidate-promotion.service.test.ts 가 검증한다)
 */

jest.mock('../../../../utils/logger.js', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

import { promoteWithStore } from '../product-promotion-core.service.js';
import type { PromotionOutcome } from '../product-promotion.types.js';
import type { NormalizedSupplierCandidate } from '../adapters/supplier/supplier-candidate.normalizer.js';
import {
  SUPPLIER_APPROVAL_KIND,
  SUPPLIER_IDENTIFIER_SOURCE_TYPE,
  SUPPLIER_IDENTIFIER_VERIFICATION_STATUS,
  SUPPLIER_LANDING_SOURCE,
  buildSupplierPromotionPlan,
} from '../adapters/supplier/supplier-promotion.plan.js';
import {
  SUPPLIER_CREATE_ALLOWED_TYPES,
  SupplierPolicyError,
  assertSupplierPolicy,
  type PolicyQueryRunner,
} from '../adapters/supplier/supplier-promotion.policy.js';
import { InMemoryPromotionStore } from './in-memory-promotion-store.js';

const GTIN = '8801234567893';
const SUPPLIER_ID = '11111111-1111-4111-8111-111111111111';

function normalized(over: Partial<NormalizedSupplierCandidate> = {}): NormalizedSupplierCandidate {
  return {
    candidateId: 'c-1', supplierId: SUPPLIER_ID, origin: 'single',
    regulatoryType: 'GENERAL', drugCategory: null,
    name: '테스트 상품', manufacturerName: '테스트 제조', specification: null, barcode: null, identifiers: [],
    evidence: { regulatoryName: null, mfdsPermitNumber: null, reportNo: null, supplierSku: null, brandName: null, originCountry: null, categoryId: null },
    ...over,
  };
}

/** InMemory store 의 masters 를 product_masters 로 보이게 하는 정책용 query fake */
function runnerOf(store: InMemoryPromotionStore): PolicyQueryRunner {
  return {
    async query(sql: string, params?: unknown[]) {
      expect(sql).toMatch(/FROM product_masters WHERE id = \$1/);
      const m = store.masters.find((x) => x.id === params?.[0]);
      return m ? [{ id: m.id, regulatory_type: m.regulatoryType, drug_category: m.drugCategory }] : [];
    },
  };
}

async function run(store: InMemoryPromotionStore, n: NormalizedSupplierCandidate): Promise<{ outcome: PromotionOutcome; policyError: SupplierPolicyError | null }> {
  store.addCandidate(n.candidateId);
  const outcome = await promoteWithStore(store, buildSupplierPromotionPlan(n, { reviewedBy: 'u-1' }));
  try {
    await assertSupplierPolicy(runnerOf(store), n, outcome);
    return { outcome, policyError: null };
  } catch (e) {
    if (e instanceof SupplierPolicyError) return { outcome, policyError: e };
    throw e;
  }
}

describe('buildSupplierPromotionPlan', () => {
  it('공통 Plan — origin 은 sourceLabel 표기 · approvalMeta.origin 에만 남고 업무 필드는 동일', () => {
    const base = normalized({ identifiers: [{ type: 'EAN13', value: GTIN, identityKey: true, isPrimary: true }], barcode: GTIN });
    const s = buildSupplierPromotionPlan(base, { reviewedBy: 'u', note: 'n' });
    const b = buildSupplierPromotionPlan({ ...base, origin: 'bulk' }, { reviewedBy: 'u', note: 'n' });

    expect(s.identifiers[0].sourceLabel).toBe('neture-supplier-single');
    expect(b.identifiers[0].sourceLabel).toBe('공급자 대량 등록');
    expect(s.approvalMeta.origin).toBe('single');
    expect(b.approvalMeta.origin).toBe('bulk');

    const strip = (p: typeof s) => ({ ...p, identifiers: p.identifiers.map((i) => ({ ...i, sourceLabel: undefined })), approvalMeta: { ...p.approvalMeta, origin: undefined } });
    expect(strip(s)).toEqual(strip(b));

    expect(s.master).toEqual({ regulatoryType: 'GENERAL', drugCategory: null, name: '테스트 상품', manufacturerName: '테스트 제조', specification: null, barcode: GTIN });
    expect(s.identifiers[0]).toMatchObject({ type: 'EAN13', value: GTIN, isPrimary: true, identityKey: true, sourceType: SUPPLIER_IDENTIFIER_SOURCE_TYPE, verificationStatus: SUPPLIER_IDENTIFIER_VERIFICATION_STATUS });
    expect(s.dedupHints).toEqual({ nameManufacturerExact: true });
    expect(s.effects).toEqual({ ensureDrugExtension: false });
    expect(s.landingSource).toBe(SUPPLIER_LANDING_SOURCE);
    expect(s.approvalMeta).toMatchObject({ kind: SUPPLIER_APPROVAL_KIND, supplierId: SUPPLIER_ID });
    expect(s.reviewedBy).toBe('u');
    expect(s.note).toBe('n');
  });

  it('DRUG 면 ensureDrugExtension=true · evidence 는 approvalMeta 로만 전달 (master 필드 아님)', () => {
    const p = buildSupplierPromotionPlan(normalized({
      regulatoryType: 'DRUG', drugCategory: 'otc',
      evidence: { regulatoryName: '규제명', mfdsPermitNumber: '2020-1', reportNo: null, supplierSku: 'SKU', brandName: '브', originCountry: 'KR', categoryId: 'cat' },
    }), {});
    expect(p.effects.ensureDrugExtension).toBe(true);
    expect(p.master.drugCategory).toBe('otc');
    expect(Object.keys(p.master).sort()).toEqual(['barcode', 'drugCategory', 'manufacturerName', 'name', 'regulatoryType', 'specification']);
    expect(p.approvalMeta.evidence).toEqual({ regulatoryName: '규제명', mfdsPermitNumber: '2020-1', reportNo: null, supplierSku: 'SKU', brandName: '브', originCountry: 'KR', categoryId: 'cat' });
    expect(p.identifiers).toEqual([]); // mfdsPermitNumber · supplierSku 는 식별자가 아니다
  });

  it('이름 · 제조사 null 은 빈 문자열로만 넘긴다 (합성 없음 → Core hold)', async () => {
    const store = new InMemoryPromotionStore();
    const r = await run(store, normalized({ name: null }));
    expect(r.outcome).toEqual({ kind: 'hold', reason: 'name_missing' });
    expect(r.policyError).toBeNull();
    expect(store.writeCount).toBe(0);
  });
});

describe('assertSupplierPolicy — create', () => {
  it('허용 목록은 GENERAL · COSMETIC 뿐', () => {
    expect([...SUPPLIER_CREATE_ALLOWED_TYPES]).toEqual(['GENERAL', 'COSMETIC']);
  });

  it.each(['GENERAL', 'COSMETIC'] as const)('%s 신규 → create 통과', async (rt) => {
    const store = new InMemoryPromotionStore();
    const r = await run(store, normalized({ regulatoryType: rt, identifiers: [{ type: 'EAN13', value: GTIN, identityKey: true, isPrimary: true }], barcode: GTIN }));
    expect(r.outcome.kind).toBe('create');
    expect(r.policyError).toBeNull();
    expect(store.masters).toHaveLength(1);
    expect(store.masters[0].regulatoryType).toBe(rt);
    expect(store.identifiers).toHaveLength(1);
    expect(store.candidates.get('c-1')!.candidateStatus).toBe('approved_new_master');
  });

  it.each([
    ['HEALTH_FUNCTIONAL', null],
    ['QUASI_DRUG', null],
    ['MEDICAL_DEVICE', null],
    ['DRUG', 'otc'],
  ] as const)('%s 신규 → Core 는 create 하지만 정책이 SUPPLIER_REGULATED_CREATE_BLOCKED', async (rt, dc) => {
    const store = new InMemoryPromotionStore();
    const r = await run(store, normalized({ regulatoryType: rt, drugCategory: dc }));
    expect(r.outcome.kind).toBe('create'); // Core 는 제품군을 판단하지 않는다 — 롤백은 서비스 TX 가 담당
    expect(r.policyError?.code).toBe('SUPPLIER_REGULATED_CREATE_BLOCKED');
    expect(r.policyError?.data).toEqual({ regulatoryType: rt });
  });

  it('후보 DRUG rx → Core hold rx_not_promotable (정책까지 오지 않음 · write 0)', async () => {
    const store = new InMemoryPromotionStore();
    const r = await run(store, normalized({ regulatoryType: 'DRUG', drugCategory: 'rx' }));
    expect(r.outcome).toEqual({ kind: 'hold', reason: 'rx_not_promotable' });
    expect(r.policyError).toBeNull();
    expect(store.writeCount).toBe(0);
  });
});

describe('assertSupplierPolicy — link', () => {
  function seedMaster(store: InMemoryPromotionStore, regulatoryType: string | null, drugCategory: string | null = null, id = 'm-existing') {
    store.addMaster({ id, name: '테스트 상품', manufacturerName: '테스트 제조', barcode: GTIN, regulatoryType, drugCategory });
    store.addIdentifier(id, 'EAN13', GTIN);
  }
  const withBarcode = (over: Partial<NormalizedSupplierCandidate>) =>
    normalized({ identifiers: [{ type: 'EAN13', value: GTIN, identityKey: true, isPrimary: true }], barcode: GTIN, ...over });

  it.each([
    ['HEALTH_FUNCTIONAL', 'HEALTH_FUNCTIONAL'],
    ['HEALTH_FUNCTIONAL', '건강기능식품'],
    ['GENERAL', '일반'],
    ['GENERAL', 'general'],
    ['QUASI_DRUG', '의약외품'],
    ['MEDICAL_DEVICE', 'MEDICAL_DEVICE'],
    ['COSMETIC', 'COSMETIC'],
  ] as const)('후보 %s ↔ 기존 regulatory_type=%s → canonical 일치 → link 통과', async (rt, existing) => {
    const store = new InMemoryPromotionStore();
    seedMaster(store, existing);
    const r = await run(store, withBarcode({ regulatoryType: rt }));
    expect(r.outcome.kind).toBe('link');
    expect(r.policyError).toBeNull();
    expect(store.masters).toHaveLength(1); // 기존 Master 불변 · 신규 없음
    expect(store.candidates.get('c-1')!.matchedProductMasterId).toBe('m-existing');
  });

  it.each([
    ['GENERAL', 'HEALTH_FUNCTIONAL'],
    ['HEALTH_FUNCTIONAL', '일반'],
    ['COSMETIC', 'GENERAL'],
    ['GENERAL', null],
    ['GENERAL', '식품'],
  ] as const)('후보 %s ↔ 기존 %s → SUPPLIER_REGULATORY_TYPE_MISMATCH', async (rt, existing) => {
    const store = new InMemoryPromotionStore();
    seedMaster(store, existing);
    const r = await run(store, withBarcode({ regulatoryType: rt }));
    expect(r.outcome.kind).toBe('link');
    expect(r.policyError?.code).toBe('SUPPLIER_REGULATORY_TYPE_MISMATCH');
    expect(r.policyError?.data).toEqual({ regulatoryType: rt, existingMaster: { id: 'm-existing', regulatoryType: existing, drugCategory: null } });
  });

  it('후보 DRUG otc ↔ 기존 DRUG otc → 통과 · 기존 DRUG rx → SUPPLIER_RX_LINK_BLOCKED', async () => {
    const ok = new InMemoryPromotionStore();
    seedMaster(ok, 'DRUG', 'otc');
    const r1 = await run(ok, withBarcode({ regulatoryType: 'DRUG', drugCategory: 'otc' }));
    expect(r1.outcome.kind).toBe('link');
    expect(r1.policyError).toBeNull();

    const rx = new InMemoryPromotionStore();
    seedMaster(rx, 'DRUG', 'rx');
    const r2 = await run(rx, withBarcode({ regulatoryType: 'DRUG', drugCategory: 'otc' }));
    expect(r2.outcome.kind).toBe('link');
    expect(r2.policyError?.code).toBe('SUPPLIER_RX_LINK_BLOCKED');
    expect(r2.policyError?.data.existingMaster).toEqual({ id: 'm-existing', regulatoryType: 'DRUG', drugCategory: 'rx' });
  });

  it('기존 한글 별칭 의약품 + rx 도 canonical 후 RX 차단 (별칭 때문에 MISMATCH 로 빠지지 않음)', async () => {
    const store = new InMemoryPromotionStore();
    seedMaster(store, '의약품', 'rx');
    const r = await run(store, withBarcode({ regulatoryType: 'DRUG', drugCategory: 'otc' }));
    expect(r.policyError?.code).toBe('SUPPLIER_RX_LINK_BLOCKED');
  });

  it('bulk origin 도 같은 정책 (origin 분기 없음)', async () => {
    const store = new InMemoryPromotionStore();
    seedMaster(store, '건강기능식품');
    const r = await run(store, withBarcode({ origin: 'bulk', regulatoryType: 'HEALTH_FUNCTIONAL' }));
    expect(r.outcome.kind).toBe('link');
    expect(r.policyError).toBeNull();
  });
});

describe('assertSupplierPolicy — conflict · hold 는 통과 (Core write 0)', () => {
  it('conflict: 바코드와 이름 매칭이 서로 다른 Master → 정책 통과 · write 0', async () => {
    const store = new InMemoryPromotionStore();
    store.addMaster({ id: 'm-a', barcode: GTIN, name: '다른', manufacturerName: '다른', regulatoryType: 'HEALTH_FUNCTIONAL' });
    store.addMaster({ id: 'm-b', name: '테스트 상품', manufacturerName: '테스트 제조', regulatoryType: 'GENERAL' });
    const r = await run(store, normalized({ regulatoryType: 'HEALTH_FUNCTIONAL', barcode: GTIN, identifiers: [{ type: 'EAN13', value: GTIN, identityKey: true, isPrimary: true }] }));
    expect(r.outcome.kind).toBe('conflict');
    expect(r.policyError).toBeNull();
    expect(store.writeCount).toBe(0);
  });

  it('hold(manufacturer_missing) 규제 제품군이어도 정책 통과 (아무것도 쓰지 않았다)', async () => {
    const store = new InMemoryPromotionStore();
    const r = await run(store, normalized({ regulatoryType: 'MEDICAL_DEVICE', manufacturerName: null }));
    expect(r.outcome).toEqual({ kind: 'hold', reason: 'manufacturer_missing' });
    expect(r.policyError).toBeNull();
    expect(store.writeCount).toBe(0);
  });
});
