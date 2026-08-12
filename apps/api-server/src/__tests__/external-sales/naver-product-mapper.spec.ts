/**
 * WO-O4O-KPA-NAVER-ONLINE-SALES-INTEGRATION-PILOT-V1
 *
 * O4O 상품 → 네이버 payload 매핑 계약 테스트.
 *
 * 고정하는 것:
 *   1. O4O 기존 데이터로 채워지는 필드는 실제로 채워진다 (복제 원장 없이)
 *   2. O4O 에 원천이 없는 필드는 **임의 기본값으로 메우지 않고** 결손으로 보고된다
 *   3. 파일럿 기본 상태는 판매중지 — 실수로 고객에게 노출되지 않는다
 */

import {
  buildNaverProductPayload,
  collectMissingRequired,
  type NaverChannelInput,
  type O4OProductSource,
} from '../../modules/external-sales/channels/naver/naver-product.mapper.js';

const FULL_SOURCE: O4OProductSource = {
  masterId: '22222222-2222-4222-8222-222222222222',
  name: '비타민D 1000IU 90캡슐',
  regulatoryType: '건강기능식품',
  brandName: '네처',
  manufacturerName: '(주)제조사',
  originCountry: '대한민국',
  specification: '500mg × 90캡슐',
  salePrice: 19800,
  representativeImageUrl: 'https://cdn.example.com/rep.jpg',
  optionalImageUrls: ['https://cdn.example.com/a.jpg', 'https://cdn.example.com/b.jpg'],
  detailContentHtml: '<div class="sd-root"><h2>제품 안내</h2></div>',
};

const FULL_INPUT: NaverChannelInput = {
  leafCategoryId: '50000205',
  stockQuantity: 30,
  deliveryFeeType: 'PAID',
  baseDeliveryFee: 3000,
  returnDeliveryFee: 3000,
  exchangeDeliveryFee: 6000,
  releaseAddressId: 101,
  refundAddressId: 102,
  afterServiceTelephoneNumber: '02-000-0000',
  afterServiceGuideContent: '평일 09:00-18:00',
  productInfoProvidedNotice: { productName: '비타민D 1000IU 90캡슐' },
};

/** O4O 에 원천이 전혀 없는 상태 — 실제 현재 데이터 상황 */
const EMPTY_INPUT: NaverChannelInput = {
  leafCategoryId: null,
  stockQuantity: null,
  deliveryFeeType: null,
  baseDeliveryFee: null,
  returnDeliveryFee: null,
  exchangeDeliveryFee: null,
  releaseAddressId: null,
  refundAddressId: null,
  afterServiceTelephoneNumber: null,
  afterServiceGuideContent: null,
  productInfoProvidedNotice: null,
};

describe('collectMissingRequired — 결손 실측', () => {
  it('O4O + 추가 입력이 모두 채워지면 결손이 없다', () => {
    expect(collectMissingRequired(FULL_SOURCE, FULL_INPUT)).toEqual([]);
  });

  it('추가 입력이 비면 CHANNEL_INPUT 결손만 보고된다 (O4O 측은 충족)', () => {
    const missing = collectMissingRequired(FULL_SOURCE, EMPTY_INPUT);

    expect(missing.length).toBeGreaterThan(0);
    expect(missing.every((m) => m.origin === 'CHANNEL_INPUT')).toBe(true);

    // 후속 UI 범위를 결정하는 목록 — 축소되면 테스트가 깨진다
    expect(missing.map((m) => m.path).sort()).toEqual(
      [
        'originProduct.deliveryInfo.claimDeliveryInfo.exchangeDeliveryFee',
        'originProduct.deliveryInfo.claimDeliveryInfo.refundAddress',
        'originProduct.deliveryInfo.claimDeliveryInfo.returnAddress',
        'originProduct.deliveryInfo.claimDeliveryInfo.returnDeliveryFee',
        'originProduct.deliveryInfo.deliveryFee.deliveryFeeType',
        'originProduct.leafCategoryId',
        'originProduct.stockQuantity',
        'originProduct.detailAttribute.afterServiceInfo.afterServiceGuideContent',
        'originProduct.detailAttribute.afterServiceInfo.afterServiceTelephoneNumber',
        'originProduct.detailAttribute.productInfoProvidedNotice',
      ].sort(),
    );
  });

  it('O4O 측 결손(가격·이미지·상세)도 origin=O4O 로 보고된다', () => {
    const missing = collectMissingRequired(
      {
        ...FULL_SOURCE,
        salePrice: null,
        representativeImageUrl: null,
        detailContentHtml: '   ',
      },
      FULL_INPUT,
    );
    expect(missing.map((m) => m.path)).toEqual([
      'originProduct.salePrice',
      'originProduct.images.representativeImage.url',
      'originProduct.detailContent',
    ]);
    expect(missing.every((m) => m.origin === 'O4O')).toBe(true);
  });

  it('판매가 0 은 결손으로 본다', () => {
    const missing = collectMissingRequired({ ...FULL_SOURCE, salePrice: 0 }, FULL_INPUT);
    expect(missing.map((m) => m.path)).toContain('originProduct.salePrice');
  });
});

