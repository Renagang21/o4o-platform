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
    email: 'pharmacy-glycopharm@o4o.com',
    name: 'Test Pharmacy',
    role: 'user',
    domain: 'glycopharm.kr',
    description: 'GlycoPharm 약국 테스트 계정',
  },
  {
    email: 'admin-glycopharm@o4o.com',
    name: 'Test Admin',
    role: 'admin',
    domain: 'glycopharm.kr',
    description: 'GlycoPharm 운영자 테스트 계정',
  },
  // KPA Society test accounts
  {
    email: 'district-admin-kpa@o4o.com',
    name: '김지부 (지부운영자)',
    role: 'admin',
    domain: 'kpa-society.kr',
    description: 'KPA 지부 운영자 테스트 계정',
  },
  {
    email: 'branch-admin-kpa@o4o.com',
    name: '이분회 (분회운영자)',
    role: 'admin',
    domain: 'kpa-society.kr',
    description: 'KPA 분회 운영자 테스트 계정',
  },
  {
    email: 'district-officer-kpa@o4o.com',
    name: '박임원 (지부임원)',
    role: 'user',
    domain: 'kpa-society.kr',
    description: 'KPA 지부 임원 테스트 계정',
  },
  {
    email: 'branch-officer-kpa@o4o.com',
    name: '최임원 (분회임원)',
    role: 'user',
    domain: 'kpa-society.kr',
    description: 'KPA 분회 임원 테스트 계정',
  },
  {
    email: 'pharmacist-kpa@o4o.com',
    name: '홍길동 (약사)',
    role: 'user',
    domain: 'kpa-society.kr',
    description: 'KPA 약사 테스트 계정',
  },
  // Neture test accounts
  {
    email: 'supplier-neture@o4o.com',
    name: 'Test Supplier',
    role: 'supplier',
    domain: 'neture.co.kr',
    description: 'Neture 공급자 테스트 계정',
  },
  {
    email: 'partner-neture@o4o.com',
    name: 'Test Partner',
    role: 'partner',
    domain: 'neture.co.kr',
    description: 'Neture 파트너 테스트 계정',
  },
  {
    email: 'admin-neture@o4o.com',
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
        // Update password, name, and activate if exists
        await queryRunner.query(
          `UPDATE users SET password = $1, name = $2, "isActive" = true, status = 'active' WHERE email = $3`,
          [hashedPassword, account.name, account.email]
        );
        console.log(`Updated existing account: ${account.email} (name: ${account.name})`);
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
    console.log('  - pharmacy-glycopharm@o4o.com (약국)');
    console.log('  - admin-glycopharm@o4o.com (운영자)');
    console.log('');
    console.log('KPA Society:');
    console.log('  - district-admin-kpa@o4o.com (지부 운영자)');
    console.log('  - branch-admin-kpa@o4o.com (분회 운영자)');
    console.log('  - district-officer-kpa@o4o.com (지부 임원)');
    console.log('  - branch-officer-kpa@o4o.com (분회 임원)');
    console.log('  - pharmacist-kpa@o4o.com (약사)');
    console.log('');
    console.log('Neture:');
    console.log('  - supplier-neture@o4o.com (공급자)');
    console.log('  - partner-neture@o4o.com (파트너)');
    console.log('  - admin-neture@o4o.com (운영자)');
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
