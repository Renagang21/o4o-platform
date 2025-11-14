/**
 * Seed test accounts with known password
 *
 * Creates or updates one test user per role with password: test123!@#
 */

import 'reflect-metadata';
import '../src/env-loader.js';
import { AppDataSource } from '../src/database/connection.js';
import { User } from '../src/entities/User.js';
import { UserRole, UserStatus } from '../src/types/auth.js';
import { hashPassword } from '../src/utils/auth.utils.js';
import logger from '../src/utils/logger.js';

const TEST_PASSWORD = 'test123!@#';

const testUsers = [
  {
    email: 'admin@test.com',
    name: 'Test Admin',
    role: UserRole.ADMIN,
  },
  {
    email: 'seller@test.com',
    name: 'Test Seller',
    role: UserRole.SELLER,
  },
  {
    email: 'supplier@test.com',
    name: 'Test Supplier',
    role: UserRole.SUPPLIER,
  },
  {
    email: 'partner@test.com',
    name: 'Test Partner',
    role: UserRole.PARTNER,
  },
  {
    email: 'customer@test.com',
    name: 'Test Customer',
    role: UserRole.CUSTOMER,
  },
];

async function seedTestAccounts() {
  try {
    // Initialize database
    await AppDataSource.initialize();
    logger.info('✅ Database connected');

    const userRepo = AppDataSource.getRepository(User);
    const hashedPassword = await hashPassword(TEST_PASSWORD);

    for (const testUser of testUsers) {
      // Check if user exists
      let user = await userRepo.findOne({
        where: { email: testUser.email }
      });

      if (user) {
        // Update existing user
        user.password = hashedPassword;
        user.name = testUser.name;
        user.role = testUser.role;
        user.status = UserStatus.ACTIVE;
        await userRepo.save(user);
        logger.info(`✅ Updated test user: ${testUser.email} (${testUser.role})`);
      } else {
        // Create new user
        user = userRepo.create({
          email: testUser.email,
          name: testUser.name,
          password: hashedPassword,
          role: testUser.role,
          roles: [testUser.role],
          status: UserStatus.ACTIVE,
          isEmailVerified: true,
          permissions: []
        });
        await userRepo.save(user);
        logger.info(`✅ Created test user: ${testUser.email} (${testUser.role})`);
      }
    }

    logger.info('\n✅ All test accounts seeded successfully!');
    logger.info(`\nTest credentials:`);
    logger.info(`  Password (all accounts): ${TEST_PASSWORD}`);
    logger.info(`\nAccounts created:`);
    testUsers.forEach(u => {
      logger.info(`  - ${u.role}: ${u.email}`);
    });

    await AppDataSource.destroy();
    process.exit(0);
  } catch (error) {
    logger.error('❌ Failed to seed test accounts:', error);
    process.exit(1);
  }
}

seedTestAccounts();
