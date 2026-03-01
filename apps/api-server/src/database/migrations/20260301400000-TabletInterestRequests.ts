import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-TABLET-MODULE-V1
 *
 * tablet_interest_requests — 매장 태블릿 관심 요청 큐
 *
 * 고객이 개별 상품에 관심 표시 → 직원 알림 → 상담/안내
 * E-commerce Core와 완전 분리 (주문 아님)
 *
 * 상태 모델: REQUESTED → ACKNOWLEDGED → COMPLETED | CANCELLED
 */
export class TabletInterestRequests20260301400000 implements MigrationInterface {
  name = 'TabletInterestRequests20260301400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enum 타입 생성
    await queryRunner.query(`
      CREATE TYPE tablet_interest_request_status_enum
        AS ENUM ('REQUESTED', 'ACKNOWLEDGED', 'COMPLETED', 'CANCELLED')
    `);

    // 테이블 생성
    await queryRunner.query(`
      CREATE TABLE tablet_interest_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

        organization_id UUID NOT NULL
          REFERENCES organization_stores(id) ON DELETE CASCADE,

        master_id UUID NOT NULL
          REFERENCES product_masters(id) ON DELETE CASCADE,

        product_name VARCHAR(255) NOT NULL,
        customer_name VARCHAR(100),
        customer_note TEXT,

        status tablet_interest_request_status_enum NOT NULL DEFAULT 'REQUESTED',

        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        acknowledged_at TIMESTAMP,
        completed_at TIMESTAMP,
        cancelled_at TIMESTAMP
      )
    `);

    // 폴링 최적화 인덱스 (organization_id + status)
    await queryRunner.query(`
      CREATE INDEX idx_interest_requests_org_status
        ON tablet_interest_requests (organization_id, status)
    `);

    // 최신순 조회 인덱스
    await queryRunner.query(`
      CREATE INDEX idx_interest_requests_org_created
        ON tablet_interest_requests (organization_id, created_at DESC)
    `);

    // Master 기준 통계 인덱스
    await queryRunner.query(`
      CREATE INDEX idx_interest_requests_master
        ON tablet_interest_requests (master_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS tablet_interest_requests CASCADE`);
    await queryRunner.query(`DROP TYPE IF EXISTS tablet_interest_request_status_enum CASCADE`);
  }
}
