/**
 * O4O 상품 → 네이버 커머스 상품 payload 매퍼
 * WO-O4O-KPA-NAVER-ONLINE-SALES-INTEGRATION-PILOT-V1
 *
 * **상품을 복제하지 않는다.** 기존 O4O 원장(`product_masters` · `organization_product_listings`
 * · `product_images` · `shared_product_descriptions`)에서 읽어 네이버 요청 본문을 만들 뿐이며,
 * 별도 판매상품 원장을 두지 않는다.
 *
 * 이 파일이 곧 **필드 매핑표의 실행 가능한 형태**다.
 *   - `O4OProductSource`        = O4O 기존 데이터로 채울 수 있는 필드
 *   - `NaverChannelInput`       = O4O 에 원천이 없어 **추가 입력이 필요한** 필드
 *   - `collectMissingRequired()` = 등록 전에 무엇이 비어 있는지 실측하는 지점
 *
 * `NaverChannelInput` 이 후속 UI 범위를 결정한다 (WO §2-2).
 */

/** O4O 기존 원장에서 그대로 가져오는 값 — 추가 입력이 필요 없다 */
export interface O4OProductSource {
  /** product_masters.id */
  masterId: string;
  /** product_masters.name → originProduct.name */
  name: string;
  /** product_masters.regulatory_type — eligibility 가드 입력 (payload 에는 넣지 않는다) */
  regulatoryType: string | null;
  /** product_masters.brand_name → detailAttribute.brandName */
  brandName: string | null;
  /** product_masters.manufacturer_name → detailAttribute.manufacturerName */
  manufacturerName: string | null;
  /** product_masters.origin_country → detailAttribute.originAreaInfo */
  originCountry: string | null;
  /** product_masters.specification — 상세 본문 보조 */
  specification: string | null;
  /** organization_product_listings.price → originProduct.salePrice */
  salePrice: number | null;
  /** product_images (is_primary=true) → images.representativeImage.url */
  representativeImageUrl: string | null;
  /** product_images (나머지, sort_order 순) → images.optionalImages[] */
  optionalImageUrls: string[];
  /** shared_product_descriptions STORE canonical → originProduct.detailContent (HTML) */
  detailContentHtml: string | null;
}

/**
 * O4O 에 원천이 없어 매장·운영자가 **추가로 입력해야 하는** 값.
 *
 * 여기 있는 항목이 전부 후속 UI 대상이다. 임의 기본값을 코드에 박지 않는다 —
 * 배송비·반품비를 추측해 넣으면 실제 정산에서 매장이 손해를 본다.
 */
export interface NaverChannelInput {
  /** 네이버 리프 카테고리 ID. O4O 카테고리와 체계가 달라 **매핑이 필요**하다 */
  leafCategoryId: string | null;
  /** 판매 재고 — O4O 에 매장 재고 개념이 없다 */
  stockQuantity: number | null;
  /** 배송비 유형: FREE | PAID | CONDITIONAL_FREE 등 */
  deliveryFeeType: string | null;
  /** 유료 배송비 (deliveryFeeType 이 FREE 가 아닐 때) */
  baseDeliveryFee: number | null;
  /** 반품 배송비 */
  returnDeliveryFee: number | null;
  /** 교환 배송비 */
  exchangeDeliveryFee: number | null;
  /** 출고지 주소록 ID — 스마트스토어센터에 사전 등록 필요 */
  releaseAddressId: number | null;
  /** 반품지 주소록 ID — 스마트스토어센터에 사전 등록 필요 */
  refundAddressId: number | null;
  /** A/S 안내 전화번호 (법정 필수) */
  afterServiceTelephoneNumber: string | null;
  /** A/S 안내 내용 (법정 필수) */
  afterServiceGuideContent: string | null;
  /**
   * 상품정보제공고시 — 카테고리별로 항목이 다르며 **법정 필수**다.
   * 카테고리 조회 API 결과에 따라 구성한다.
   */
  productInfoProvidedNotice: Record<string, unknown> | null;
}

/** 등록/수정 시 네이버가 요구하는 필수 필드 중 비어 있는 것 */
export interface MissingRequiredField {
  /** payload 상 경로 */
  path: string;
  /** 어디서 채워야 하는가 */
  origin: 'O4O' | 'CHANNEL_INPUT';
  /** 사람이 읽는 설명 */
  label: string;
}

/**
 * 등록 전 필수 필드 실측.
 *
 * 네이버에 보내기 전에 호출해 **무엇이 비어 있는지 먼저 보고**한다.
 * 빈 배열이 아니면 등록을 시도하지 않는다 (400 을 받아 원인을 역추적하는 것보다 명확하다).
 */
