/**
 * @o4o/store-products-ui
 *
 * WO-O4O-STORE-PRODUCTS-UI-CORE-EXTRACTION-V1
 *
 * 매장 경영자(*:store_owner)가 사용하는 매장 상품 관리 UI 패키지.
 * Backend: /api/v1/store/products (createStoreProductLibraryController)
 *
 * 본 패키지는 다음 3개의 서비스 웹앱에서 동일하게 사용된다(다음 Phase):
 *  - services/web-kpa-society
 *  - services/web-glycopharm
 *  - services/web-k-cosmetics
 *
 * Phase A 산출물 — 공통화만 수행, 라우팅 적용은 후속 Phase에서.
 */

// Page
export { default as StoreProductsManagerPage } from './StoreProductsManagerPage.js';
export type { StoreProductsManagerPageProps } from './StoreProductsManagerPage.js';

// Modal (개별 사용 가능)
export { default as StoreProductImageManagerModal } from './StoreProductImageManagerModal.js';

// API 클라이언트 — 개별 함수 + 번들 객체
export {
  // 검색/등록
  searchStoreProducts,
  createStoreListing,
  getMyStoreListings,
  updateStoreListing,
  updateListingDescription,
  // 이미지
  getMasterImages,
  importImageFromUrl,
  reorderImages,
  setImagePrimary,
  deleteImage,
  // 채널
  getMyChannels,
  getChannelProducts,
  addProductToChannel,
  toggleChannelProduct,
  // 번들
  storeProductsApi,
} from './api.js';

// Types
export type {
  StoreProductSearchResult,
  StoreListingItem,
  PaginatedResponse,
  ProductImageItem,
  StoreChannel,
  ChannelProductItem,
} from './types.js';
