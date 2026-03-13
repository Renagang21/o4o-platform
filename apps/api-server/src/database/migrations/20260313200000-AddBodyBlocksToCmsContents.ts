/**
 * Migration: Add bodyBlocks JSONB column to cms_contents
 * WO-O4O-CMS-GUIDE-EDITOR-V1
 *
 * TipTap Rich Editor의 Block[] JSON을 저장하기 위한 컬럼.
 * 기존 body(TEXT) 필드는 호환성을 위해 유지.
 */

import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBodyBlocksToCmsContents1710360000000 implements MigrationInterface {
  name = 'AddBodyBlocksToCmsContents1710360000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "cms_contents"
      ADD COLUMN IF NOT EXISTS "bodyBlocks" JSONB DEFAULT NULL
    `);
    console.log('[AddBodyBlocksToCmsContents] Added bodyBlocks JSONB column.');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "cms_contents" DROP COLUMN IF EXISTS "bodyBlocks"
    `);
  }
}
