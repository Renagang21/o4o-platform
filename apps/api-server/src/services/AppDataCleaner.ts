import { DataSource } from 'typeorm';
import { AppDataSource } from '../database/connection.js';
import logger from '../utils/logger.js';

/**
 * Purge options for app data cleanup
 */
export interface PurgeOptions {
  appId: string;
  appType: 'core' | 'extension' | 'standalone';
  ownsTables?: string[];
  ownsCPT?: string[];
  ownsACF?: string[];
}

/**
 * Core table registry
 * Lists all tables owned by core apps to prevent extension apps from deleting them
 */
const CORE_TABLES_REGISTRY: Record<string, string[]> = {
  'forum-core': [
    'forum_post',
    'forum_category',
    'forum_comment',
    'forum_tag',
    'forum_like',
    'forum_bookmark',
  ],
};

/**
 * AppDataCleaner Service
 *
 * Handles data cleanup when uninstalling apps with purge option
 * - Drops database tables owned by the app
 * - Removes CPT registrations
 * - Deletes ACF field groups
 * - Ensures extension apps cannot delete core tables
 */
export class AppDataCleaner {
  private dataSource: DataSource;

  constructor() {
    this.dataSource = AppDataSource;
  }

  /**
   * Purge all data owned by an app
   *
   * @param options - Purge configuration
   * @throws Error if extension app tries to delete core tables
   */
  async purge(options: PurgeOptions): Promise<void> {
    const { appId, appType, ownsTables = [], ownsCPT = [], ownsACF = [] } = options;

    logger.info(`[AppDataCleaner] Starting purge for ${appId} (${appType})`);

    // Safety check: Extension apps cannot delete core tables
    if (appType === 'extension') {
      this.validateExtensionPurge(ownsTables);
    }

    // Drop tables
    if (ownsTables.length > 0) {
      await this.dropTables(ownsTables, appId);
    }

    // Delete CPTs
    if (ownsCPT.length > 0) {
      await this.deleteCPTs(ownsCPT, appId);
    }

    // Delete ACF groups
    if (ownsACF.length > 0) {
      await this.deleteACFs(ownsACF, appId);
    }

    logger.info(`[AppDataCleaner] Purge completed for ${appId}`);
  }

  /**
   * Validate that extension apps don't try to delete core tables
   *
   * @param tables - Tables to be deleted
   * @throws Error if any table is a core table
   */
  private validateExtensionPurge(tables: string[]): void {
    // Get all core tables from registry
    const allCoreTables = Object.values(CORE_TABLES_REGISTRY).flat();

    // Check if any table is a core table
    const coreTablesInList = tables.filter(table => allCoreTables.includes(table));

    if (coreTablesInList.length > 0) {
      throw new Error(
        `Extension app cannot delete core tables: ${coreTablesInList.join(', ')}. ` +
        `Only the core app that owns these tables can delete them.`
      );
    }
  }

  /**
   * Drop database tables
   *
   * @param tables - Table names to drop
   * @param appId - App identifier (for logging)
   */
  private async dropTables(tables: string[], appId: string): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();

    try {
      await queryRunner.connect();

      for (const tableName of tables) {
        // Check if table exists
        const tableExists = await queryRunner.hasTable(tableName);

        if (!tableExists) {
          logger.warn(`[AppDataCleaner] Table ${tableName} does not exist, skipping`);
          continue;
        }

        // Drop table with CASCADE to remove dependencies
        logger.info(`[AppDataCleaner] Dropping table: ${tableName}`);
        await queryRunner.query(`DROP TABLE IF EXISTS "${tableName}" CASCADE`);
        logger.info(`[AppDataCleaner] Table ${tableName} dropped successfully`);
      }
    } catch (error) {
      logger.error(`[AppDataCleaner] Error dropping tables for ${appId}:`, error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Delete CPT registrations
   *
   * @param cptNames - CPT type names to delete
   * @param appId - App identifier (for logging)
   */
  private async deleteCPTs(cptNames: string[], appId: string): Promise<void> {
    // TODO: Implement CPT registry deletion
    // This would remove CPT definitions from custom_post_types table
    logger.info(`[AppDataCleaner] Would delete CPTs for ${appId}: ${cptNames.join(', ')}`);
    logger.warn('[AppDataCleaner] CPT deletion not yet implemented');
  }

  /**
   * Delete ACF field groups
   *
   * @param acfGroups - ACF group names to delete
   * @param appId - App identifier (for logging)
   */
  private async deleteACFs(acfGroups: string[], appId: string): Promise<void> {
    // TODO: Implement ACF field group deletion
    // This would remove ACF definitions from acf_field_groups table
    logger.info(`[AppDataCleaner] Would delete ACF groups for ${appId}: ${acfGroups.join(', ')}`);
    logger.warn('[AppDataCleaner] ACF deletion not yet implemented');
  }

  /**
   * Register core tables for a core app
   * Used to track which tables are owned by which core app
   *
   * @param appId - Core app identifier
   * @param tables - Tables owned by this core app
   */
  static registerCoreTables(appId: string, tables: string[]): void {
    CORE_TABLES_REGISTRY[appId] = tables;
  }

  /**
   * Get all core tables
   *
   * @returns List of all core table names
   */
  static getAllCoreTables(): string[] {
    return Object.values(CORE_TABLES_REGISTRY).flat();
  }

  /**
   * Check if a table is a core table
   *
   * @param tableName - Table to check
   * @returns true if table is owned by a core app
   */
  static isCoreTable(tableName: string): boolean {
    return this.getAllCoreTables().includes(tableName);
  }
}
