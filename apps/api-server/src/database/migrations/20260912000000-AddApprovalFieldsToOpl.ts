import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-EVENT-OFFER-APPROVAL-PHASE1-V1
 *
 * organization_product_listings에 Approval Queue 메타컬럼 추가.
 *
 * Event Offer를 단순 노출(Exposure Control)에서 Approval Queue 기반으로 승격.
 * supplier가 제안 → operator가 service별로 독립 승인/반려 → 매장 노출.
 *
 * 추가 컬럼:
 *   - requested_by      uuid NULL  : proposal 작성자 (supplier user_id)
 *   - decided_by        uuid NULL  : 승인/반려 결정자 (operator user_id)
 *   - decided_at        timestamp NULL : 결정 시각
 *   - rejected_reason   text NULL  : 반려 사유
 *
 * 인덱스:
 *   - (status, service_key) 복합 — pending 큐 조회 가속
 *
 * 주의:
 *   - status는 이미 varchar(20)이라 'rejected' 값 추가에 ENUM ALTER 불필요
 *   - 기존 row는 신규 컬럼이 NULL인 채로 자연스럽게 호환됨
 *     · approved row (운영자 직접 등록): decided_by NULL이지만 의미상 승인
 *     · pending row (supplier proposal 잔존분): 신규 approve endpoint로 처리 가능
 */
export class AddApprovalFieldsToOpl20260912000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE IF EXISTS organization_product_listings
        ADD COLUMN IF NOT EXISTS requested_by    uuid NULL,
        ADD COLUMN IF NOT EXISTS decided_by      uuid NULL,
        ADD COLUMN IF NOT EXISTS decided_at      timestamp NULL,
        ADD COLUMN IF NOT EXISTS rejected_reason text NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_opl_status_service
        ON organization_product_listings(status, service_key)
    `);

    console.log('[Migration] organization_product_listings: added approval fields + idx_opl_status_service');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_opl_status_service`);
    await queryRunner.query(`
      ALTER TABLE IF EXISTS organization_product_listings
        DROP COLUMN IF EXISTS rejected_reason,
        DROP COLUMN IF EXISTS decided_at,
        DROP COLUMN IF EXISTS decided_by,
        DROP COLUMN IF EXISTS requested_by
    `);
  }
}
