import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-PAYMENT-CORE-GLYCOPHARM-PILOT-V1
 *
 * o4o_payments 테이블 생성
 * PaymentCoreService의 PaymentRepository 백킹 스토어
 */
export class CreateO4oPaymentsTable1771027200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "o4o_payments" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "status" varchar(20) NOT NULL DEFAULT 'CREATED',
        "amount" decimal(12,2) NOT NULL,
        "currency" varchar(10) NOT NULL DEFAULT 'KRW',
        "transactionId" varchar(100) NOT NULL,
        "orderId" varchar(100),
        "paymentKey" varchar(255),
        "paymentMethod" varchar(50),
        "paidAmount" decimal(12,2),
        "requestedAt" timestamp NOT NULL DEFAULT NOW(),
        "paidAt" timestamp,
        "failedAt" timestamp,
        "cancelledAt" timestamp,
        "refundedAt" timestamp,
        "failureReason" text,
        "sourceService" varchar(50) NOT NULL,
        "metadata" jsonb,
        "createdAt" timestamp NOT NULL DEFAULT NOW(),
        "updatedAt" timestamp NOT NULL DEFAULT NOW()
      );
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_o4o_payments_transactionId"
        ON "o4o_payments"("transactionId");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_o4o_payments_orderId"
        ON "o4o_payments"("orderId");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_o4o_payments_sourceService"
        ON "o4o_payments"("sourceService");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "o4o_payments";`);
  }
}
