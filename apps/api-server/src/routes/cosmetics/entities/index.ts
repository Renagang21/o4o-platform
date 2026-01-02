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
 * 다른 도메인(K-Shopping, 향후 채널)에서 이 엔티티를 참조할 때:
 * - UUID 문자열로만 참조 (FK 제약 금지)
 * - 필요 시 API를 통해 조회
 * - 이 엔티티들의 스키마 변경이 외부 도메인에 영향 주지 않아야 함
 *
 * @core H1-0 (2025-01-02)
 */

export * from './cosmetics-brand.entity.js';
export * from './cosmetics-line.entity.js';
export * from './cosmetics-product.entity.js';
export * from './cosmetics-price-policy.entity.js';
export * from './cosmetics-product-log.entity.js';
export * from './cosmetics-price-log.entity.js';
