import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-KPA-PHARMACY-APPLICATION-STABILIZATION-V1 Phase 5
 * KpaMember에 activity_type, fee_category 컬럼 추가
 */
export class AddKpaMemberProfessionFields1739600000000 implements MigrationInterface {
  name = 'AddKpaMemberProfessionFields1739600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "kpa_members"
      ADD COLUMN IF NOT EXISTS "activity_type" varchar(50) NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "kpa_members"
      ADD COLUMN IF NOT EXISTS "fee_category" varchar(50) NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "kpa_members"
      DROP COLUMN IF EXISTS "fee_category"
    `);
    await queryRunner.query(`
      ALTER TABLE "kpa_members"
      DROP COLUMN IF EXISTS "activity_type"
    `);
  }
}
