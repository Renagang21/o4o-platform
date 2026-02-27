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
    logger.info(`\n🏷️  roles: ${JSON.stringify(adminUser.roles)}`);

    // Phase3-E: Query role_assignments table directly for authoritative role data
    logger.info(`\n🛡️  RoleAssignments (authoritative source):`);
    try {
      const { roleAssignmentService } = await import('../modules/auth/services/role-assignment.service.js');
      const assignments = await roleAssignmentService.getActiveRoles(adminUser.id);
      if (assignments.length > 0) {
        for (const a of assignments) {
          logger.info(`   - ${a.role} (assigned: ${a.assignedAt}, active: ${a.isActive})`);
        }
      } else {
        logger.info(`   ⚠️  No active RoleAssignments found`);
      }

      // Get permissions via RoleAssignment service
      const permissions = await roleAssignmentService.getPermissions(adminUser.id);
      logger.info(`\n✅ Effective permissions via RoleAssignment (${permissions.length}):`);
      if (permissions.length > 0) {
        for (const perm of permissions) {
          logger.info(`   • ${perm}`);
        }
      } else {
        logger.warn(`   ⚠️  No effective permissions!`);
      }

      // Check specific permissions needed for users menu
      const requiredPerms = ['users.view', 'users.create', 'users.edit', 'users.delete'];
      logger.info(`\n🔍 Checking required permissions for users menu:`);
      for (const perm of requiredPerms) {
        const hasIt = await roleAssignmentService.hasPermission(adminUser.id, perm);
        logger.info(`   ${hasIt ? '✅' : '❌'} ${perm}`);
      }
    } catch (err: any) {
      logger.warn(`   ⚠️  RoleAssignment query failed: ${err.message}`);
      logger.info(`\n📋 Falling back to direct user permissions: ${JSON.stringify(adminUser.permissions || [])}`);
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
