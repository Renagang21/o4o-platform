/**
 * Check Admin User Permissions
 *
 * Usage:
 *   npx tsx src/scripts/check-admin-permissions.ts
 */

import { AppDataSource } from '../database/connection.js';
import { User } from '../entities/User.js';
import logger from '../utils/logger.js';

async function checkAdminPermissions() {
  try {
    // Initialize database connection
    if (!AppDataSource.isInitialized) {
      logger.info('📡 Initializing database connection...');
      await AppDataSource.initialize();
    }

    const userRepo = AppDataSource.getRepository(User);

    // Find admin user (Phase3-E: dbRoles ManyToMany dropped — use role_assignments)
    const adminUser = await userRepo.findOne({
      where: { email: 'admin@neture.co.kr' },
    });

    if (!adminUser) {
      logger.error('❌ Admin user not found');
      return;
    }

    logger.info('\n╔═══════════════════════════════════════════════════════════╗');
    logger.info('║         Admin User Permissions                           ║');
    logger.info('╚═══════════════════════════════════════════════════════════╝\n');
    logger.info(`📧 Email: ${adminUser.email}`);
    logger.info(`👤 Name: ${adminUser.name}`);
    logger.info(`🆔 ID: ${adminUser.id}`);

    // Phase3-E: roles from role_assignments (users.roles column dropped)
    const raRows: { role: string }[] = await AppDataSource.query(
      `SELECT role FROM role_assignments WHERE user_id = $1 AND is_active = true ORDER BY assigned_at ASC`,
      [adminUser.id]
    );
    if (raRows && raRows.length > 0) {
      logger.info(`\n🛡️  role_assignments (${raRows.length}):`);
      for (const row of raRows) {
        logger.info(`   - ${row.role}`);
      }
    } else {
      logger.info(`\n⚠️  No active role_assignments found`);
    }

    // Check if user has getAllPermissions method
    const allPermissions = adminUser.getAllPermissions();
    logger.info(`\n✅ Effective permissions (${allPermissions.length}):`);
    if (allPermissions.length > 0) {
      for (const perm of allPermissions) {
        logger.info(`   • ${perm}`);
      }
    } else {
      logger.warn(`   ⚠️  No effective permissions!`);
    }

    // Check specific permissions needed for users menu
    const requiredPerms = ['users.view', 'users.create', 'users.edit', 'users.delete'];
    logger.info(`\n🔍 Checking required permissions for users menu:`);
    for (const perm of requiredPerms) {
      const hasIt = adminUser.hasPermission(perm);
      logger.info(`   ${hasIt ? '✅' : '❌'} ${perm}`);
    }

  } catch (error: any) {
    logger.error('\n❌ Failed to check permissions:', error.message);
    logger.error(error.stack);
    throw error;
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  checkAdminPermissions()
    .then(() => {
      logger.info('\n✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('❌ Script failed:', error);
      process.exit(1);
    });
}

export { checkAdminPermissions };
