import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-SIGNAGE-SUPPLIER-CAMPAIGN-REQUEST-V1
 *
 * signage_forced_content에 캠페인 추적 컬럼 추가.
 *
 * - media_id: 공급자 캠페인으로 생성된 row에만 설정 (playback_logs 연결용)
 * - campaign_request_id: kpa_approval_requests.id 참조 (요청 출처 추적)
 *
 * 기존 운영자 수동 강제 삽입 데이터는 두 컬럼 모두 NULL 유지.
 */
export class AddCampaignFieldsToSignageForcedContent20260430000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE signage_forced_content
        ADD COLUMN IF NOT EXISTS media_id UUID,
        ADD COLUMN IF NOT EXISTS campaign_request_id UUID
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_sfc_media_id
        ON signage_forced_content (media_id)
        WHERE media_id IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_sfc_campaign_request_id
        ON signage_forced_content (campaign_request_id)
        WHERE campaign_request_id IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_sfc_campaign_request_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_sfc_media_id`);
    await queryRunner.query(`
      ALTER TABLE signage_forced_content
        DROP COLUMN IF EXISTS campaign_request_id,
        DROP COLUMN IF EXISTS media_id
    `);
  }
}
