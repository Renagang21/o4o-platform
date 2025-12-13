/**
 * Yaksa Scheduler Install Lifecycle Hook
 * Phase 19-A
 */

import type { EntityManager } from 'typeorm';

export interface InstallContext {
  entityManager: EntityManager;
  organizationId?: string;
}

export async function install(context: InstallContext): Promise<void> {
  console.log('[yaksa-scheduler] Installing...');

  // Tables are created by TypeORM synchronization/migrations
  // No additional install steps needed

  console.log('[yaksa-scheduler] Install complete');
}

export default install;
