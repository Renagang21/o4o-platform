/**
 * Create Admin User Script
 * Creates a super admin user with full permissions
 *
 * Usage:
 *   npx tsx src/scripts/create-admin-user.ts
 */

import { AppDataSource } from '../database/connection.js';
import { User } from '../entities/User.js';
import { Role } from '../entities/Role.js';
import { UserRole, UserStatus } from '../types/auth.js';
import bcrypt from 'bcrypt';
import logger from '../utils/logger.js';

interface CreateAdminOptions {
  email?: string;
  password?: string;
  name?: string;
}

async function createAdminUser(options: CreateAdminOptions = {}) {
  try {
    // Initialize database connection
    if (!AppDataSource.isInitialized) {
      logger.info('📡 Initializing database connection...');
      await AppDataSource.initialize();
    }

    const userRepo = AppDataSource.getRepository(User);
    const roleRepo = AppDataSource.getRepository(Role);

    // Default admin credentials
    const adminEmail = options.email || 'admin@neture.co.kr';
    const adminPassword = options.password || 'Admin123!';
    const adminName = options.name || 'System Administrator';

    logger.info('\n╔═══════════════════════════════════════════════════════════╗');
    logger.info('║         Creating Admin User                              ║');
    logger.info('╚═══════════════════════════════════════════════════════════╝\n');

    // Check if user already exists
    const existingUser = await userRepo.findOne({
      where: { email: adminEmail }
    });

    if (existingUser) {
      logger.info(`⚠️  User already exists:`);
      logger.info(`   Email: ${existingUser.email}`);
      logger.info(`   Name: ${existingUser.name}`);
      logger.info(`   ID: ${existingUser.id}`);
      logger.info(`   Status: ${existingUser.status}`);

      // WO-AUTH-DEV-RUNTIME-RECOVERY: 기존 계정의 status가 ACTIVE가 아니면 업데이트
      if (existingUser.status !== UserStatus.ACTIVE) {
        logger.info(`\n🔄 Updating status from '${existingUser.status}' to 'active'...`);
        existingUser.status = UserStatus.ACTIVE;
        existingUser.isActive = true;
        existingUser.isEmailVerified = true;
        await userRepo.save(existingUser);
        logger.info(`✅ Status updated to 'active' - login now enabled!`);
      }

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
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    // Create user
    logger.info('👤 Creating user...');
    const newUser = userRepo.create({
      email: adminEmail,
      password: hashedPassword,
      name: adminName,
      roles: [UserRole.SUPER_ADMIN],
      status: UserStatus.ACTIVE,  // WO-AUTH-DEV-RUNTIME-RECOVERY: 로그인 허용을 위해 필수
      isEmailVerified: true,
      isActive: true
    });

    await userRepo.save(newUser);
    logger.info(`✅ User created successfully!`);
    logger.info(`   ID: ${newUser.id}`);
    logger.info(`   Email: ${newUser.email}`);
    logger.info(`   Name: ${newUser.name}`);

    // Find or create admin role
    logger.info('\n🔍 Finding admin role...');
    let adminRole = await roleRepo.findOne({
      where: { name: 'super_admin' }
    });

    if (!adminRole) {
      adminRole = await roleRepo.findOne({
        where: { name: 'admin' }
      });
    }

    if (!adminRole) {
      logger.info('⚠️  No admin role found. Creating super_admin role...');
      adminRole = roleRepo.create({
        name: 'super_admin',
        displayName: 'Super Admin',
        description: 'Full system access',
        isActive: true,
        isSystem: true
      });
      await roleRepo.save(adminRole);
      logger.info('✅ Super admin role created');
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
    logger.info('║         Admin User Created Successfully                  ║');
    logger.info('╚═══════════════════════════════════════════════════════════╝\n');
    logger.info('📧 Email:    ' + adminEmail);
    logger.info('👤 Name:     ' + adminName);
    logger.info('🔑 Password: ' + adminPassword);
    logger.info('🛡️  Role:     ' + adminRole.displayName + ' (' + adminRole.name + ')');
    logger.info('\n⚠️  IMPORTANT: Change the password after first login!\n');

    return newUser;

  } catch (error: any) {
    logger.error('\n❌ Failed to create admin user:', error.message);
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
const options: CreateAdminOptions = {};

for (const arg of args) {
  if (arg.startsWith('--email=')) {
    options.email = arg.split('=')[1];
  } else if (arg.startsWith('--password=')) {
    options.password = arg.split('=')[1];
  } else if (arg.startsWith('--name=')) {
    options.name = arg.split('=')[1];
  } else if (arg === '--help') {
    console.log(`
Create Admin User Script
========================

Usage:
  npx tsx src/scripts/create-admin-user.ts [options]

Options:
  --email=<email>       Admin email (default: admin@neture.co.kr)
  --password=<password> Admin password (default: Admin123!)
  --name=<name>         Admin name (default: System Administrator)
  --help                Show this help message

Examples:
  npx tsx src/scripts/create-admin-user.ts
  npx tsx src/scripts/create-admin-user.ts --email=admin@example.com --password=MySecurePass123!
    `);
    process.exit(0);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  createAdminUser(options)
    .then(() => {
      logger.info('✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('❌ Script failed:', error);
      process.exit(1);
    });
}

export { createAdminUser };
