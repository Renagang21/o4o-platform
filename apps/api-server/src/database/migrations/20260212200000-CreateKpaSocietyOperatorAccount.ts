import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Create kpa-society@o4o.com operator account
 *
 * KPA Society 운영자 계정 (admin-kpa-society@o4o.com = 슈퍼운영자와 별개)
 * Role: kpa:operator (서비스 운영자, platform:admin 아님)
 */
export class CreateKpaSocietyOperatorAccount20260212200000 implements MigrationInterface {
  name = 'CreateKpaSocietyOperatorAccount20260212200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Pre-computed bcrypt hash for 'O4oTestPass' (salt rounds: 10)
    const HASHED_PASSWORD = '$2a$10$3YjlNJQN4VC0r9g7UVYNz.dBw40P1mwo5ONt36NyvglEaJpEQWSQC';

    const existing = await queryRunner.query(
      `SELECT id FROM users WHERE email = $1`,
      ['kpa-society@o4o.com']
    );

    if (existing && existing.length > 0) {
      // Account exists — update password and ensure active
      await queryRunner.query(
        `UPDATE users SET password = $1, status = 'active', "isActive" = true,
         roles = ARRAY['kpa:operator']::text[]
         WHERE email = $2`,
        [HASHED_PASSWORD, 'kpa-society@o4o.com']
      );
      console.log('[Migration] Updated kpa-society@o4o.com operator account');
    } else {
      // Create new account
      await queryRunner.query(
        `INSERT INTO users (
          email, password, name, "lastName", "firstName",
          role, status, "isActive", "isEmailVerified", "loginAttempts",
          permissions, roles, "createdAt", "updatedAt"
        ) VALUES (
          $1, $2, 'KPA Society 운영자', 'KPA', '운영자',
          'operator', 'active', true, true, 0,
          '[]', ARRAY['kpa:operator']::text[], NOW(), NOW()
        )`,
        ['kpa-society@o4o.com', HASHED_PASSWORD]
      );
      console.log('[Migration] Created kpa-society@o4o.com operator account');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM users WHERE email = $1`,
      ['kpa-society@o4o.com']
    );
    console.log('[Migration] Removed kpa-society@o4o.com operator account');
  }
}
