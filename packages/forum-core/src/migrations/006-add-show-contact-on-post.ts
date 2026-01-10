import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Forum Core Migration 006 - Add Show Contact On Post
 *
 * Work Order: WO-NETURE-EXTERNAL-CONTACT-V1
 *
 * Adds the show_contact_on_post column to forum_post table.
 * This allows authors to optionally display their external contact
 * information (KakaoTalk) on individual posts.
 */
export class ForumCoreMigration006AddShowContactOnPost implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if column already exists
    const table = await queryRunner.getTable('forum_post');

    if (!table?.findColumnByName('show_contact_on_post')) {
      await queryRunner.query(`
        ALTER TABLE "forum_post"
        ADD COLUMN "show_contact_on_post" boolean NOT NULL DEFAULT false
      `);
      console.log('Added show_contact_on_post column to forum_post table');
    } else {
      console.log('show_contact_on_post column already exists, skipping');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "forum_post" DROP COLUMN IF EXISTS "show_contact_on_post"
    `);
    console.log('Removed show_contact_on_post column from forum_post table');
  }
}
