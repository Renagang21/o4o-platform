import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeForumPostAuthorNullable2026012700001 implements MigrationInterface {
  name = 'MakeForumPostAuthorNullable2026012700001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasTable = await queryRunner.hasTable('forum_post');
    if (!hasTable) {
      console.log('Table forum_post does not exist, skipping migration');
      return;
    }
    await queryRunner.query(`ALTER TABLE "forum_post" ALTER COLUMN "author_id" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "forum_post" ALTER COLUMN "categoryId" DROP NOT NULL`);

    // Fix content column type: entity expects jsonb but 001 migration created as text
    const contentCol = await queryRunner.query(`
      SELECT data_type FROM information_schema.columns
      WHERE table_name = 'forum_post' AND column_name = 'content'
    `);
    if (contentCol.length > 0 && contentCol[0].data_type === 'text') {
      await queryRunner.query(`
        ALTER TABLE "forum_post"
        ALTER COLUMN "content" TYPE jsonb USING content::jsonb
      `);
      console.log('Converted forum_post.content from text to jsonb');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasTable = await queryRunner.hasTable('forum_post');
    if (!hasTable) return;
    await queryRunner.query(`ALTER TABLE "forum_post" ALTER COLUMN "author_id" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "forum_post" ALTER COLUMN "categoryId" SET NOT NULL`);
  }
}
