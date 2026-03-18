/**
 * LinkTestPharmacistToOrganization
 *
 * WO-GLYCOPHARM-PATIENT-PHARMACY-LINK-FLOW-V1
 *
 * pharmacist_test@glycopharm.co.kr 계정에 organization 연결.
 * care-pharmacy-context middleware가 약국을 식별하려면
 * created_by_user_id 또는 organization_members 레코드 필요.
 *
 * Idempotent: ON CONFLICT / IF NOT EXISTS 사용.
 */
import type { MigrationInterface, QueryRunner } from 'typeorm';

export class LinkTestPharmacistToOrganization20260318130000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Find pharmacist_test user
    const users = await queryRunner.query(
      `SELECT id FROM users WHERE email = $1 LIMIT 1`,
      ['pharmacist_test@glycopharm.co.kr'],
    );

    if (users.length === 0) {
      console.log('[Migration] pharmacist_test@glycopharm.co.kr not found, skipping');
      return;
    }

    const userId = users[0].id;

    // 2. Check if already linked via created_by_user_id
    const existingOrg = await queryRunner.query(
      `SELECT id FROM organizations WHERE created_by_user_id = $1 LIMIT 1`,
      [userId],
    );

    if (existingOrg.length > 0) {
      console.log(`[Migration] User already linked to org ${existingOrg[0].id}, skipping`);
      return;
    }

    // 3. Check if already linked via organization_members
    const existingMember = await queryRunner.query(
      `SELECT organization_id FROM organization_members WHERE user_id = $1 AND left_at IS NULL LIMIT 1`,
      [userId],
    );

    if (existingMember.length > 0) {
      console.log(`[Migration] User already member of org ${existingMember[0].organization_id}, skipping`);
      return;
    }

    // 4. Create a test pharmacy organization
    const orgCode = 'TEST-SEED-PHARMACIST_TEST';
    const orgResult = await queryRunner.query(
      `INSERT INTO organizations (id, name, code, type, level, path, "isActive", created_by_user_id, "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), '테스트 약국', $1, 'pharmacy', 0, $2, true, $3, NOW(), NOW())
       ON CONFLICT (code) DO UPDATE SET created_by_user_id = $3, "updatedAt" = NOW()
       RETURNING id`,
      [orgCode, `/${orgCode}`, userId],
    );
    const orgId = orgResult[0].id;
    console.log(`[Migration] Created org ${orgId} for pharmacist_test`);

    // 5. Create organization_members record
    await queryRunner.query(
      `INSERT INTO organization_members (id, organization_id, user_id, role, is_primary, joined_at, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, 'owner', true, NOW(), NOW(), NOW())
       ON CONFLICT ON CONSTRAINT "UQ_org_member_org_user" DO NOTHING`,
      [orgId, userId],
    );

    // 6. Create glycopharm + glucoseview enrollments
    for (const serviceCode of ['glycopharm', 'glucoseview']) {
      await queryRunner.query(
        `INSERT INTO organization_service_enrollments (id, organization_id, service_code, status, enrolled_at, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, $2, 'active', NOW(), NOW(), NOW())
         ON CONFLICT DO NOTHING`,
        [orgId, serviceCode],
      );
    }
    console.log(`[Migration] Enrollments created for org ${orgId}`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Don't remove — idempotent forward migration
  }
}
