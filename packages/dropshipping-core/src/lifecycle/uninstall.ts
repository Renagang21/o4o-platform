/**
 * Dropshipping Core - Uninstall Lifecycle Hook
 *
 * Executed when dropshipping-core is uninstalled (removed).
 * Responsibilities:
 * - Optionally purge dropshipping data (keep-data by default)
 *
 * Note: Permissions removal is now handled by AppManager's PermissionService
 *
 * SAFETY: By default, data is KEPT. Only purge if explicitly requested.
 */

import type { UninstallContext } from '@o4o/types';

export async function uninstall(context: UninstallContext): Promise<void> {
  const { dataSource, logger, options = {} } = context;
  const { purgeData = false } = options;

  logger.info('[dropshipping-core] Uninstalling...');

  // Optionally purge data
  if (purgeData) {
    logger.warn('[dropshipping-core] PURGE MODE - Deleting all dropshipping data!');
    await purgeDropshippingData(dataSource, logger);
  } else {
    logger.info('[dropshipping-core] Keep-data mode - Dropshipping data will be preserved');
  }

  logger.info('[dropshipping-core] Uninstallation completed successfully.');
}

/**
 * Purge all dropshipping data from the database
 */
async function purgeDropshippingData(dataSource: any, logger: any): Promise<void> {
  const queryRunner = dataSource.createQueryRunner();

  try {
    await queryRunner.connect();
    await queryRunner.startTransaction();

    // Drop dropshipping tables in reverse dependency order
    const dropshippingTables = [
      'payment_settlements',
      'seller_channel_accounts',
      'channel_product_links',
      'settlement_items',
      'settlements',
      'partner_commissions',
      'commissions',
      'commission_policies',
      'seller_authorizations',
      'seller_products',
      'seller_profiles',
      'supplier_profiles',
      'partner_profiles',
      'partners',
      'sellers',
      'suppliers',
      'products',
    ];

    for (const tableName of dropshippingTables) {
      try {
        await queryRunner.query(`DROP TABLE IF EXISTS "${tableName}" CASCADE`);
        logger.info(`[dropshipping-core] Table dropped: ${tableName}`);
      } catch (error) {
        logger.error(`[dropshipping-core] Error dropping table ${tableName}:`, error);
      }
    }

    await queryRunner.commitTransaction();
    logger.info('[dropshipping-core] All dropshipping data purged');
  } catch (error) {
    await queryRunner.rollbackTransaction();
    logger.error('[dropshipping-core] Error purging data:', error);
    throw error;
  } finally {
    await queryRunner.release();
  }
}

export default uninstall;
