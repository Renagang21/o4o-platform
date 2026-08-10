/**
 * WO-O4O-DRUG-COMMERCE-ABSOLUTE-BLOCK-V1
 *
 * 의약품(DRUG) **거래**(장바구니 담기 / 수량 변경 / 주문 생성) 절대 차단의 보안 회귀 테스트.
 *
 * `drug-access-gate.spec.ts`(유입 축)와 목적이 다르다 —
 *   유입 축: 약국 대상 서비스면 **허용**
 *   거래 축(본 스펙): 서비스·역할·운영자 **예외 없이 거부**
 *
 * 판정 SSOT 는 `product_masters.regulatory_type` 이며, 상품 참조는 서버에서만 해석한다
 * (요청이 자기 신고한 필드를 신뢰하지 않는다).
 */

// checkout.service 가 잡는 AppDataSource 를 테스트용 stub 으로 대체한다.
// (실제 DB 연결 없이 createOrder 의 차단 지점을 그대로 통과시키기 위함)
const savedOrders: any[] = [];
const orderLogs: any[] = [];

jest.mock('../../database/connection.js', () => ({
  AppDataSource: {
    isInitialized: true,
    initialize: jest.fn(async () => undefined),
    query: jest.fn(async (sql: string, params: any[] = []) => fakeQuery(sql, params)),
    getRepository: jest.fn((entity: any) => {
      const name = typeof entity === 'function' ? entity.name : String(entity);
      return {
        create: (v: any) => ({ ...v, id: `${name}-${savedOrders.length + 1}` }),
        save: async (v: any) => {
          if (name === 'OrderLog') orderLogs.push(v);
          else savedOrders.push(v);
          return v;
        },
      };
    }),
  },
}));

import type { DataSource } from 'typeorm';
import {
  assertNoDrugInCommerce,
  toCommerceRefFromCartItem,
  toCommerceRefFromOrderItem,
  DrugCommerceErrorCode,
  DrugCommerceBlockedError,
} from '../../modules/neture/guards/drug-commerce.guard.js';
import { StoreCartService, CartError } from '../../services/cart/store-cart.service.js';
import { checkoutService } from '../../services/checkout.service.js';

// ── 고정 픽스처 ─────────────────────────────────────────────────────────────
const MASTER_DRUG = '11111111-1111-4111-8111-111111111111'; // regulatory_type='DRUG'
const MASTER_DRUG_KO = '11111111-1111-4111-8111-111111111112'; // regulatory_type='의약품'
const MASTER_HFF = '22222222-2222-4222-8222-222222222222'; // 건강기능식품
const MASTER_QUASI = '22222222-2222-4222-8222-222222222223'; // QUASI_DRUG (의약외품)
const MASTER_DEVICE = '22222222-2222-4222-8222-222222222224'; // MEDICAL_DEVICE

const OFFER_DRUG = '33333333-3333-4333-8333-333333333331'; // → MASTER_DRUG
const OFFER_HFF = '33333333-3333-4333-8333-333333333332'; // → MASTER_HFF

const OPL_DRUG_MASTER = '44444444-4444-4444-8444-444444444441'; // master_id=MASTER_DRUG
const OPL_HFF_MASTER = '44444444-4444-4444-8444-444444444442'; // master_id=MASTER_HFF
const OPL_VIA_OFFER_DRUG = '44444444-4444-4444-8444-444444444443'; // master_id=NULL, offer_id=OFFER_DRUG

const MISSING_ID = '99999999-9999-4999-8999-999999999999'; // 어느 축에도 없음

const MASTER_TYPE: Record<string, string> = {
  [MASTER_DRUG]: 'DRUG',
  [MASTER_DRUG_KO]: '의약품',
  [MASTER_HFF]: '건강기능식품',
  [MASTER_QUASI]: 'QUASI_DRUG',
  [MASTER_DEVICE]: 'MEDICAL_DEVICE',
};

const OFFER_MASTER: Record<string, string> = {
  [OFFER_DRUG]: MASTER_DRUG,
  [OFFER_HFF]: MASTER_HFF,
};

const OPL_ROW: Record<string, { masterId: string | null; offerId: string | null }> = {
  [OPL_DRUG_MASTER]: { masterId: MASTER_DRUG, offerId: null },
  [OPL_HFF_MASTER]: { masterId: MASTER_HFF, offerId: null },
  [OPL_VIA_OFFER_DRUG]: { masterId: null, offerId: OFFER_DRUG },
};

let queryFails = false;

