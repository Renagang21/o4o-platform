import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-PAYMENT-CORE-GLYCOPHARM-PILOT-V1
 * WO-O4O-PAYMENTCORE-O4O-PAYMENTS-MIGRATION-RELOCATE-V1
 *
 * o4o_payments 테이블 생성 — PaymentCoreService(PaymentRepository) 백킹 스토어(PlatformPayment entity).
 *
 * 본 migration 은 원래 apps/api-server/src/migrations/ (migration 러너 미스캔 디렉터리)에 있어
 * production 에 적용되지 않았다(IR-O4O-PAYMENTCORE-O4O-PAYMENTS-SCHEMA-CONTRACT-AUDIT-V1).
 * 스캔 디렉터리(src/database/migrations)로 이전하여 CI/CD migration job 이 적용하도록 한다.
 * CREATE TABLE/INDEX IF NOT EXISTS — 재적용 안전.
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
