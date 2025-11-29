/**
 * Dropshipping Core - Install Lifecycle Hook
 *
 * Executed when dropshipping-core is installed for the first time.
 * Responsibilities:
 * - Check for existing tables
 * - Seed permissions
 * - Initialize default data (optional)
 */

import type { InstallContext } from '@o4o/types';

export async function install(context: InstallContext): Promise<void> {
  const { dataSource, options = {}, logger } = context;
  const { adoptExistingTables = true, seedDefaultData = false } = options;

  logger.info('[dropshipping-core] Installing...');

  // 1. Check for existing tables
  if (adoptExistingTables) {
    const hasDropshippingTables = await checkDropshippingTablesExist(dataSource);
    if (hasDropshippingTables) {
      logger.info('[dropshipping-core] Existing dropshipping tables found. Adopting them.');
    } else {
      logger.info('[dropshipping-core] No existing tables. Will create during migration.');
    }
  }

  // 2. Seed permissions (handled by AppManager's PermissionService)
  logger.info('[dropshipping-core] Permissions will be registered by AppManager');

  // 3. Seed default data (optional)
  if (seedDefaultData) {
    await seedDefaultData_Internal(dataSource, logger);
  }

  logger.info('[dropshipping-core] Installation completed successfully.');
}

/**
 * Check if dropshipping tables exist in the database
 */
async function checkDropshippingTablesExist(dataSource: any): Promise<boolean> {
  try {
    const queryRunner = dataSource.createQueryRunner();
    const tables = await queryRunner.getTables();
    await queryRunner.release();

    const dropshippingTables = [
      'products',
      'suppliers',
      'sellers',
      'partners',
    ];

    return dropshippingTables.every((tableName) =>
      tables.some((table: any) => table.name === tableName)
    );
  } catch (error) {
    return false;
  }
}

/**
 * Seed default data
 */
async function seedDefaultData_Internal(dataSource: any, logger: any): Promise<void> {
  logger.info('[dropshipping-core] Seeding default data...');

  // TODO: Add default commission policies, etc.

  logger.info('[dropshipping-core] Default data seeded.');
}

export default install;
