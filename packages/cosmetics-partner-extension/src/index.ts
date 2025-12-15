/**
 * Cosmetics Partner Extension
 *
 * 화장품 파트너/인플루언서 확장 기능 패키지
 *
 * 주요 기능:
 * - Partner Profile Management (파트너 프로필 관리)
 * - Partner Links (추천 링크 생성 및 추적)
 * - Partner Routines (루틴 기반 제품 추천)
 * - Partner Earnings (수익 관리 및 정산)
 */

import { Router } from 'express';
import type { DataSource } from 'typeorm';

// Manifest
export {
  cosmeticsPartnerExtensionManifest,
  cosmeticsPartnerExtensionManifest as manifest,
} from './manifest.js';
export { cosmeticsPartnerExtensionManifest as default } from './manifest.js';

// Backend
export * from './backend/index.js';

// Frontend
export * from './frontend/index.js';

// Shortcodes
export { shortcodes } from './shortcodes/index.js';

// Lifecycle
export * from './lifecycle/index.js';

/**
 * Create Express routes for Cosmetics Partner Extension
 */
export function createRoutes(dataSource: DataSource): Router {
  const router = Router();

  // Import entities
  const { PartnerProfile } = require('./backend/entities/partner-profile.entity');
  const { PartnerLink } = require('./backend/entities/partner-link.entity');
  const { PartnerRoutine } = require('./backend/entities/partner-routine.entity');
  const { PartnerEarnings } = require('./backend/entities/partner-earnings.entity');

  // Import route creator
  const { createPartnerExtensionRoutes } = require('./backend/routes');

  // Get repositories
  const profileRepository = dataSource.getRepository(PartnerProfile);
  const linkRepository = dataSource.getRepository(PartnerLink);
  const routineRepository = dataSource.getRepository(PartnerRoutine);
  const earningsRepository = dataSource.getRepository(PartnerEarnings);

  // Create routes with dependencies
  const partnerRoutes = createPartnerExtensionRoutes({
    profileRepository,
    linkRepository,
    routineRepository,
    earningsRepository,
  });

  // Mount routes
  router.use('/cosmetics-partner', partnerRoutes);

  return router;
}
