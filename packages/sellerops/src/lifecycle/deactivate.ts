/**
 * SellerOps Deactivate Hook
 *
 * Called when the SellerOps app is deactivated.
 *
 * Phase 2 업데이트:
 * - Core Extension Registry에서 SellerOps Extension 해제
 */

import { DataSource } from 'typeorm';
import { unregisterExtension } from '@o4o/dropshipping-core';

export async function onDeactivate(dataSource: DataSource): Promise<void> {
  console.log('[sellerops] Deactivating SellerOps App...');

  // 1. Core Extension Registry에서 해제
  console.log('[sellerops] Unregistering from Dropshipping Core Extension Registry...');
  unregisterExtension('sellerops');
  console.log('[sellerops] Extension unregistered successfully');

  // 2. Unregister event subscriptions
  console.log('[sellerops] Unregistering event subscriptions...');

  // Note: We don't delete data on deactivation, just disable functionality
  // Data cleanup happens only on uninstall

  console.log('[sellerops] SellerOps App deactivated successfully');
}

export default onDeactivate;
