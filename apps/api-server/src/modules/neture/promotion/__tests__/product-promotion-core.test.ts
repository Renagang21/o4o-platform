/**
 * Unit tests — WO-O4O-PRODUCT-CANDIDATE-GENERAL-PROMOTION-CORE-FOUNDATION-V1 §6.1
 *
 * 실 DB 불필요. InMemoryPromotionStore 위에서 promoteWithStore 의 create / link / conflict / hold,
 * identifier 멱등, identityKey 축 분리, conflict/hold write 0, afterCommit 의 effects 선언 기반 실행을 검증한다.
 */

jest.mock('../../services/product-drug-extension.service.js', () => ({
  ProductDrugExtensionService: jest.fn().mockImplementation(() => ({
    ensureForProductMaster: mockEnsureDrugExt,
  })),
}));
jest.mock('../../services/product-landing.service.js', () => ({
  ensureProductLandingForMaster: (...args: unknown[]) => mockEnsureLanding(...args),
}));
jest.mock('../../../../utils/logger.js', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

const mockEnsureDrugExt = jest.fn(async () => undefined);
const mockEnsureLanding = jest.fn(async () => undefined);

import fs from 'fs';
import path from 'path';
import { PROMOTION_IMAGE_SOURCE, ProductPromotionCore, linkPromotionImages, promoteWithStore } from '../product-promotion-core.service.js';
import type { ProductPromotionPlan, PromotionIdentifierInput } from '../product-promotion.types.js';
import { InMemoryPromotionStore } from './in-memory-promotion-store.js';

const GTIN = '8801234567893';

function ident(over: Partial<PromotionIdentifierInput> = {}): PromotionIdentifierInput {
  return {
    type: 'EAN13', value: GTIN, isPrimary: true, identityKey: true,
    sourceType: 'test', sourceLabel: 'test', verificationStatus: 'unverified',
    ...over,
  };
}

function plan(over: Partial<ProductPromotionPlan> = {}, master: Partial<ProductPromotionPlan['master']> = {}): ProductPromotionPlan {
  return {
    candidateId: 'c-1',
    master: {
      regulatoryType: 'GENERAL', drugCategory: null, name: '테스트 상품', manufacturerName: '테스트 제조', specification: null, barcode: null,
      ...master,
    },
    identifiers: [],
    dedupHints: { nameManufacturerExact: true },
    effects: { ensureDrugExtension: false },
    reviewedBy: 'admin-1',
    note: null,
    approvalMeta: { kind: 'test' },
    ...over,
  };
}

function storeWithCandidate(): InMemoryPromotionStore {
  const s = new InMemoryPromotionStore();
  s.addCandidate('c-1');
  return s;
}

describe('promoteWithStore — create', () => {
  it('중복 0 → Master + Identifier 생성 + candidate approved_new_master', async () => {
    const s = storeWithCandidate();
    const out = await promoteWithStore(s, plan({ identifiers: [ident()] }, { barcode: GTIN }));
    expect(out.kind).toBe('create');
    if (out.kind !== 'create') return;
    expect(out.identifiersCreated).toBe(1);
    expect(s.masters).toHaveLength(1);
    expect(s.masters[0].barcode).toBe(GTIN);
    expect(s.identifiers).toEqual([expect.objectContaining({ masterId: out.masterId, type: 'EAN13', normalized: GTIN })]);
    const c = s.candidates.get('c-1')!;
    expect(c.candidateStatus).toBe('approved_new_master');
    expect(c.matchedProductMasterId).toBe(out.masterId);
    expect(c.reviewedBy).toBe('admin-1');
    expect(c.approval).toMatchObject({ kind: 'test', outcome: 'create', masterId: out.masterId, identifiersCreated: 1 });
  });

  it('바코드 없는 후보 → barcode NULL 로 생성 (합성 없음), identifier 0', async () => {
    const s = storeWithCandidate();
    const out = await promoteWithStore(s, plan());
    expect(out.kind).toBe('create');
    expect(s.masters[0].barcode).toBeNull();
    expect(s.identifiers).toHaveLength(0);
  });

  it('identityKey=false 식별자가 다른 Master 에 이미 있어도 create 를 막지 않는다 (+ 새 Master 에 부가 추가)', async () => {
    const s = storeWithCandidate();
    s.addMaster({ id: 'other', name: '다른 상품', manufacturerName: '다른 제조' });
    s.addIdentifier('other', 'MFDS_CODE', 'A123');
    const out = await promoteWithStore(s, plan({ identifiers: [ident({ type: 'MFDS_CODE', value: 'A123', isPrimary: false, identityKey: false })] }));
    expect(out.kind).toBe('create');
    expect(s.reads.byIdentifier).toBe(0); // dedup 축 ② 에 참여하지 않음
    expect(s.masters).toHaveLength(2);
    expect(s.identifiers.filter((i) => i.normalized === 'A123')).toHaveLength(2);
  });

  it('같은 값이라도 identityKey=true 면 다른 Master 에 link 된다 (축 ② 참여)', async () => {
    const s = storeWithCandidate();
    s.addMaster({ id: 'other', name: '다른 상품', manufacturerName: '다른 제조' });
    s.addIdentifier('other', 'MFDS_CODE', 'A123');
    const out = await promoteWithStore(s, plan({ identifiers: [ident({ type: 'MFDS_CODE', value: 'A123', isPrimary: false, identityKey: true })] }));
    expect(out.kind).toBe('link');
    if (out.kind !== 'link') return;
    expect(out.masterId).toBe('other');
    expect(out.matchType).toBe('identifier');
    expect(s.masters).toHaveLength(1);
  });

  it('dedupHints.nameManufacturerExact=false 면 이름+제조사 조회를 하지 않는다', async () => {
    const s = storeWithCandidate();
    s.addMaster({ id: 'same', name: '테스트 상품', manufacturerName: '테스트 제조' });
    const out = await promoteWithStore(s, plan({ dedupHints: { nameManufacturerExact: false } }));
    expect(out.kind).toBe('create');
    expect(s.reads.byNameManufacturer).toBe(0);
  });
});

describe('promoteWithStore — create metadata (Supplier cutover §2.2 · §2.5)', () => {
  const metadata = { categoryId: 'cat-1', brandId: 'brand-1', originCountry: 'KR', regulatoryName: '규제명' };

  it('plan.master.metadata 는 createMaster 로 그대로 전달된다 (Core 는 해석하지 않음)', async () => {
    const store = storeWithCandidate();
    const out = await promoteWithStore(store, plan({}, { barcode: GTIN, metadata }));
    expect(out.kind).toBe('create');
    expect(store.masters[0].metadata).toEqual(metadata);
  });

  it('metadata 없이도 create 는 그대로 동작한다 (optional · 하위호환)', async () => {
    const store = storeWithCandidate();
    const out = await promoteWithStore(store, plan({}, { barcode: GTIN }));
    expect(out.kind).toBe('create');
    expect(store.masters[0].metadata).toBeNull();
  });

  it('link 에서는 기존 Master 의 metadata 를 건드리지 않는다 (UPDATE 0)', async () => {
    const store = storeWithCandidate();
    store.addMaster({ id: 'm-existing', barcode: GTIN, name: '테스트 상품', manufacturerName: '테스트 제조' });
    const out = await promoteWithStore(store, plan({ identifiers: [ident()] }, { barcode: GTIN, metadata }));
    expect(out.kind).toBe('link');
    expect(store.masters).toHaveLength(1);
    expect(store.masters[0]).not.toHaveProperty('metadata');
    expect(store.writes.createMaster).toBe(0);
  });
});

describe('promoteWithStore — link', () => {
  it('바코드 1건 일치 → link · 기존 Master 불변 · identifier 보강 · candidate matched', async () => {
    const s = storeWithCandidate();
    s.addMaster({ id: 'ex', name: '기존 이름', manufacturerName: '기존 제조', barcode: GTIN, specification: '10정' });
    const out = await promoteWithStore(s, plan({ identifiers: [ident()] }, { barcode: GTIN, name: '다른 이름' }));
    expect(out.kind).toBe('link');
    if (out.kind !== 'link') return;
    expect(out.masterId).toBe('ex');
    expect(out.matchType).toBe('barcode');
    expect(out.identifiersCreated).toBe(1);
    expect(out.existingMasterDiff).toMatchObject({ nameDiffers: true, manufacturerDiffers: true, specificationDiffers: true });
    expect(s.masters).toHaveLength(1);
    expect(s.masters[0]).toMatchObject({ name: '기존 이름', manufacturerName: '기존 제조', specification: '10정' }); // 덮어쓰기 없음
    const c = s.candidates.get('c-1')!;
    expect(c.candidateStatus).toBe('matched');
    expect(c.matchedProductMasterId).toBe('ex');
    expect(c.approval).toMatchObject({ outcome: 'link', matchType: 'barcode' });
  });

  it('이름+제조사 1건 일치 → link(name_manufacturer) · 차이 없으면 diff null', async () => {
    const s = storeWithCandidate();
    s.addMaster({ id: 'ex', name: ' 테스트 상품 ', manufacturerName: '테스트 제조' });
    const out = await promoteWithStore(s, plan());
    expect(out.kind).toBe('link');
    if (out.kind !== 'link') return;
    expect(out.matchType).toBe('name_manufacturer');
    expect(out.existingMasterDiff).toBeNull();
  });

  it('identifier 멱등 — 같은 Master 에 두 번 승격해도 identifier 는 1개', async () => {
    const s = new InMemoryPromotionStore();
    s.addCandidate('c-1');
    s.addCandidate('c-2');
    const first = await promoteWithStore(s, plan({ candidateId: 'c-1', identifiers: [ident()] }, { barcode: GTIN }));
    expect(first.kind).toBe('create');
    const second = await promoteWithStore(s, plan({ candidateId: 'c-2', identifiers: [ident()] }, { barcode: GTIN }));
    expect(second.kind).toBe('link');
    if (second.kind !== 'link') return;
    expect(second.identifiersCreated).toBe(0);
    expect(s.identifiers).toHaveLength(1);
  });

  it('Plan 안 동일 식별자 중복은 1회만 생성', async () => {
    const s = storeWithCandidate();
    const out = await promoteWithStore(s, plan({ identifiers: [ident(), ident({ value: ` ${GTIN} ` })] }, { barcode: GTIN }));
    expect(out.kind).toBe('create');
    expect(s.identifiers).toHaveLength(1);
  });
});

describe('promoteWithStore — conflict (write 0)', () => {
  it('바코드와 이름+제조사가 서로 다른 Master → conflict(barcode_belongs_to_other_master) · candidate 포함 write 0', async () => {
    const s = storeWithCandidate();
    s.addMaster({ id: 'a', barcode: GTIN, name: 'A', manufacturerName: 'A사' });
    s.addMaster({ id: 'b', name: '테스트 상품', manufacturerName: '테스트 제조' });
    const out = await promoteWithStore(s, plan({ identifiers: [ident()] }, { barcode: GTIN }));
    expect(out.kind).toBe('conflict');
    if (out.kind !== 'conflict') return;
    expect(out.reason).toBe('barcode_belongs_to_other_master');
    expect(out.masters.map((m) => [m.id, m.matchType])).toEqual([['a', 'barcode'], ['b', 'name_manufacturer']]);
    expect(s.writeCount).toBe(0);
    expect(s.candidates.get('c-1')).toMatchObject({ candidateStatus: 'pending', matchedProductMasterId: null });
    expect(s.identifiers).toHaveLength(0);
  });

  it('바코드 Master 와 identifier Master 가 다르면 identifier_belongs_to_other_master', async () => {
    const s = storeWithCandidate();
    s.addMaster({ id: 'a', barcode: GTIN, name: 'A', manufacturerName: 'A사' });
    s.addMaster({ id: 'b', name: 'B', manufacturerName: 'B사' });
    s.addIdentifier('b', 'EAN13', GTIN);
    const out = await promoteWithStore(s, plan({ identifiers: [ident()] }, { barcode: GTIN }));
    expect(out.kind).toBe('conflict');
    if (out.kind !== 'conflict') return;
    expect(out.reason).toBe('identifier_belongs_to_other_master');
    expect(s.writeCount).toBe(0);
  });

  it('같은 축에서 2건 이상 → multiple_masters_match', async () => {
    const s = storeWithCandidate();
    s.addMaster({ id: 'a', name: '테스트 상품', manufacturerName: '테스트 제조' });
    s.addMaster({ id: 'b', name: '테스트 상품', manufacturerName: '테스트 제조' });
    const out = await promoteWithStore(s, plan());
    expect(out).toMatchObject({ kind: 'conflict', reason: 'multiple_masters_match' });
    expect(s.writeCount).toBe(0);
  });

  it('같은 Master 가 여러 축에 걸리면 1건으로 합쳐져 link', async () => {
    const s = storeWithCandidate();
    s.addMaster({ id: 'a', barcode: GTIN, name: '테스트 상품', manufacturerName: '테스트 제조' });
    s.addIdentifier('a', 'EAN13', GTIN);
    const out = await promoteWithStore(s, plan({ identifiers: [ident()] }, { barcode: GTIN }));
    expect(out).toMatchObject({ kind: 'link', masterId: 'a', matchType: 'barcode' });
  });
});

describe('promoteWithStore — hold (write 0)', () => {
  const cases: Array<[string, () => { s: InMemoryPromotionStore; p: ProductPromotionPlan }, string]> = [
    ['이름 없음', () => ({ s: storeWithCandidate(), p: plan({}, { name: '   ' }) }), 'name_missing'],
    ['제조사 없음', () => ({ s: storeWithCandidate(), p: plan({}, { manufacturerName: '' }) }), 'manufacturer_missing'],
    ['Rx', () => ({ s: storeWithCandidate(), p: plan({}, { regulatoryType: 'DRUG', drugCategory: 'rx' }) }), 'rx_not_promotable'],
    ['DRUG 인데 drugCategory 없음', () => ({ s: storeWithCandidate(), p: plan({}, { regulatoryType: 'DRUG', drugCategory: null }) }), 'drug_category_required'],
    ['regulatoryType 한글 별칭', () => ({ s: storeWithCandidate(), p: plan({}, { regulatoryType: '의약품' as never }) }), 'regulatory_type_invalid'],
    ['master.barcode 가 GTIN 형식 아님', () => ({ s: storeWithCandidate(), p: plan({}, { barcode: 'ABC-1' }) }), 'identifier_invalid'],
    ['식별자 값 비어 있음', () => ({ s: storeWithCandidate(), p: plan({ identifiers: [ident({ value: '  ' })] }) }), 'identifier_invalid'],
    ['candidate 없음', () => ({ s: new InMemoryPromotionStore(), p: plan() }), 'candidate_not_found'],
    ['candidate 상태 rejected', () => { const s = new InMemoryPromotionStore(); s.addCandidate('c-1', { candidateStatus: 'rejected' }); return { s, p: plan() }; }, 'candidate_not_reviewable'],
    ['candidate 이미 연결', () => { const s = new InMemoryPromotionStore(); s.addCandidate('c-1', { matchedProductMasterId: 'x' }); return { s, p: plan() }; }, 'candidate_already_linked'],
  ];
  it.each(cases)('%s → hold(%s) · write 0', async (_label, mk, reason) => {
    const { s, p } = mk();
    const out = await promoteWithStore(s, p);
    expect(out).toEqual({ kind: 'hold', reason });
    expect(s.writeCount).toBe(0);
  });

  it('DRUG + otc 는 구조 검증을 통과한다 (제품군 적격성은 Core 가 판단하지 않음)', async () => {
    const s = storeWithCandidate();
    const out = await promoteWithStore(s, plan({}, { regulatoryType: 'DRUG', drugCategory: 'otc' }));
    expect(out.kind).toBe('create');
  });
});

describe('ProductPromotionCore.afterCommit — effects 는 Adapter 선언만 따른다', () => {
  beforeEach(() => {
    mockEnsureDrugExt.mockClear();
    mockEnsureLanding.mockClear();
  });
  const core = new ProductPromotionCore({} as never);

  it('create + ensureDrugExtension=true → extension 1회 + landing 1회', async () => {
    await core.afterCommit(plan({ effects: { ensureDrugExtension: true }, landingSource: 'test-src' }), { kind: 'create', masterId: 'm-1', identifiersCreated: 0 });
    expect(mockEnsureDrugExt).toHaveBeenCalledTimes(1);
    expect(mockEnsureDrugExt).toHaveBeenCalledWith('m-1');
    expect(mockEnsureLanding).toHaveBeenCalledTimes(1);
    expect(mockEnsureLanding.mock.calls[0][1]).toBe('m-1');
    expect(mockEnsureLanding.mock.calls[0][2]).toBe('test-src');
  });

  it('regulatoryType=DRUG 이어도 ensureDrugExtension=false 면 extension 0회 (Core 는 regulatoryType 을 보지 않는다)', async () => {
    await core.afterCommit(plan({ effects: { ensureDrugExtension: false } }, { regulatoryType: 'DRUG', drugCategory: 'otc' }), { kind: 'create', masterId: 'm-1', identifiersCreated: 0 });
    expect(mockEnsureDrugExt).not.toHaveBeenCalled();
    expect(mockEnsureLanding).toHaveBeenCalledTimes(1);
  });

  it('regulatoryType=GENERAL 이어도 ensureDrugExtension=true 면 extension 1회', async () => {
    await core.afterCommit(plan({ effects: { ensureDrugExtension: true } }), { kind: 'create', masterId: 'm-1', identifiersCreated: 0 });
    expect(mockEnsureDrugExt).toHaveBeenCalledTimes(1);
  });

  it('link / conflict / hold 에서는 아무 효과도 실행하지 않는다', async () => {
    await core.afterCommit(plan({ effects: { ensureDrugExtension: true } }), { kind: 'link', masterId: 'm-1', identifiersCreated: 0, matchType: 'barcode', existingMasterDiff: null });
    await core.afterCommit(plan({ effects: { ensureDrugExtension: true } }), { kind: 'conflict', reason: 'multiple_masters_match', masters: [] });
    await core.afterCommit(plan({ effects: { ensureDrugExtension: true } }), { kind: 'hold', reason: 'name_missing' });
    expect(mockEnsureDrugExt).not.toHaveBeenCalled();
    expect(mockEnsureLanding).not.toHaveBeenCalled();
  });

  it('extension 실패는 삼키고 landing 은 계속 진행한다 (best-effort)', async () => {
    mockEnsureDrugExt.mockRejectedValueOnce(new Error('boom'));
    await expect(core.afterCommit(plan({ effects: { ensureDrugExtension: true } }), { kind: 'create', masterId: 'm-1', identifiersCreated: 0 })).resolves.toBeUndefined();
    expect(mockEnsureLanding).toHaveBeenCalledTimes(1);
  });

  it('create + effects.images → product_images INSERT (커밋 후) · link 에서는 0 · 실패해도 landing 진행', async () => {
    const query = jest.fn(async () => []);
    const withImages = new ProductPromotionCore({ query } as never);
    const images = [
      { url: 'https://cdn.example.com/c1.jpg', type: 'content' as const, sortOrder: 1 },
      { url: 'https://cdn.example.com/t.jpg', type: 'thumbnail' as const, sortOrder: 0 },
    ];
    await withImages.afterCommit(plan({ effects: { ensureDrugExtension: false, images } }), { kind: 'create', masterId: 'm-1', identifiersCreated: 0 });
    expect(query).toHaveBeenCalledTimes(2);
    expect(mockEnsureLanding).toHaveBeenCalledTimes(1);

    query.mockClear();
    mockEnsureLanding.mockClear();
    await withImages.afterCommit(plan({ effects: { ensureDrugExtension: false, images } }), { kind: 'link', masterId: 'm-1', identifiersCreated: 0, matchType: 'barcode', existingMasterDiff: null });
    expect(query).not.toHaveBeenCalled();

    query.mockRejectedValueOnce(new Error('db down'));
    await expect(withImages.afterCommit(plan({ effects: { ensureDrugExtension: false, images } }), { kind: 'create', masterId: 'm-1', identifiersCreated: 0 })).resolves.toBeUndefined();
    expect(mockEnsureLanding).toHaveBeenCalledTimes(1);
  });
});

describe('linkPromotionImages — sortOrder 정렬 · thumbnail 1장만 primary · source=candidate_promotion', () => {
  it('INSERT 파라미터 계약', async () => {
    const query = jest.fn(async () => []);
    const n = await linkPromotionImages({ query } as never, 'm-9', [
      { url: ' https://cdn.example.com/c1.jpg ', type: 'content', sortOrder: 2 },
      { url: 'https://cdn.example.com/t1.jpg', type: 'thumbnail', sortOrder: 0 },
      { url: 'https://cdn.example.com/t2.jpg', type: 'thumbnail', sortOrder: 1 },
      { url: '   ', type: 'content', sortOrder: 3 },
    ]);
    expect(n).toBe(3);
    expect(query).toHaveBeenCalledTimes(3);
    const params = query.mock.calls.map((c: unknown[]) => c[1]);
    expect(params).toEqual([
      ['m-9', 'https://cdn.example.com/t1.jpg', 0, true, 'thumbnail', PROMOTION_IMAGE_SOURCE],
      ['m-9', 'https://cdn.example.com/t2.jpg', 1, false, 'thumbnail', PROMOTION_IMAGE_SOURCE],
      ['m-9', 'https://cdn.example.com/c1.jpg', 2, false, 'content', PROMOTION_IMAGE_SOURCE],
    ]);
    for (const c of query.mock.calls) {
      expect(String(c[0])).toMatch(/INSERT INTO product_images/);
      expect(String(c[0])).not.toMatch(/UPDATE|DELETE/);
    }
  });
});

describe('Core 소스 불변식 — 제품군 분기 없음', () => {
  it('core/decide/store 소스에 regulatoryType 기반 실행 분기가 없다 (구조 검증 2줄만 허용)', () => {
    const dir = path.resolve(__dirname, '..');
    const core = fs.readFileSync(path.join(dir, 'product-promotion-core.service.ts'), 'utf8');
    const store = fs.readFileSync(path.join(dir, 'product-promotion.store.ts'), 'utf8');
    const decide = fs.readFileSync(path.join(dir, 'product-promotion.decide.ts'), 'utf8');
    expect(core).not.toMatch(/regulatoryType\s*===/);
    expect(store).not.toMatch(/regulatoryType\s*===/);
    // decide: DRUG 구조 검증(drugCategory 필수 · rx 불가) 2곳만 — 적격성 판단·effects 분기 없음
    const hits = decide.match(/regulatoryType\s*===\s*'DRUG'/g) ?? [];
    expect(hits).toHaveLength(2);
    expect(decide).not.toMatch(/ensureDrugExtension|ProductDrugExtension/);
    expect(core).not.toMatch(/identityKey\s*[:=]\s*[^,;]*type/); // identityKey 를 type 에서 추론하지 않음
  });
});
