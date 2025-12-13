/**
 * Yaksa Scheduler Extension
 * Phase 19-A: Central Scheduler Infrastructure
 *
 * Provides route registration for the scheduler API.
 */

import type { Router } from 'express';
import { createSchedulerRoutes } from './backend/controllers/scheduler.controller.js';

/**
 * Create routes for the yaksa-scheduler extension
 */
export function createRoutes(router: Router): void {
  // All routes are prefixed with /yaksa-scheduler
  createSchedulerRoutes(router);
}

export default { createRoutes };
