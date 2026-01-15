/**
 * Migration: SeedAdditionalTestAccounts
 *
 * Phase 5 Extension: Create test accounts for GlycoPharm, KPA Society, Neture
 *
 * These accounts match the UI buttons displayed on each service's login page.
 * Password: TestPassword (bcrypt hashed)
 */

import { MigrationInterface, QueryRunner } from 'typeorm';
import bcrypt from 'bcryptjs';

const TEST_PASSWORD = 'TestPassword';

const TEST_ACCOUNTS = [
  // GlycoPharm test accounts
  {
    email: 'pharmacy@glycopharm.kr',
    name: 'Test Pharmacy',
    role: 'user',
    domain: 'glycopharm.kr',
    description: 'GlycoPharm 약국 테스트 계정',
  },
  {
    email: 'admin@neture.co.kr',
    name: 'Test Admin',
    role: 'admin',
    domain: 'glycopharm.kr',
    description: 'GlycoPharm 운영자 테스트 계정',
  },
  // KPA Society test accounts
  {
    email: 'district-admin@kpa-test.kr',
    name: 'Test District Admin',
    role: 'admin',
    domain: 'kpa-society.kr',
    description: 'KPA 지부 운영자 테스트 계정',
  },
  {
    email: 'branch-admin@kpa-test.kr',
    name: 'Test Branch Admin',
    role: 'admin',
    domain: 'kpa-society.kr',
    description: 'KPA 분회 운영자 테스트 계정',
  },
  {
    email: 'district-officer@kpa-test.kr',
    name: 'Test District Officer',
    role: 'user',
    domain: 'kpa-society.kr',
    description: 'KPA 지부 임원 테스트 계정',
  },
  {
    email: 'branch-officer@kpa-test.kr',
    name: 'Test Branch Officer',
    role: 'user',
    domain: 'kpa-society.kr',
    description: 'KPA 분회 임원 테스트 계정',
  },
  {
    email: 'pharmacist@kpa-test.kr',
    name: 'Test Pharmacist',
    role: 'user',
    domain: 'kpa-society.kr',
    description: 'KPA 약사 테스트 계정',
  },
  // Neture test accounts
  {
    email: 'supplier@neture.test',
    name: 'Test Supplier',
    role: 'supplier',
    domain: 'neture.co.kr',
    description: 'Neture 공급자 테스트 계정',
  },
  {
    email: 'partner@neture.test',
    name: 'Test Partner',
    role: 'partner',
    domain: 'neture.co.kr',
    description: 'Neture 파트너 테스트 계정',
  },
  {
    email: 'admin@neture.test',
    name: 'Test Admin',
    role: 'admin',
    domain: 'neture.co.kr',
    description: 'Neture 운영자 테스트 계정',
  },
];

export class SeedAdditionalTestAccounts1737100200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const hashedPassword = await bcrypt.hash(TEST_PASSWORD, 10);

    for (const account of TEST_ACCOUNTS) {
      // Check if account already exists (idempotent)
      const existing = await queryRunner.query(
        `SELECT id FROM users WHERE email = $1`,
        [account.email]
      );

      if (existing.length > 0) {
        // Update password and activate if exists
        await queryRunner.query(
          `UPDATE users SET password = $1, "isActive" = true, status = 'active' WHERE email = $2`,
          [hashedPassword, account.email]
        );
        console.log(`Updated existing account: ${account.email}`);
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
          account.role,
          account.domain,
        ]
      );

      console.log(`Created test account: ${account.email} (${account.description})`);
    }

    console.log('');
    console.log('=== Additional Test Accounts Created ===');
    console.log('Password: TestPassword');
    console.log('');
    console.log('GlycoPharm:');
    console.log('  - pharmacy@glycopharm.kr (약국)');
    console.log('  - admin@neture.co.kr (운영자)');
    console.log('');
    console.log('KPA Society:');
    console.log('  - district-admin@kpa-test.kr (지부 운영자)');
    console.log('  - branch-admin@kpa-test.kr (분회 운영자)');
    console.log('  - district-officer@kpa-test.kr (지부 임원)');
    console.log('  - branch-officer@kpa-test.kr (분회 임원)');
    console.log('  - pharmacist@kpa-test.kr (약사)');
    console.log('');
    console.log('Neture:');
    console.log('  - supplier@neture.test (공급자)');
    console.log('  - partner@neture.test (파트너)');
    console.log('  - admin@neture.test (운영자)');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const testEmails = TEST_ACCOUNTS.map(a => a.email);

    for (const email of testEmails) {
      await queryRunner.query(
        `UPDATE users SET "isActive" = false, status = 'inactive' WHERE email = $1`,
        [email]
      );
      console.log(`Deactivated test account: ${email}`);
    }

    console.log('');
    console.log('All additional test accounts have been deactivated.');
  }
}