describe('buildNaverProductPayload — O4O 값 전달', () => {
  it('O4O 원장 값이 payload 로 그대로 옮겨진다', () => {
    const payload = buildNaverProductPayload(FULL_SOURCE, FULL_INPUT) as any;
    const origin = payload.originProduct;

    expect(origin.name).toBe(FULL_SOURCE.name);
    expect(origin.salePrice).toBe(19800);
    expect(origin.detailContent).toBe(FULL_SOURCE.detailContentHtml);
    expect(origin.images.representativeImage.url).toBe(FULL_SOURCE.representativeImageUrl);
    expect(origin.images.optionalImages).toEqual([
      { url: 'https://cdn.example.com/a.jpg' },
      { url: 'https://cdn.example.com/b.jpg' },
    ]);
    expect(origin.detailAttribute.brandName).toBe('네처');
    expect(origin.detailAttribute.manufacturerName).toBe('(주)제조사');
    expect(origin.detailAttribute.originAreaInfo).toEqual({ content: '대한민국' });
  });

  it('기본 상태는 판매중지 — 파일럿이 고객에게 노출되지 않는다', () => {
    const payload = buildNaverProductPayload(FULL_SOURCE, FULL_INPUT) as any;
    expect(payload.originProduct.statusType).toBe('SUSPENSION');
    expect(payload.smartstoreChannelProduct.channelProductDisplayStatusType).toBe('SUSPENSION');
    expect(payload.smartstoreChannelProduct.naverShoppingRegistration).toBe(false);
  });

  it('SALE 로 명시할 때만 노출 상태가 된다', () => {
    const payload = buildNaverProductPayload(FULL_SOURCE, FULL_INPUT, {
      statusType: 'SALE',
    }) as any;
    expect(payload.originProduct.statusType).toBe('SALE');
    expect(payload.smartstoreChannelProduct.channelProductDisplayStatusType).toBe('ON');
  });

  it('추가 입력이 비어도 임의 기본값을 만들어내지 않는다', () => {
    const payload = buildNaverProductPayload(FULL_SOURCE, EMPTY_INPUT) as any;
    const origin = payload.originProduct;

    expect(origin.leafCategoryId).toBeNull();
    expect(origin.stockQuantity).toBeNull();
    expect(origin.deliveryInfo.deliveryFee.deliveryFeeType).toBeNull();
    expect(origin.deliveryInfo.claimDeliveryInfo.returnDeliveryFee).toBeNull();
    // 주소록은 값이 없으면 키 자체를 만들지 않는다
    expect(origin.deliveryInfo.claimDeliveryInfo.returnAddress).toBeUndefined();
  });

  it('regulatoryType 은 payload 에 실리지 않는다 (외부로 규제 유형을 내보내지 않는다)', () => {
    const payload = buildNaverProductPayload(FULL_SOURCE, FULL_INPUT);
    expect(JSON.stringify(payload)).not.toContain('건강기능식품');
  });
});
