/**
 * Migration: CreateKpaAdminAccount
 *
 * kpa:admin 역할의 KPA-a 서비스 관리자 계정 생성.
 *
 * 기존 계정 구분:
 * - admin-kpa-society@o4o.com → platform admin (legacy `admin` role) = 슈퍼 관리자
 * - kpa-society@o4o.com → kpa:operator = 서비스 운영자
 * - kpa-admin@o4o.com (이 마이그레이션) → kpa:admin = KPA 서비스 관리자
 *
 * Password: O4oTestPass
 * Idempotent: 이미 존재하면 스킵
 */

import { MigrationInterface, QueryRunner } from 'typeorm';
import bcrypt from 'bcryptjs';

export class CreateKpaAdminAccount20260216200001 implements MigrationInterface {
  name = 'CreateKpaAdminAccount20260216200001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const email = 'kpa-admin@o4o.com';

    // Check if already exists
    const existing = await queryRunner.query(
      `SELECT id FROM users WHERE email = $1`,
      [email],
    );

    if (existing.length > 0) {
      console.log(`[MIGRATION] User ${email} already exists, skipping`);
      return;
    }

    const hashedPassword = await bcrypt.hash('O4oTestPass', 10);

    // Create user with kpa:admin role
    const result = await queryRunner.query(
      `INSERT INTO users (
        id, email, password, name, role, roles, status,
        "isActive", "isEmailVerified", domain, service_key,
        permissions, "createdAt", "updatedAt"
      ) VALUES (
        gen_random_uuid(), $1, $2, 'KPA 관리자', 'user', ARRAY['kpa:admin']::text[], 'active',
        true, true, 'kpa-society.co.kr', 'kpa-society',
        '[]', NOW(), NOW()
      ) RETURNING id`,
      [email, hashedPassword],
    );

    const userId = result[0].id;

    // Create kpa_member for 대한약사회
    await queryRunner.query(
      `INSERT INTO kpa_members (
        id, user_id, organization_id, role, status, membership_type,
        joined_at, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1, 'a0000000-0a00-4000-a000-000000000001', 'admin', 'active', 'pharmacist',
        CURRENT_DATE, NOW(), NOW()
      )`,
      [userId],
    );

    console.log(`[MIGRATION] Created KPA admin account: ${email} (kpa:admin)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const email = 'kpa-admin@o4o.com';
    await queryRunner.query(
      `DELETE FROM kpa_members WHERE user_id IN (SELECT id FROM users WHERE email = $1)`,
      [email],
    );
    await queryRunner.query(
      `DELETE FROM users WHERE email = $1`,
      [email],
    );
    console.log(`[MIGRATION] Deleted KPA admin account: ${email}`);
  }
}
