import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-MARKET-TRIAL-PRODUCT-ORDER-SHIPPING-SCHEMA-CLEANUP-V1 (P3-1)
 *
 * 유통참여형 펀딩 = Neture 전용 content-only 모집. 주문/발송(풀필먼트·배송) 축을 제거한다.
 * - 실측(2026-06-19, read-only): market_trial_fulfillments = 0 row, market_trial_shipping_addresses = 0 row.
 *   → 배송지 개인정보가 저장된 적 없음. drop 안전.
 * - 정산(settlement*)·결제(payment*) 컬럼 및 기존 데이터(정산 choice_pending 1 / 결제 paid 1)는 미변경.
 * - core entity 컬럼(listingId / customerConversion* / convertedProduct* / productId) drop 은 별도 WO(P3-2).
 */
export class DropMarketTrialFulfillmentAndShipping20261115000000 implements MigrationInterface {
  name = 'DropMarketTrialFulfillmentAndShipping20261115000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "market_trial_fulfillments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "market_trial_shipping_addresses"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 구조만 복원한다(원본 row 0 — 데이터 복원 없음).
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "market_trial_shipping_addresses" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "participationId" uuid NOT NULL,
        "recipientName" varchar(100) NOT NULL,
        "phone" varchar(20) NOT NULL,
        "postalCode" varchar(10) NOT NULL,
        "address" varchar(500) NOT NULL,
        "addressDetail" varchar(200),
        "deliveryNote" varchar(500),
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_market_trial_shipping_addresses" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_market_trial_shipping_addresses_participationId" ON "market_trial_shipping_addresses" ("participationId")`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "market_trial_fulfillments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "participationId" uuid NOT NULL,
        "trialId" uuid NOT NULL,
        "status" varchar(30) NOT NULL DEFAULT 'pending',
        "orderId" uuid,
        "orderNumber" varchar(50),
        "statusHistory" jsonb NOT NULL DEFAULT '[]',
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_market_trial_fulfillments" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_market_trial_fulfillments_participationId" ON "market_trial_fulfillments" ("participationId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_market_trial_fulfillments_trialId" ON "market_trial_fulfillments" ("trialId")`);
  }
}
