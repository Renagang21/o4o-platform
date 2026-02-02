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
    // GlycoPharm service organization
    await queryRunner.query(`
      INSERT INTO organizations (id, name, code, type, level, path, metadata, "isActive", "childrenCount", "createdAt", "updatedAt")
      VALUES (
        'a1b2c3d4-0001-4000-a000-forum00000001',
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
