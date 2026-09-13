/**
 * API 서비스 모듈 통합 export
 */

export { apiClient } from './client';
export { forumApi } from './forum';
export { lmsApi } from './lms';
export { aiApi } from './ai';
export type { AiAnalyzeResult, AiAnalyzeKind } from './ai';
export { eventOfferApi } from './eventOffer';
export { eventOfferAdminApi } from './eventOfferAdmin';
export { newsApi } from './news';
export { mypageApi, type ProfileResponse } from './mypage';
export { cmsApi } from './cms';
export { participationApi } from './participation';
export { homeApi } from './home';
// dashboardApi(cms_media 자료함 클라이언트) 는 제거됨 — WO-O4O-CMS-LEGACY-MEDIA-ASSET-TO-MEDIA-V2-CANONICALIZATION-FINAL-CLOSURE-V1
export { resourcesApi, type ResourceItem, type ResourceListResponse } from './resources';
// WO-O4O-EVENT-OFFER-TO-CART-MIGRATION-V1 (Phase 1a): canonical store cart
export {
  storeCartApi,
  type StoreCartItem,
  type CartSourceType,
  type CartPricingSource,
  type SupplierGroup,
} from './storeCart';
