/**
 * Migration: Add storefront_config JSONB to kpa_organizations
 *
 * WO-PHARMACY-HUB-REALIGN-PHASEH2-V1
 * 약국 매장 설정(템플릿/테마/컴포넌트)을 서버에 저장하기 위한 JSONB 컬럼 추가.
 */

import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddKpaStorefrontConfig20260215000010 implements MigrationInterface {
  name = 'AddKpaStorefrontConfig20260215000010';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Guard: check if column already exists
    const columnExists = await queryRunner.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'kpa_organizations' AND column_name = 'storefront_config'
    `);

    if (columnExists.length === 0) {
      await queryRunner.query(`
        ALTER TABLE "kpa_organizations"
        ADD COLUMN "storefront_config" JSONB NOT NULL DEFAULT '{}'
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "kpa_organizations" DROP COLUMN IF EXISTS "storefront_config"
    `);
  }
}
