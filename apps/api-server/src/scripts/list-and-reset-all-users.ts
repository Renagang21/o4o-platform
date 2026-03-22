/**
 * List All Users and Reset Their Passwords
 *
 * Usage:
 *   npx tsx src/scripts/list-and-reset-all-users.ts [--password=newpass]
 */

import { AppDataSource } from '../database/connection.js';
import { User } from '../entities/User.js';
import { hashPassword } from '../utils/auth.utils.js';
import logger from '../utils/logger.js';

interface ResetOptions {
  password?: string;
}

async function listAndResetAllUsers(options: ResetOptions = {}) {
  try {
    // Initialize database connection
    if (!AppDataSource.isInitialized) {
      logger.info('📡 Initializing database connection...');
      await AppDataSource.initialize();
    }

    const userRepo = AppDataSource.getRepository(User);

    // Default password
    const newPassword = options.password || 'User2024!';

    logger.info('\n╔═══════════════════════════════════════════════════════════╗');
    logger.info('║         List All Users & Reset Passwords                ║');
    logger.info('╚═══════════════════════════════════════════════════════════╝\n');

    // Find all users
    // Phase3-E: dbRoles ManyToMany dropped — no relations needed
    const users = await userRepo.find({
      select: ['id', 'email', 'name', 'isActive'],
    });

    if (users.length === 0) {
      logger.warn('⚠️  No users found in database');
      return;
    }

    logger.info(`📊 Found ${users.length} users\n`);

    // Hash new password once
    logger.info('🔐 Hashing password...');
    const hashedPassword = await hashPassword(newPassword);

    logger.info('\n📋 Users List:\n');

    // Update each user's password
    for (const user of users) {
      logger.info(`─────────────────────────────────────────────────────────────`);
      logger.info(`📧 Email: ${user.email}`);
      logger.info(`👤 Name: ${user.name || 'N/A'}`);
      logger.info(`🆔 ID: ${user.id}`);
      logger.info(`✅ Active: ${user.isActive}`);

      // Update password
      await userRepo
        .createQueryBuilder()
        .update(User)
        .set({ password: hashedPassword })
        .where('id = :id', { id: user.id })
        .execute();

      logger.info(`🔑 Password reset: ✅`);
      logger.info('');
    }

    // Summary
    logger.info('╔═══════════════════════════════════════════════════════════╗');
    logger.info('║         Password Reset Summary                           ║');
    logger.info('╚═══════════════════════════════════════════════════════════╝\n');
    logger.info(`✅ Successfully reset passwords for ${users.length} users`);
    logger.info(`🔑 New password for all users: ${newPassword}`);
    logger.info('\n⚠️  IMPORTANT: Save this password securely!\n');

    // Print credentials table
    logger.info('╔═══════════════════════════════════════════════════════════╗');
    logger.info('║         Login Credentials                                ║');
    logger.info('╚═══════════════════════════════════════════════════════════╝\n');

    for (const user of users) {
      logger.info(`Email: ${user.email}`);
      logger.info(`Password: ${newPassword}`);
      logger.info(`Roles: ${user.roles?.join(', ') || 'none'}`);
      logger.info('');
    }

  } catch (error: any) {
    logger.error('\n❌ Failed to reset passwords:', error.message);
    logger.error(error.stack);
    throw error;
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const options: ResetOptions = {};

for (const arg of args) {
  if (arg.startsWith('--password=')) {
    options.password = arg.split('=')[1];
  } else if (arg === '--help') {
    console.log(`
List All Users and Reset Passwords Script
==========================================

Usage:
  npx tsx src/scripts/list-and-reset-all-users.ts [options]

Options:
  --password=<password> New password for all users (default: User2024!)
  --help                Show this help message

Examples:
  npx tsx src/scripts/list-and-reset-all-users.ts
  npx tsx src/scripts/list-and-reset-all-users.ts --password=MyNewPass123!
    `);
    process.exit(0);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  listAndResetAllUsers(options)
    .then(() => {
      logger.info('✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('❌ Script failed:', error);
      process.exit(1);
    });
}

export { listAndResetAllUsers };
