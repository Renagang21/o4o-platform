/**
 * WO-O4O-CROSSSERVICE-B2B-CHECKOUT-CONFIRM-SERVICE-AGNOSTIC-ADOPTION-V1 (결함 O1 · §9 · §32)
 *
 * cart write 경계 — `POST /store/cart/:serviceKey/items` 의 `organizationId` 는
 * 클라이언트가 보낸 값이다. 예전에는 검증 없이 저장됐고 confirm 이 그것을 주문 소유 축으로
 * 승격했다. 이제 **담는 시점에** 서버가 소속을 검증한다.
 *
 * canonical: client organizationId = 선택값 / server validation = 권위.
 */
import { StoreCartService, CartError } from '../store-cart.service.js';

jest.mock('../../../modules/neture/guards/drug-commerce.guard.js', () => ({
  assertNoDrugInCommerce: jest.fn(async () => ({ allowed: true })),
  toCommerceRefFromCartItem: (x: any) => x,
  DrugCommerceErrorCode: { DRUG_COMMERCE_BLOCKED: 'DRUG_COMMERCE_BLOCKED' },
}));

const candidates: Array<{ organizationId: string }> = [];
jest.mock('../../../utils/store-organization.resolver.js', () => ({
  findStoreOrganizationCandidates: jest.fn(async () => candidates),
  findAnyServiceStoreOrganizationCandidates: jest.fn(async () => candidates),
}));

function makeService() {
  const saved: any[] = [];
  const dataSource = {
    getRepository: () => ({
      create: (x: any) => x,
      save: jest.fn(async (x: any) => {
        saved.push(x);
        return { id: 'cart-1', ...x };
      }),
    }),
    query: jest.fn(async () => []),
  } as any;
  return { service: new StoreCartService(dataSource), saved };
}

const scope = { buyerId: 'buyer-1', serviceKey: 'glycopharm' };
const input = {
  productName: '공급상품 A',
  sourceType: 'b2b' as const,
  supplierProductOfferId: 'offer-1',
  quantity: 1,
  priceSnapshot: 30000,
};

beforeEach(() => {
  candidates.length = 0;
  candidates.push({ organizationId: 'org-mine' });
});

describe('cart 담기 시점의 매장 조직 검증', () => {
  it('조직을 지정하지 않으면 그대로 통과한다 (기존 흐름 보존)', async () => {
    const { service, saved } = makeService();
    await service.add(scope, input);
    expect(saved[0].organizationId).toBeNull();
  });

  it('접근 가능한 조직은 저장된다', async () => {
    const { service, saved } = makeService();
    await service.add(scope, { ...input, organizationId: 'org-mine' });
    expect(saved[0].organizationId).toBe('org-mine');
  });

  it('타인 조직 id 는 cart 에 들어가지 못한다 (403)', async () => {
    const { service, saved } = makeService();
    await expect(
      service.add(scope, { ...input, organizationId: 'org-victim' }),
    ).rejects.toMatchObject({ code: 'FOREIGN_STORE_ORGANIZATION', status: 403 });
    expect(saved).toHaveLength(0);
  });

  it('접근 가능한 조직이 하나도 없으면 어떤 조직도 지정할 수 없다', async () => {
    candidates.length = 0;
    const { service } = makeService();
    await expect(
      service.add(scope, { ...input, organizationId: 'org-mine' }),
    ).rejects.toBeInstanceOf(CartError);
  });
});
