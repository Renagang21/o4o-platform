/**
 * EnsurePhamacy1OrgMemberForKpa
 *
 * IR-KPA-SIGNAGE-END-TO-END-BROWSER-VERIFY-V1:
 * phamacy1@o4o.com의 kpaMembership.organizationId = 대한약사회(..001)이지만,
 * organization_members에 ..001 레코드가 없어서 signage middleware 403 발생.
 *
 * 전략: 기존 레코드 상태를 로깅 후, ..001이 없으면 INSERT.
 */
import type { MigrationInterface, QueryRunner } from 'typeorm';

export class EnsurePhamacy1OrgMemberForKpa20260419600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const ORG_KPA_NATIONAL = 'a0000000-0a00-4000-a000-000000000001';

    const users = await queryRunner.query(
      `SELECT id FROM users WHERE email = $1 LIMIT 1`,
      ['phamacy1@o4o.com'],
    );
    if (users.length === 0) {
      console.log('[EnsurePhamacy1OrgMemberForKpa] phamacy1@o4o.com not found, skipping');
      return;
    }

    const userId = users[0].id;

    // Log ALL existing org member records for debugging
    const allRecords = await queryRunner.query(
      `SELECT organization_id, role, is_primary, left_at FROM organization_members WHERE user_id = $1`,
      [userId],
    );
    console.log(`[EnsurePhamacy1OrgMemberForKpa] Existing records: ${JSON.stringify(allRecords)}`);

    // Check if already has ..001
    const existing001 = allRecords.find(
      (r: any) => r.organization_id === ORG_KPA_NATIONAL && r.left_at === null,
    );
    if (existing001) {
      console.log('[EnsurePhamacy1OrgMemberForKpa] Already linked to 대한약사회, skipping');
      return;
    }

    // Insert new record for 대한약사회
    await queryRunner.query(
      `INSERT INTO organization_members (id, organization_id, user_id, role, is_primary, joined_at, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, 'owner', true, NOW(), NOW(), NOW())
       ON CONFLICT DO NOTHING`,
      [ORG_KPA_NATIONAL, userId],
    );
    console.log(`[EnsurePhamacy1OrgMemberForKpa] Inserted org member for 대한약사회 as owner`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const ORG_KPA_NATIONAL = 'a0000000-0a00-4000-a000-000000000001';
    const users = await queryRunner.query(
      `SELECT id FROM users WHERE email = $1 LIMIT 1`,
      ['phamacy1@o4o.com'],
    );
    if (users.length === 0) return;
    await queryRunner.query(
      `DELETE FROM organization_members WHERE user_id = $1 AND organization_id = $2`,
      [users[0].id, ORG_KPA_NATIONAL],
    );
  }
}
