import { MigrationInterface, QueryRunner } from 'typeorm';
import * as bcrypt from 'bcrypt';

/**
 * Update GlucoseView test account passwords to 'TestPassword'
 *
 * Test accounts:
 * - pharmacist@test.test
 * - admin@test.test
 */
export class UpdateGlucoseViewTestAccountPasswords1737400100000 implements MigrationInterface {
  name = 'UpdateGlucoseViewTestAccountPasswords1737400100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Generate bcrypt hash for 'TestPassword'
    const hashedPassword = await bcrypt.hash('TestPassword', 12);

    const testEmails = [
      'pharmacist@test.test',
      'admin@test.test',
    ];

    // Update passwords for existing test accounts
    for (const email of testEmails) {
      await queryRunner.query(
        `UPDATE users SET password = $1 WHERE email = $2`,
        [hashedPassword, email]
      );
    }

    console.log(`✅ Updated passwords for GlucoseView test accounts: ${testEmails.join(', ')}`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Cannot revert password changes (one-way hash)
    console.log('⚠️ Password changes cannot be reverted');
  }
}
