import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: MigrateForumPostContentToJsonb
 *
 * Converts ForumPost.content from TEXT to JSONB for Block[] support.
 * This migration:
 * 1. Adds a temporary jsonb column
 * 2. Converts existing text content to Block[] format
 * 3. Drops the old text column and renames the new one
 *
 * Existing text content is wrapped in a paragraph block:
 * "Hello world" -> [{ "id": "...", "type": "paragraph", "content": "Hello world" }]
 */
export class MigrateForumPostContentToJsonb9100000000000 implements MigrationInterface {
  name = 'MigrateForumPostContentToJsonb9100000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if the forum_post table exists
    const tableExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'forum_post'
      )
    `);

    if (!tableExists[0]?.exists) {
      console.log('forum_post table does not exist, skipping migration');
      return;
    }

    // Check current column type
    const columnInfo = await queryRunner.query(`
      SELECT data_type
      FROM information_schema.columns
      WHERE table_name = 'forum_post' AND column_name = 'content'
    `);

    if (!columnInfo.length) {
      console.log('content column does not exist, skipping migration');
      return;
    }

    const currentType = columnInfo[0]?.data_type;

    // If already jsonb, skip
    if (currentType === 'jsonb') {
      console.log('content column is already jsonb, skipping migration');
      return;
    }

    console.log(`Migrating forum_post.content from ${currentType} to jsonb...`);

    // Step 1: Add temporary jsonb column
    await queryRunner.query(`
      ALTER TABLE forum_post
      ADD COLUMN IF NOT EXISTS content_new jsonb DEFAULT '[]'::jsonb
    `);

    // Step 2: Convert existing text content to Block[] format
    // Each text is wrapped in a paragraph block with generated ID
    await queryRunner.query(`
      UPDATE forum_post
      SET content_new = CASE
        WHEN content IS NULL OR content = '' THEN '[]'::jsonb
        ELSE jsonb_build_array(
          jsonb_build_object(
            'id', 'block-' || EXTRACT(EPOCH FROM NOW())::bigint || '-0',
            'type', 'paragraph',
            'content', content,
            'attributes', '{}'::jsonb,
            'order', 0
          )
        )
      END
      WHERE content_new = '[]'::jsonb OR content_new IS NULL
    `);

    // Step 3: Drop old column and rename new one
    await queryRunner.query(`
      ALTER TABLE forum_post DROP COLUMN content
    `);

    await queryRunner.query(`
      ALTER TABLE forum_post RENAME COLUMN content_new TO content
    `);

    // Step 4: Set NOT NULL constraint with default
    await queryRunner.query(`
      ALTER TABLE forum_post
      ALTER COLUMN content SET DEFAULT '[]'::jsonb,
      ALTER COLUMN content SET NOT NULL
    `);

    console.log('Migration completed successfully');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Check if the forum_post table exists
    const tableExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'forum_post'
      )
    `);

    if (!tableExists[0]?.exists) {
      console.log('forum_post table does not exist, skipping rollback');
      return;
    }

    // Check current column type
    const columnInfo = await queryRunner.query(`
      SELECT data_type
      FROM information_schema.columns
      WHERE table_name = 'forum_post' AND column_name = 'content'
    `);

    if (!columnInfo.length) {
      console.log('content column does not exist, skipping rollback');
      return;
    }

    const currentType = columnInfo[0]?.data_type;

    // If already text, skip
    if (currentType === 'text') {
      console.log('content column is already text, skipping rollback');
      return;
    }

    console.log('Rolling back forum_post.content from jsonb to text...');

    // Step 1: Add temporary text column
    await queryRunner.query(`
      ALTER TABLE forum_post
      ADD COLUMN IF NOT EXISTS content_old text
    `);

    // Step 2: Convert Block[] back to text (extract first paragraph content)
    await queryRunner.query(`
      UPDATE forum_post
      SET content_old = COALESCE(
        content->0->>'content',
        ''
      )
    `);

    // Step 3: Drop jsonb column and rename text column
    await queryRunner.query(`
      ALTER TABLE forum_post DROP COLUMN content
    `);

    await queryRunner.query(`
      ALTER TABLE forum_post RENAME COLUMN content_old TO content
    `);

    // Step 4: Set NOT NULL constraint
    await queryRunner.query(`
      ALTER TABLE forum_post
      ALTER COLUMN content SET NOT NULL
    `);

    console.log('Rollback completed successfully');
  }
}
