import { MigrationInterface, QueryRunner } from 'typeorm';
import bcrypt from 'bcryptjs';

/**
 * Glycopharm 테스트 계정 Seed
 *
 * 생성 계정:
 * - pharmacy@glycopharm.kr (약국 역할)
 */
export class SeedGlycopharmTestAccounts9980000000001 implements MigrationInterface {
  name = 'SeedGlycopharmTestAccounts9980000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const testPassword = await bcrypt.hash('test123!@#', 10);

    // 약국 테스트 계정 (유효한 UUID 사용)
    await queryRunner.query(`
      INSERT INTO users (
        id,
        email,
        password,
        name,
        status,
        "isActive",
        "isEmailVerified",
        created_at,
        updated_at
      ) VALUES (
        '00000000-0000-0000-0000-000000000101',
        'pharmacy@glycopharm.kr',
        '${testPassword}',
        '글리코팜 테스트 약국',
        'active',
        true,
        true,
        NOW(),
        NOW()
      )
      ON CONFLICT (email) DO NOTHING
    `);

    // 약국 역할 할당
    await queryRunner.query(`
      INSERT INTO role_assignments (
        id,
        user_id,
        role,
        is_active,
        valid_from,
        assigned_at,
        assigned_by,
        created_at,
        updated_at
      ) VALUES (
        gen_random_uuid(),
        '00000000-0000-0000-0000-000000000101',
        'pharmacy',
        true,
        NOW(),
        NOW(),
        '00000000-0000-0000-0000-000000000101',
        NOW(),
        NOW()
      )
      ON CONFLICT DO NOTHING
    `);

    console.log('✅ Glycopharm test accounts created');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 역할 할당 삭제
    await queryRunner.query(`
      DELETE FROM role_assignments WHERE user_id = '00000000-0000-0000-0000-000000000101'
    `);

    // 테스트 계정 삭제
    await queryRunner.query(`
      DELETE FROM users WHERE id = '00000000-0000-0000-0000-000000000101'
    `);

    console.log('✅ Glycopharm test accounts removed');
  }
}
