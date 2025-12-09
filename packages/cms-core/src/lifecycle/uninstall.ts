import { UninstallContext } from '../types/context.js';

/**
 * Uninstall Hook
 *
 * cms-core 앱 삭제 시 실행됩니다.
 * - 테이블 삭제 (purgeData가 true인 경우)
 * - 앱 레지스트리에서 제거
 */
export async function uninstall(context: UninstallContext): Promise<void> {
  const { dataSource, manifest, logger, purgeData = false } = context;

  logger.info(`[${manifest.appId}] Uninstalling... (purgeData: ${purgeData})`);

  try {
    // 1. Drop tables if purging data
    if (purgeData) {
      await dropTables(dataSource, manifest.ownsTables, logger);
    }

    // 2. Remove from app_registry
    await unregisterApp(dataSource, manifest.appId);

    logger.info(`[${manifest.appId}] Uninstalled successfully.`);
  } catch (error) {
    logger.error(`[${manifest.appId}] Uninstall failed:`, error);
    throw error;
  }
}

async function dropTables(
  dataSource: any,
  tables: string[],
  logger: any
): Promise<void> {
  logger.warn('Dropping CMS tables...');

  // Drop tables in reverse dependency order
  const tablesToDrop = [
    'cms_media_tags',
    'cms_media_folders',
    'cms_media_files',
    'cms_media',
    'cms_menu_locations',
    'cms_menu_items',
    'cms_menus',
    'cms_settings',
    'cms_acf_values',
    'cms_acf_fields',
    'cms_acf_field_groups',
    'cms_cpt_fields',
    'cms_cpt_types',
    'cms_views',
    'cms_template_parts',
    'cms_templates',
  ];

  for (const table of tablesToDrop) {
    try {
      await dataSource.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
      logger.info(`Dropped table: ${table}`);
    } catch (error) {
      logger.warn(`Failed to drop table ${table}:`, error);
    }
  }

  logger.warn('CMS tables dropped.');
}

async function unregisterApp(dataSource: any, appId: string): Promise<void> {
  // Check if app_registry table exists
  const hasTable = await dataSource.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_name = 'app_registry'
    );
  `);

  if (!hasTable[0].exists) {
    return;
  }

  await dataSource.query(`DELETE FROM app_registry WHERE "appId" = $1`, [appId]);
}
