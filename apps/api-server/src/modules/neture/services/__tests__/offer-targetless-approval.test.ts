/**
 * WO-NETURE-PHARMACY-STORE-COMMERCE-REFACTOR-V1 (DESIGN §3-3) — 공급처 미지정(serviceKeys 빈) 제품의 운영자 승인 · 반려
 *
 * OSA 행이 없으면 파생 sync 는 PENDING 을 돌려준다. 승인 · 반려 모두 제품 등록 상태를 직접 기록해야 하며
 * (승인만 처리되면 반려가 "성공" 응답 뒤에도 PENDING 으로 남는다 — Codex review), 반려는 파생 REJECTED 와 같은 cascade 를 한다.
 * DB 없이 AppDataSource 를 fake 로 대체하고 실행된 SQL 을 기록한다.
 */
jest.mock('@o4o/ai-prompts/store', () => ({ PRODUCT_CONTENT_PROMPTS: {} }), { virtual: true });

const state: {
  offer: Record<string, unknown> | null;
  osaRows: Array<{ id: string }>;
  qrQueries: string[];
  committed: number;
  syncCalls: number;
} = { offer: null, osaRows: [], qrQueries: [], committed: 0, syncCalls: 0 };

jest.mock('../../../../database/connection.js', () => ({
  AppDataSource: {
    getRepository: () => ({ findOne: jest.fn(async () => state.offer) }),
    query: async () => [],
    createQueryRunner: () => ({
      startTransaction: async () => undefined,
      commitTransaction: async () => { state.committed += 1; },
      rollbackTransaction: async () => undefined,
      release: async () => undefined,
      query: async (sql: string) => {
        state.qrQueries.push(sql.replace(/\s+/g, ' ').trim());
        if (/FROM offer_service_approvals WHERE offer_id/.test(sql)) return state.osaRows;
        return [];
      },
    }),
    manager: {},
  },
}));
jest.mock('../offer-service-approval.service.js', () => ({
  OfferServiceApprovalService: jest.fn().mockImplementation(() => ({
    syncOfferFromServiceApprovals: jest.fn(async () => {
      state.syncCalls += 1;
      return { previousStatus: 'PENDING', derivedStatus: 'PENDING', autoListedCount: 0 };
    }),
  })),
}));
jest.mock('../../../../utils/logger.js', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

import { NetureOfferService } from '../offer.service.js';

const OFFER_ID = '11111111-1111-4111-8111-111111111111';
const ADMIN_ID = '22222222-2222-4222-8222-222222222222';

function reset(serviceKeys: string[], approvalStatus = 'PENDING') {
  state.offer = { id: OFFER_ID, masterId: 'm-1', isActive: false, approvalStatus, serviceKeys };
  state.osaRows = [];
  state.qrQueries = [];
  state.committed = 0;
  state.syncCalls = 0;
}

describe('공급처 미지정 제품 — 운영자 승인 · 반려', () => {
  const service = new NetureOfferService({} as never);

  it('반려: OSA 파생 sync 없이 REJECTED · 비활성으로 기록하고 product_approvals · listings cascade 를 적용한다', async () => {
    reset([]);
    const r = await service.rejectProduct(OFFER_ID, ADMIN_ID, '자료 부족');
    expect(r).toMatchObject({ success: true, data: { approvalStatus: 'REJECTED', isActive: false } });
    expect(state.syncCalls).toBe(0);
    expect(state.committed).toBe(1);
    expect(state.qrQueries.some((q) => /UPDATE supplier_product_offers SET approval_status = 'REJECTED', is_active = false/.test(q))).toBe(true);
    expect(state.qrQueries.some((q) => /UPDATE product_approvals SET approval_status = 'revoked'/.test(q))).toBe(true);
    expect(state.qrQueries.some((q) => /UPDATE organization_product_listings SET is_active = false/.test(q))).toBe(true);
    expect(state.qrQueries.some((q) => /INSERT INTO offer_service_approvals/.test(q))).toBe(false);
  });

  it('승인한 뒤에도 반려할 수 있다(이미 APPROVED 인 공급처 미지정 제품)', async () => {
    reset([], 'APPROVED');
    const r = await service.rejectProduct(OFFER_ID, ADMIN_ID);
    expect(r).toMatchObject({ success: true, data: { approvalStatus: 'REJECTED' } });
  });

  it('승인: REJECTED 와 대칭으로 APPROVED · 활성을 직접 기록한다', async () => {
    reset([]);
    const r = await service.approveProduct(OFFER_ID, ADMIN_ID);
    expect(r).toMatchObject({ success: true, data: { approvalStatus: 'APPROVED', isActive: true } });
    expect(state.syncCalls).toBe(0);
  });

  it('공급처가 지정된 제품은 기존 OSA 파생 경로 그대로', async () => {
    reset(['kpa-society']);
    await service.rejectProduct(OFFER_ID, ADMIN_ID);
    expect(state.qrQueries.some((q) => /INSERT INTO offer_service_approvals/.test(q))).toBe(true);
    expect(state.syncCalls).toBe(1);
  });
});
