import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Add `body` (HTML) column to kpa_working_contents.
 * WO-O4O-KPA-QR-CONTENT-RICH-EDITOR-ADOPTION-V1
 *
 * 운영자 콘텐츠 등록이 RichTextEditor(body HTML) 기반으로 전환되면서,
 * copy-to-store 사본(kpa_working_contents)도 body 를 보존해야 한다.
 * 기존 blocks-only 사본은 body=NULL 로 유지되며 edited_blocks 로 계속 렌더된다.
 */
export class AddBodyToKpaWorkingContents20261124000000 implements MigrationInterface {
  name = 'AddBodyToKpaWorkingContents20261124000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "kpa_working_contents" ADD COLUMN IF NOT EXISTS "body" text`);
    console.log('[Migration] kpa_working_contents.body added');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "kpa_working_contents" DROP COLUMN IF EXISTS "body"`);
    console.log('[Migration] kpa_working_contents.body dropped');
  }
}
