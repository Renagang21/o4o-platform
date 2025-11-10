#!/usr/bin/env ts-node
/**
 * Seed Users Script
 *
 * Creates 30 test users:
 * - 30 customers (base role)
 * - 6 additional suppliers (customer + supplier role)
 * - 9 additional sellers (customer + seller role)
 * - 5 additional partners (customer + partner role)
 *
 * Usage:
 * NODE_ENV=production node dist/scripts/seed-users.js
 */

import 'reflect-metadata';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import bcrypt from 'bcryptjs';
import { AppDataSource } from '../src/database/connection.js';
import { User, UserStatus } from '../src/entities/User.js';
import { RoleAssignment } from '../src/entities/RoleAssignment.js';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envFile = process.env.NODE_ENV === 'production' ? '.env-apiserver' : '.env.development';
// When compiled, script is in dist/scripts/, so we need to go up two levels to reach the api-server root
const envPath = path.resolve(__dirname, '../../', envFile);
console.log(`Loading environment from: ${envPath}`);
dotenv.config({ path: envPath });
console.log(`DB_PASSWORD type: ${typeof process.env.DB_PASSWORD}, value: ${process.env.DB_PASSWORD ? '[SET]' : '[NOT SET]'}`);

interface UserData {
  name: string;
  email: string;
  password: string;
  additionalRoles?: string[]; // customer is default, these are additional
}

// Generate test users
const users: UserData[] = [
  // Regular customers (10명)
  { name: '일반고객01', email: 'customer01@test.com', password: 'test1234' },
  { name: '일반고객02', email: 'customer02@test.com', password: 'test1234' },
  { name: '일반고객03', email: 'customer03@test.com', password: 'test1234' },
  { name: '일반고객04', email: 'customer04@test.com', password: 'test1234' },
  { name: '일반고객05', email: 'customer05@test.com', password: 'test1234' },
  { name: '일반고객06', email: 'customer06@test.com', password: 'test1234' },
  { name: '일반고객07', email: 'customer07@test.com', password: 'test1234' },
  { name: '일반고객08', email: 'customer08@test.com', password: 'test1234' },
  { name: '일반고객09', email: 'customer09@test.com', password: 'test1234' },
  { name: '일반고객10', email: 'customer10@test.com', password: 'test1234' },

  // Suppliers (6명 - customer + supplier role)
  { name: '공급자01_김철수', email: 'supplier01@test.com', password: 'test1234', additionalRoles: ['supplier'] },
  { name: '공급자02_이영희', email: 'supplier02@test.com', password: 'test1234', additionalRoles: ['supplier'] },
  { name: '공급자03_박민수', email: 'supplier03@test.com', password: 'test1234', additionalRoles: ['supplier'] },
  { name: '공급자04_정수진', email: 'supplier04@test.com', password: 'test1234', additionalRoles: ['supplier'] },
  { name: '공급자05_최동욱', email: 'supplier05@test.com', password: 'test1234', additionalRoles: ['supplier'] },
  { name: '공급자06_강미라', email: 'supplier06@test.com', password: 'test1234', additionalRoles: ['supplier'] },

  // Sellers (9명 - customer + seller role)
  { name: '판매자01_홍길동', email: 'seller01@test.com', password: 'test1234', additionalRoles: ['seller'] },
  { name: '판매자02_윤서연', email: 'seller02@test.com', password: 'test1234', additionalRoles: ['seller'] },
  { name: '판매자03_임재현', email: 'seller03@test.com', password: 'test1234', additionalRoles: ['seller'] },
  { name: '판매자04_조은비', email: 'seller04@test.com', password: 'test1234', additionalRoles: ['seller'] },
  { name: '판매자05_신동호', email: 'seller05@test.com', password: 'test1234', additionalRoles: ['seller'] },
  { name: '판매자06_한지민', email: 'seller06@test.com', password: 'test1234', additionalRoles: ['seller'] },
  { name: '판매자07_서준혁', email: 'seller07@test.com', password: 'test1234', additionalRoles: ['seller'] },
  { name: '판매자08_오나영', email: 'seller08@test.com', password: 'test1234', additionalRoles: ['seller'] },
  { name: '판매자09_백승우', email: 'seller09@test.com', password: 'test1234', additionalRoles: ['seller'] },

  // Partners (5명 - customer + partner role)
  { name: '파트너01_류현우', email: 'partner01@test.com', password: 'test1234', additionalRoles: ['partner'] },
  { name: '파트너02_송하은', email: 'partner02@test.com', password: 'test1234', additionalRoles: ['partner'] },
  { name: '파트너03_안준영', email: 'partner03@test.com', password: 'test1234', additionalRoles: ['partner'] },
  { name: '파트너04_문소희', email: 'partner04@test.com', password: 'test1234', additionalRoles: ['partner'] },
  { name: '파트너05_황태양', email: 'partner05@test.com', password: 'test1234', additionalRoles: ['partner'] },
];

