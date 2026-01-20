import { MigrationInterface, QueryRunner } from 'typeorm';
import * as bcrypt from 'bcrypt';

/**
 * Update KPA test account passwords to 'TestPassword'
 *
 * Test accounts:
 * - member@kpa.test
 * - branch-officer@kpa.test
 * - regional-officer@kpa.test
 * - admin@kpa.test
 */
export class UpdateKpaTestAccountPasswords1737400000000 implements MigrationInterface {
  name = 'UpdateKpaTestAccountPasswords1737400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Generate bcrypt hash for 'TestPassword'
    const hashedPassword = await bcrypt.hash('TestPassword', 12);

    const testEmails = [
      'member@kpa.test',
      'branch-officer@kpa.test',
      'regional-officer@kpa.test',
      'admin@kpa.test',
    ];

    // Update passwords for existing test accounts
    for (const email of testEmails) {
      await queryRunner.query(
        `UPDATE users SET password = $1 WHERE email = $2`,
        [hashedPassword, email]
      );
    }

    console.log(`✅ Updated passwords for KPA test accounts: ${testEmails.join(', ')}`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Cannot revert password changes (one-way hash)
    console.log('⚠️ Password changes cannot be reverted');
  }
}
