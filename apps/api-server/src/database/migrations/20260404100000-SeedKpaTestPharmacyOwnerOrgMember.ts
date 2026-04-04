/**
 * SeedKpaTestPharmacyOwnerOrgMember
 *
 * WO-KPA-HUB-STORE-ORDERABLE-PRODUCT-APPLY-FIX-V1:
 * test-yaksa04 시드 데이터 보완 — organization_members 레코드 생성.
 * 기존 시드(20260403900000)에서 kpa_pharmacist_profiles만 생성하고
 * organization_members를 누락하여 POST /apply에서 organizationId=null 발생.
 *
 * Idempotent: ON CONFLICT DO NOTHING
 */
import type { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedKpaTestPharmacyOwnerOrgMember20260404100000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const ORG_JONGNO = 'a0000000-0a00-4000-a000-000000000003';

    // Find test-yaksa04 user
    const users = await queryRunner.query(
      `SELECT id FROM users WHERE email = $1 LIMIT 1`,
      ['test-yaksa04@o4o.com'],
    );
    if (users.length === 0) {
      console.log('[SeedKpaTestPharmacyOwnerOrgMember] test-yaksa04 not found, skipping');
      return;
    }

    const userId = users[0].id;

    // Check if already exists
    const existing = await queryRunner.query(
      `SELECT 1 FROM organization_members WHERE user_id = $1 AND organization_id = $2 AND left_at IS NULL LIMIT 1`,
      [userId, ORG_JONGNO],
    );
    if (existing.length > 0) {
      console.log('[SeedKpaTestPharmacyOwnerOrgMember] Already linked, skipping');
      return;
    }

    // Create organization_members record
    await queryRunner.query(
      `INSERT INTO organization_members (id, organization_id, user_id, role, is_primary, joined_at, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, 'owner', true, NOW(), NOW(), NOW())
       ON CONFLICT ON CONSTRAINT "UQ_org_member_org_user" DO NOTHING`,
      [ORG_JONGNO, userId],
    );
    console.log(`[SeedKpaTestPharmacyOwnerOrgMember] Linked test-yaksa04 to 종로구약사회 as owner`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Idempotent forward migration — no rollback
  }
}
