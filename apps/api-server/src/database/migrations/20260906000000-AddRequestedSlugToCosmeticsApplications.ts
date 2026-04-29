/**
 * WO-O4O-STORE-FLOW-BLOCKER-FIX-V1 — BUG-1
 *
 * cosmetics.cosmetics_store_applications 에 requested_slug 컬럼 추가.
 * CosmeticsStoreApplication entity 정의와 DB 스키마 동기화.
 */

import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRequestedSlugToCosmeticsApplications20260906000000 implements MigrationInterface {
  name = 'AddRequestedSlugToCosmeticsApplications20260906000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE cosmetics.cosmetics_store_applications
        ADD COLUMN IF NOT EXISTS requested_slug VARCHAR(120) NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE cosmetics.cosmetics_store_applications
        DROP COLUMN IF EXISTS requested_slug
    `);
  }
}
