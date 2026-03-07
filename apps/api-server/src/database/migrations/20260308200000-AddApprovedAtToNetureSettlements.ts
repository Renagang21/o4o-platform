import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-SETTLEMENT-ENGINE-OPERATOR-REFACTOR-V1
 *
 * neture_settlements 테이블에 approved_at 컬럼 추가
 *
 * - approved_at: 운영자 승인 시점 기록 (paid_at과 대칭)
 * - status 컬럼은 VARCHAR(30)이므로 'approved' 값 자체는 스키마 변경 불필요
 */
export class AddApprovedAtToNetureSettlements20260308200000 implements MigrationInterface {
  name = 'AddApprovedAtToNetureSettlements20260308200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE neture_settlements
      ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE neture_settlements DROP COLUMN IF EXISTS approved_at
    `);
  }
}
