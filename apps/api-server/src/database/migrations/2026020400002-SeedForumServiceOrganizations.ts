import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-FORUM-ORGANIZATION-MAPPING-IMPLEMENTATION-V1
 *
 * Seed service-level organizations for Forum context separation.
 * Each service gets a top-level organization record so that
 * forum_category.organizationId / forum_post.organizationId
 * can reference a valid FK target.
 *
 * Fixed UUIDs are used so the API constants file can reference them directly.
 */
export class SeedForumServiceOrganizations1706745602002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if organizations table exists before seeding
    const tableExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'organizations'
      ) AS "exists";
    `);

    if (!tableExists[0]?.exists) {
      console.log('[SeedForumServiceOrganizations] organizations table does not exist, skipping seed.');
      return;
    }

    // GlycoPharm service organization
    // WO-O4O-FORUM-ORGS-INVALID-UUID-HOTFIX-V1:
    //   기존 ID 'a1b2c3d4-0001-4000-a000-forum00000001' 은 UUID 형식 위반으로 INSERT 실패.
    //   유효 UUID 로 교체. fresh DB 안전성 목적이며, prod 정합은 별도 후속 마이그레이션이 보장.
    await queryRunner.query(`
      INSERT INTO organizations (id, name, code, type, level, path, metadata, "isActive", "childrenCount", "createdAt", "updatedAt")
      VALUES (
        'a1b2c3d4-0001-4000-a000-91c0fa800001',
        'GlycoPharm',
        'FORUM_GLYCOPHARM',
        'division',
        0,
        '/glycopharm',
        '{"purpose": "forum-service-organization", "serviceCode": "glycopharm"}'::jsonb,
        true,
        0,
        NOW(),
        NOW()
      )
      ON CONFLICT (code) DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM organizations WHERE code = 'FORUM_GLYCOPHARM';
    `);
  }
}
