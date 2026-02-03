import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-FORUM-SCOPE-SEPARATION-V1
 *
 * Nullify organizationId on forum posts/categories that were created
 * through the KPA community forum but incorrectly received an
 * organizationId from the user's branch membership.
 *
 * After this migration:
 * - organizationId IS NULL = community scope (약사 공동 커뮤니티)
 * - organizationId IS NOT NULL = organization scope (분회/지부 전용)
 *
 * Only affects non-exclusive posts/categories linked to KPA organizations.
 * GlycoPharm/Neture posts are not affected (different org IDs).
 */
export class NullifyForumPostOrgIdForCommunity1706745607001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if tables exist
    const postTableExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'forum_post'
      ) AS "exists";
    `);

    if (!postTableExists[0]?.exists) {
      console.log('[NullifyForumPostOrgIdForCommunity] forum_post table does not exist, skipping.');
      return;
    }

    const kpaTableExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'kpa_organizations'
      ) AS "exists";
    `);

    if (!kpaTableExists[0]?.exists) {
      console.log('[NullifyForumPostOrgIdForCommunity] kpa_organizations table does not exist, skipping.');
      return;
    }

    // Nullify organizationId on non-exclusive forum posts linked to KPA organizations
    const postResult = await queryRunner.query(`
      UPDATE forum_post
      SET organization_id = NULL
      WHERE organization_id IS NOT NULL
        AND is_organization_exclusive = false
        AND organization_id IN (
          SELECT id FROM kpa_organizations
        );
    `);
    console.log(`[NullifyForumPostOrgIdForCommunity] Updated ${postResult?.[1] ?? 0} forum posts to community scope.`);

    // Nullify organizationId on non-exclusive forum categories linked to KPA organizations
    const catResult = await queryRunner.query(`
      UPDATE forum_category
      SET organization_id = NULL
      WHERE organization_id IS NOT NULL
        AND is_organization_exclusive = false
        AND organization_id IN (
          SELECT id FROM kpa_organizations
        );
    `);
    console.log(`[NullifyForumPostOrgIdForCommunity] Updated ${catResult?.[1] ?? 0} forum categories to community scope.`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverse is not safely possible without storing original values.
    // This is a one-way data correction.
    console.log('[NullifyForumPostOrgIdForCommunity] down: no-op (cannot restore original organizationId values).');
  }
}
