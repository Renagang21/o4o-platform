/**
 * Membership-Yaksa Routes
 *
 * Router factories that create routes with DataSource
 */

export { createMemberRoutes } from './memberRoutes.js';
export { createVerificationRoutes } from './verificationRoutes.js';
export { createStatsRoutes } from './statsRoutes.js';

/**
 * Create all membership routes
 *
 * This is a helper function for API server integration
 */
import { Router } from 'express';
import { DataSource } from 'typeorm';
import { createMemberRoutes } from './memberRoutes.js';
import { createVerificationRoutes } from './verificationRoutes.js';
import { createStatsRoutes } from './statsRoutes.js';

export function createMembershipRoutes(dataSource: DataSource): Router {
  const router = Router();

  // /api/membership/members
  router.use('/members', createMemberRoutes(dataSource));

  // /api/membership/verifications
  router.use('/verifications', createVerificationRoutes(dataSource));

  // /api/membership/stats
  router.use('/stats', createStatsRoutes(dataSource));

  return router;
}
