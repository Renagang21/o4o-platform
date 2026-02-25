/**
 * Migration: Add config JSONB column to organization_channels
 *
 * WO-CHANNEL-CREATION-FLOW-SIMPLIFICATION-V1
 *
 * 채널별 설정(Hero, Theme, 배치 등)을 저장하기 위한 JSONB 컬럼 추가.
 * 초기값은 빈 객체 {}.
 */

import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddConfigToOrganizationChannels20260225000001 implements MigrationInterface {
  name = 'AddConfigToOrganizationChannels20260225000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Guard: check if column already exists
    const columnExists = await queryRunner.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'organization_channels'
        AND column_name = 'config'
    `);

    if (columnExists.length > 0) {
      return;
    }

    await queryRunner.query(`
      ALTER TABLE "organization_channels"
      ADD COLUMN "config" JSONB NOT NULL DEFAULT '{}'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "organization_channels"
      DROP COLUMN IF EXISTS "config"
    `);
  }
}
