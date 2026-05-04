/**
 * ImageManagerModal — admin-dashboard thin wrapper
 *
 * WO-O4O-STORE-PRODUCT-IMAGE-REGISTRATION-PHASE2-V1
 * WO-O4O-STORE-PRODUCT-IMAGE-REGISTRATION-PHASE3-V1
 * WO-O4O-STORE-PRODUCTS-UI-CORE-EXTRACTION-V1: 공통 패키지 @o4o/store-products-ui 의
 *   StoreProductImageManagerModal 로 리다이렉트.
 *
 * 본 파일은 기존 admin-dashboard 임포트 경로를 깨지 않기 위한 호환 wrapper 다.
 * 신규 호출자는 직접 `@o4o/store-products-ui` 의 StoreProductImageManagerModal 을 임포트할 것.
 */

export { StoreProductImageManagerModal as default } from '@o4o/store-products-ui';
