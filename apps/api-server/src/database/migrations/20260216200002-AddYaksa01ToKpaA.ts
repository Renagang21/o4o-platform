/**
 * Migration: AddYaksa01ToKpaA
 *
 * yaksa01@o4o.com (약국 개설자)에게 대한약사회(KPA-a) kpa_member 추가.
 *
 * 기존: 종로구약사회(a0000000-0a00-4000-a000-000000000003) — KPA-c 분회 서비스
 * 추가: 대한약사회(a0000000-0a00-4000-a000-000000000001) — KPA-a 커뮤니티 서비스
 *
 * 이로써 yaksa01은 KPA-a(커뮤니티), KPA-b(지부/분회 데모), KPA-c(분회 서비스) 모두 이용 가능.
 * Idempotent: 이미 존재하면 스킵.
 */

import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddYaksa01ToKpaA20260216200002 implements MigrationInterface {
  name = 'AddYaksa01ToKpaA20260216200002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const email = 'yaksa01@o4o.com';
    const kpaAOrgId = 'a0000000-0a00-4000-a000-000000000001'; // 대한약사회

    // Get user ID
    const users = await queryRunner.query(
      `SELECT id FROM users WHERE email = $1`,
      [email],
    );

    if (users.length === 0) {
      console.log(`[MIGRATION] User ${email} not found, skipping`);
      return;
    }

    const userId = users[0].id;

    // UQ_kpa_members_user_id: one user → one org only.
    // If yaksa01 already has a kpa_member row (e.g. 종로구약사회), skip.
    const existing = await queryRunner.query(
      `SELECT id, organization_id FROM kpa_members WHERE user_id = $1`,
      [userId],
    );

    if (existing.length > 0) {
      console.log(`[MIGRATION] ${email} already has kpa_member (org: ${existing[0].organization_id}), skipping`);
      return;
    }

    // Add kpa_member for 대한약사회 (ON CONFLICT safety)
    await queryRunner.query(
      `INSERT INTO kpa_members (
        id, user_id, organization_id, role, status, membership_type,
        license_number, pharmacy_name, pharmacy_address,
        joined_at, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1, $2, 'member', 'active', 'pharmacist',
        'LIC-2024-01', '종로약국01', '서울시 종로구',
        CURRENT_DATE, NOW(), NOW()
      )
      ON CONFLICT (user_id) DO NOTHING`,
      [userId, kpaAOrgId],
    );

    console.log(`[MIGRATION] Added ${email} to 대한약사회 (KPA-a)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const email = 'yaksa01@o4o.com';
    const kpaAOrgId = 'a0000000-0a00-4000-a000-000000000001';

    await queryRunner.query(
      `DELETE FROM kpa_members
       WHERE user_id IN (SELECT id FROM users WHERE email = $1)
         AND organization_id = $2`,
      [email, kpaAOrgId],
    );

    console.log(`[MIGRATION] Removed ${email} from 대한약사회 (KPA-a)`);
  }
}
