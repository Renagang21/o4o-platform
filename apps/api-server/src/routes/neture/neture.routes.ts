/**
 * Neture Routes
 *
 * Work Order: WO-NETURE-CORE-P1 (initial)
 * Work Order: WO-O4O-NETURE-COMMUNITY-OPERATOR-MANAGEMENT-V1 (community hub)
 */

import { Router } from 'express';
import { DataSource } from 'typeorm';
import { createNetureController } from './controllers/neture.controller.js';
import { createNetureCommunityHubController } from './controllers/neture-community-hub.controller.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { requireNetureScope } from '../../middleware/neture-scope.middleware.js';

export function createNetureRoutes(dataSource: DataSource): Router {
  const router = Router();

  // Core controller (public + admin endpoints)
  const netureController = createNetureController(dataSource);
  router.use('/', netureController);

  // ============================================================================
  // Community Hub Routes — WO-O4O-NETURE-COMMUNITY-OPERATOR-MANAGEMENT-V1
  // /api/v1/neture/community/*
  // ============================================================================
  const communityHubController = createNetureCommunityHubController(
    dataSource,
    requireAuth as any,
    requireNetureScope as any,
  );
  router.use('/', communityHubController);

  return router;
}

export default createNetureRoutes;
