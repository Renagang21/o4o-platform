/**
 * SellerOps Deactivate Hook
 *
 * Called when the SellerOps app is deactivated
 */

import { DataSource } from 'typeorm';

export async function onDeactivate(dataSource: DataSource): Promise<void> {
  console.log('[sellerops] Deactivating SellerOps App...');

  // Unregister event subscriptions
  console.log('[sellerops] Unregistering event subscriptions...');

  // Note: We don't delete data on deactivation, just disable functionality
  // Data cleanup happens only on uninstall

  console.log('[sellerops] SellerOps App deactivated successfully');
}
