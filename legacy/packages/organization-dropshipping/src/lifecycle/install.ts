import { DataSource } from 'typeorm';
import { OrganizationDropshippingService } from '../services/OrganizationDropshippingService.js';

/**
 * Organization-Dropshipping Extension Install Hook
 *
 * This hook is executed when the extension is installed.
 * It sets up the organization-dropshipping integration.
 */
export async function onInstall(dataSource: DataSource): Promise<void> {
  console.log('[organization-dropshipping] Installing extension...');

  const service = new OrganizationDropshippingService(dataSource);

  // Subscribe to organization lifecycle events
  // Note: This assumes organization-core provides event emitters
  // If not available yet, this can be implemented later when
  // organization-core adds event support

  console.log('[organization-dropshipping] Extension installed successfully');
  console.log('[organization-dropshipping] Features:');
  console.log('  - Organization-scoped products');
  console.log('  - Organization-based groupbuys');
  console.log('  - Hierarchical dropshipping permissions');
  console.log('  - Organization-specific pricing');
  console.log('  - Groupbuy participant tracking');
}

/**
 * Organization-Dropshipping Extension Uninstall Hook
 */
export async function onUninstall(dataSource: DataSource): Promise<void> {
  console.log('[organization-dropshipping] Uninstalling extension...');

  // Cleanup: Remove event listeners
  // Note: Actual implementation depends on organization-core's event system

  console.log('[organization-dropshipping] Extension uninstalled successfully');
}
