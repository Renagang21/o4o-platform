/**
 * SeedPhamacy1OrgMember
 *
 * WO-KPA-SOCIETY-PHARMACY-STORE-LOCAL-PRODUCT-SEED-AND-REGISTRATION-VERIFY-V1:
 * phamacy1@o4o.com 테스트 계정 — organization_members 레코드 생성.
 * 이 계정은 pharmacistFunction='pharmacy_owner', isStoreOwner=true 이지만
 * organization_members 레코드가 누락되어 resolveStoreAccess()에서 403 반환.
 *
 * 종로구약사회 (테스트 조직)에 owner로 연결.
 * Idempotent: ON CONFLICT DO NOTHING
 */
import type { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedPhamacy1OrgMember20260405100000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const ORG_JONGNO = 'a0000000-0a00-4000-a000-000000000003';

    // Find phamacy1 user
    const users = await queryRunner.query(
      `SELECT id FROM users WHERE email = $1 LIMIT 1`,
      ['phamacy1@o4o.com'],
    );
    if (users.length === 0) {
      console.log('[SeedPhamacy1OrgMember] phamacy1@o4o.com not found, skipping');
      return;
    }

    const userId = users[0].id;

    // Check if already exists
    const existing = await queryRunner.query(
      `SELECT 1 FROM organization_members WHERE user_id = $1 AND left_at IS NULL LIMIT 1`,
      [userId],
    );
    if (existing.length > 0) {
      console.log('[SeedPhamacy1OrgMember] Already has org membership, skipping');
      return;
    }

    // Create organization_members record
    await queryRunner.query(
      `INSERT INTO organization_members (id, organization_id, user_id, role, is_primary, joined_at, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, 'owner', true, NOW(), NOW(), NOW())
       ON CONFLICT ON CONSTRAINT "UQ_org_member_org_user" DO NOTHING`,
      [ORG_JONGNO, userId],
    );
    console.log(`[SeedPhamacy1OrgMember] Linked phamacy1@o4o.com to 종로구약사회 as owner`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Idempotent forward migration — no rollback
  }
}
