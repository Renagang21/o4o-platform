/**
 * FixPhamacy1OrgMemberAlignment
 *
 * IR-KPA-SIGNAGE-END-TO-END-BROWSER-VERIFY-V1:
 * phamacy1@o4o.com의 organization_members.organization_id가 종로구약사회(..003)로 되어 있으나,
 * kpaMembership.organizationId는 대한약사회(..001)을 반환.
 * 이 불일치로 signage middleware가 403 반환.
 *
 * 수정: organization_members를 대한약사회(..001)로 변경하여 정합성 확보.
 * Idempotent: 이미 ..001이면 0 rows affected.
 */
import type { MigrationInterface, QueryRunner } from 'typeorm';

export class FixPhamacy1OrgMemberAlignment20260419500000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const ORG_KPA_NATIONAL = 'a0000000-0a00-4000-a000-000000000001';
    const ORG_JONGNO = 'a0000000-0a00-4000-a000-000000000003';

    // Find phamacy1 user
    const users = await queryRunner.query(
      `SELECT id FROM users WHERE email = $1 LIMIT 1`,
      ['phamacy1@o4o.com'],
    );
    if (users.length === 0) {
      console.log('[FixPhamacy1OrgMemberAlignment] phamacy1@o4o.com not found, skipping');
      return;
    }

    const userId = users[0].id;

    // Check if there's already a record for 대한약사회
    const existingNational = await queryRunner.query(
      `SELECT 1 FROM organization_members WHERE user_id = $1 AND organization_id = $2 AND left_at IS NULL LIMIT 1`,
      [userId, ORG_KPA_NATIONAL],
    );
    if (existingNational.length > 0) {
      console.log('[FixPhamacy1OrgMemberAlignment] Already linked to 대한약사회, skipping');
      return;
    }

    // Update 종로구약사회 → 대한약사회
    const result = await queryRunner.query(
      `UPDATE organization_members SET organization_id = $1, updated_at = NOW()
       WHERE user_id = $2 AND organization_id = $3 AND left_at IS NULL`,
      [ORG_KPA_NATIONAL, userId, ORG_JONGNO],
    );
    console.log(`[FixPhamacy1OrgMemberAlignment] Updated org: 종로구약사회 → 대한약사회 (${result[1]} rows)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverse: 대한약사회 → 종로구약사회
    const ORG_KPA_NATIONAL = 'a0000000-0a00-4000-a000-000000000001';
    const ORG_JONGNO = 'a0000000-0a00-4000-a000-000000000003';

    const users = await queryRunner.query(
      `SELECT id FROM users WHERE email = $1 LIMIT 1`,
      ['phamacy1@o4o.com'],
    );
    if (users.length === 0) return;

    await queryRunner.query(
      `UPDATE organization_members SET organization_id = $1, updated_at = NOW()
       WHERE user_id = $2 AND organization_id = $3 AND left_at IS NULL`,
      [ORG_JONGNO, users[0].id, ORG_KPA_NATIONAL],
    );
  }
}
