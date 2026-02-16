import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-PAYMENT-CORE-STABILIZATION-V1
 *
 * P0-2: paymentKey UNIQUE 제약 추가 (partial — NULL 제외)
 * 보너스: status INDEX 추가 (성능)
 */
export class AddPaymentKeyUniqueAndStatusIndex1771027200001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // paymentKey UNIQUE (partial) — NULL은 여러 개 허용 (prepare 단계)
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_o4o_payments_paymentKey_unique"
        ON "o4o_payments"("paymentKey") WHERE "paymentKey" IS NOT NULL;
    `);

    // status INDEX — 상태별 조회 성능
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_o4o_payments_status"
        ON "o4o_payments"("status");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_o4o_payments_status";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_o4o_payments_paymentKey_unique";`);
  }
}
