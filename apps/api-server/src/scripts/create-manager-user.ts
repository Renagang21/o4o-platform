/**
 * Create Manager User Script
 * Creates a regular admin/manager user with admin permissions
 *
 * Usage:
 *   npx tsx src/scripts/create-manager-user.ts
 */

import { AppDataSource } from '../database/connection.js';
import { User } from '../entities/User.js';
import { Role } from '../entities/Role.js';
import { UserRole } from '../types/auth.js';
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
    const roleRepo = AppDataSource.getRepository(Role);

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

      // Load user with roles
      const userWithRoles = await userRepo.findOne({
        where: { id: existingUser.id },
        relations: ['dbRoles']
      });

      if (userWithRoles?.dbRoles && userWithRoles.dbRoles.length > 0) {
        logger.info(`\n   Current roles:`);
        for (const role of userWithRoles.dbRoles) {
          logger.info(`   - ${role.name} (${role.displayName})`);
        }
      } else {
        logger.info(`\n   ⚠️  User has no roles assigned!`);
        logger.info(`   Legacy roles array: ${existingUser.roles?.join(', ')}`);
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
      roles: [UserRole.ADMIN],
      isEmailVerified: true,
      isActive: true
    });

    await userRepo.save(newUser);
    logger.info(`✅ User created successfully!`);
    logger.info(`   ID: ${newUser.id}`);
    logger.info(`   Email: ${newUser.email}`);
    logger.info(`   Name: ${newUser.name}`);

    // Find admin role
    logger.info('\n🔍 Finding admin role...');
    let adminRole = await roleRepo.findOne({
      where: { name: 'admin' }
    });

    if (!adminRole) {
      logger.info('⚠️  No admin role found. Creating admin role...');
      adminRole = roleRepo.create({
        name: 'admin',
        displayName: 'Admin',
        description: 'System administrator',
        isActive: true,
        isSystem: true
      });
      await roleRepo.save(adminRole);
      logger.info('✅ Admin role created');
    } else {
      logger.info(`✅ Found role: ${adminRole.name} (${adminRole.displayName})`);
    }

    // Assign role to user via dbRoles relation
    logger.info('\n🔗 Assigning role to user...');
    if (!newUser.dbRoles) {
      newUser.dbRoles = [];
    }
    newUser.dbRoles.push(adminRole);
    await userRepo.save(newUser);
    logger.info('✅ Role assigned successfully!');

    // Summary
    logger.info('\n╔═══════════════════════════════════════════════════════════╗');
    logger.info('║         Manager User Created Successfully                ║');
    logger.info('╚═══════════════════════════════════════════════════════════╝\n');
    logger.info('📧 Email:    ' + managerEmail);
    logger.info('👤 Name:     ' + managerName);
    logger.info('🔑 Password: ' + managerPassword);
    logger.info('🛡️  Role:     ' + adminRole.displayName + ' (' + adminRole.name + ')');
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
