/**
 * Forum Core - Uninstall Lifecycle Hook
 *
 * Executed when forum-core is uninstalled (removed).
 * Responsibilities:
 * - Check for extension apps that depend on forum-core
 * - Optionally purge forum data (keep-data by default)
 *
 * Note: Permissions removal is now handled by AppManager's PermissionService
 *
 * SAFETY: By default, data is KEPT. Only purge if explicitly requested.
 */

import type { UninstallContext } from '@o4o/types';

export async function uninstall(context: UninstallContext): Promise<void> {
  const { dataSource, logger, options = {} } = context;
  const { purgeData = false } = options;

  logger.info('[forum-core] Uninstalling...');

  // Note: Dependency checks are handled by AppManager before calling this hook

  // Optionally purge data
  if (purgeData) {
    logger.warn('[forum-core] PURGE MODE - Deleting all forum data!');
    await purgeForumData(dataSource, logger);
  } else {
    logger.info('[forum-core] Keep-data mode - Forum data will be preserved');
  }

  // Note: Permissions removal is now handled by AppManager's PermissionService

  logger.info('[forum-core] Uninstallation completed successfully.');
}

/**
 * Purge all forum data from the database
 * Note: This is handled by AppManager's AppDataCleaner, but kept here for reference
 */
async function purgeForumData(dataSource: any, logger: any): Promise<void> {
  const queryRunner = dataSource.createQueryRunner();

  try {
    await queryRunner.connect();
    await queryRunner.startTransaction();

    // Drop forum tables in reverse dependency order
    const forumTables = [
      'forum_like',
      'forum_bookmark',
      'forum_comment',
      'forum_tag',
      'forum_post',
      'forum_category',
    ];

    for (const tableName of forumTables) {
      try {
        await queryRunner.query(`DROP TABLE IF EXISTS "${tableName}" CASCADE`);
        logger.info(`[forum-core] Table dropped: ${tableName}`);
      } catch (error) {
        logger.error(`[forum-core] Error dropping table ${tableName}:`, error);
      }
    }

    await queryRunner.commitTransaction();
    logger.info('[forum-core] All forum data purged');
  } catch (error) {
    await queryRunner.rollbackTransaction();
    logger.error('[forum-core] Error purging data:', error);
    throw error;
  } finally {
    await queryRunner.release();
  }
}

export default uninstall;