/** 가드가 보내는 4축 UNION 조회를 픽스처로 재현한다 */
function fakeQuery(sql: string, params: any[] = []): any[] {
  if (!/WITH refs AS/.test(sql)) return [];
  if (queryFails) throw new Error('resolve query failed');

  const ids: string[] = (params[0] as string[]) || [];
  const rows: Array<{ ref: string; master_id: string; regulatory_type: string | null }> = [];
  const push = (ref: string, masterId: string | null | undefined) => {
    if (!masterId || !(masterId in MASTER_TYPE)) return;
    const row = { ref, master_id: masterId, regulatory_type: MASTER_TYPE[masterId] };
    // UNION 은 중복 행을 접는다
    if (!rows.some((r) => r.ref === row.ref && r.master_id === row.master_id)) rows.push(row);
  };

  for (const ref of ids) {
    push(ref, ref in MASTER_TYPE ? ref : null); // ① master 직접
    push(ref, OFFER_MASTER[ref]); // ② offer → master
    const opl = OPL_ROW[ref];
    if (opl) {
      push(ref, opl.masterId); // ③ OPL.master_id
      if (opl.offerId) push(ref, OFFER_MASTER[opl.offerId]); // ④ OPL → offer → master
    }
  }
  return rows;
}

function makeExecutor(): DataSource {
  return { query: async (sql: string, params: any[] = []) => fakeQuery(sql, params) } as any;
}

/** cart 항목 1건 판정 헬퍼 */
async function gateCartItem(item: Parameters<typeof toCommerceRefFromCartItem>[0]) {
  return assertNoDrugInCommerce(makeExecutor(), [toCommerceRefFromCartItem(item)]);
}

// ── StoreCartService stub DataSource ────────────────────────────────────────
function makeCartService(existing: any[] = []) {
  const saved: any[] = [];
  const dataSource = {
    getRepository: () => ({
      create: (v: any) => ({ ...v, id: 'cart-new' }),
      save: async (v: any) => {
        saved.push(v);
        return v;
      },
      findOne: async ({ where }: any) => existing.find((e) => e.id === where.id) ?? null,
      find: async () => existing,
      delete: async () => ({ affected: 1 }),
    }),
    query: async (sql: string, params: any[] = []) => fakeQuery(sql, params),
  } as any;
  return { service: new StoreCartService(dataSource), saved };
}

const SCOPE = { buyerId: 'buyer-1', serviceKey: 'neture' };

beforeEach(() => {
  queryFails = false;
  savedOrders.length = 0;
  orderLogs.length = 0;
});

