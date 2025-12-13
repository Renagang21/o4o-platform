/**
 * Yaksa Scheduler Activate Lifecycle Hook
 * Phase 19-A, 19-B, 19-C
 */

import type { EntityManager } from 'typeorm';
import { schedulerService } from '../backend/services/SchedulerService.js';
import { jobMonitorService } from '../backend/services/JobMonitorService.js';
import { integratedDashboardService } from '../backend/services/IntegratedDashboardService.js';
import { registerAllHandlers } from '../handlers/index.js';

export interface ActivateContext {
  entityManager: EntityManager;
  organizationId?: string;
}

export async function activate(context: ActivateContext): Promise<void> {
  console.log('[yaksa-scheduler] Activating...');

  // Initialize services
  schedulerService.initialize(context.entityManager);
  jobMonitorService.initialize(context.entityManager);
  integratedDashboardService.initialize(context.entityManager);

  // Register all job handlers (Phase 19-B)
  registerAllHandlers();

  // Start all scheduled jobs
  await schedulerService.startAllJobs();

  console.log('[yaksa-scheduler] Activation complete');
}

export default activate;
