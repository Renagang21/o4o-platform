import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateForumJoinRequests20261001000000 implements MigrationInterface {
  name = 'CreateForumJoinRequests20261001000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // forum_join_requests — service-agnostic join request table
    // FK references forum_category_requests (forum_category was dropped in 20260908000000)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS forum_join_requests (
        id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        forum_category_id UUID NOT NULL
          REFERENCES forum_category_requests(id) ON DELETE CASCADE,
        user_id          UUID NOT NULL,
        status           VARCHAR(20) NOT NULL DEFAULT 'pending'
          CHECK (status IN ('pending','approved','rejected','cancelled')),
        message          TEXT,
        reviewer_id      UUID,
        review_comment   TEXT,
        reviewed_at      TIMESTAMPTZ,
        created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // At most one pending request per (forum, user) at a time
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uidx_forum_join_requests_pending
        ON forum_join_requests (forum_category_id, user_id)
        WHERE status = 'pending'
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_forum_join_requests_category
        ON forum_join_requests (forum_category_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_forum_join_requests_user
        ON forum_join_requests (user_id)
    `);

    // Backfill from kpa_approval_requests (entity_type='forum_member_join')
    await queryRunner.query(`
      INSERT INTO forum_join_requests
        (id, forum_category_id, user_id, status, reviewer_id, review_comment, reviewed_at, created_at, updated_at)
      SELECT
        id,
        (payload->>'forum_category_id')::UUID,
        requester_id,
        CASE status
          WHEN 'pending'  THEN 'pending'
          WHEN 'approved' THEN 'approved'
          WHEN 'rejected' THEN 'rejected'
          ELSE 'cancelled'
        END,
        reviewed_by,
        review_comment,
        reviewed_at,
        created_at,
        updated_at
      FROM kpa_approval_requests
      WHERE entity_type = 'forum_member_join'
        AND (payload->>'forum_category_id') IS NOT NULL
        AND (payload->>'forum_category_id')::TEXT ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      ON CONFLICT DO NOTHING
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS forum_join_requests CASCADE`);
  }
}
