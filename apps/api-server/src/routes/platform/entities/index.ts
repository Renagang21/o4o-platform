/**
 * Platform Entities
 *
 * WO-O4O-CROSS-SERVICE-STORE-LINKING-V1
 * WO-STORE-LOCAL-PRODUCT-DISPLAY-V1
 * WO-O4O-TABLET-MODULE-V1
 */

export { PhysicalStore } from './physical-store.entity.js';
export { PhysicalStoreLink } from './physical-store-link.entity.js';
export { StoreLocalProduct } from './store-local-product.entity.js';
export { StoreTablet } from './store-tablet.entity.js';
export { StoreTabletDisplay } from './store-tablet-display.entity.js';
export { TabletInterestRequest, InterestRequestStatus } from './tablet-interest-request.entity.js';
export { StoreExecutionAsset } from './store-execution-asset.entity.js';
// WO-KPA-STORE-ASSET-DERIVATION-TABLE-V1: 원본↔파생 관계 추적
export { StoreAssetDerivation } from './store-asset-derivation.entity.js';
export { StoreQrCode } from './store-qr-code.entity.js';
export { StoreQrScanEvent } from './store-qr-scan-event.entity.js';
export { ProductMarketingAsset } from './product-marketing-asset.entity.js';
// WO-O4O-MULTILINGUAL-PRODUCT-CONTENT-STORAGE-V1
export {
  StoreMultilingualProductContentGroup,
  type StoreMultilingualProductTargetKind,
  type StoreMultilingualProductContentSourceType,
  type StoreMultilingualProductContentStatus,
} from './store-multilingual-product-content-group.entity.js';
export {
  StoreMultilingualProductContentPage,
  type StoreMultilingualProductLocale,
  type StoreMultilingualProductContentPageStatus,
  type StoreMultilingualProductContentFormat,
} from './store-multilingual-product-content-page.entity.js';
// WO-O4O-KPA-MULTILINGUAL-PRODUCT-CONTENT-HUB-FLOW-PILOT-V1 — operator-side HUB originals
export {
  OperatorMultilingualProductContentGroup,
  type OperatorMultilingualProductContentAuthorRole,
  type OperatorMultilingualProductContentStatus,
} from './operator-multilingual-product-content-group.entity.js';
export {
  OperatorMultilingualProductContentPage,
  type OperatorMultilingualProductLocale,
  type OperatorMultilingualProductContentPageStatus,
  type OperatorMultilingualProductContentFormat,
} from './operator-multilingual-product-content-page.entity.js';
