import { UninstallContext } from '../types/context.js';

/**
 * Uninstall Hook
 *
 * organization-core 앱 삭제 시 실행됩니다.
 * - 데이터 정리 (옵션: purgeData)
 * - RoleAssignment 정리
 * - 권한 삭제
 * - 테이블 삭제 (옵션: dropTables)
 */
export async function uninstall(context: UninstallContext): Promise<void> {
  const { dataSource, manifest, logger, options = {} } = context;

  logger.info(`[${manifest.appId}] Starting uninstallation...`);

  try {
    // 1. 데이터 삭제 (선택적)
    if (options.purgeData) {
      await purgeData(dataSource, logger);
    } else {
      logger.warn('Data preserved (purgeData=false).');
    }

    // 2. RoleAssignment 정리
    await cleanupRoleAssignments(dataSource, logger);

    // 3. 권한 삭제
    await deletePermissions(dataSource, manifest, logger);

    // 4. 테이블 삭제 (선택적)
    if (options.dropTables) {
      await dropTables(dataSource, logger);
    } else {
      logger.warn('Tables preserved (dropTables=false).');
    }

    logger.info(`[${manifest.appId}] Uninstallation completed successfully.`);
  } catch (error) {
    logger.error(`[${manifest.appId}] Uninstallation failed:`, error);
    throw error;
  }
}

/**
 * 데이터 삭제
 */
async function purgeData(dataSource: any, logger: any): Promise<void> {
  logger.info('Purging organization data...');

  await dataSource.query(`DELETE FROM organization_members`);
  await dataSource.query(`DELETE FROM organizations`);

  logger.info('Organization data purged.');
}

/**
 * RoleAssignment 정리
 *
 * scopeType='organization'인 권한 삭제
 */
async function cleanupRoleAssignments(
  dataSource: any,
  logger: any
): Promise<void> {
  logger.info('Cleaning up organization role assignments...');

  // role_assignments 테이블 존재 여부 확인
  const hasTable = await dataSource.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_name = 'role_assignments'
    );
  `);

  if (!hasTable[0].exists) {
    logger.warn('role_assignments table does not exist. Skipping cleanup.');
    return;
  }

  await dataSource.query(`
    DELETE FROM role_assignments
    WHERE scope_type = 'organization'
  `);

  logger.info('Organization role assignments cleaned up.');
}

/**
 * 권한 삭제
 */
async function deletePermissions(
  dataSource: any,
  manifest: any,
  logger: any
): Promise<void> {
  logger.info('Deleting permissions...');

  // permissions 테이블 존재 여부 확인
  const hasTable = await dataSource.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_name = 'permissions'
    );
  `);

  if (!hasTable[0].exists) {
    logger.warn('permissions table does not exist. Skipping permission deletion.');
    return;
  }

  for (const perm of manifest.permissions) {
    await dataSource.query(`DELETE FROM permissions WHERE id = $1`, [perm.id]);
    logger.info(`Permission deleted: ${perm.id}`);
  }

  logger.info('Permissions deleted successfully.');
}

/**
 * 테이블 삭제
 */
async function dropTables(dataSource: any, logger: any): Promise<void> {
  logger.info('Dropping tables...');

  await dataSource.query(`DROP TABLE IF EXISTS organization_members CASCADE`);
  await dataSource.query(`DROP TABLE IF EXISTS organizations CASCADE`);

  logger.info('Tables dropped successfully.');
}
