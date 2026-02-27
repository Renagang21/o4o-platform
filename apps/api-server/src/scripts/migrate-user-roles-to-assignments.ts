/**
 * Phase 1.2: User Roles → RoleAssignment Migration Script
 *
 * Migrates legacy User.role and User.roles to RoleAssignment table.
 * This ensures auth.middleware.ts::requireRole works correctly.
 *
 * Usage:
 *   npm run migration:roles
 *   or
 *   npx tsx scripts/migrate-user-roles-to-assignments.ts
 */

// MUST be first: Load environment variables
import '../env-loader.js';

// MUST import reflect-metadata before TypeORM entities
import 'reflect-metadata';

import { AppDataSource } from '../database/connection.js';
import { User } from '../modules/auth/entities/User.js';
import { RoleAssignment } from '../modules/auth/entities/RoleAssignment.js';
import logger from '../utils/logger.js';

interface MigrationStats {
  totalUsers: number;
  migratedUsers: number;
  totalAssignments: number;
  skippedUsers: number;
  errors: Array<{ userId: string; error: string }>;
}

async function migrateUserRoles(): Promise<MigrationStats> {
  const stats: MigrationStats = {
    totalUsers: 0,
    migratedUsers: 0,
    totalAssignments: 0,
    skippedUsers: 0,
    errors: []
  };

  try {
    // Initialize database connection
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      logger.info('[Migration] Database connection initialized');
    }

    const userRepo = AppDataSource.getRepository(User);
    const roleAssignmentRepo = AppDataSource.getRepository(RoleAssignment);

    // Get all users with roles
    const users = await userRepo.find({
      select: ['id', 'email', 'roles', 'createdAt']
    });

    stats.totalUsers = users.length;
    logger.info(`[Migration] Found ${stats.totalUsers} users to migrate`);

    for (const user of users) {
      try {
        // Collect all roles for this user
        const userRoles: string[] = [];

        // role column removed - Phase3-E: use roles array only
        // Add roles from roles array
        if (user.roles && Array.isArray(user.roles)) {
          userRoles.push(...user.roles);
        }

        // Remove duplicates
        const uniqueRoles = [...new Set(userRoles)];

        if (uniqueRoles.length === 0) {
          logger.debug(`[Migration] User ${user.id} has no roles, skipping`);
          stats.skippedUsers++;
          continue;
        }

        logger.debug(`[Migration] User ${user.id} (${user.email}) has roles: ${uniqueRoles.join(', ')}`);

        // Check existing assignments
        const existingAssignments = await roleAssignmentRepo.find({
          where: { userId: user.id }
        });

        const existingRoles = existingAssignments.map(a => a.role);

        // Create missing assignments
        let created = 0;
        for (const role of uniqueRoles) {
          if (existingRoles.includes(role)) {
            logger.debug(`[Migration] User ${user.id} already has ${role} assignment, skipping`);
            continue;
          }

          const assignment = new RoleAssignment();
          assignment.userId = user.id;
          assignment.role = role;
          assignment.isActive = true;
          assignment.validFrom = user.createdAt || new Date();
          assignment.assignedAt = new Date();
          assignment.assignedBy = 'system-migration';

          await roleAssignmentRepo.save(assignment);
          created++;
          stats.totalAssignments++;

          logger.info(`[Migration] Created ${role} assignment for user ${user.id} (${user.email})`);
        }

        if (created > 0) {
          stats.migratedUsers++;
        } else {
          stats.skippedUsers++;
        }

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        stats.errors.push({ userId: user.id, error: errorMsg });
        logger.error(`[Migration] Failed to migrate user ${user.id}:`, error);
      }
    }

    logger.info('[Migration] Summary:', {
      totalUsers: stats.totalUsers,
      migratedUsers: stats.migratedUsers,
      totalAssignments: stats.totalAssignments,
      skippedUsers: stats.skippedUsers,
      errors: stats.errors.length
    });

    if (stats.errors.length > 0) {
      logger.error('[Migration] Errors:', stats.errors);
    }

    return stats;

  } catch (error) {
    logger.error('[Migration] Fatal error:', error);
    throw error;
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      logger.info('[Migration] Database connection closed');
    }
  }
}

// Run migration if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateUserRoles()
    .then((stats) => {
      console.log('\n✅ Migration completed successfully!');
      console.log(`   Total users: ${stats.totalUsers}`);
      console.log(`   Migrated: ${stats.migratedUsers}`);
      console.log(`   Assignments created: ${stats.totalAssignments}`);
      console.log(`   Skipped: ${stats.skippedUsers}`);
      console.log(`   Errors: ${stats.errors.length}\n`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Migration failed:', error);
      process.exit(1);
    });
}

export { migrateUserRoles };
