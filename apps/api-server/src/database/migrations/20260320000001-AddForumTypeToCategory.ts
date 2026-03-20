import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-FORUM-REQUEST-UNIFICATION-PHASE1-V1
 *
 * 1) forum_category.forum_type 컬럼 추가 (open | managed)
 * 2) forum_category_requests 테이블 확장 (forum_type, icon_url, tags, metadata 추가)
 * 3) GlycoPharm 레거시 데이터 이관 (glycopharm_forum_category_requests → forum_category_requests)
 */
export class AddForumTypeToCategory1771200000017 implements MigrationInterface {
  name = 'AddForumTypeToCategory1771200000017';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // =========================================================================
    // 1. forum_category.forum_type 추가 + 백필
    // =========================================================================
    await queryRunner.query(`
      ALTER TABLE forum_category
      ADD COLUMN IF NOT EXISTS forum_type VARCHAR(20) NOT NULL DEFAULT 'open'
    `);

    // =========================================================================
    // 2. forum_category_requests 테이블 확장
    //    (forum-core에서 이미 생성된 테이블에 누락 컬럼 추가)
    // =========================================================================

    // forum_type
    await queryRunner.query(`
      ALTER TABLE forum_category_requests
      ADD COLUMN IF NOT EXISTS forum_type VARCHAR(20) NOT NULL DEFAULT 'open'
    `);

    // icon_url
    await queryRunner.query(`
      ALTER TABLE forum_category_requests
      ADD COLUMN IF NOT EXISTS icon_url VARCHAR(500)
    `);

    // tags (text array)
    await queryRunner.query(`
      ALTER TABLE forum_category_requests
      ADD COLUMN IF NOT EXISTS tags TEXT[]
    `);

    // metadata (jsonb)
    await queryRunner.query(`
      ALTER TABLE forum_category_requests
      ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'
    `);

    // requester_id 인덱스 (없을 수 있으므로 IF NOT EXISTS)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_fcr_requester
      ON forum_category_requests(requester_id, status)
    `);

    // =========================================================================
    // 3. GlycoPharm 레거시 데이터 이관
    //    glycopharm_forum_category_requests → forum_category_requests
    // =========================================================================
    const tableExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'glycopharm_forum_category_requests'
      )
    `);

    if (tableExists?.[0]?.exists) {
      const legacyCount = await queryRunner.query(`
        SELECT COUNT(*)::int AS cnt FROM glycopharm_forum_category_requests
      `);

      if (legacyCount?.[0]?.cnt > 0) {
        // 중복 방지: 이미 이관된 데이터는 건너뜀
        await queryRunner.query(`
          INSERT INTO forum_category_requests (
            id, service_code, organization_id, requester_id,
            name, description, reason, forum_type,
            icon_emoji, icon_url, tags, metadata,
            status, reviewer_id, review_comment, reviewed_at,
            created_category_id, created_category_slug,
            requester_name, requester_email, reviewer_name,
            created_at, updated_at
          )
          SELECT
            g.id,
            'glycopharm',
            NULL,
            g.requester_id,
            g.name,
            g.description,
            g.reason,
            'open',
            NULL,
            NULL,
            NULL,
            '{}',
            g.status::varchar,
            g.reviewer_id,
            g.review_comment,
            g.reviewed_at,
            g.created_category_id,
            g.created_category_slug,
            g.requester_name,
            g.requester_email,
            g.reviewer_name,
            g.created_at,
            g.updated_at
          FROM glycopharm_forum_category_requests g
          WHERE NOT EXISTS (
            SELECT 1 FROM forum_category_requests f WHERE f.id = g.id
          )
        `);
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE forum_category DROP COLUMN IF EXISTS forum_type`);
    await queryRunner.query(`ALTER TABLE forum_category_requests DROP COLUMN IF EXISTS forum_type`);
    await queryRunner.query(`ALTER TABLE forum_category_requests DROP COLUMN IF EXISTS icon_url`);
    await queryRunner.query(`ALTER TABLE forum_category_requests DROP COLUMN IF EXISTS tags`);
    await queryRunner.query(`ALTER TABLE forum_category_requests DROP COLUMN IF EXISTS metadata`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_fcr_requester`);
  }
}
