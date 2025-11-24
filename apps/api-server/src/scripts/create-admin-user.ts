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
import { UserRoleAssignment } from '../entities/UserRoleAssignment.js';
import bcrypt from 'bcrypt';
import logger from '../utils/logger.js';

interface CreateAdminOptions {
  email?: string;
  username?: string;
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
    const roleAssignmentRepo = AppDataSource.getRepository(UserRoleAssignment);

    // Default admin credentials
    const adminEmail = options.email || 'admin@neture.co.kr';
    const adminUsername = options.username || 'admin';
    const adminPassword = options.password || 'Admin123!';
    const adminName = options.name || 'System Administrator';

    logger.info('\n╔═══════════════════════════════════════════════════════════╗');
    logger.info('║         Creating Admin User                              ║');
    logger.info('╚═══════════════════════════════════════════════════════════╝\n');

    // Check if user already exists
    const existingUser = await userRepo.findOne({
      where: [
        { email: adminEmail },
        { username: adminUsername }
      ]
    });

    if (existingUser) {
      logger.info(`⚠️  User already exists:`);
      logger.info(`   Email: ${existingUser.email}`);
      logger.info(`   Username: ${existingUser.username}`);
      logger.info(`   ID: ${existingUser.id}`);

      // Check roles
      const assignments = await roleAssignmentRepo.find({
        where: { userId: existingUser.id },
        relations: ['role']
      });

      if (assignments.length > 0) {
        logger.info(`\n   Current roles:`);
        for (const assignment of assignments) {
          logger.info(`   - ${assignment.role.name} (${assignment.role.slug})`);
        }
      } else {
        logger.info(`\n   ⚠️  User has no roles assigned!`);
        logger.info(`   Would you like to assign admin role? (Run with --assign-role flag)`);
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
      username: adminUsername,
      password: hashedPassword,
      name: adminName,
      emailVerified: true,
      isActive: true
    });

    await userRepo.save(newUser);
    logger.info(`✅ User created successfully!`);
    logger.info(`   ID: ${newUser.id}`);
    logger.info(`   Email: ${newUser.email}`);
    logger.info(`   Username: ${newUser.username}`);

    // Find or create admin role
    logger.info('\n🔍 Finding admin role...');
    let adminRole = await roleRepo.findOne({
      where: { slug: 'super_admin' }
    });

    if (!adminRole) {
      adminRole = await roleRepo.findOne({
        where: { slug: 'admin' }
      });
    }

    if (!adminRole) {
      logger.info('⚠️  No admin role found. Creating super_admin role...');
      adminRole = roleRepo.create({
        name: 'Super Admin',
        slug: 'super_admin',
        description: 'Full system access',
        isActive: true
      });
      await roleRepo.save(adminRole);
      logger.info('✅ Super admin role created');
    } else {
      logger.info(`✅ Found role: ${adminRole.name} (${adminRole.slug})`);
    }

    // Assign role to user
    logger.info('\n🔗 Assigning role to user...');
    const roleAssignment = roleAssignmentRepo.create({
      userId: newUser.id,
      roleId: adminRole.id,
      assignedBy: newUser.id, // Self-assigned for first admin
      assignedAt: new Date()
    });

    await roleAssignmentRepo.save(roleAssignment);
    logger.info('✅ Role assigned successfully!');

    // Summary
    logger.info('\n╔═══════════════════════════════════════════════════════════╗');
    logger.info('║         Admin User Created Successfully                  ║');
    logger.info('╚═══════════════════════════════════════════════════════════╝\n');
    logger.info('📧 Email:    ' + adminEmail);
    logger.info('👤 Username: ' + adminUsername);
    logger.info('🔑 Password: ' + adminPassword);
    logger.info('🛡️  Role:     ' + adminRole.name);
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
  } else if (arg.startsWith('--username=')) {
    options.username = arg.split('=')[1];
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
  --username=<username> Admin username (default: admin)
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
