import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-KPA-A-FORUM-MEMBERSHIP-TABLE-AND-JOIN-API-V1
 *
 * Creates forum_category_members table for closed forum membership.
 * Backfills existing forum_category creators as role='owner'.
 */
export class CreateForumCategoryMembersTable20260404400000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS forum_category_members (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        forum_category_id UUID NOT NULL,
        user_id UUID NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'member',
        joined_at TIMESTAMP NOT NULL DEFAULT NOW(),
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

        CONSTRAINT fk_fcm_forum_category
          FOREIGN KEY (forum_category_id)
          REFERENCES forum_category(id) ON DELETE CASCADE,

        CONSTRAINT fk_fcm_user
          FOREIGN KEY (user_id)
          REFERENCES users(id) ON DELETE CASCADE,

        CONSTRAINT uq_fcm_category_user
          UNIQUE (forum_category_id, user_id)
      )
    `);

    // 2. Index
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_fcm_category_role
        ON forum_category_members (forum_category_id, role)
    `);

    // 3. Backfill existing forum owners
    // Column may be "createdBy" (camelCase from migration 001) or created_by (snake_case)
    await queryRunner.query(`
      DO $$ BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'forum_category' AND column_name = 'createdBy'
        ) THEN
          INSERT INTO forum_category_members (forum_category_id, user_id, role, joined_at)
          SELECT fc.id, fc."createdBy", 'owner', fc.created_at
          FROM forum_category fc
          WHERE fc."createdBy" IS NOT NULL
          ON CONFLICT (forum_category_id, user_id) DO NOTHING;
        ELSIF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'forum_category' AND column_name = 'created_by'
        ) THEN
          INSERT INTO forum_category_members (forum_category_id, user_id, role, joined_at)
          SELECT fc.id, fc.created_by, 'owner', fc.created_at
          FROM forum_category fc
          WHERE fc.created_by IS NOT NULL
          ON CONFLICT (forum_category_id, user_id) DO NOTHING;
        END IF;
      END $$
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS forum_category_members`);
  }
}
