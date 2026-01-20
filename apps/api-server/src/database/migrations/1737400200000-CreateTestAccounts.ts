import { MigrationInterface, QueryRunner } from 'typeorm';
import * as bcrypt from 'bcrypt';

/**
 * Create test accounts for KPA Society and GlucoseView
 *
 * KPA Society test accounts:
 * - member@kpa.test (일반회원)
 * - branch-officer@kpa.test (분회 임원)
 * - regional-officer@kpa.test (지부 임원)
 * - admin@kpa.test (관리자)
 *
 * GlucoseView test accounts:
 * - pharmacist@test.test (약사)
 * - admin@test.test (관리자)
 *
 * Password for all: TestPassword
 */
export class CreateTestAccounts1737400200000 implements MigrationInterface {
  name = 'CreateTestAccounts1737400200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hashedPassword = await bcrypt.hash('TestPassword', 12);

    const testAccounts = [
      // KPA Society
      { email: 'member@kpa.test', fullName: 'KPA 일반회원', role: 'pharmacist' },
      { email: 'branch-officer@kpa.test', fullName: 'KPA 분회임원', role: 'pharmacist' },
      { email: 'regional-officer@kpa.test', fullName: 'KPA 지부임원', role: 'pharmacist' },
      { email: 'admin@kpa.test', fullName: 'KPA 관리자', role: 'admin' },
      // GlucoseView
      { email: 'pharmacist@test.test', fullName: 'GlucoseView 약사', role: 'pharmacist' },
      { email: 'admin@test.test', fullName: 'GlucoseView 관리자', role: 'admin' },
    ];

    for (const account of testAccounts) {
      // Check if account already exists
      const existing = await queryRunner.query(
        `SELECT id FROM users WHERE email = $1`,
        [account.email]
      );

      if (existing && existing.length > 0) {
        // Update password if account exists
        await queryRunner.query(
          `UPDATE users SET password = $1 WHERE email = $2`,
          [hashedPassword, account.email]
        );
        console.log(`Updated password for existing account: ${account.email}`);
      } else {
        // Create new account
        await queryRunner.query(
          `INSERT INTO users (email, password, name, role, "isActive", "isEmailVerified", "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, true, true, NOW(), NOW())`,
          [account.email, hashedPassword, account.fullName, account.role]
        );
        console.log(`Created test account: ${account.email}`);
      }
    }

    console.log('All test accounts created/updated successfully');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const testEmails = [
      'member@kpa.test',
      'branch-officer@kpa.test',
      'regional-officer@kpa.test',
      'admin@kpa.test',
      'pharmacist@test.test',
      'admin@test.test',
    ];

    for (const email of testEmails) {
      await queryRunner.query(`DELETE FROM users WHERE email = $1`, [email]);
    }

    console.log('Test accounts removed');
  }
}
