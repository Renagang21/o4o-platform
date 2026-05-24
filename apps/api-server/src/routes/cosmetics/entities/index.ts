/**
 * Cosmetics Entities Index
 *
 * Phase 7-A-1: Cosmetics API Implementation
 *
 * 📦 CORE CATALOG ENTITIES (H1-0)
 *
 * ## Core Entities (Source of Truth)
 * - CosmeticsBrand: 브랜드 정보 (모든 채널 공유)
 * - CosmeticsLine: 제품 라인 (모든 채널 공유)
 * - CosmeticsProduct: 상품 정보 (모든 채널 공유)
 * - CosmeticsPricePolicy: 가격 정책 (모든 채널 공유)
 *
 * ## Audit Entities
 * - CosmeticsProductLog: 상품 변경 이력
 * - CosmeticsPriceLog: 가격 변경 이력
 *
 * ## 외부 참조 원칙
 * 외부 채널(web-k-cosmetics, 향후 채널)에서 이 엔티티를 참조할 때:
 * - UUID 문자열로만 참조 (FK 제약 금지)
 * - 필요 시 API를 통해 조회
 * - 이 엔티티들의 스키마 변경이 외부 채널에 영향 주지 않아야 함
 *
 * Note: K-Shopping은 H8-6에서 Cosmetics에 통합되었습니다.
 *
 * @core H1-0 (2025-01-02)
 */

export * from './cosmetics-brand.entity.js';
export * from './cosmetics-line.entity.js';
export * from './cosmetics-product.entity.js';
export * from './cosmetics-price-policy.entity.js';
export * from './cosmetics-product-log.entity.js';
export * from './cosmetics-price-log.entity.js';

// ============================================================================
// STORE ENTITIES (WO-KCOS-STORES-PHASE1-V1: K-Cosmetics Store Core)
// ============================================================================
export * from './cosmetics-store.entity.js';
export * from './cosmetics-store-application.entity.js';
export * from './cosmetics-store-member.entity.js';
export * from './cosmetics-store-listing.entity.js';

// ============================================================================
// STORE PLAYLIST ENTITIES (WO-KCOS-STORES-PHASE4-SIGNAGE-INTEGRATION-V1)
// ============================================================================
export * from './cosmetics-store-playlist.entity.js';
export * from './cosmetics-store-playlist-item.entity.js';

// ============================================================================
// CONTENT / RESOURCE ENTITIES (WO-O4O-KCOS-RESOURCES-BACKEND-V1)
// GP glycopharm_contents canonical template mirror.
// ============================================================================
export * from './cosmetics-content.entity.js';
