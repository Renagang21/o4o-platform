import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPinnedAndIconEmojiToForumCategory2026020300001 implements MigrationInterface {
  name = 'AddPinnedAndIconEmojiToForumCategory2026020300001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ForumCategory: pinned fields
    await queryRunner.query(`
      ALTER TABLE "forum_category"
      ADD COLUMN IF NOT EXISTS "isPinned" boolean NOT NULL DEFAULT false
    `);

    await queryRunner.query(`
      ALTER TABLE "forum_category"
      ADD COLUMN IF NOT EXISTS "pinnedOrder" int NULL
    `);

    // ForumCategory: icon emoji
    await queryRunner.query(`
      ALTER TABLE "forum_category"
      ADD COLUMN IF NOT EXISTS "iconEmoji" varchar(10) NULL
    `);

    // ForumCategoryRequest: icon emoji
    await queryRunner.query(`
      ALTER TABLE "forum_category_requests"
      ADD COLUMN IF NOT EXISTS "icon_emoji" varchar(10) NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "forum_category_requests" DROP COLUMN IF EXISTS "icon_emoji"`);
    await queryRunner.query(`ALTER TABLE "forum_category" DROP COLUMN IF EXISTS "iconEmoji"`);
    await queryRunner.query(`ALTER TABLE "forum_category" DROP COLUMN IF EXISTS "pinnedOrder"`);
    await queryRunner.query(`ALTER TABLE "forum_category" DROP COLUMN IF EXISTS "isPinned"`);
  }
}
