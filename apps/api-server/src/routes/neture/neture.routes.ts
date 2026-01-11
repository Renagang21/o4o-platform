/**
 * Neture Routes - P1 Implementation
 *
 * Work Order: WO-NETURE-CORE-P1
 * Phase: P1 (Backend Integration)
 *
 * HARD RULES:
 * - GET endpoints ONLY
 * - NO authentication required (public information)
 * - NO payment/order endpoints
 * - Read-only information platform
 */

import { Router } from 'express';
import { DataSource } from 'typeorm';
import { createNetureController } from './controllers/neture.controller.js';

/**
 * Create Neture routes (P1 - Read-Only)
 */
export function createNetureRoutes(dataSource: DataSource): Router {
  const router = Router();

  // Mount GET-only controller (no auth required)
  const netureController = createNetureController(dataSource);
  router.use('/', netureController);

  // ============================================================================
  // HARD RULES ENFORCEMENT
  // ============================================================================
  // ❌ NO /payments endpoint (violates read-only principle)
  // ❌ NO /orders endpoint (violates read-only principle)
  // ❌ NO authentication middleware (public information platform)
  // ============================================================================

  return router;
}

export default createNetureRoutes;
