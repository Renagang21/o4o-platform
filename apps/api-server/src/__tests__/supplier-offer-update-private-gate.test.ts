/**
 * WO-O4O-NETURE-SUPPLIER-OFFER-UPDATE-PRIVATE-GATE-FIX-V1 — regression guard
 *
 * 배경: createSupplierOffer 는 신규 등록을 항상
 *   isPublic:false + serviceKeys:[] + allowedSellerIds:[] (= PRIVATE, UI 의 "내부 상품") 로 만든다.
 *   그런데 updateSupplierOffer 는 "PRIVATE + sellerIds 비어있음" 이면 **모든** 수정을 거부했다
 *   (PRIVATE_REQUIRES_SELLER_IDS). 결과적으로 신규 등록 상품은 공급 방식을 설정하기 전까지
 *   가격·설명·재고 무엇도 저장할 수 없었다 (CHECK-…-PRODUCT-CREATION-AND-DESCRIPTION-WRITE-SMOKE… §4).
 *
 * 수정 계약: 게이트는 **유통 축을 실제로 바꾸거나 상품을 활성화하는 요청**에만 적용한다.
 *   노출·거래 차단은 소비 경로의 `distribution_type <> 'PRIVATE' OR $x = ANY(allowed_seller_ids)`
 *   필터가 이미 보장하므로, 순수 정보 수정을 막을 이유가 없다.
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

import { NetureOfferService } from '../modules/neture/services/offer.service.js';

type OfferRow = {
  id: string;
  supplierId: string;
  masterId: string;
  isActive: boolean;
  isPublic: boolean;
  isFeatured: boolean;
  serviceKeys: string[];
  allowedSellerIds: string[];
  distributionType: string;
  priceGeneral: number;
  consumerShortDescription: string | null;
};

/** 신규 등록 직후 상태 = 내부 상품(PRIVATE) · 판매자 미지정 · 비활성 */
function newlyRegisteredOffer(over: Partial<OfferRow> = {}): OfferRow {
  return {
    id: 'offer-1',
    supplierId: 'sup-1',
    masterId: 'master-1',
    isActive: false,
    isPublic: false,
    isFeatured: false,
    serviceKeys: [],
    allowedSellerIds: [],
    distributionType: 'PRIVATE',
    priceGeneral: 1000,
    consumerShortDescription: null,
    ...over,
  };
}

function withOffer(row: OfferRow) {
  const svc = Object.create(NetureOfferService.prototype) as any;
  const saved: OfferRow[] = [];
  Object.defineProperty(svc, 'offerRepo', {
    value: {
      findOne: async () => row,
      save: async (o: OfferRow) => {
        saved.push({ ...o });
        return o;
      },
    },
    configurable: true,
  });
  return { svc, saved };
}

describe('updateSupplierOffer — PRIVATE + 판매자 미지정 게이트 적용 범위', () => {
  it('신규 등록 직후 내부 상품도 가격 수정을 저장할 수 있다 (회귀의 핵심)', async () => {
    const { svc, saved } = withOffer(newlyRegisteredOffer());
    const r = await svc.updateSupplierOffer('offer-1', 'sup-1', { priceGeneral: 1100 });
    expect(r.success).toBe(true);
    expect(saved[0].priceGeneral).toBe(1100);
  });

  it('프론트가 변경 없는 isPublic:false 를 함께 보내도 통과한다', async () => {
    const { svc } = withOffer(newlyRegisteredOffer());
    const r = await svc.updateSupplierOffer('offer-1', 'sup-1', {
      priceGeneral: 1100,
      isPublic: false,
      isActive: false,
      consumerShortDescription: '<p>설명</p>',
    });
    expect(r.success).toBe(true);
  });

  it('판매자 미지정 내부 상품을 활성화하려 하면 거부한다', async () => {
    const { svc } = withOffer(newlyRegisteredOffer());
    const r = await svc.updateSupplierOffer('offer-1', 'sup-1', { isActive: true });
    expect(r).toMatchObject({ success: false, error: 'PRIVATE_REQUIRES_SELLER_IDS' });
  });

  it('판매자 목록을 비우는 변경은 거부한다', async () => {
    const { svc } = withOffer(newlyRegisteredOffer({ allowedSellerIds: ['seller-1'], isActive: true }));
    const r = await svc.updateSupplierOffer('offer-1', 'sup-1', { allowedSellerIds: [] });
    expect(r).toMatchObject({ success: false, error: 'PRIVATE_REQUIRES_SELLER_IDS' });
  });

  it('이미 활성인 내부 상품의 정보 수정은 통과한다 (레거시 데이터)', async () => {
    const { svc, saved } = withOffer(newlyRegisteredOffer({ isActive: true }));
    const r = await svc.updateSupplierOffer('offer-1', 'sup-1', { stockQuantity: 5 });
    expect(r.success).toBe(true);
    expect(saved).toHaveLength(1);
  });

  it('전체 공개로 전환하면 PRIVATE 이 아니므로 게이트에 걸리지 않는다', async () => {
    const { svc, saved } = withOffer(newlyRegisteredOffer());
    const r = await svc.updateSupplierOffer('offer-1', 'sup-1', { isPublic: true });
    expect(r.success).toBe(true);
    expect(saved[0].distributionType).toBe('PUBLIC');
  });

  it('판매자를 지정하면 활성화도 통과한다', async () => {
    const { svc, saved } = withOffer(newlyRegisteredOffer());
    const r = await svc.updateSupplierOffer('offer-1', 'sup-1', {
      allowedSellerIds: ['seller-1'],
      isActive: true,
    });
    expect(r.success).toBe(true);
    expect(saved[0].isActive).toBe(true);
  });
});
