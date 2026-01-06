import { MigrationInterface, QueryRunner } from 'typeorm';
import * as bcrypt from 'bcrypt';

/**
 * GlucoseView Test Accounts Migration
 *
 * Creates test accounts for development:
 * - pharmacist@test.test / testID1234 (약사)
 * - admin@test.test / adminID1234 (관리자)
 */
export class SeedGlucoseViewTestAccounts9970000000002 implements MigrationInterface {
  name = 'SeedGlucoseViewTestAccounts9970000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Hash passwords
    const pharmacistPassword = await bcrypt.hash('testID1234', 10);
    const adminPassword = await bcrypt.hash('adminID1234', 10);

    // Check if users table exists and has the right structure
    const tableExists = await queryRunner.hasTable('users');
    if (!tableExists) {
      console.log('Users table does not exist, skipping test account creation');
      return;
    }

    // Create pharmacist test user in core users table
    const pharmacistUserId = '99990001-0001-0001-0001-000000000001';
    const adminUserId = '99990002-0002-0002-0002-000000000002';

    // Check if test users already exist
    const existingUsers = await queryRunner.query(
      `SELECT id FROM users WHERE email IN ('pharmacist@test.test', 'admin@test.test')`
    );

    if (existingUsers.length > 0) {
      console.log('Test accounts already exist, skipping');
      return;
    }

    // Insert pharmacist user
    await queryRunner.query(`
      INSERT INTO users (id, email, password, name, "isActive", "createdAt", "updatedAt")
      VALUES (
        '${pharmacistUserId}',
        'pharmacist@test.test',
        '${pharmacistPassword}',
        '테스트약사',
        true,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
    `);

    // Insert admin user
    await queryRunner.query(`
      INSERT INTO users (id, email, password, name, "isActive", "createdAt", "updatedAt")
      VALUES (
        '${adminUserId}',
        'admin@test.test',
        '${adminPassword}',
        '관리자',
        true,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
    `);

    // Insert pharmacist profile (약사)
    await queryRunner.query(`
      INSERT INTO glucoseview_pharmacists (
        id, user_id, license_number, real_name, display_name, phone, email,
        chapter_id, pharmacy_name, role, approval_status, approved_at, created_at, updated_at
      )
      VALUES (
        'p9990001-0001-0001-0001-000000000001',
        '${pharmacistUserId}',
        'PH-TEST-001',
        '테스트약사',
        '테스트약사',
        '010-0000-0001',
        'pharmacist@test.test',
        'a1111111-1111-1111-1111-111111111111',
        '테스트약국',
        'pharmacist',
        'approved',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
    `);

    // Insert admin pharmacist profile (관리자)
    await queryRunner.query(`
      INSERT INTO glucoseview_pharmacists (
        id, user_id, license_number, real_name, display_name, phone, email,
        chapter_id, pharmacy_name, role, approval_status, approved_at, created_at, updated_at
      )
      VALUES (
        'p9990002-0002-0002-0002-000000000002',
        '${adminUserId}',
        'PH-ADMIN-001',
        '관리자',
        '관리자',
        '010-0000-0002',
        'admin@test.test',
        'a1111111-1111-1111-1111-111111111111',
        '관리자약국',
        'admin',
        'approved',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
    `);

    console.log('GlucoseView test accounts created successfully');
    console.log('  - pharmacist@test.test / testID1234');
    console.log('  - admin@test.test / adminID1234');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove test pharmacist profiles
    await queryRunner.query(`
      DELETE FROM glucoseview_pharmacists
      WHERE user_id IN (
        '99990001-0001-0001-0001-000000000001',
        '99990002-0002-0002-0002-000000000002'
      )
    `);

    // Remove test users
    await queryRunner.query(`
      DELETE FROM users
      WHERE email IN ('pharmacist@test.test', 'admin@test.test')
    `);
  }
}