// ════════════════════════════════════════════════════════════════════════════
describe('drug-commerce.guard — 의약품 거래 절대 차단', () => {
  it('[1] ProductMaster 직접 참조가 의약품이면 담기가 거부된다', async () => {
    const { service } = makeCartService();
    await expect(
      service.add(SCOPE, { productName: '의약품 A', productMasterId: MASTER_DRUG }),
    ).rejects.toMatchObject({ code: DrugCommerceErrorCode.DRUG_COMMERCE_FORBIDDEN });
  });

  it('[2] SupplierProductOffer 참조가 의약품 master 를 가리키면 거부된다', async () => {
    const r = await gateCartItem({ productName: 'offer', supplierProductOfferId: OFFER_DRUG });
    expect(r.allowed).toBe(false);
    expect(r.code).toBe(DrugCommerceErrorCode.DRUG_COMMERCE_FORBIDDEN);
  });

  it('[3] OrganizationProductListing(master_id 축)이 의약품이면 거부된다', async () => {
    const r = await gateCartItem({
      productName: 'listing',
      organizationProductListingId: OPL_DRUG_MASTER,
    });
    expect(r.allowed).toBe(false);
    expect(r.code).toBe(DrugCommerceErrorCode.DRUG_COMMERCE_FORBIDDEN);
  });

  it('[4] OPL → offer → master 경유(master_id=NULL)도 의약품으로 해석해 거부한다', async () => {
    const r = await gateCartItem({
      productName: 'listing via offer',
      organizationProductListingId: OPL_VIA_OFFER_DRUG,
    });
    expect(r.allowed).toBe(false);
    expect(r.code).toBe(DrugCommerceErrorCode.DRUG_COMMERCE_FORBIDDEN);
  });

  it('[5] regulatory_type 한글 표기(의약품)도 동일하게 거부된다', async () => {
    const r = await gateCartItem({ productName: 'ko', productMasterId: MASTER_DRUG_KO });
    expect(r.allowed).toBe(false);
    expect(r.code).toBe(DrugCommerceErrorCode.DRUG_COMMERCE_FORBIDDEN);
  });

  it('[6] 약국 대상 서비스(kpa-society · pharmacy-hub · glycopharm)에서도 거부된다 — 서비스 예외 없음', async () => {
    for (const serviceKey of ['kpa-society', 'pharmacy-hub', 'glycopharm']) {
      const { service } = makeCartService();
      await expect(
        service.add(
          { buyerId: 'buyer-1', serviceKey },
          { productName: '의약품 A', productMasterId: MASTER_DRUG },
        ),
      ).rejects.toMatchObject({ code: DrugCommerceErrorCode.DRUG_COMMERCE_FORBIDDEN });
    }
  });

  it('[7] 판정 입력에 role·serviceKey·organizationId 가 없다 — 역할/운영자 우회 표면 자체가 없다', async () => {
    // 어떤 부가 문맥을 넣어도 결과가 같다(가드가 그 값을 아예 받지 않으므로).
    const asOperator = await assertNoDrugInCommerce(makeExecutor(), [
      {
        label: 'operator context',
        productMasterId: MASTER_DRUG,
        // @ts-expect-error — 가드 계약에 role/serviceKey 입력이 존재하지 않음을 컴파일 타임에 고정
        role: 'operator',
        serviceKey: 'kpa-society',
      },
    ]);
    expect(asOperator.allowed).toBe(false);
    expect(asOperator.code).toBe(DrugCommerceErrorCode.DRUG_COMMERCE_FORBIDDEN);
  });

  it('[8] 비의약품(건강기능식품 · 의약외품 · 의료기기)은 기존대로 통과한다', async () => {
    for (const masterId of [MASTER_HFF, MASTER_QUASI, MASTER_DEVICE]) {
      const r = await gateCartItem({ productName: '비의약품', productMasterId: masterId });
      expect(r.allowed).toBe(true);
    }
    const { service, saved } = makeCartService();
    const item = await service.add(SCOPE, {
      productName: '건강기능식품 A',
      productMasterId: MASTER_HFF,
      supplierProductOfferId: OFFER_HFF,
      quantity: 2,
      priceSnapshot: 10000,
    });
    expect(item.quantity).toBe(2);
    expect(saved).toHaveLength(1);
  });

  it('[9] 상품 참조가 하나도 없으면 거부된다 (식별 불가 = 비의약품 증명 불가)', async () => {
    const { service, saved } = makeCartService();
    await expect(service.add(SCOPE, { productName: '이름만 있는 항목' })).rejects.toMatchObject({
      code: DrugCommerceErrorCode.DRUG_COMMERCE_PRODUCT_UNRESOLVED,
    });
    expect(saved).toHaveLength(0);
  });

  it('[10] UUID 형식이 아닌 참조는 거부된다', async () => {
    const r = await gateCartItem({ productName: 'bad', productMasterId: 'not-a-uuid' });
    expect(r.allowed).toBe(false);
    expect(r.code).toBe(DrugCommerceErrorCode.DRUG_COMMERCE_PRODUCT_UNRESOLVED);
  });

  it('[11] 어느 축에서도 해석되지 않는 참조는 거부된다', async () => {
    const r = await gateCartItem({ productName: 'missing', supplierProductOfferId: MISSING_ID });
    expect(r.allowed).toBe(false);
    expect(r.code).toBe(DrugCommerceErrorCode.DRUG_COMMERCE_PRODUCT_UNRESOLVED);
  });

  it('[12] 다형 참조가 서로 다른 ProductMaster 를 가리키면 거부된다', async () => {
    const r = await gateCartItem({
      productName: 'conflict',
      productMasterId: MASTER_HFF, // 자기 신고는 건강기능식품
      supplierProductOfferId: OFFER_HFF,
      organizationProductListingId: OPL_HFF_MASTER,
      eventOfferId: MASTER_QUASI, // 실제로는 다른 master
    });
    expect(r.allowed).toBe(false);
    expect(r.code).toBe(DrugCommerceErrorCode.DRUG_COMMERCE_REFERENCE_CONFLICT);
  });

  it('[13] 해석 조회가 실패하면 전량 거부된다 (fail-closed)', async () => {
    queryFails = true;
    const r = await gateCartItem({ productName: 'hff', productMasterId: MASTER_HFF });
    expect(r.allowed).toBe(false);
    expect(r.code).toBe(DrugCommerceErrorCode.DRUG_COMMERCE_PRODUCT_UNRESOLVED);
  });
});

