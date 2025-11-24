/**
 * Reset Admin User Password
 *
 * Usage:
 *   npx tsx src/scripts/reset-admin-password.ts [--password=newpass]
 */

import { AppDataSource } from '../database/connection.js';
import { User } from '../entities/User.js';
import bcrypt from 'bcrypt';
import logger from '../utils/logger.js';

interface ResetPasswordOptions {
  email?: string;
  password?: string;
}

async function resetAdminPassword(options: ResetPasswordOptions = {}) {
  try {
    // Initialize database connection
    if (!AppDataSource.isInitialized) {
      logger.info('📡 Initializing database connection...');
      await AppDataSource.initialize();
    }

    const userRepo = AppDataSource.getRepository(User);

    // Default values
    const adminEmail = options.email || 'admin@neture.co.kr';
    const newPassword = options.password || 'Admin2024!';

    logger.info('\n╔═══════════════════════════════════════════════════════════╗');
    logger.info('║         Reset Admin Password                             ║');
    logger.info('╚═══════════════════════════════════════════════════════════╝\n');

    // Find admin user
    const adminUser = await userRepo.findOne({
      where: { email: adminEmail }
    });

    if (!adminUser) {
      logger.error(`❌ User not found: ${adminEmail}`);
      return;
    }

    logger.info(`📧 Email: ${adminUser.email}`);
    logger.info(`👤 Name: ${adminUser.name}`);
    logger.info(`🆔 ID: ${adminUser.id}`);

    // Hash new password
    logger.info('\n🔐 Hashing new password...');
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password directly (bypass BeforeUpdate hook)
    await userRepo
      .createQueryBuilder()
      .update(User)
      .set({ password: hashedPassword })
      .where('id = :id', { id: adminUser.id })
      .execute();

    logger.info('✅ Password updated successfully!');

    // Display credentials
    logger.info('\n╔═══════════════════════════════════════════════════════════╗');
    logger.info('║         New Admin Credentials                            ║');
    logger.info('╚═══════════════════════════════════════════════════════════╝\n');
    logger.info('📧 Email:    ' + adminEmail);
    logger.info('🔑 Password: ' + newPassword);
    logger.info('\n⚠️  IMPORTANT: Save these credentials securely!\n');

  } catch (error: any) {
    logger.error('\n❌ Failed to reset password:', error.message);
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
const options: ResetPasswordOptions = {};

for (const arg of args) {
  if (arg.startsWith('--email=')) {
    options.email = arg.split('=')[1];
  } else if (arg.startsWith('--password=')) {
    options.password = arg.split('=')[1];
  } else if (arg === '--help') {
    console.log(`
Reset Admin Password Script
===========================

Usage:
  npx tsx src/scripts/reset-admin-password.ts [options]

Options:
  --email=<email>       Admin email (default: admin@neture.co.kr)
  --password=<password> New password (default: Admin2024!)
  --help                Show this help message

Examples:
  npx tsx src/scripts/reset-admin-password.ts
  npx tsx src/scripts/reset-admin-password.ts --password=MyNewPass123!
    `);
    process.exit(0);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  resetAdminPassword(options)
    .then(() => {
      logger.info('✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('❌ Script failed:', error);
      process.exit(1);
    });
}

export { resetAdminPassword };
