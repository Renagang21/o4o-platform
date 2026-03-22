/**
 * Migration: SeedProductionTestAccounts
 *
 * Phase 5: Production Test Account Creation
 *
 * Creates test accounts for production testing:
 * - GlucoseView: pharmacist@test.test, admin@test.test
 * - K-Cosmetics: consumer@k-cosmetics.test, seller@k-cosmetics.test, supplier@k-cosmetics.test, admin@k-cosmetics.test
 *
 * Rules:
 * - Test accounts are identified by email prefix pattern
 * - Password: TestPassword (bcrypt hashed)
 * - Idempotent: skips if account already exists
 * - Minimum permissions principle
 *
 * Cleanup: Run separate cleanup Work Order to deactivate/delete after testing
 */

import { MigrationInterface, QueryRunner } from 'typeorm';
import bcrypt from 'bcryptjs';

// Test password (hashed at runtime)
const TEST_PASSWORD = 'TestPassword';

// Test account definitions
const TEST_ACCOUNTS = [
  // GlucoseView test accounts
  {
    email: 'pharmacist@o4o.com',
    name: 'Test Pharmacist',
    role: 'user', // Use standard role, specific permissions via domain
    domain: 'glucoseview.co.kr',
    description: 'GlucoseView 약사 테스트 계정',
  },
  {
    email: 'admin@o4o.com',
    name: 'Test Admin',
    role: 'admin',
    domain: 'glucoseview.co.kr',
    description: 'GlucoseView 관리자 테스트 계정',
  },
  // K-Cosmetics test accounts
  {
    email: 'consumer-k-cosmetics@o4o.com',
    name: 'Test Consumer',
    role: 'user',
    domain: 'k-cosmetics.site',
    description: 'K-Cosmetics 소비자 테스트 계정',
  },
  {
    email: 'seller-k-cosmetics@o4o.com',
    name: 'Test Seller',
    role: 'seller',
    domain: 'k-cosmetics.site',
    description: 'K-Cosmetics 판매자 테스트 계정',
  },
  {
    email: 'supplier-k-cosmetics@o4o.com',
    name: 'Test Supplier',
    role: 'supplier',
    domain: 'k-cosmetics.site',
    description: 'K-Cosmetics 공급자 테스트 계정',
  },
  {
    email: 'admin-k-cosmetics@o4o.com',
    name: 'Test Admin',
    role: 'admin',
    domain: 'k-cosmetics.site',
    description: 'K-Cosmetics 관리자 테스트 계정',
  },
];

export class SeedProductionTestAccounts1737000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Hash password once
    const hashedPassword = await bcrypt.hash(TEST_PASSWORD, 10);

    for (const account of TEST_ACCOUNTS) {
      // Check if account already exists (idempotent)
      const existing = await queryRunner.query(
        `SELECT id FROM users WHERE email = $1`,
        [account.email]
      );

      if (existing.length > 0) {
        console.log(`Test account already exists: ${account.email}, skipping...`);
        continue;
      }

      // Create test account
      await queryRunner.query(
        `INSERT INTO users (
          id, email, password, name, role, roles, status,
          "isActive", "isEmailVerified", domain, permissions,
          "createdAt", "updatedAt"
        ) VALUES (
          gen_random_uuid(), $1, $2, $3, $4, $5, 'active',
          true, true, $6, '[]',
          NOW(), NOW()
        )`,
        [
          account.email,
          hashedPassword,
          account.name,
          account.role,
          account.role, // roles array as simple string
          account.domain,
        ]
      );

      console.log(`Created test account: ${account.email} (${account.description})`);
    }

    console.log('');
    console.log('=== Production Test Accounts Created ===');
    console.log('Password: TestPassword');
    console.log('');
    console.log('GlucoseView:');
    console.log('  - pharmacist@o4o.com (약사)');
    console.log('  - admin@o4o.com (관리자)');
    console.log('');
    console.log('K-Cosmetics:');
    console.log('  - consumer-k-cosmetics@o4o.com (소비자)');
    console.log('  - seller-k-cosmetics@o4o.com (판매자)');
    console.log('  - supplier-k-cosmetics@o4o.com (공급자)');
    console.log('  - admin-k-cosmetics@o4o.com (관리자)');
    console.log('');
    console.log('Note: Run cleanup Work Order after testing to deactivate/delete accounts');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Deactivate test accounts (soft delete)
    const testEmails = TEST_ACCOUNTS.map(a => a.email);

    for (const email of testEmails) {
      await queryRunner.query(
        `UPDATE users SET "isActive" = false, status = 'inactive' WHERE email = $1`,
        [email]
      );
      console.log(`Deactivated test account: ${email}`);
    }

    console.log('');
    console.log('All test accounts have been deactivated.');
    console.log('To permanently delete, run: DELETE FROM users WHERE email LIKE \'%@o4o.com\'');
  }
}
