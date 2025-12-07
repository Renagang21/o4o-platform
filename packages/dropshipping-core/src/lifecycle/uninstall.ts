/**
 * Dropshipping-Core Uninstall Hook
 *
 * Called when the Dropshipping-Core app is uninstalled
 * WARNING: This will remove all dropshipping data from the database
 */

import { DataSource } from 'typeorm';

export async function onUninstall(dataSource: DataSource): Promise<void> {
  console.log('[dropshipping-core] Uninstalling Dropshipping Core...');

  // WARNING: This will delete all dropshipping data
  // Tables to drop: All dropshipping_* tables

  try {
    // Drop tables in reverse dependency order
    await dataSource.query('DROP TABLE IF EXISTS dropshipping_commission_transactions CASCADE');
    await dataSource.query('DROP TABLE IF EXISTS dropshipping_commission_rules CASCADE');
    await dataSource.query('DROP TABLE IF EXISTS dropshipping_settlement_batches CASCADE');
    await dataSource.query('DROP TABLE IF EXISTS dropshipping_order_relays CASCADE');
    await dataSource.query('DROP TABLE IF EXISTS dropshipping_seller_listings CASCADE');
    await dataSource.query('DROP TABLE IF EXISTS dropshipping_supplier_product_offers CASCADE');
    await dataSource.query('DROP TABLE IF EXISTS dropshipping_product_masters CASCADE');
    await dataSource.query('DROP TABLE IF EXISTS dropshipping_sellers CASCADE');
    await dataSource.query('DROP TABLE IF EXISTS dropshipping_suppliers CASCADE');

    console.log(
      '[dropshipping-core] Dropshipping Core uninstalled successfully - all data removed'
    );
  } catch (error) {
    console.error('[dropshipping-core] Error during uninstallation:', error);
    throw error;
  }
}