export function collectMissingRequired(
  source: O4OProductSource,
  input: NaverChannelInput,
): MissingRequiredField[] {
  const missing: MissingRequiredField[] = [];

  const needO4O = (ok: boolean, path: string, label: string) => {
    if (!ok) missing.push({ path, origin: 'O4O', label });
  };
  const needInput = (ok: boolean, path: string, label: string) => {
    if (!ok) missing.push({ path, origin: 'CHANNEL_INPUT', label });
  };

  // ── O4O 원장에서 채워야 하는 필수 ──────────────────────────────────────
  needO4O(!!source.name?.trim(), 'originProduct.name', '상품명');
  needO4O(
    source.salePrice != null && source.salePrice > 0,
    'originProduct.salePrice',
    '판매가',
  );
  needO4O(
    !!source.representativeImageUrl,
    'originProduct.images.representativeImage.url',
    '대표 이미지',
  );
  needO4O(
    !!source.detailContentHtml?.trim(),
    'originProduct.detailContent',
    '상품 상세 (HTML)',
  );

  // ── 추가 입력이 필요한 필수 ────────────────────────────────────────────
  needInput(!!input.leafCategoryId, 'originProduct.leafCategoryId', '네이버 리프 카테고리');
  needInput(input.stockQuantity != null, 'originProduct.stockQuantity', '재고 수량');
  needInput(
    !!input.deliveryFeeType,
    'originProduct.deliveryInfo.deliveryFee.deliveryFeeType',
    '배송비 유형',
  );
  needInput(
    input.returnDeliveryFee != null,
    'originProduct.deliveryInfo.claimDeliveryInfo.returnDeliveryFee',
    '반품 배송비',
  );
  needInput(
    input.exchangeDeliveryFee != null,
    'originProduct.deliveryInfo.claimDeliveryInfo.exchangeDeliveryFee',
    '교환 배송비',
  );
  needInput(
    input.releaseAddressId != null,
    'originProduct.deliveryInfo.claimDeliveryInfo.returnAddress',
    '출고지 주소록 ID',
  );
  needInput(
    input.refundAddressId != null,
    'originProduct.deliveryInfo.claimDeliveryInfo.refundAddress',
    '반품지 주소록 ID',
  );
  needInput(
    !!input.afterServiceTelephoneNumber,
    'originProduct.detailAttribute.afterServiceInfo.afterServiceTelephoneNumber',
    'A/S 전화번호',
  );
  needInput(
    !!input.afterServiceGuideContent,
    'originProduct.detailAttribute.afterServiceInfo.afterServiceGuideContent',
    'A/S 안내 내용',
  );
  needInput(
    !!input.productInfoProvidedNotice,
    'originProduct.detailAttribute.productInfoProvidedNotice',
    '상품정보제공고시 (법정 필수)',
  );

  return missing;
}

/** 상품 상태 — 파일럿은 판매중지(SUSPENSION)로 올려 노출 없이 검증한다 */
export type NaverProductStatusType = 'SALE' | 'SUSPENSION' | 'OUTOFSTOCK' | 'WAIT';

export interface BuildPayloadOptions {
  /** 기본값 'SUSPENSION' — 파일럿에서 실제 고객 노출을 막는다 */
  statusType?: NaverProductStatusType;
}

/**
 * 네이버 상품 등록/수정 payload 생성.
 *
 * 호출 전 `collectMissingRequired()` 가 빈 배열이어야 한다. 비어 있지 않은데 호출하면
 * 네이버가 400 으로 거절한다 — 여기서 임의 기본값으로 메우지 않는 것이 의도다.
 */
export function buildNaverProductPayload(
  source: O4OProductSource,
  input: NaverChannelInput,
  options: BuildPayloadOptions = {},
): Record<string, unknown> {
  const statusType = options.statusType ?? 'SUSPENSION';

  return {
    originProduct: {
      statusType,
      saleType: 'NEW',
      leafCategoryId: input.leafCategoryId,
      name: source.name,
      detailContent: source.detailContentHtml,
      images: {
        representativeImage: { url: source.representativeImageUrl },
        optionalImages: source.optionalImageUrls.map((url) => ({ url })),
      },
      salePrice: source.salePrice,
      stockQuantity: input.stockQuantity,
      deliveryInfo: {
        deliveryType: 'DELIVERY',
        deliveryAttributeType: 'NORMAL',
        deliveryFee: {
          deliveryFeeType: input.deliveryFeeType,
          baseFee: input.baseDeliveryFee ?? undefined,
        },
        claimDeliveryInfo: {
          returnDeliveryFee: input.returnDeliveryFee,
          exchangeDeliveryFee: input.exchangeDeliveryFee,
          returnAddress: input.releaseAddressId
            ? { addressBookNo: input.releaseAddressId }
            : undefined,
          refundAddress: input.refundAddressId
            ? { addressBookNo: input.refundAddressId }
            : undefined,
        },
      },
      detailAttribute: {
        brandName: source.brandName ?? undefined,
        manufacturerName: source.manufacturerName ?? undefined,
        originAreaInfo: source.originCountry ? { content: source.originCountry } : undefined,
        afterServiceInfo: {
          afterServiceTelephoneNumber: input.afterServiceTelephoneNumber,
          afterServiceGuideContent: input.afterServiceGuideContent,
        },
        productInfoProvidedNotice: input.productInfoProvidedNotice ?? undefined,
      },
    },
    smartstoreChannelProduct: {
      channelProductName: source.name,
      naverShoppingRegistration: false,
      channelProductDisplayStatusType: statusType === 'SALE' ? 'ON' : 'SUSPENSION',
    },
  };
}
