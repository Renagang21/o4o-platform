import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeForumPostAuthorNullable2026012700001 implements MigrationInterface {
  name = 'MakeForumPostAuthorNullable2026012700001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasTable = await queryRunner.hasTable('forum_posts');
    if (!hasTable) {
      console.log('Table forum_posts does not exist, skipping migration');
      return;
    }
    await queryRunner.query(`ALTER TABLE "forum_posts" ALTER COLUMN "author_id" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "forum_posts" ALTER COLUMN "categoryId" DROP NOT NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasTable = await queryRunner.hasTable('forum_posts');
    if (!hasTable) return;
    await queryRunner.query(`ALTER TABLE "forum_posts" ALTER COLUMN "author_id" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "forum_posts" ALTER COLUMN "categoryId" SET NOT NULL`);
  }
}
