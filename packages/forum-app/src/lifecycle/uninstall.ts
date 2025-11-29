/**
 * Forum Core - Uninstall Lifecycle Hook
 *
 * Executed when forum-core is uninstalled (removed).
 * Responsibilities:
 * - Check for extension apps that depend on forum-core
 * - Optionally purge forum data (keep-data by default)
 * - Remove forum permissions
 *
 * SAFETY: By default, data is KEPT. Only purge if explicitly requested.
 */

export interface UninstallContext {
  appId: string;
  version: string;
  db: any;
  appManager?: any;
  options?: {
    purgeData?: boolean;
    force?: boolean;
  };
}

export async function uninstall(context: UninstallContext): Promise<void> {
  const { db, appManager, options = {} } = context;
  const { purgeData = false, force = false } = options;

  console.log('[forum-core] Uninstalling...');

  // 1. Check for dependent extension apps
  if (!force && appManager) {
    await checkDependencies(appManager);
  }

  // 2. Deactivate first (if still active)
  // This is handled by AppManager before calling uninstall

  // 3. Optionally purge data
  if (purgeData) {
    console.warn('[forum-core] PURGE MODE - Deleting all forum data!');
    await purgeForumData(db);
  } else {
    console.log('[forum-core] Keep-data mode - Forum data will be preserved');
  }

  // 4. Remove forum permissions (always)
  await removeForumPermissions(db);

  console.log('[forum-core] Uninstallation completed successfully.');
}

/**
 * Check if any extension apps depend on forum-core
 */
async function checkDependencies(appManager: any): Promise<void> {
  const dependentApps = await appManager.findDependentApps('forum-core');

  if (dependentApps.length > 0) {
    const appNames = dependentApps.map((app: any) => app.appId).join(', ');
    throw new Error(
      `Cannot uninstall forum-core: The following apps depend on it: ${appNames}. ` +
        `Please uninstall these apps first, or use --force to override.`
    );
  }

  console.log('[forum-core] No dependent apps found');
}

/**
 * Purge all forum data from the database
 */
async function purgeForumData(db: any): Promise<void> {
  const queryRunner = db.createQueryRunner();

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
        console.log(`[forum-core] Table dropped: ${tableName}`);
      } catch (error) {
        console.error(`[forum-core] Error dropping table ${tableName}:`, error);
      }
    }

    await queryRunner.commitTransaction();
    console.log('[forum-core] All forum data purged');
  } catch (error) {
    await queryRunner.rollbackTransaction();
    console.error('[forum-core] Error purging data:', error);
    throw error;
  } finally {
    await queryRunner.release();
  }
}

/**
 * Remove forum permissions
 */
async function removeForumPermissions(db: any): Promise<void> {
  const permissionRepository = db.getRepository('Permission');

  const forumPermissionNames = [
    'forum.read',
    'forum.write',
    'forum.comment',
    'forum.moderate',
    'forum.admin',
  ];

  for (const permName of forumPermissionNames) {
    try {
      await permissionRepository.delete({ name: permName });
      console.log(`[forum-core] Permission removed: ${permName}`);
    } catch (error) {
      console.error(`[forum-core] Error removing permission ${permName}:`, error);
    }
  }
}

export default uninstall;
