/**
 * WO-O4O-SUPPLIER-EXISTING-MASTER-DIRECT-OFFER-LINK-V1 — 서비스 경로 검증
 *
 *   ProductMaster 선택 → masterId → 서버 재검증 → SupplierProductOffer
 *
 * DB 없이 AppDataSource 를 entity 이름으로 분기하는 fake 로 대체한다.
 *  - DRUG gate 는 실제 assertDrugOfferAllowed 를 쓴다(AppDataSource.query 만 fake).
 *  - ProductMaster / ProductIdentifier / ProductCandidate 저장소에는 write 메서드 자체를 두지 않아
 *    접근 시 TypeError 로 드러나게 한다(write 0 증명).
 */
jest.mock('@o4o/ai-prompts/store', () => ({ PRODUCT_CONTENT_PROMPTS: {} }), { virtual: true });

const state: {
  master: Record<string, unknown> | null;
  category: { isRegulated: boolean } | null;
  supplier: { id: string; status: string } | null;
  existingOffer: { id: string; deletedAt: Date | null } | null;
  saveImpl: ((o: unknown) => Promise<unknown>) | null;
  pharmacyRows: Array<{ service_key: string }>;
  queries: Array<{ sql: string; params: unknown[] }>;
  saved: unknown[];
  approvalCalls: unknown[];
} = {
  master: null, category: null, supplier: null, existingOffer: null, saveImpl: null,
  pharmacyRows: [{ service_key: 'kpa-society' }], queries: [], saved: [], approvalCalls: [],
};

function repoFor(entity: { name?: string } | string) {
  const name = typeof entity === 'string' ? entity : entity.name;
  switch (name) {
    case 'ProductMaster':
      return { findOne: jest.fn(async () => state.master) }; // save/update/insert 없음 → write 0
    case 'ProductCategory':
      return { findOne: jest.fn(async () => state.category) };
    case 'NetureSupplier':
      return { findOne: jest.fn(async () => state.supplier) };
    case 'SupplierProductOffer':
      return {
        findOne: jest.fn(async () => state.existingOffer),
        create: jest.fn((o: unknown) => o),
        save: jest.fn(async (o: Record<string, unknown>) => {
          if (state.saveImpl) return state.saveImpl(o);
          const row = { ...o, id: 'offer-new', createdAt: new Date('2026-09-21') };
          state.saved.push(row);
          return row;
        }),
      };
    default:
      throw new Error(`unexpected repository: ${name}`);
  }
}

