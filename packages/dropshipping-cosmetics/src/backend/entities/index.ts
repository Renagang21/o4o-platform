/**
 * Cosmetics Extension Entities
 *
 * Phase 9-C: Core v2 정렬
 * - 화장품 Extension 전용 엔티티
 * - Core ProductMaster와 연동
 */

export { CosmeticsFilter } from './cosmetics-filter.entity.js';
// CosmeticsRoutine REMOVED - Use PartnerRoutine from cosmetics-partner-extension (Phase 7-Y)
export { CosmeticsBrand } from './brand.entity.js';

// Dictionary Entities
export { CosmeticsSkinType } from './skin-type.entity.js';
export { CosmeticsConcern } from './concern.entity.js';
export { CosmeticsIngredient } from './ingredient.entity.js';
export { CosmeticsCategory } from './category.entity.js';

// Signage Playlist / Campaign Entities REMOVED
//   WO-O4O-COSMETICS-SIGNAGE-PRODUCT-RELATION-REMOVE-V1 (2026-06-05):
//   product 직접 결합 dead 경로 제거. 활성 매장 사이니지는 o4o-store /store-playlists
//   (cosmetics_store_playlists, snapshot/signage-media 기반) — 본 패키지와 무관.

// Seller Workflow Entities
export { CosmeticsSellerWorkflowSession } from './seller-workflow-session.entity.js';
