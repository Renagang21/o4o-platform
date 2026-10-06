/**
 * WO-NETURE-PHARMACY-STORE-COMMERCE-REFACTOR-V1 (DESIGN §16-5 결정) — 공급자 opt-in(pharmacy-hub) 폐지
 *
 * - 새 제공 시작은 받지 않는다(일반가 = 기본 공급, 별도 단가 = 공급 제안).
 * - opt-in 키만 남은 상품에서 키를 지우면 service_keys 가 비어 Neture 약국 기본 공급으로 판정되므로 막는다
 *   (PH 설정 제거만으로 공급 범위가 넓어지지 않는다).
 * - 다른 키가 남는 제공 중지는 종전대로 그 키만 제거한다.
 * DB 없이 AppDataSource 를 fake 로 대체하고 실행된 SQL 을 기록한다.
 */
jest.mock('@o4o/ai-prompts/store', () => ({ PRODUCT_CONTENT_PROMPTS: {} }), { virtual: true });

const state: { row: Record<string, unknown> | null; qrQueries: Array<{ sql: string; params?: unknown[] }> } = {
  row: null,
  qrQueries: [],
};

jest.mock('../../../../database/connection.js', () => ({
  AppDataSource: {
    getRepository: () => ({ findOne: jest.fn(async () => null) }),
    query: async () => (state.row ? [state.row] : []),
    createQueryRunner: () => ({
      connect: async () => undefined,
      startTransaction: async () => undefined,
      commitTransaction: async () => undefined,
      rollbackTransaction: async () => undefined,
      release: async () => undefined,
      query: async (sql: string, params?: unknown[]) => {
        state.qrQueries.push({ sql: sql.replace(/\s+/g, ' ').trim(), params });
        return [];
      },
    }),
    manager: {},
  },
}));
jest.mock('../../../../utils/logger.js', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

import { NetureOfferService } from '../offer.service.js';

const OFFER_ID = '11111111-1111-4111-8111-111111111111';
const SUPPLIER_ID = '33333333-3333-4333-8333-333333333333';

function reset(serviceKeys: string[]) {
  state.row = {
    id: OFFER_ID,
    supplier_id: SUPPLIER_ID,
    is_public: false,
    service_keys: serviceKeys,
    is_regulated: false,
    master_id: 'm-1',
    regulatory_type: null,
  };
  state.qrQueries = [];
}

const updates = () => state.qrQueries.filter((q) => /UPDATE supplier_product_offers/.test(q.sql));

describe('공급자 opt-in(pharmacy-hub) 폐지', () => {
  const service = new NetureOfferService({} as never);

  it('미제공 상품의 새 제공 시작은 SUPPLIER_OPTIN_RETIRED 로 거부하고 아무것도 쓰지 않는다', async () => {
    reset([]);
    const r = await service.setServiceDelivery(OFFER_ID, SUPPLIER_ID, 'pharmacy-hub', { enabled: true, unitPrice: 1000 });
    expect(r).toMatchObject({ success: false, error: 'SUPPLIER_OPTIN_RETIRED' });
    expect(state.qrQueries).toHaveLength(0);
  });

  it('pharmacy-hub 만 남은 상품의 제공 중지는 기본 공급 노출을 막기 위해 거부한다(service_keys 불변)', async () => {
    reset(['pharmacy-hub']);
    const r = await service.setServiceDelivery(OFFER_ID, SUPPLIER_ID, 'pharmacy-hub', { enabled: false });
    expect(r).toMatchObject({ success: false, error: 'OPTIN_STOP_WOULD_EXPOSE_DEFAULT_SUPPLY' });
    expect(updates()).toHaveLength(0);
  });

  it('다른 키가 남는 제공 중지는 pharmacy-hub 만 제거한다', async () => {
    reset(['kpa-society', 'pharmacy-hub']);
    const r = await service.setServiceDelivery(OFFER_ID, SUPPLIER_ID, 'pharmacy-hub', { enabled: false });
    expect(r).toMatchObject({ success: true, data: { serviceKeys: ['kpa-society'], changed: true } });
    expect(updates()).toHaveLength(1);
    expect(updates()[0].params?.[1]).toEqual(['kpa-society']);
  });

  it('타 공급자 상품은 종전대로 NOT_OWNED', async () => {
    reset(['pharmacy-hub']);
    const r = await service.setServiceDelivery(OFFER_ID, 'other-supplier', 'pharmacy-hub', { enabled: false });
    expect(r).toMatchObject({ success: false, error: 'NOT_OWNED' });
  });
});
