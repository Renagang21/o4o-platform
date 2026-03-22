/**
 * Migration: UpdateGlucoseViewTestAccountPasswords
 *
 * Phase 5 Hotfix: Update existing GlucoseView test account passwords
 *
 * The original SeedProductionTestAccounts migration skipped these accounts
 * because they already existed with different passwords.
 * This migration updates them to use the standard TestPassword.
 */

import { MigrationInterface, QueryRunner } from 'typeorm';
import bcrypt from 'bcryptjs';

const TEST_PASSWORD = 'TestPassword';

const GLUCOSEVIEW_ACCOUNTS = [
  'pharmacist@test.test',
  'admin@test.test',
];

export class UpdateGlucoseViewTestAccountPasswords1737100000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const hashedPassword = await bcrypt.hash(TEST_PASSWORD, 10);

    for (const email of GLUCOSEVIEW_ACCOUNTS) {
      const result = await queryRunner.query(
        `UPDATE users SET password = $1 WHERE email = $2 RETURNING email`,
        [hashedPassword, email]
      );

      if (result && result.length > 0) {
        console.log(`Updated password for: ${email}`);
      } else {
        console.log(`Account not found (skipping): ${email}`);
      }
    }

    console.log('');
    console.log('=== GlucoseView Test Account Passwords Updated ===');
    console.log('Password: TestPassword');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Cannot restore original passwords
    console.log('Warning: Original passwords cannot be restored');
  }
}