async function seedUsers() {
  try {
    console.log('🌱 Starting to seed users...\n');

    // Initialize database connection
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      console.log('✅ Database connection initialized\n');
    }

    const userRepository = AppDataSource.getRepository(User);
    const roleAssignmentRepository = AppDataSource.getRepository(RoleAssignment);

    let createdCount = 0;
    let skippedCount = 0;

    for (const userData of users) {
      // Check if user already exists
      const existingUser = await userRepository.findOne({
        where: { email: userData.email }
      });

      if (existingUser) {
        console.log(`⏭️  User already exists: ${userData.email}`);
        skippedCount++;
        continue;
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 12);

      // Create user with base customer role
      const user = userRepository.create({
        email: userData.email,
        password: hashedPassword,
        name: userData.name,
        status: UserStatus.APPROVED, // Pre-approved for testing
        isActive: true,
        isEmailVerified: true,
      });

      const savedUser = await userRepository.save(user);

      // Create base customer role assignment
      const customerAssignment = roleAssignmentRepository.create({
        userId: savedUser.id,
        role: 'customer',
        isActive: true,
        validFrom: new Date(),
        assignedBy: 'system',
        assignedAt: new Date(),
      });
      await roleAssignmentRepository.save(customerAssignment);

      // Create additional role assignments
      if (userData.additionalRoles && userData.additionalRoles.length > 0) {
        for (const role of userData.additionalRoles) {
          const roleAssignment = roleAssignmentRepository.create({
            userId: savedUser.id,
            role: role,
            isActive: true,
            validFrom: new Date(),
            assignedBy: 'system',
            assignedAt: new Date(),
          });
          await roleAssignmentRepository.save(roleAssignment);
        }

        const rolesStr = ['customer', ...userData.additionalRoles].join(', ');
        console.log(`✅ Created user: ${userData.name} (${userData.email}) - Roles: ${rolesStr}`);
      } else {
        console.log(`✅ Created user: ${userData.name} (${userData.email}) - Role: customer`);
      }

      createdCount++;
    }

    // Summary
    console.log('\n📊 Seeding Summary:');
    console.log(`   - Users created: ${createdCount}`);
    console.log(`   - Users skipped (already exist): ${skippedCount}`);
    console.log(`   - Total users processed: ${users.length}`);

    console.log('\n📋 Role Distribution:');
    console.log(`   - Regular customers: 10 (customer only)`);
    console.log(`   - Suppliers: 6 (customer + supplier)`);
    console.log(`   - Sellers: 9 (customer + seller)`);
    console.log(`   - Partners: 5 (customer + partner)`);
    console.log(`   - Total: 30 users`);

    console.log('\n🔐 Login Credentials:');
    console.log(`   - Email: customer01@test.com ~ customer10@test.com`);
    console.log(`   - Email: supplier01@test.com ~ supplier06@test.com`);
    console.log(`   - Email: seller01@test.com ~ seller09@test.com`);
    console.log(`   - Email: partner01@test.com ~ partner05@test.com`);
    console.log(`   - Password (all users): test1234`);

    console.log('\n✨ Seeding completed successfully!\n');

    await AppDataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding users:', error);
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
    process.exit(1);
  }
}

// Run the seed
seedUsers();
