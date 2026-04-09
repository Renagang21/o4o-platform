import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-NETURE-CURATION-PHASE3-FULL-REMOVAL-V1
 *
 * offer_curations 테이블 완전 제거.
 *
 * Phase 1 (WO-NETURE-CURATION-PHASE1-DECISION-PRESSURE-REMOVE-V1):
 *   - 운영자 메뉴/라우트/Action Queue 압박 경로 제거
 * Phase 2 (WO-KPA-RECOMMENDED-TAB-REPLACE-CURATION-WITH-SUPPLIER-HIGHLIGHT-V1):
 *   - KPA 약국 추천 탭의 데이터 의존을 supplier_product_offers.is_featured 로 교체
 * Phase 3 (이번 마이그레이션):
 *   - 모든 코드 의존이 0 인 상태에서 테이블 + 인덱스 일괄 DROP
 *
 * 안전 장치 (백업):
 *   - DROP 직전에 offer_curations_backup_20260409 테이블로 데이터 스냅샷 생성
 *   - 같은 마이그레이션 트랜잭션 안에서 백업 → 인덱스 DROP → 테이블 DROP 순으로 진행
 *   - 백업 테이블은 Phase 4(추후 정리) 전까지 DB에 보존
 *
 * 롤백:
 *   - down() 은 빈 테이블 + 인덱스만 재생성. 데이터 자동 복원은 하지 않음
 *     (필요 시 운영자가 offer_curations_backup_20260409 → offer_curations 수동 복사)
 *   - 큐레이션 기능 자체가 운영 원칙(통제 극소화)에 위배되어 폐기되었으므로
 *     역방향 사용은 권장하지 않음.
 */
export class DropOfferCurationsTable20260409110000 implements MigrationInterface {
  name = 'DropOfferCurationsTable20260409110000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1) Safety backup — DROP 직전 데이터 스냅샷
    //    (이미 존재할 경우 재실행 안전성을 위해 IF NOT EXISTS)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS offer_curations_backup_20260409 AS
      SELECT * FROM offer_curations
    `);

    // 2) Drop indexes + table
    await queryRunner.query(`DROP INDEX IF EXISTS uq_offer_curations_unique`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_offer_curations_active`);
    await queryRunner.query(`DROP TABLE IF EXISTS offer_curations`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS offer_curations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        offer_id UUID NOT NULL REFERENCES supplier_product_offers(id) ON DELETE CASCADE,
        service_key VARCHAR(50) NOT NULL,
        placement VARCHAR(50) NOT NULL,
        category_id UUID NULL,
        position INT DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        start_at TIMESTAMP NULL,
        end_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_offer_curations_unique
      ON offer_curations (offer_id, service_key, placement, COALESCE(category_id, '00000000-0000-0000-0000-000000000000'))
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_offer_curations_active
      ON offer_curations (service_key, placement, is_active)
    `);
  }
}
