/**
 * Phase P0 Task D: Member → User Field Migration Script
 *
 * Migrates Member.name, Member.email, Member.phone to User entity
 * where User fields are empty. This prepares for removal of
 * duplicate fields from Member entity.
 *
 * Usage:
 *   pnpm -F @o4o/api-server migration:member-dedup
 *   or
 *   npx tsx src/scripts/migrate-member-to-user-fields.ts
 *
 * Rules:
 * - Member.name → User.name (if User.name is null/empty)
 * - Member.email → User.email (never overwrite - email is unique identifier)
 * - Member.phone → User.phone (if User.phone is null/empty)
 */

// MUST be first: Load environment variables
import '../env-loader.js';

// MUST import reflect-metadata before TypeORM entities
import 'reflect-metadata';

import { AppDataSource } from '../database/connection.js';
import logger from '../utils/logger.js';

interface MigrationStats {
  totalMembers: number;
  usersUpdated: number;
  namesMigrated: number;
  phonesMigrated: number;
  skipped: number;
  errors: Array<{ memberId: string; userId: string; error: string }>;
}

async function migrateMemberToUserFields(): Promise<MigrationStats> {
  const stats: MigrationStats = {
    totalMembers: 0,
    usersUpdated: 0,
    namesMigrated: 0,
    phonesMigrated: 0,
    skipped: 0,
    errors: [],
  };

  try {
    // Initialize database connection
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      logger.info('[Migration] Database connection initialized');
    }

    // Get all members with their user data
    const members = await AppDataSource.query(`
      SELECT
        m.id as member_id,
        m.user_id,
        m.name as member_name,
        m.email as member_email,
        m.phone as member_phone,
        u.name as user_name,
        u.email as user_email,
        u.phone as user_phone
      FROM yaksa_members m
      LEFT JOIN users u ON u.id = m.user_id
      WHERE m.user_id IS NOT NULL
    `);

    stats.totalMembers = members.length;
    logger.info(`[Migration] Found ${stats.totalMembers} members to process`);

    for (const row of members) {
      const {
        member_id,
        user_id,
        member_name,
        member_email,
        member_phone,
        user_name,
        user_email,
        user_phone,
      } = row;

      // Skip if no user found
      if (!user_id) {
        stats.skipped++;
        continue;
      }

      try {
        const updates: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        // Migrate name if User.name is empty and Member.name exists
        if (!user_name && member_name) {
          updates.push(`name = $${paramIndex++}`);
          values.push(member_name.trim());
          stats.namesMigrated++;
        }

        // Migrate phone if User.phone is empty and Member.phone exists
        if (!user_phone && member_phone) {
          updates.push(`phone = $${paramIndex++}`);
          values.push(member_phone.trim());
          stats.phonesMigrated++;
        }

        // Note: We don't migrate email because:
        // 1. User.email is the unique identifier
        // 2. Member.email might be different/outdated
        // 3. Email changes should be handled separately

        if (updates.length > 0) {
          values.push(user_id);
          const query = `
            UPDATE users
            SET ${updates.join(', ')}, updated_at = NOW()
            WHERE id = $${paramIndex}
          `;

          await AppDataSource.query(query, values);
          stats.usersUpdated++;

          logger.debug(
            `[Migration] Updated user ${user_id} with member data: ${updates.join(', ')}`
          );
        } else {
          stats.skipped++;
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        stats.errors.push({
          memberId: member_id,
          userId: user_id,
          error: errorMsg,
        });
        logger.error(
          `[Migration] Failed to migrate member ${member_id} to user ${user_id}:`,
          error
        );
      }
    }

    // Summary
    logger.info('[Migration] ===== Member→User Field Migration Summary =====');
    logger.info(`[Migration] Total Members: ${stats.totalMembers}`);
    logger.info(`[Migration] Users Updated: ${stats.usersUpdated}`);
    logger.info(`[Migration] Names Migrated: ${stats.namesMigrated}`);
    logger.info(`[Migration] Phones Migrated: ${stats.phonesMigrated}`);
    logger.info(`[Migration] Skipped (no updates needed): ${stats.skipped}`);
    logger.info(`[Migration] Errors: ${stats.errors.length}`);

    if (stats.errors.length > 0) {
      logger.error('[Migration] Errors:');
      for (const err of stats.errors.slice(0, 10)) {
        logger.error(`  - Member ${err.memberId} → User ${err.userId}: ${err.error}`);
      }
      if (stats.errors.length > 10) {
        logger.error(`  ... and ${stats.errors.length - 10} more errors`);
      }
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

/**
 * Verify the migration status
 */
async function verifyMigration(): Promise<void> {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }

  try {
    // Check for members without user data
    const membersWithoutUserName = await AppDataSource.query(`
      SELECT COUNT(*) as count
      FROM yaksa_members m
      JOIN users u ON u.id = m.user_id
      WHERE m.name IS NOT NULL
        AND m.name != ''
        AND (u.name IS NULL OR u.name = '')
    `);

    const membersWithoutUserPhone = await AppDataSource.query(`
      SELECT COUNT(*) as count
      FROM yaksa_members m
      JOIN users u ON u.id = m.user_id
      WHERE m.phone IS NOT NULL
        AND m.phone != ''
        AND (u.phone IS NULL OR u.phone = '')
    `);

    console.log('\n===== Migration Verification =====');
    console.log(
      `Members with name but User.name empty: ${membersWithoutUserName[0]?.count || 0}`
    );
    console.log(
      `Members with phone but User.phone empty: ${membersWithoutUserPhone[0]?.count || 0}`
    );

    const totalPending =
      parseInt(membersWithoutUserName[0]?.count || '0', 10) +
      parseInt(membersWithoutUserPhone[0]?.count || '0', 10);

    if (totalPending === 0) {
      console.log('\n✅ Migration complete! All Member data has been migrated to User.');
    } else {
      console.log(
        `\n⚠️ ${totalPending} records still need migration. Run migration again.`
      );
    }
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
}

// Run migration if executed directly
const isMainModule =
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith('migrate-member-to-user-fields.ts');

if (isMainModule) {
  const command = process.argv[2];

  if (command === 'verify') {
    verifyMigration()
      .then(() => process.exit(0))
      .catch((error) => {
        console.error('Verification failed:', error);
        process.exit(1);
      });
  } else {
    migrateMemberToUserFields()
      .then((stats) => {
        console.log('\n===== Migration Complete =====');
        console.log(`Total Members: ${stats.totalMembers}`);
        console.log(`Users Updated: ${stats.usersUpdated}`);
        console.log(`Names Migrated: ${stats.namesMigrated}`);
        console.log(`Phones Migrated: ${stats.phonesMigrated}`);
        console.log(`Skipped: ${stats.skipped}`);
        console.log(`Errors: ${stats.errors.length}`);

        if (stats.errors.length === 0) {
          console.log('\n✅ Migration completed successfully!');
        } else {
          console.log('\n⚠️ Migration completed with some errors.');
        }

        process.exit(stats.errors.length > 0 ? 1 : 0);
      })
      .catch((error) => {
        console.error('\n❌ Migration failed:', error);
        process.exit(1);
      });
  }
}

export { migrateMemberToUserFields, verifyMigration };
