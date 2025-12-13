/**
 * Yaksa Scheduler Uninstall Lifecycle Hook
 * Phase 19-A
 */

import type { EntityManager } from 'typeorm';

export interface UninstallContext {
  entityManager: EntityManager;
  organizationId?: string;
}

export async function uninstall(context: UninstallContext): Promise<void> {
  console.log('[yaksa-scheduler] Uninstalling...');

  // Note: Table cleanup would be handled by migrations
  // For safety, we don't auto-delete data on uninstall

  console.log('[yaksa-scheduler] Uninstall complete');
}

export default uninstall;
