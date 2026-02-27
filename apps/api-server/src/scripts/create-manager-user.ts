/**
 * Create Manager User Script
 * Creates a regular admin/manager user with admin permissions
 *
 * Usage:
 *   npx tsx src/scripts/create-manager-user.ts
 */

import { AppDataSource } from '../database/connection.js';
import { User } from '../entities/User.js';
import bcrypt from 'bcrypt';
import logger from '../utils/logger.js';

interface CreateManagerOptions {
  email?: string;
  password?: string;
  name?: string;
}

async function createManagerUser(options: CreateManagerOptions = {}) {
  try {
    // Initialize database connection
    if (!AppDataSource.isInitialized) {
      logger.info('📡 Initializing database connection...');
      await AppDataSource.initialize();
    }

    const userRepo = AppDataSource.getRepository(User);

    // Default manager credentials
    const managerEmail = options.email || 'manager@neture.co.kr';
    const managerPassword = options.password || 'Manager2024!';
    const managerName = options.name || 'General Manager';

    logger.info('\n╔═══════════════════════════════════════════════════════════╗');
    logger.info('║         Creating Manager User                            ║');
    logger.info('╚═══════════════════════════════════════════════════════════╝\n');

    // Check if user already exists
    const existingUser = await userRepo.findOne({
      where: { email: managerEmail }
    });

    if (existingUser) {
      logger.info(`⚠️  User already exists:`);
      logger.info(`   Email: ${existingUser.email}`);
      logger.info(`   Name: ${existingUser.name}`);
      logger.info(`   ID: ${existingUser.id}`);

      // Phase3-E: Query role_assignments (dbRoles ManyToMany dropped)
      const raRows: { role: string }[] = await AppDataSource.query(
        `SELECT role FROM role_assignments WHERE user_id = $1 AND is_active = true ORDER BY assigned_at ASC`,
        [existingUser.id]
      );
      if (raRows && raRows.length > 0) {
        logger.info(`\n   Current roles (role_assignments):`);
        for (const row of raRows) {
          logger.info(`   - ${row.role}`);
        }
      } else {
        logger.info(`\n   ⚠️  User has no active role_assignments!`);
      }

      return existingUser;
    }

    // Hash password
    logger.info('🔐 Hashing password...');
    const hashedPassword = await bcrypt.hash(managerPassword, 10);

    // Create user
    logger.info('👤 Creating user...');
    const newUser = userRepo.create({
      email: managerEmail,
      password: hashedPassword,
      name: managerName,
      isEmailVerified: true,
      isActive: true
    });

    await userRepo.save(newUser);
    logger.info(`✅ User created successfully!`);
    logger.info(`   ID: ${newUser.id}`);
    logger.info(`   Email: ${newUser.email}`);
    logger.info(`   Name: ${newUser.name}`);

    // Phase3-E: Insert role_assignments (roles/user_roles tables dropped)
    logger.info('\n🔗 Assigning admin role via role_assignments...');
    await AppDataSource.query(
      `INSERT INTO role_assignments (id, user_id, role, is_active, valid_from, assigned_at, scope_type)
       VALUES (gen_random_uuid(), $1, $2, true, NOW(), NOW(), 'global')
       ON CONFLICT ON CONSTRAINT "unique_active_role_per_user" DO NOTHING`,
      [newUser.id, 'admin']
    );
    logger.info('✅ Role assigned successfully!');

    // Summary
    logger.info('\n╔═══════════════════════════════════════════════════════════╗');
    logger.info('║         Manager User Created Successfully                ║');
    logger.info('╚═══════════════════════════════════════════════════════════╝\n');
    logger.info('📧 Email:    ' + managerEmail);
    logger.info('👤 Name:     ' + managerName);
    logger.info('🔑 Password: ' + managerPassword);
    logger.info('🛡️  Role:     admin (role_assignments)');
    logger.info('\n⚠️  IMPORTANT: Change the password after first login!\n');

    return newUser;

  } catch (error: any) {
    logger.error('\n❌ Failed to create manager user:', error.message);
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
const options: CreateManagerOptions = {};

for (const arg of args) {
  if (arg.startsWith('--email=')) {
    options.email = arg.split('=')[1];
  } else if (arg.startsWith('--password=')) {
    options.password = arg.split('=')[1];
  } else if (arg.startsWith('--name=')) {
    options.name = arg.split('=')[1];
  } else if (arg === '--help') {
    console.log(`
Create Manager User Script
===========================

Usage:
  npx tsx src/scripts/create-manager-user.ts [options]

Options:
  --email=<email>       Manager email (default: manager@neture.co.kr)
  --password=<password> Manager password (default: Manager2024!)
  --name=<name>         Manager name (default: General Manager)
  --help                Show this help message

Examples:
  npx tsx src/scripts/create-manager-user.ts
  npx tsx src/scripts/create-manager-user.ts --email=manager@example.com --password=MySecurePass123!
    `);
    process.exit(0);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  createManagerUser(options)
    .then(() => {
      logger.info('✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('❌ Script failed:', error);
      process.exit(1);
    });
}

export { createManagerUser };
