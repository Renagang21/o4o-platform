/**
 * Cosmetics Extension Backend Module
 *
 * Exports entities and routes for API server integration
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
  CosmeticsSignagePlaylist,
  CosmeticsSellerWorkflowSession,
  CosmeticsCampaign,
} from './entities/index.js';
import { createCosmeticsFilterRoutes } from './routes/cosmetics-filter.routes.js';
// createInfluencerRoutineRoutes REMOVED - Routine CRUD moved to cosmetics-partner-extension (Phase 7-Y)
import { createSignageRoutes } from './routes/signage.routes.js';
import { createRecommendationRoutes } from './routes/recommendation.routes.js';
import { createBrandRoutes } from './routes/brand.routes.js';
import { createDictionaryRoutes } from './routes/dictionary.routes.js';
import { createSignagePlaylistRoutes } from './routes/signage-playlist.routes.js';
import { createSellerWorkflowRoutes } from './routes/seller-workflow.routes.js';
import { createCampaignRoutes } from './routes/campaign.routes.js';

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
      CosmeticsSignagePlaylist,
      CosmeticsSellerWorkflowSession,
      CosmeticsCampaign,
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
      {
        path: '/api/v1/cosmetics',
        router: createSignagePlaylistRoutes(dataSource),
      },
      {
        path: '/api/v1/cosmetics',
        router: createSellerWorkflowRoutes(dataSource),
      },
      {
        path: '/api/v1/cosmetics',
        router: createCampaignRoutes(dataSource),
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
  CosmeticsSignagePlaylist,
  CosmeticsSellerWorkflowSession,
  CosmeticsCampaign,
];

export default createCosmeticsModule;
