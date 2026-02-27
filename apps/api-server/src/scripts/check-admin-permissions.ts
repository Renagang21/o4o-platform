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

    // Find admin user
    const adminUser = await userRepo.findOne({
      where: { email: 'admin@neture.co.kr' },
      relations: ['dbRoles', 'dbRoles.permissions']
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
    logger.info(`🏷️  Legacy roles array: ${JSON.stringify(adminUser.roles)}`);

    if (adminUser.dbRoles && adminUser.dbRoles.length > 0) {
      logger.info(`\n🛡️  Database roles (${adminUser.dbRoles.length}):`);
      for (const role of adminUser.dbRoles) {
        logger.info(`   - ${role.name} (${role.displayName})`);
        if (role.permissions && role.permissions.length > 0) {
          logger.info(`     Permissions from role:`);
          for (const perm of role.permissions) {
            logger.info(`       • ${perm.key} - ${perm.description}`);
          }
        } else {
          logger.info(`     ⚠️  No permissions assigned to this role`);
        }
      }
    } else {
      logger.info(`\n⚠️  No database roles assigned`);
    }

    logger.info(`\n📋 Direct user permissions: ${JSON.stringify(adminUser.permissions || [])}`);

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
