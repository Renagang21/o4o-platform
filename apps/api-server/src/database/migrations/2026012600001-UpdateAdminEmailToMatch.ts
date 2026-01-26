/**
 * Migration: UpdateAdminEmailToMatch
 *
 * Updates the admin account email from admin-neture@o4o.com to admin@neture.co.kr
 * to match the admin dashboard login page test account button.
 */

import { MigrationInterface, QueryRunner } from 'typeorm';

const OLD_EMAIL = 'admin-neture@o4o.com';
const NEW_EMAIL = 'admin@neture.co.kr';

export class UpdateAdminEmailToMatch2026012600001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if old email exists
    const existing = await queryRunner.query(
      `SELECT id, email FROM users WHERE email = $1`,
      [OLD_EMAIL]
    );

    if (existing.length === 0) {
      console.log(`Account ${OLD_EMAIL} not found, skipping migration`);
      return;
    }

    // Check if new email already exists (avoid duplicate)
    const newExists = await queryRunner.query(
      `SELECT id FROM users WHERE email = $1`,
      [NEW_EMAIL]
    );

    if (newExists.length > 0) {
      console.log(`Account ${NEW_EMAIL} already exists, skipping migration`);
      return;
    }

    // Update email
    await queryRunner.query(
      `UPDATE users SET email = $1, "updatedAt" = NOW() WHERE email = $2`,
      [NEW_EMAIL, OLD_EMAIL]
    );

    console.log('');
    console.log('=== Admin Email Updated ===');
    console.log(`Old: ${OLD_EMAIL}`);
    console.log(`New: ${NEW_EMAIL}`);
    console.log('');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert email change
    const existing = await queryRunner.query(
      `SELECT id FROM users WHERE email = $1`,
      [NEW_EMAIL]
    );

    if (existing.length === 0) {
      console.log(`Account ${NEW_EMAIL} not found, skipping rollback`);
      return;
    }

    await queryRunner.query(
      `UPDATE users SET email = $1, "updatedAt" = NOW() WHERE email = $2`,
      [OLD_EMAIL, NEW_EMAIL]
    );

    console.log(`Reverted admin email from ${NEW_EMAIL} to ${OLD_EMAIL}`);
  }
}
