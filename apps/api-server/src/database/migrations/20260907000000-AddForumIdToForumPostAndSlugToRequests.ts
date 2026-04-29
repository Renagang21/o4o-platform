import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-FORUM-MULTI-STRUCTURE-RECONSTRUCTION-V1
 *
 * forum_category_requests를 "포럼" 엔티티로 승격하기 위한 스키마 변경.
 *
 * 1. forum_post.forum_id (uuid, nullable, FK → forum_category_requests.id)
 * 2. forum_category_requests.slug (varchar(200), unique)
 * 3. 기존 데이터 backfill:
 *    - forum_category_requests.slug 자동 생성 (id prefix 기반, Korean-safe)
 *    - forum_post.forum_id = "KPA-society 개선을 위한 포럼" 의 id
 */
export class AddForumIdToForumPostAndSlugToRequests20260907000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ─── 1. forum_post.forum_id ──────────────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE forum_post
        ADD COLUMN IF NOT EXISTS forum_id uuid
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'fk_forum_post_forum'
        ) THEN
          ALTER TABLE forum_post
            ADD CONSTRAINT fk_forum_post_forum
            FOREIGN KEY (forum_id) REFERENCES forum_category_requests(id) ON DELETE SET NULL;
        END IF;
      END$$;
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_forum_post_forum_id ON forum_post(forum_id)
    `);
    console.log('[Migration] forum_post.forum_id column + FK + index added');

    // ─── 2. forum_category_requests.slug ─────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE forum_category_requests
        ADD COLUMN IF NOT EXISTS slug varchar(200)
    `);
    // Backfill slug — id의 처음 8자 기반 (Korean name URL encoding 회피)
    await queryRunner.query(`
      UPDATE forum_category_requests
        SET slug = 'forum-' || LEFT(id::text, 8)
        WHERE slug IS NULL
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uniq_forum_category_requests_slug
        ON forum_category_requests(slug)
    `);
    console.log('[Migration] forum_category_requests.slug column + unique index added');

    // ─── 3. Backfill forum_post.forum_id ─────────────────────────────────
    // "KPA-society 개선을 위한 포럼" (status=completed) 의 id를 찾아서 모든 forum_post에 할당
    const targetRows = await queryRunner.query(`
      SELECT id FROM forum_category_requests
        WHERE status = 'completed' AND name LIKE 'KPA-soci%개선%'
        LIMIT 1
    `);
    const targetForumId: string | undefined = targetRows[0]?.id;
    if (targetForumId) {
      const result = await queryRunner.query(
        `UPDATE forum_post SET forum_id = $1 WHERE forum_id IS NULL`,
        [targetForumId],
      );
      console.log(`[Migration] forum_post.forum_id backfilled to ${targetForumId}: ${result[1] ?? 0} rows`);
    } else {
      console.warn('[Migration] No completed KPA-Society 개선 forum found — forum_post.forum_id remains NULL');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS uniq_forum_category_requests_slug`);
    await queryRunner.query(`ALTER TABLE forum_category_requests DROP COLUMN IF EXISTS slug`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_forum_post_forum_id`);
    await queryRunner.query(`
      ALTER TABLE forum_post DROP CONSTRAINT IF EXISTS fk_forum_post_forum
    `);
    await queryRunner.query(`ALTER TABLE forum_post DROP COLUMN IF EXISTS forum_id`);
  }
}
