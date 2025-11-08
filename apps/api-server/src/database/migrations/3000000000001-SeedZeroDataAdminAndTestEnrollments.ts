import { MigrationInterface, QueryRunner } from 'typeorm';
import bcrypt from 'bcryptjs';

/**
 * P0 Zero-Data: 시드 데이터 (관리자 + 테스트 신청)
 *
 * 생성 데이터:
 * - 관리자 1계정 (admin@neture.co.kr)
 * - 관리자 역할 할당
 * - 테스트용 역할 신청 3건 (supplier, seller, partner)
 *
 * @see docs/dev/investigations/user-refactor_2025-11/zerodata/p0_execution_order.md
 */
export class SeedZeroDataAdminAndTestEnrollments3000000000001 implements MigrationInterface {
  name = 'SeedZeroDataAdminAndTestEnrollments3000000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 관리자 비밀번호 해시
    const adminPassword = await bcrypt.hash('admin123!@#', 10);

    // 1. 관리자 계정 생성
    await queryRunner.query(`
      INSERT INTO users (
        id,
        email,
        password,
        name,
        status,
        "isActive",
        "isEmailVerified",
        role,
        roles,
        "createdAt",
        "updatedAt"
      ) VALUES (
        '00000000-0000-0000-0000-000000000001',
        'admin@neture.co.kr',
        '${adminPassword}',
        'System Admin',
        'ACTIVE',
        true,
        true,
        'admin',
        '{admin}',
        NOW(),
        NOW()
      )
      ON CONFLICT (email) DO NOTHING
    `);

    // 2. 관리자 역할 할당
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
        '00000000-0000-0000-0000-000000000002',
        '00000000-0000-0000-0000-000000000001',
        'admin',
        true,
        NOW(),
        NOW(),
        '00000000-0000-0000-0000-000000000001',
        NOW(),
        NOW()
      )
      ON CONFLICT (id) DO NOTHING
    `);

    // 3. 테스트용 일반 사용자 생성 (역할 신청용)
    const testPassword = await bcrypt.hash('test123!@#', 10);

    // 공급자 신청 테스트 계정
    await queryRunner.query(`
      INSERT INTO users (
        id,
        email,
        password,
        name,
        status,
        "isActive",
        "isEmailVerified",
        "createdAt",
        "updatedAt"
      ) VALUES (
        '00000000-0000-0000-0000-000000000011',
        'test-supplier@neture.co.kr',
        '${testPassword}',
        'Test Supplier',
        'PENDING',
        true,
        true,
        NOW(),
        NOW()
      )
      ON CONFLICT (email) DO NOTHING
    `);

    // 판매자 신청 테스트 계정
    await queryRunner.query(`
      INSERT INTO users (
        id,
        email,
        password,
        name,
        status,
        "isActive",
        "isEmailVerified",
        "createdAt",
        "updatedAt"
      ) VALUES (
        '00000000-0000-0000-0000-000000000012',
        'test-seller@neture.co.kr',
        '${testPassword}',
        'Test Seller',
        'PENDING',
        true,
        true,
        NOW(),
        NOW()
      )
      ON CONFLICT (email) DO NOTHING
    `);

    // 파트너 신청 테스트 계정
    await queryRunner.query(`
      INSERT INTO users (
        id,
        email,
        password,
        name,
        status,
        "isActive",
        "isEmailVerified",
        "createdAt",
        "updatedAt"
      ) VALUES (
        '00000000-0000-0000-0000-000000000013',
        'test-partner@neture.co.kr',
        '${testPassword}',
        'Test Partner',
        'PENDING',
        true,
        true,
        NOW(),
        NOW()
      )
      ON CONFLICT (email) DO NOTHING
    `);

    // 4. 테스트용 역할 신청 생성

    // 공급자 신청 (PENDING)
    await queryRunner.query(`
      INSERT INTO role_enrollments (
        id,
        user_id,
        role,
        status,
        application_data,
        created_at,
        updated_at
      ) VALUES (
        '00000000-0000-0000-0000-000000000021',
        '00000000-0000-0000-0000-000000000011',
        'supplier',
        'PENDING',
        '{"companyName": "테스트 공급사", "taxId": "123-45-67890", "businessEmail": "supplier@test.com", "businessPhone": "02-1234-5678", "businessAddress": "서울특별시 강남구 테스트로 123"}'::jsonb,
        NOW(),
        NOW()
      )
      ON CONFLICT (id) DO NOTHING
    `);

    // 판매자 신청 (PENDING)
    await queryRunner.query(`
      INSERT INTO role_enrollments (
        id,
        user_id,
        role,
        status,
        application_data,
        created_at,
        updated_at
      ) VALUES (
        '00000000-0000-0000-0000-000000000022',
        '00000000-0000-0000-0000-000000000012',
        'seller',
        'PENDING',
        '{"storeName": "테스트 스토어", "storeUrl": "https://smartstore.naver.com/test", "salesChannel": "smartstore", "businessEmail": "seller@test.com", "businessPhone": "02-2345-6789"}'::jsonb,
        NOW(),
        NOW()
      )
      ON CONFLICT (id) DO NOTHING
    `);

    // 파트너 신청 (PENDING)
    await queryRunner.query(`
      INSERT INTO role_enrollments (
        id,
        user_id,
        role,
        status,
        application_data,
        created_at,
        updated_at
      ) VALUES (
        '00000000-0000-0000-0000-000000000023',
        '00000000-0000-0000-0000-000000000013',
        'partner',
        'PENDING',
        '{"partnerType": "influencer", "platform": "youtube", "channelUrl": "https://youtube.com/@test", "followerCount": 50000, "contactEmail": "partner@test.com", "contactPhone": "010-1234-5678"}'::jsonb,
        NOW(),
        NOW()
      )
      ON CONFLICT (id) DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 역순으로 삭제

    // 신청 삭제
    await queryRunner.query(`
      DELETE FROM role_enrollments WHERE id IN (
        '00000000-0000-0000-0000-000000000021',
        '00000000-0000-0000-0000-000000000022',
        '00000000-0000-0000-0000-000000000023'
      )
    `);

    // 테스트 사용자 삭제
    await queryRunner.query(`
      DELETE FROM users WHERE id IN (
        '00000000-0000-0000-0000-000000000011',
        '00000000-0000-0000-0000-000000000012',
        '00000000-0000-0000-0000-000000000013'
      )
    `);

    // 관리자 역할 할당 삭제
    await queryRunner.query(`
      DELETE FROM role_assignments WHERE id = '00000000-0000-0000-0000-000000000002'
    `);

    // 관리자 계정 삭제
    await queryRunner.query(`
      DELETE FROM users WHERE id = '00000000-0000-0000-0000-000000000001'
    `);
  }
}