jest.mock('../../../../database/connection.js', () => ({
  AppDataSource: {
    getRepository: (e: never) => repoFor(e),
    query: async (sql: string, params: unknown[]) => {
      state.queries.push({ sql, params });
      if (/service_audience_policies/.test(sql)) return state.pharmacyRows;
      if (/FROM product_masters/.test(sql)) return state.master ? [{ regulatory_type: state.master.regulatoryType }] : [];
      return [];
    },
    manager: {},
  },
}));
jest.mock('../service-audience.service.js', () => ({
  ServiceAudienceService: jest.fn().mockImplementation(() => ({
    getPharmacyAudienceResolver: async () => (k: string) => state.pharmacyRows.some((r) => r.service_key === k),
  })),
}));
jest.mock('../offer-service-approval.service.js', () => ({
  OfferServiceApprovalService: jest.fn().mockImplementation(() => ({
    createPendingApprovals: jest.fn(async (...args: unknown[]) => { state.approvalCalls.push(args); }),
  })),
}));
jest.mock('../../../../utils/logger.js', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

import { NetureOfferService } from '../offer.service.js';

const MASTER_ID = '11111111-1111-4111-8111-111111111111';
const SUPPLIER_ID = '22222222-2222-4222-8222-222222222222';

function activeMaster(over: Record<string, unknown> = {}) {
  return {
    id: MASTER_ID, status: 'ACTIVE', regulatoryType: 'GENERAL', categoryId: null,
    isMfdsVerified: false, mfdsPermitNumber: null, barcode: '8801234567890', ...over,
  };
}

function build() {
  const catalogService = {
    resolveOrCreateMaster: jest.fn(),
    updateProductMaster: jest.fn(),
  };
  const svc = new NetureOfferService(catalogService as never);
  return { svc, catalogService };
}

beforeEach(() => {
  state.master = activeMaster();
  state.category = null;
  state.supplier = { id: SUPPLIER_ID, status: 'ACTIVE' };
  state.existingOffer = null;
  state.saveImpl = null;
  state.pharmacyRows = [{ service_key: 'kpa-society' }];
  state.queries = [];
  state.saved = [];
  state.approvalCalls = [];
});

describe('body 키 계약', () => {
  it.each([
    ['barcode', { barcode: '880' }],
    ['name', { name: 'x' }],
    ['manufacturerName', { manufacturerName: 'x' }],
    ['regulatoryType', { regulatoryType: 'DRUG' }],
    ['regulatoryName', { regulatoryName: 'x' }],
    ['mfdsPermitNumber', { mfdsPermitNumber: '123' }],
    ['categoryId', { categoryId: MASTER_ID }],
    ['brandName', { brandName: 'x' }],
    ['specification', { specification: 'x' }],
    ['originCountry', { originCountry: 'KR' }],
    ['manualData', { manualData: { name: 'x' } }],
  ])('Master 기준정보 %s 포함 → MASTER_FIELD_NOT_ALLOWED · Offer 생성 0', async (_k, extra) => {
    const { svc, catalogService } = build();
    const r = await svc.createSupplierOfferFromExistingMaster(SUPPLIER_ID, { masterId: MASTER_ID, ...extra });
    expect(r).toMatchObject({ success: false, error: 'MASTER_FIELD_NOT_ALLOWED' });
    expect(state.saved).toHaveLength(0);
    expect(catalogService.resolveOrCreateMaster).not.toHaveBeenCalled();
  });

  it('supplierId 를 body 로 넣으면 SUPPLIER_ID_NOT_ALLOWED (middleware 확정값만 사용)', async () => {
    const { svc } = build();
    const r = await svc.createSupplierOfferFromExistingMaster(SUPPLIER_ID, { masterId: MASTER_ID, supplierId: 'other' });
    expect(r).toMatchObject({ success: false, error: 'SUPPLIER_ID_NOT_ALLOWED' });
    expect(state.saved).toHaveLength(0);
  });

  it('허용 목록 밖 키 → UNSUPPORTED_FIELD', async () => {
    const { svc } = build();
    const r = await svc.createSupplierOfferFromExistingMaster(SUPPLIER_ID, { masterId: MASTER_ID, foo: 1 });
    expect(r).toMatchObject({ success: false, error: 'UNSUPPORTED_FIELD' });
  });
});

describe('Master 서버 재검증', () => {
  it.each(['not-a-uuid', '', 123, undefined])('masterId=%p → INVALID_MASTER_ID (DB 조회 0)', async (bad) => {
    const { svc } = build();
    const r = await svc.createSupplierOfferFromExistingMaster(SUPPLIER_ID, { masterId: bad as never });
    expect(r).toMatchObject({ success: false, error: 'INVALID_MASTER_ID' });
    expect(state.saved).toHaveLength(0);
  });

  it('존재하지 않는 Master → MASTER_NOT_FOUND', async () => {
    state.master = null;
    const { svc } = build();
    const r = await svc.createSupplierOfferFromExistingMaster(SUPPLIER_ID, { masterId: MASTER_ID });
    expect(r).toMatchObject({ success: false, error: 'MASTER_NOT_FOUND' });
  });

  it.each(['SUSPENDED', 'ARCHIVED'])('status=%s → MASTER_NOT_ACTIVE (Product Library 가 ACTIVE-only 여도 write 는 재검증)', async (status) => {
    state.master = activeMaster({ status });
    const { svc } = build();
    const r = await svc.createSupplierOfferFromExistingMaster(SUPPLIER_ID, { masterId: MASTER_ID });
    expect(r).toMatchObject({ success: false, error: 'MASTER_NOT_ACTIVE' });
    expect(state.saved).toHaveLength(0);
  });

  it.each([null, '', 'WEIRD'])('regulatoryType=%p → MASTER_REGULATORY_TYPE_UNSUPPORTED', async (rt) => {
    state.master = activeMaster({ regulatoryType: rt });
    const { svc } = build();
    const r = await svc.createSupplierOfferFromExistingMaster(SUPPLIER_ID, { masterId: MASTER_ID });
    expect(r).toMatchObject({ success: false, error: 'MASTER_REGULATORY_TYPE_UNSUPPORTED' });
  });

  it('한글 별칭 "건강기능식품" 은 canonical 로 해석돼 통과한다', async () => {
    state.master = activeMaster({ regulatoryType: '건강기능식품' });
    const { svc } = build();
    const r = await svc.createSupplierOfferFromExistingMaster(SUPPLIER_ID, { masterId: MASTER_ID });
    expect(r.success).toBe(true);
  });

  it('공급자 비활성 → SUPPLIER_NOT_ACTIVE', async () => {
    state.supplier = { id: SUPPLIER_ID, status: 'PENDING' };
    const { svc } = build();
    const r = await svc.createSupplierOfferFromExistingMaster(SUPPLIER_ID, { masterId: MASTER_ID });
    expect(r).toMatchObject({ success: false, error: 'SUPPLIER_NOT_ACTIVE' });
  });

  it('PUBLIC 인데 짧은 설명 없음 → PUBLIC_REQUIRES_DESCRIPTION (기존 등록 계약 동일)', async () => {
    const { svc } = build();
    const r = await svc.createSupplierOfferFromExistingMaster(SUPPLIER_ID, { masterId: MASTER_ID, isPublic: true });
    expect(r).toMatchObject({ success: false, error: 'PUBLIC_REQUIRES_DESCRIPTION' });
  });
});

describe('정상 생성 — masterId 보존 · Master 재추론 0 · Master/Candidate write 0', () => {
  it('선택 masterId 가 그대로 offer.masterId 가 되고 resolveOrCreateMaster 는 호출되지 않는다', async () => {
    const { svc, catalogService } = build();
    const r = await svc.createSupplierOfferFromExistingMaster(SUPPLIER_ID, {
      masterId: MASTER_ID, priceGeneral: 1000, stockQuantity: '7', serviceKeys: ['kpa-society'], isFeatured: true,
    });
    expect(r.success).toBe(true);
    expect((r as { data: { masterId: string } }).data.masterId).toBe(MASTER_ID);
    expect(state.saved).toHaveLength(1);
    const saved = state.saved[0] as Record<string, unknown>;
    expect(saved).toMatchObject({
      supplierId: SUPPLIER_ID, masterId: MASTER_ID, approvalStatus: 'PENDING', isActive: false,
      priceGeneral: 1000, stockQuantity: 7, isFeatured: true, serviceKeys: ['kpa-society'], distributionType: 'SERVICE',
    });
    expect(String(saved.slug)).toMatch(/^8801234567890-22222222-/);
    expect(catalogService.resolveOrCreateMaster).not.toHaveBeenCalled();
    expect(catalogService.updateProductMaster).not.toHaveBeenCalled();
    // barcode/name 재탐색 0 · product_masters 는 read 도 raw query 로 하지 않는다(DRUG gate 에 regulatoryType 을 넘겼으므로)
    expect(state.queries.filter((q) => /product_masters|product_identifiers|product_candidates/i.test(q.sql))).toHaveLength(0);
    expect(state.queries.filter((q) => /INSERT|UPDATE|DELETE/i.test(q.sql))).toHaveLength(0);
  });

  it('barcode 없는 Master 는 slug 에 master.id 를 쓴다 (기존 계약)', async () => {
    state.master = activeMaster({ barcode: null });
    const { svc } = build();
    await svc.createSupplierOfferFromExistingMaster(SUPPLIER_ID, { masterId: MASTER_ID });
    expect(String((state.saved[0] as Record<string, unknown>).slug)).toMatch(new RegExp(`^${MASTER_ID}-`));
  });

  it('service approval 은 승인 대상 키에 대해 기존 서비스로 생성한다', async () => {
    const { svc } = build();
    await svc.createSupplierOfferFromExistingMaster(SUPPLIER_ID, { masterId: MASTER_ID, serviceKeys: ['kpa-society'] });
    expect(state.approvalCalls).toHaveLength(1);
    expect(state.approvalCalls[0]).toEqual(['offer-new', ['kpa-society']]);
  });
});

describe('Offer 유일성 계약 — 변경 0 · 재사용', () => {
  it('live Offer 존재 → OFFER_ALREADY_EXISTS (save 0)', async () => {
    state.existingOffer = { id: 'o1', deletedAt: null };
    const { svc } = build();
    const r = await svc.createSupplierOfferFromExistingMaster(SUPPLIER_ID, { masterId: MASTER_ID });
    expect(r).toMatchObject({ success: false, error: 'OFFER_ALREADY_EXISTS' });
    expect(state.saved).toHaveLength(0);
  });

  it('soft-deleted Offer 존재 → OFFER_IN_RECYCLE_BIN', async () => {
    state.existingOffer = { id: 'o1', deletedAt: new Date('2026-01-01') };
    const { svc } = build();
    const r = await svc.createSupplierOfferFromExistingMaster(SUPPLIER_ID, { masterId: MASTER_ID });
    expect(r).toMatchObject({ success: false, error: 'OFFER_IN_RECYCLE_BIN' });
  });

  it('사전검사 통과 후 INSERT 경쟁 23505(해당 constraint) → OFFER_ALREADY_EXISTS fallback', async () => {
    state.saveImpl = async () => { throw Object.assign(new Error('dup'), { code: '23505', constraint: 'uq_supplier_product_offers_master_supplier' }); };
    const { svc } = build();
    const r = await svc.createSupplierOfferFromExistingMaster(SUPPLIER_ID, { masterId: MASTER_ID });
    expect(r).toMatchObject({ success: false, error: 'OFFER_ALREADY_EXISTS' });
  });

  it('다른 constraint 의 23505 는 그대로 전파한다', async () => {
    state.saveImpl = async () => { throw Object.assign(new Error('slug'), { code: '23505', constraint: 'uq_slug' }); };
    const { svc } = build();
    await expect(svc.createSupplierOfferFromExistingMaster(SUPPLIER_ID, { masterId: MASTER_ID })).rejects.toThrow('slug');
  });
});

describe('DRUG gate — assertDrugOfferAllowed 계약 불변 (완화 없음)', () => {
  beforeEach(() => { state.master = activeMaster({ regulatoryType: 'DRUG' }); });

  it('DRUG + isPublic=true → DRUG_PUBLIC_DISTRIBUTION_FORBIDDEN', async () => {
    const { svc } = build();
    const r = await svc.createSupplierOfferFromExistingMaster(SUPPLIER_ID, {
      masterId: MASTER_ID, isPublic: true, consumerShortDescription: 'd', serviceKeys: ['kpa-society'],
    });
    expect(r).toMatchObject({ success: false, error: 'DRUG_PUBLIC_DISTRIBUTION_FORBIDDEN' });
    expect(state.saved).toHaveLength(0);
  });

  it('DRUG + serviceKeys=[] (PRIVATE draft) → DRUG_SERVICE_CONTEXT_REQUIRED — 완화하지 않는다', async () => {
    const { svc } = build();
    const r = await svc.createSupplierOfferFromExistingMaster(SUPPLIER_ID, { masterId: MASTER_ID, isPublic: false, serviceKeys: [] });
    expect(r).toMatchObject({ success: false, error: 'DRUG_SERVICE_CONTEXT_REQUIRED' });
  });

  it('DRUG + 비약국 serviceKey 포함 → DRUG_NON_PHARMACY_SERVICE', async () => {
    const { svc } = build();
    const r = await svc.createSupplierOfferFromExistingMaster(SUPPLIER_ID, { masterId: MASTER_ID, serviceKeys: ['kpa-society', 'k-cosmetics'] });
    expect(r).toMatchObject({ success: false, error: 'DRUG_NON_PHARMACY_SERVICE' });
  });

  it('DRUG + pharmacy-target serviceKeys 만 → 허용', async () => {
    const { svc } = build();
    const r = await svc.createSupplierOfferFromExistingMaster(SUPPLIER_ID, { masterId: MASTER_ID, serviceKeys: ['kpa-society'] });
    expect(r.success).toBe(true);
    expect((state.saved[0] as Record<string, unknown>).isPublic).toBe(false);
  });

  it('한글 "의약품" Master 도 DRUG 로 판정된다', async () => {
    state.master = activeMaster({ regulatoryType: '의약품' });
    const { svc } = build();
    const r = await svc.createSupplierOfferFromExistingMaster(SUPPLIER_ID, { masterId: MASTER_ID, serviceKeys: [] });
    expect(r).toMatchObject({ success: false, error: 'DRUG_SERVICE_CONTEXT_REQUIRED' });
  });
});

describe('규제 permit — Master 값만 사용', () => {
  const CAT = '33333333-3333-4333-8333-333333333333';

  it('규제 카테고리 + 미검증 + 허가번호 없음 → PERMIT_REQUIRED_FOR_UNVERIFIED_REGULATED', async () => {
    state.master = activeMaster({ regulatoryType: 'HEALTH_FUNCTIONAL', categoryId: CAT });
    state.category = { isRegulated: true };
    const { svc } = build();
    const r = await svc.createSupplierOfferFromExistingMaster(SUPPLIER_ID, { masterId: MASTER_ID, serviceKeys: ['kpa-society'] });
    expect(r).toMatchObject({ success: false, error: 'PERMIT_REQUIRED_FOR_UNVERIFIED_REGULATED' });
  });

  it('규제 카테고리 + MFDS 검증됨 → 통과', async () => {
    state.master = activeMaster({ regulatoryType: 'HEALTH_FUNCTIONAL', categoryId: CAT, isMfdsVerified: true });
    state.category = { isRegulated: true };
    const { svc } = build();
    const r = await svc.createSupplierOfferFromExistingMaster(SUPPLIER_ID, { masterId: MASTER_ID, serviceKeys: ['kpa-society'] });
    expect(r.success).toBe(true);
  });

  it('규제 카테고리 + Master 에 허가번호 있음 → 통과 (공급자 입력 없이)', async () => {
    state.master = activeMaster({ regulatoryType: 'HEALTH_FUNCTIONAL', categoryId: CAT, mfdsPermitNumber: 'P-1' });
    state.category = { isRegulated: true };
    const { svc } = build();
    const r = await svc.createSupplierOfferFromExistingMaster(SUPPLIER_ID, { masterId: MASTER_ID, serviceKeys: ['kpa-society'] });
    expect(r.success).toBe(true);
  });

  it('규제 상품 + 비약국 serviceKey → REGULATED_PRODUCT_NON_PHARMACY_SERVICE (기존 is_regulated 축 유지)', async () => {
    state.master = activeMaster({ regulatoryType: 'HEALTH_FUNCTIONAL', categoryId: CAT, isMfdsVerified: true });
    state.category = { isRegulated: true };
    const { svc } = build();
    const r = await svc.createSupplierOfferFromExistingMaster(SUPPLIER_ID, { masterId: MASTER_ID, serviceKeys: ['k-cosmetics'] });
    expect(r).toMatchObject({ success: false, error: 'REGULATED_PRODUCT_NON_PHARMACY_SERVICE' });
  });
});

describe('(은퇴) 레거시 createSupplierOffer — 공급자 Offer 생성 primitive 는 from-master 하나뿐', () => {
  /**
   * WO-O4O-SUPPLIER-PRODUCT-REGISTRATION-AI-FIRST-CUTOVER-AND-LEGACY-MASTER-RESOLUTION-RETIREMENT-V1 §2.3 · §2.4
   * 기존 기대("masterId 주입 → MASTER_ID_DIRECT_INJECTION_NOT_ALLOWED" · "resolveOrCreateMaster 경유")는
   * 레거시 메서드 자체가 사라져 더 이상 유효하지 않다. 그 자리에 은퇴 계약을 둔다.
   */
  it('NetureOfferService 인스턴스에 createSupplierOffer / validateCreateInput / resolveProductMetadata 가 없다', () => {
    const { svc } = build();
    const anySvc = svc as unknown as Record<string, unknown>;
    expect(typeof anySvc.createSupplierOffer).toBe('undefined');
    expect(typeof anySvc.validateCreateInput).toBe('undefined');
    expect(typeof anySvc.resolveProductMetadata).toBe('undefined');
    expect(typeof anySvc.createSupplierOfferFromExistingMaster).toBe('function');
  });

  it('공급자 Offer 생성 경로 전체에서 CatalogService.resolveOrCreateMaster / updateProductMaster 호출 0 (from-master 정상 생성 후에도)', async () => {
    const { svc, catalogService } = build();
    const r = await svc.createSupplierOfferFromExistingMaster(SUPPLIER_ID, { masterId: MASTER_ID, priceGeneral: 1000 });
    expect(r.success).toBe(true);
    expect(catalogService.resolveOrCreateMaster).not.toHaveBeenCalled();
    expect(catalogService.updateProductMaster).not.toHaveBeenCalled();
    expect(state.saved).toHaveLength(1);
  });
});
