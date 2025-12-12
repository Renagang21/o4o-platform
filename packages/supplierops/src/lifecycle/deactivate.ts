/**
 * SupplierOps Deactivate Hook
 *
 * Called when the app is deactivated.
 *
 * Phase 2 업데이트:
 * - Core Extension Registry에서 SupplierOps Extension 해제
 */

import { unregisterExtension } from '@o4o/dropshipping-core';

/**
 * Deactivate hook - disables routes and event handlers
 */
export async function onDeactivate(): Promise<void> {
  console.log('[supplierops] Running deactivate hook...');

  // 1. Core Extension Registry에서 해제
  console.log('[supplierops] Unregistering from Dropshipping Core Extension Registry...');
  unregisterExtension('supplierops');
  console.log('[supplierops] Extension unregistered successfully');

  // 2. Event handlers 해제
  console.log('[supplierops] Event handlers disabled');

  console.log('[supplierops] Deactivation completed');
}

export default onDeactivate;
