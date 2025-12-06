/**
 * Cosmetics Extension Backend Module
 *
 * Exports entities and routes for API server integration
 */

import type { DataSource } from 'typeorm';
import { CosmeticsFilter, CosmeticsRoutine, CosmeticsBrand } from './entities/index.js';
import { createCosmeticsFilterRoutes } from './routes/cosmetics-filter.routes.js';
import { createInfluencerRoutineRoutes } from './routes/influencer-routine.routes.js';
import { createSignageRoutes } from './routes/signage.routes.js';
import { createRecommendationRoutes } from './routes/recommendation.routes.js';
import { createBrandRoutes } from './routes/brand.routes.js';

export function createCosmeticsModule(dataSource: DataSource) {
  return {
    name: 'dropshipping-cosmetics',
    version: '1.0.0',

    // TypeORM entities
    entities: [CosmeticsFilter, CosmeticsRoutine, CosmeticsBrand],

    // Express routes (initialized with DataSource)
    routes: [
      {
        path: '/api/v1/cosmetics',
        router: createCosmeticsFilterRoutes(dataSource),
      },
      {
        path: '/api/v1/partner/routines',
        router: createInfluencerRoutineRoutes(dataSource),
      },
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
    ],
  };
}

// Export for convenience
export const CosmeticsEntities = [CosmeticsFilter, CosmeticsRoutine, CosmeticsBrand];

export default createCosmeticsModule;
