/**
 * Migration: UpdateOperatorPasswords
 *
 * Update all operator/admin account passwords to O4oTestPass
 * and create any missing operator accounts.
 *
 * Operator accounts (password: O4oTestPass):
 * - admin-kpa-society@o4o.com (KPA Society 메인 운영자)
 * - district-admin@o4o.com (KPA Society 지부 운영자)
 * - branch-admin@o4o.com (KPA Society 분회 운영자)
 * - admin-neture@o4o.com (네뚜레 운영자)
 * - admin-k-cosmetics@o4o.com (K-Cosmetics 운영자)
 * - admin-glycopharm@o4o.com (GlycoPharm 운영자)
 * - admin-glucoseview@o4o.com (GlucoseView 운영자)
 */

import { MigrationInterface, QueryRunner } from 'typeorm';

// Pre-computed bcrypt hash for 'O4oTestPass' (salt rounds: 10)
// This avoids runtime dependency on bcryptjs in migration context
const HASHED_PASSWORD = '$2a$10$3YjlNJQN4VC0r9g7UVYNz.dBw40P1mwo5ONt36NyvglEaJpEQWSQC';

const OPERATOR_ACCOUNTS = [
  // KPA Society
  {
    email: 'admin-kpa-society@o4o.com',
    name: 'KPA Society Admin',
    role: 'admin',
    description: 'KPA Society 메인 운영자',
  },
  {
    email: 'district-admin@o4o.com',
    name: '김지부 (지부운영자)',
    role: 'admin',
    description: 'KPA Society 지부 운영자',
  },
  {
    email: 'branch-admin@o4o.com',
    name: '이분회 (분회운영자)',
    role: 'admin',
    description: 'KPA Society 분회 운영자',
  },
  // Neture
  {
    email: 'admin-neture@o4o.com',
    name: 'Neture Admin',
    role: 'admin',
    description: '네뚜레 운영자',
  },
  // K-Cosmetics
  {
    email: 'admin-k-cosmetics@o4o.com',
    name: 'K-Cosmetics Admin',
    role: 'admin',
    description: 'K-Cosmetics 운영자',
  },
  // GlycoPharm
  {
    email: 'admin-glycopharm@o4o.com',
    name: 'GlycoPharm Admin',
    role: 'admin',
    description: 'GlycoPharm 운영자',
  },
  // GlucoseView
  {
    email: 'admin-glucoseview@o4o.com',
    name: 'GlucoseView Admin',
    role: 'admin',
    description: 'GlucoseView 운영자',
  },
];

export class UpdateOperatorPasswords1769408012358 implements MigrationInterface {
  name = 'UpdateOperatorPasswords1769408012358';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const account of OPERATOR_ACCOUNTS) {
      // Check if account exists
      const existing = await queryRunner.query(
        `SELECT id FROM users WHERE email = $1`,
        [account.email]
      );

      if (existing && existing.length > 0) {
        // Update password
        await queryRunner.query(
          `UPDATE users SET password = $1 WHERE email = $2`,
          [HASHED_PASSWORD, account.email]
        );
        console.log(`  Updated password for: ${account.email}`);
      } else {
        // Create new account
        await queryRunner.query(
          `INSERT INTO users (email, password, "fullName", role, status, "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, 'active', NOW(), NOW())`,
          [account.email, HASHED_PASSWORD, account.name, account.role]
        );
        console.log(`  Created account: ${account.email}`);
      }
    }

    console.log('');
    console.log('Operator accounts updated with password: O4oTestPass');
    console.log('');
    for (const account of OPERATOR_ACCOUNTS) {
      console.log(`  - ${account.email} (${account.description})`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Pre-computed bcrypt hash for 'TestPassword' (salt rounds: 10)
    const testPasswordHash = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';

    for (const account of OPERATOR_ACCOUNTS) {
      await queryRunner.query(
        `UPDATE users SET password = $1 WHERE email = $2`,
        [testPasswordHash, account.email]
      );
    }

    console.log('Reverted operator passwords to TestPassword');
  }
}
