/**
 * Cosmetics Extension Backend Module
 *
 * Exports entities and routes for API server integration
 *
 * WO-O4O-COSMETICS-SIGNAGE-PRODUCT-RELATION-REMOVE-V1 (2026-06-05):
 *   product 직접 결합 dead 경로 제거 — CosmeticsSignagePlaylist / CosmeticsCampaign
 *   entity·service·route·controller 및 본 모듈 등록을 삭제.
 *   활성 매장 사이니지는 api-server o4o-store /store-playlists (snapshot/signage-media) — 본 패키지 무관.
 */

import type { DataSource } from 'typeorm';
import {
  CosmeticsFilter,
  // CosmeticsRoutine REMOVED - Use PartnerRoutine from cosmetics-partner-extension (Phase 7-Y)
  CosmeticsBrand,
  CosmeticsSkinType,
  CosmeticsConcern,
  CosmeticsIngredient,
  CosmeticsCategory,
  CosmeticsSellerWorkflowSession,
} from './entities/index.js';
import { createCosmeticsFilterRoutes } from './routes/cosmetics-filter.routes.js';
// createInfluencerRoutineRoutes REMOVED - Routine CRUD moved to cosmetics-partner-extension (Phase 7-Y)
import { createSignageRoutes } from './routes/signage.routes.js';
import { createRecommendationRoutes } from './routes/recommendation.routes.js';
import { createBrandRoutes } from './routes/brand.routes.js';
import { createDictionaryRoutes } from './routes/dictionary.routes.js';
// createSignagePlaylistRoutes / createCampaignRoutes REMOVED (WO-O4O-COSMETICS-SIGNAGE-PRODUCT-RELATION-REMOVE-V1)
import { createSellerWorkflowRoutes } from './routes/seller-workflow.routes.js';

export function createCosmeticsModule(dataSource: DataSource) {
  return {
    name: 'dropshipping-cosmetics',
    version: '1.0.0',

    // TypeORM entities
    entities: [
      CosmeticsFilter,
      // CosmeticsRoutine REMOVED (Phase 7-Y) - PartnerRoutine is canonical
      CosmeticsBrand,
      CosmeticsSkinType,
      CosmeticsConcern,
      CosmeticsIngredient,
      CosmeticsCategory,
      CosmeticsSellerWorkflowSession,
    ],

    // Express routes (initialized with DataSource)
    routes: [
      {
        path: '/api/v1/cosmetics',
        router: createCosmeticsFilterRoutes(dataSource),
      },
      // /api/v1/partner/routines REMOVED (Phase 7-Y) - CRUD moved to cosmetics-partner-extension
      {
        path: '/api/v1/cosmetics',
        router: createSignageRoutes(dataSource),
      },
      {
        path: '/api/v1/cosmetics',
        router: createRecommendationRoutes(dataSource),
      },
      {
        path: '/api/v1/cosmetics',
        router: createBrandRoutes(dataSource),
      },
      {
        path: '/api/v1/cosmetics',
        router: createDictionaryRoutes(dataSource),
      },
      // signage-playlist / campaign routes REMOVED (product 결합 dead 경로)
      {
        path: '/api/v1/cosmetics',
        router: createSellerWorkflowRoutes(dataSource),
      },
    ],
  };
}

// Export for convenience
export const CosmeticsEntities = [
  CosmeticsFilter,
  // CosmeticsRoutine REMOVED (Phase 7-Y) - PartnerRoutine is canonical
  CosmeticsBrand,
  CosmeticsSkinType,
  CosmeticsConcern,
  CosmeticsIngredient,
  CosmeticsCategory,
  CosmeticsSellerWorkflowSession,
];

export default createCosmeticsModule;