describe('CheckoutService.createOrder — 주문 경로 차단', () => {
  const baseDto = {
    buyerId: 'buyer-1',
    sellerId: 'seller-1',
    supplierId: 'supplier-1',
  };

  it('[14] 비의약품 주문은 생성되고, 의약품이 1건이라도 섞이면 주문 전체가 거부된다', async () => {
    // 통제군 — 비의약품만
    await checkoutService.createOrder({
      ...baseDto,
      items: [
        {
          productId: OFFER_HFF,
          productName: '건강기능식품 A',
          quantity: 1,
          unitPrice: 10000,
          subtotal: 10000,
        },
      ],
    } as any);
    expect(savedOrders).toHaveLength(1);

    // 혼합 주문 — 비의약품 + 의약품 (통제군의 흔적을 지우고 다시 관측)
    savedOrders.length = 0;
    orderLogs.length = 0;
    await expect(
      checkoutService.createOrder({
        ...baseDto,
        items: [
          {
            productId: OFFER_HFF,
            productName: '건강기능식품 A',
            quantity: 1,
            unitPrice: 10000,
            subtotal: 10000,
          },
          {
            productId: OFFER_DRUG,
            productName: '의약품 B',
            quantity: 1,
            unitPrice: 5000,
            subtotal: 5000,
          },
        ],
      } as any),
    ).rejects.toBeInstanceOf(DrugCommerceBlockedError);

    // 부분 주문도 로그도 남지 않는다
    expect(savedOrders).toHaveLength(0);
    expect(orderLogs).toHaveLength(0);
  });

  it('[15] metadata 자기 신고가 비의약품이어도 productId 가 의약품이면 차단된다', async () => {
    await expect(
      checkoutService.createOrder({
        ...baseDto,
        items: [
          {
            productId: MASTER_DRUG, // 실제 상품 = 의약품
            productName: '건강기능식품으로 위장',
            quantity: 1,
            unitPrice: 1000,
            subtotal: 1000,
            metadata: { supplierProductOfferId: OFFER_HFF }, // 자기 신고 = 비의약품
          },
        ],
      } as any),
    ).rejects.toBeInstanceOf(DrugCommerceBlockedError);
    expect(savedOrders).toHaveLength(0);

    // 참조 매핑 자체도 두 축을 모두 대조한다
    const ref = toCommerceRefFromOrderItem({
      productId: MASTER_DRUG,
      productName: 'x',
      metadata: { supplierProductOfferId: OFFER_HFF },
    });
    expect(ref.supplierProductOfferId).toBe(OFFER_HFF);
    expect(ref.ambiguousIds).toContain(MASTER_DRUG);
  });
});

describe('StoreCartService.update — 기존 항목 재판정', () => {
  it('[16] 게이트 도입 전에 담긴 의약품 항목은 수량 변경으로도 되살아나지 않는다', async () => {
    const legacyDrugItem = {
      id: 'legacy-drug',
      buyerId: SCOPE.buyerId,
      serviceKey: SCOPE.serviceKey,
      productName: '레거시 의약품',
      productMasterId: MASTER_DRUG,
      supplierProductOfferId: null,
      organizationProductListingId: null,
      eventOfferId: null,
      quantity: 1,
    };
    const legacyHffItem = { ...legacyDrugItem, id: 'legacy-hff', productMasterId: MASTER_HFF };

    const { service, saved } = makeCartService([legacyDrugItem, legacyHffItem]);

    await expect(service.update(SCOPE, 'legacy-drug', { quantity: 5 })).rejects.toMatchObject({
      code: DrugCommerceErrorCode.DRUG_COMMERCE_FORBIDDEN,
    });
    expect(saved).toHaveLength(0);
    expect(legacyDrugItem.quantity).toBe(1); // 저장 전 차단 — 수량 변경 없음

    // 비의약품 항목은 기존대로 수정된다
    const updated = await service.update(SCOPE, 'legacy-hff', { quantity: 5 });
    expect(updated.quantity).toBe(5);
    expect(saved).toHaveLength(1);
  });

  it('CartError 는 의약품 차단에 한해 403 을 갖는다 (기존 코드의 상태 매핑 불변)', async () => {
    const { service } = makeCartService();
    const err = await service
      .add(SCOPE, { productName: '의약품 A', productMasterId: MASTER_DRUG })
      .catch((e) => e);
    expect(err).toBeInstanceOf(CartError);
    expect((err as CartError).status).toBe(403);

    const validationErr = await service
      .add(SCOPE, { productName: '', productMasterId: MASTER_HFF })
      .catch((e) => e);
    expect((validationErr as CartError).code).toBe('VALIDATION_ERROR');
    expect((validationErr as CartError).status).toBeUndefined();
  });
});
