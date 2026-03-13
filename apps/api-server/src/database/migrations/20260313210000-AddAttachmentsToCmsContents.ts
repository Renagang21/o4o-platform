/**
 * Migration: Add attachments JSONB column to cms_contents
 * WO-O4O-KNOWLEDGE-LIBRARY-V1
 *
 * Knowledge 자료실 첨부파일 저장.
 */

import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAttachmentsToCmsContents1710367800000 implements MigrationInterface {
  name = 'AddAttachmentsToCmsContents1710367800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "cms_contents"
      ADD COLUMN IF NOT EXISTS "attachments" JSONB DEFAULT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "cms_contents"
      DROP COLUMN IF EXISTS "attachments"
    `);
  }
}
