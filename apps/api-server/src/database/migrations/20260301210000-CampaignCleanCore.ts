import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-NETURE-CAMPAIGN-CLEAN-CORE-V1
 *
 * Campaign 잔존 DB 구조 완전 제거:
 * 1. neture_campaign_status ENUM 타입 DROP
 * 2. 테이블은 ProductMasterCoreReset20260301100000에서 이미 DROP 완료
 */
export class CampaignCleanCore20260301210000 implements MigrationInterface {
  name = 'CampaignCleanCore20260301210000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TYPE IF EXISTS neture_campaign_status CASCADE`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE neture_campaign_status AS ENUM ('DRAFT', 'SCHEDULED', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED')
    `);
  }
}
