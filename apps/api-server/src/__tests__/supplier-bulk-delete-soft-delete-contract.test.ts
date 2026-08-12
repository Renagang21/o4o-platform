/**
 * WO-O4O-NETURE-SUPPLIER-DELETE-POLICY-AND-REVIEW-ROUNDTRIP-BATCH-V1 — regression guard
 *
 * 배경: 공급자 일괄 삭제가 `offerRepo.remove()` = hard delete 였다.
 *   supplier_product_offers 를 참조하는 FK 5개가 전부 ON DELETE CASCADE 이므로
 *   (organization_product_listings / service_products / offer_service_approvals /
 *    product_approvals / offer_service_prices)
 *   공급자의 클릭 한 번이 매장 진열과 운영자 승인 이력까지 지웠고 복구가 불가능했다.
 *   운영자 정책(operator-product-cleanup.controller)은 이미 soft delete + 휴지통 + 복원이고,
 *   hard delete 는 "활성 listing/service_products 없음" 가드가 걸려 있었다.
 *
 * 새 계약: 공급자 삭제 = soft delete + 운영자 hard-delete 와 동일한 가드.
 *
 * DB 없이 service 메서드의 분기만 검증한다.
 */
import 'reflect-metadata';

jest.mock('@o4o/ai-prompts/store', () => ({ PRODUCT_CONTENT_PROMPTS: {} }), { virtual: true });
jest.mock('../modules/neture/guards/drug-access.guard.js', () => ({
  assertDrugOfferAllowed: jest.fn(async () => ({ allowed: true })),
}));
jest.mock('../utils/auto-listing.utils.js', () => ({
  autoExpandPublicProduct: jest.fn(async () => 0),
}));

const queryMock = jest.fn();
jest.mock('../database/connection.js', () => ({
  AppDataSource: { query: (...args: unknown[]) => queryMock(...args) },
}));

import { NetureOfferService } from '../modules/neture/services/offer.service.js';

/** listing/serviceProduct 카운트를 흉내낸다. */
function mockCounts({ listings = 0, serviceProducts = 0 }) {
  queryMock.mockImplementation(async (sql: string) => {
    if (sql.includes('organization_product_listings')) return [{ cnt: listings }];
    if (sql.includes('service_products')) return [{ cnt: serviceProducts }];
    return [];
  });
}

function withOffers(rows: Array<{ id: string; supplierId: string }>) {
  const svc = Object.create(NetureOfferService.prototype) as any;
  const updated: Array<{ id: string; patch: Record<string, unknown> }> = [];
  const softDeleted: string[] = [];
  const removed: string[] = [];
  Object.defineProperty(svc, 'offerRepo', {
    value: {
      find: async () => rows,
      update: async (id: string, patch: Record<string, unknown>) => { updated.push({ id, patch }); },
      softDelete: async (id: string) => { softDeleted.push(id); },
      remove: async (o: { id: string }) => { removed.push(o.id); },
    },
    configurable: true,
  });
  return { svc, updated, softDeleted, removed };
}

beforeEach(() => queryMock.mockReset());

describe('bulkDeleteOffers — 공급자 삭제는 soft delete 다', () => {
  it('연결 데이터가 없으면 soft delete 하고 hard delete 는 하지 않는다', async () => {
    mockCounts({});
    const { svc, updated, softDeleted, removed } = withOffers([{ id: 'offer-1', supplierId: 'sup-1' }]);
    const r = await svc.bulkDeleteOffers('sup-1', ['offer-1'], 'user-1');

    expect(r).toMatchObject({ deleted: 1, failed: [] });
    expect(softDeleted).toEqual(['offer-1']);
    expect(removed).toEqual([]); // hard delete 금지 — CASCADE 로 매장 진열/승인 이력이 사라진다
  });

  it('soft delete 시 운영자 휴지통 컬럼(deleted_by/delete_reason)과 is_active=false 를 함께 쓴다', async () => {
    mockCounts({});
    const { svc, updated } = withOffers([{ id: 'offer-1', supplierId: 'sup-1' }]);
    await svc.bulkDeleteOffers('sup-1', ['offer-1'], 'user-1');

    expect(updated[0].patch).toMatchObject({
      isActive: false,
      deletedBy: 'user-1',
      deleteReason: 'SUPPLIER_DELETE',
    });
  });

  it('매장에 활성 진열이 남아 있으면 삭제하지 않고 HAS_ACTIVE_LISTINGS 로 거부한다', async () => {
    mockCounts({ listings: 2 });
    const { svc, softDeleted } = withOffers([{ id: 'offer-1', supplierId: 'sup-1' }]);
    const r = await svc.bulkDeleteOffers('sup-1', ['offer-1'], 'user-1');

    expect(r.deleted).toBe(0);
    expect(r.failed).toEqual([{ id: 'offer-1', error: 'HAS_ACTIVE_LISTINGS' }]);
    expect(softDeleted).toEqual([]);
  });

  it('서비스 상품으로 연결돼 있으면 HAS_SERVICE_PRODUCTS 로 거부한다', async () => {
    mockCounts({ serviceProducts: 1 });
    const { svc, softDeleted } = withOffers([{ id: 'offer-1', supplierId: 'sup-1' }]);
    const r = await svc.bulkDeleteOffers('sup-1', ['offer-1'], 'user-1');

    expect(r.failed).toEqual([{ id: 'offer-1', error: 'HAS_SERVICE_PRODUCTS' }]);
    expect(softDeleted).toEqual([]);
  });

  it('소유하지 않았거나 이미 철회된 id 는 NOT_FOUND_OR_NOT_OWNED 로 남는다', async () => {
    mockCounts({});
    const { svc } = withOffers([{ id: 'offer-1', supplierId: 'sup-1' }]);
    const r = await svc.bulkDeleteOffers('sup-1', ['offer-1', 'offer-x'], 'user-1');

    expect(r.deleted).toBe(1);
    expect(r.failed).toEqual([{ id: 'offer-x', error: 'NOT_FOUND_OR_NOT_OWNED' }]);
  });

  it('일부만 막혀도 나머지는 삭제한다 (건별 판정)', async () => {
    queryMock.mockImplementation(async (sql: string, params: unknown[]) => {
      if (sql.includes('organization_product_listings')) {
        return [{ cnt: params[0] === 'offer-blocked' ? 1 : 0 }];
      }
      return [{ cnt: 0 }];
    });
    const { svc, softDeleted } = withOffers([
      { id: 'offer-ok', supplierId: 'sup-1' },
      { id: 'offer-blocked', supplierId: 'sup-1' },
    ]);
    const r = await svc.bulkDeleteOffers('sup-1', ['offer-ok', 'offer-blocked'], 'user-1');

    expect(r.deleted).toBe(1);
    expect(softDeleted).toEqual(['offer-ok']);
    expect(r.failed).toEqual([{ id: 'offer-blocked', error: 'HAS_ACTIVE_LISTINGS' }]);
  });
});
