/**
 * Migration: AddUsageTypeToKpaContents
 *
 * WO-O4O-KPA-RESOURCES-USAGE-TYPE-V1
 *
 * kpa_contents에 usage_type 컬럼 추가.
 * 기존 데이터는 source_type 기반으로 자동 매핑:
 *   external → LINK
 *   upload   → DOWNLOAD
 *   manual   → READ  (default)
 */

import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUsageTypeToKpaContents20260429200000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE kpa_contents
      ADD COLUMN IF NOT EXISTS usage_type VARCHAR(20)
    `);

    await queryRunner.query(`
      UPDATE kpa_contents
      SET usage_type = CASE
        WHEN source_type = 'external' THEN 'LINK'
        WHEN source_type = 'upload'   THEN 'DOWNLOAD'
        ELSE 'READ'
      END
      WHERE usage_type IS NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE kpa_contents DROP COLUMN IF EXISTS usage_type
    `);
  }
}
