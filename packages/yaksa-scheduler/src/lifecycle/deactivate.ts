/**
 * Yaksa Scheduler Deactivate Lifecycle Hook
 * Phase 19-A
 */

import { schedulerService } from '../backend/services/SchedulerService.js';

export interface DeactivateContext {
  organizationId?: string;
}

export async function deactivate(context: DeactivateContext): Promise<void> {
  console.log('[yaksa-scheduler] Deactivating...');

  // Stop all cron jobs
  schedulerService.stopAllJobs();

  console.log('[yaksa-scheduler] Deactivation complete');
}

export default deactivate;
