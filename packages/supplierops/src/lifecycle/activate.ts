/**
 * SupplierOps Activate Hook
 *
 * Called when the app is activated.
 *
 * Phase 2 업데이트:
 * - Core Extension Registry에 SupplierOps Extension 등록
 * - Validation Hook 자동 연결
 */

import { registerExtension } from '@o4o/dropshipping-core';
import { supplierOpsExtension } from '../extension.js';

/**
 * Activate hook - enables routes and event handlers
 */
export async function onActivate(): Promise<void> {
  console.log('[supplierops] Running activate hook...');

  // 1. Core Extension Registry에 등록
  console.log('[supplierops] Registering with Dropshipping Core Extension Registry...');
  registerExtension(supplierOpsExtension);
  console.log('[supplierops] Extension registered successfully');

  // 2. Event handlers 등록
  console.log('[supplierops] Event handlers enabled:');
  console.log('[supplierops] - product.master.created');
  console.log('[supplierops] - product.offer.created');
  console.log('[supplierops] - order.relay.dispatched');
  console.log('[supplierops] - settlement.closed');

  console.log('[supplierops] Activation completed');
}

export default onActivate;
