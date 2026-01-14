/**
 * Migration: ActivateGlucoseViewTestAccounts
 *
 * Phase 5 Hotfix: Activate existing GlucoseView test accounts
 *
 * The GlucoseView test accounts were created before but were inactive.
 * This migration activates them for testing.
 */

import { MigrationInterface, QueryRunner } from 'typeorm';

const GLUCOSEVIEW_ACCOUNTS = [
  'pharmacist@test.test',
  'admin@test.test',
];

export class ActivateGlucoseViewTestAccounts1737100100000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const email of GLUCOSEVIEW_ACCOUNTS) {
      const result = await queryRunner.query(
        `UPDATE users SET "isActive" = true, status = 'active' WHERE email = $1 RETURNING email`,
        [email]
      );

      if (result && result.length > 0) {
        console.log(`Activated: ${email}`);
      } else {
        console.log(`Account not found (skipping): ${email}`);
      }
    }

    console.log('');
    console.log('=== GlucoseView Test Accounts Activated ===');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const email of GLUCOSEVIEW_ACCOUNTS) {
      await queryRunner.query(
        `UPDATE users SET "isActive" = false, status = 'inactive' WHERE email = $1`,
        [email]
      );
      console.log(`Deactivated: ${email}`);
    }
  }
}
