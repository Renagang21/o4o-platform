/**
 * Store Products UI — Types
 *
 * WO-O4O-STORE-PRODUCTS-UI-CORE-EXTRACTION-V1
 *
 * Backend contract: /api/v1/store/products (createStoreProductLibraryController)
 */

// ── 검색/등록 ────────────────────────────────────────────────────────────────

export interface StoreProductSearchResult {
  id: string;                              // masterId
  barcode: string;
  name: string;
  regulatoryName: string;
  manufacturerName: string;
  specification: string | null;
  category: { id: string; name: string } | null;
  brand: { id: string; name: string } | null;
  primaryImageUrl: string | null;
  offerCount: number;
}

export interface StoreProductOffer {
  id: string;                              // offerId (SupplierProductOffer.id)
  supplierId: string;
  supplierName: string;
  priceGeneral: number;
  priceGold: number;
  pricePlatinum: number;
  distributionType: string;
  consumerShortDescription: string | null;
  businessShortDescription: string | null;
  effectiveShortDescription: string;
  effectiveDetailDescription: string;
  brandName: string | null;
  manufacturerName: string | null;
}

// ── 매장 진열 목록 ───────────────────────────────────────────────────────────

export interface StoreListingItem {
  id: string;                              // OrganizationProductListing.id
  /** WO-O4O-KPA-STORE-MY-PRODUCTS-FLOW-SIMPLIFY-V1: master 기반 등록 시 null */
  offerId: string | null;                  // SupplierProductOffer.id (null = master-only listing)
  isActive: boolean;
  price: number | null;                    // 매장 override 가격 (null = 미설정)
  createdAt: string;
  updatedAt: string;
  masterId: string;
  barcode: string;
  name: string;
  regulatoryName: string;
  manufacturerName: string;
  primaryImage: string | null;
  imageCount: number;                      // 등록된 이미지 수 (0 = 이미지 없음)
  offerPrice: number | null;               // 공급자 기본가 (null = master-only listing)
  distributionType: string | null;         // null = master-only listing
  supplierId: string | null;               // null = master-only listing
  supplierName: string | null;             // null = master-only listing
}

// ── 페이지네이션 응답 ─────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

// ── 이미지 ───────────────────────────────────────────────────────────────────

export interface ProductImageItem {
  id: string;
  imageUrl: string;
  gcsPath: string;
  type: 'thumbnail' | 'detail' | 'content';
  isPrimary: boolean;
  sortOrder: number;
  createdAt: string;
}

// ── 채널 ────────────────────────────────────────────────────────────────────

export interface StoreChannel {
  id: string;
  channelType: 'B2C' | 'KIOSK';
  status: string;
  approvedAt: string | null;
  createdAt: string;
}

export interface ChannelProductItem {
  id: string;                              // OrganizationProductChannel.id
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
  productListingId: string;
  productName: string;
  retailPrice: number;
  serviceKey: string;
  listingActive: boolean;
}
