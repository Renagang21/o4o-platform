/**
 * Cosmetics Supplier Extension
 *
 * 화장품 공급사 확장 앱
 * - 공급사 프로필 관리
 * - 가격 정책 (최저가/최고가)
 * - 샘플 관리
 * - Seller/Partner 승인
 * - 캠페인 관리
 */

// Manifest
export { manifest, default as supplierExtensionManifest } from './manifest';

// Backend
export * from './backend';
