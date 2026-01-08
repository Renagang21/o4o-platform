import { MigrationInterface, QueryRunner } from 'typeorm';
import bcrypt from 'bcryptjs';

/**
 * KPA Society 테스트 계정 Seed
 *
 * 생성 계정:
 * - pharmacist@kpa-test.kr (약사)
 * - district-admin@kpa-test.kr (지부 운영자)
 * - branch-admin@kpa-test.kr (분회 운영자)
 */
export class SeedKpaSocietyTestAccounts9990000000003 implements MigrationInterface {
  name = 'SeedKpaSocietyTestAccounts9990000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const testPassword = await bcrypt.hash('test123!@#', 10);

    // 1. 약사 테스트 계정
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
        '00000000-0000-0000-0000-000000000201',
        'pharmacist@kpa-test.kr',
        '${testPassword}',
        '테스트 약사',
        'active',
        true,
        true,
        NOW(),
        NOW()
      )
      ON CONFLICT (email) DO NOTHING
    `);

    // 약사 역할 할당
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
        '00000000-0000-0000-0000-000000000201',
        'pharmacist',
        true,
        NOW(),
        NOW(),
        '00000000-0000-0000-0000-000000000201',
        NOW(),
        NOW()
      )
      ON CONFLICT DO NOTHING
    `);

    // 2. 지부 운영자 테스트 계정
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
        '00000000-0000-0000-0000-000000000202',
        'district-admin@kpa-test.kr',
        '${testPassword}',
        '지부 운영자 (테스트)',
        'active',
        true,
        true,
        NOW(),
        NOW()
      )
      ON CONFLICT (email) DO NOTHING
    `);

    // 지부 운영자 역할 할당
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
        '00000000-0000-0000-0000-000000000202',
        'membership_district_admin',
        true,
        NOW(),
        NOW(),
        '00000000-0000-0000-0000-000000000202',
        NOW(),
        NOW()
      )
      ON CONFLICT DO NOTHING
    `);

    // 3. 분회 운영자 테스트 계정
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
        '00000000-0000-0000-0000-000000000203',
        'branch-admin@kpa-test.kr',
        '${testPassword}',
        '분회 운영자 (테스트)',
        'active',
        true,
        true,
        NOW(),
        NOW()
      )
      ON CONFLICT (email) DO NOTHING
    `);

    // 분회 운영자 역할 할당
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
        '00000000-0000-0000-0000-000000000203',
        'membership_branch_admin',
        true,
        NOW(),
        NOW(),
        '00000000-0000-0000-0000-000000000203',
        NOW(),
        NOW()
      )
      ON CONFLICT DO NOTHING
    `);

    console.log('✅ KPA Society test accounts created');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 역할 할당 삭제
    await queryRunner.query(`
      DELETE FROM role_assignments WHERE user_id IN (
        '00000000-0000-0000-0000-000000000201',
        '00000000-0000-0000-0000-000000000202',
        '00000000-0000-0000-0000-000000000203'
      )
    `);

    // 테스트 계정 삭제
    await queryRunner.query(`
      DELETE FROM users WHERE id IN (
        '00000000-0000-0000-0000-000000000201',
        '00000000-0000-0000-0000-000000000202',
        '00000000-0000-0000-0000-000000000203'
      )
    `);

    console.log('✅ KPA Society test accounts removed');
  }
}
