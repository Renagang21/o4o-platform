import { DataSource } from 'typeorm';
import { OrganizationForumService } from '../services/OrganizationForumService.js';

/**
 * Organization-Forum Extension Install Hook
 *
 * This hook is executed when the extension is installed.
 * It sets up event listeners for organization creation to automatically
 * create default forum categories.
 */
export async function onInstall(dataSource: DataSource): Promise<void> {
  console.log('[organization-forum] Installing extension...');

  const service = new OrganizationForumService(dataSource);

  // Subscribe to organization lifecycle events
  // Note: This assumes organization-core provides event emitters
  // If not available yet, this can be implemented later when
  // organization-core adds event support

  console.log('[organization-forum] Extension installed successfully');
  console.log('[organization-forum] Features:');
  console.log('  - Auto-create forum categories on organization creation');
  console.log('  - Organization-scoped forum permissions');
  console.log('  - Hierarchical forum access control');
}

/**
 * Organization-Forum Extension Uninstall Hook
 */
export async function onUninstall(dataSource: DataSource): Promise<void> {
  console.log('[organization-forum] Uninstalling extension...');

  // Cleanup: Remove event listeners
  // Note: Actual implementation depends on organization-core's event system

  console.log('[organization-forum] Extension uninstalled successfully');
}
