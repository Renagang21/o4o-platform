import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-MARKETING-CONTENT-REWARD-DETAIL-MVP-V1
 * credit_transactions(source_type, source_id) 복합 인덱스 추가
 * — 강의별 보상 지급 조회 성능 개선
 */
export class AddSourceIndexToCreditTransactions20260416600000 implements MigrationInterface {
  name = 'AddSourceIndexToCreditTransactions20260416600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_credit_transactions_source
      ON credit_transactions (source_type, source_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_credit_transactions_source
    `);
  }
}
