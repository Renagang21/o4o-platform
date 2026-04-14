/**
 * Migration: Create checkout_orders, checkout_payments, checkout_order_logs tables
 *
 * WO-KPA-CHECKOUT-ORDER-ENTITY-ALIGNMENT-FIX-V1
 *
 * These entities existed as TypeORM @Entity classes but had no CREATE TABLE
 * migration — so the tables were never created in production.
 *
 * This migration creates all three tables with IF NOT EXISTS for safety.
 */
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCheckoutTables1713052800000 implements MigrationInterface {
  name = 'CreateCheckoutTables1713052800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ──────────────────────────────────────────────────────────
    // 1. Enum types (IF NOT EXISTS)
    // ──────────────────────────────────────────────────────────
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "checkout_orders_status_enum"
          AS ENUM ('created','pending_payment','paid','refunded','cancelled');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "checkout_orders_paymentstatus_enum"
          AS ENUM ('pending','paid','failed','refunded');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "checkout_payments_status_enum"
          AS ENUM ('pending','success','failed','refunded');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "checkout_order_logs_action_enum"
          AS ENUM ('created','payment_initiated','payment_success','payment_failed','refund_requested','refunded','cancelled','status_changed');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    // ──────────────────────────────────────────────────────────
    // 2. checkout_orders
    // ──────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "checkout_orders" (
        "id"                    uuid DEFAULT uuid_generate_v4() NOT NULL,
        "orderNumber"           varchar(50) NOT NULL,
        "buyerId"               uuid NOT NULL,
        "sellerId"              varchar(100) NOT NULL,
        "supplierId"            varchar(100) NOT NULL,
        "sellerOrganizationId"  uuid,
        "partnerId"             varchar(100),
        "subtotal"              decimal(12,2) NOT NULL DEFAULT 0,
        "shippingFee"           decimal(10,2) NOT NULL DEFAULT 0,
        "discount"              decimal(10,2) NOT NULL DEFAULT 0,
        "totalAmount"           decimal(12,2) NOT NULL,
        "status"                "checkout_orders_status_enum" NOT NULL DEFAULT 'created',
        "paymentStatus"         "checkout_orders_paymentstatus_enum" NOT NULL DEFAULT 'pending',
        "paymentMethod"         varchar(50),
        "shippingAddress"       jsonb,
        "items"                 jsonb NOT NULL DEFAULT '[]'::jsonb,
        "metadata"              jsonb,
        "paidAt"                timestamp,
        "refundedAt"            timestamp,
        "cancelledAt"           timestamp,
        "createdAt"             timestamp NOT NULL DEFAULT now(),
        "updatedAt"             timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_checkout_orders" PRIMARY KEY ("id")
      );
    `);

    // Indexes
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_checkout_orders_orderNumber" ON "checkout_orders" ("orderNumber")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_checkout_orders_buyerId" ON "checkout_orders" ("buyerId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_checkout_orders_supplierId" ON "checkout_orders" ("supplierId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_checkout_orders_partnerId" ON "checkout_orders" ("partnerId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_checkout_orders_status" ON "checkout_orders" ("status")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_checkout_orders_paymentStatus" ON "checkout_orders" ("paymentStatus")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_checkout_orders_seller_org_id" ON "checkout_orders" ("sellerOrganizationId")`);

    // ──────────────────────────────────────────────────────────
    // 3. checkout_payments
    // ──────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "checkout_payments" (
        "id"                  uuid DEFAULT uuid_generate_v4() NOT NULL,
        "orderId"             uuid NOT NULL,
        "paymentKey"          varchar(255),
        "pgProvider"          varchar(50) NOT NULL DEFAULT 'toss',
        "amount"              decimal(12,2) NOT NULL,
        "refundedAmount"      decimal(12,2) NOT NULL DEFAULT 0,
        "status"              "checkout_payments_status_enum" NOT NULL DEFAULT 'pending',
        "method"              varchar(50),
        "cardCompany"         varchar(50),
        "cardNumber"          varchar(20),
        "installmentMonths"   int NOT NULL DEFAULT 0,
        "failureReason"       text,
        "refundReason"        text,
        "metadata"            jsonb,
        "approvedAt"          timestamp,
        "failedAt"            timestamp,
        "refundedAt"          timestamp,
        "createdAt"           timestamp NOT NULL DEFAULT now(),
        "updatedAt"           timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_checkout_payments" PRIMARY KEY ("id"),
        CONSTRAINT "FK_checkout_payments_order" FOREIGN KEY ("orderId") REFERENCES "checkout_orders"("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_checkout_payments_orderId" ON "checkout_payments" ("orderId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_checkout_payments_paymentKey" ON "checkout_payments" ("paymentKey")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_checkout_payments_status" ON "checkout_payments" ("status")`);

    // ──────────────────────────────────────────────────────────
    // 4. checkout_order_logs
    // ──────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "checkout_order_logs" (
        "id"              uuid DEFAULT uuid_generate_v4() NOT NULL,
        "orderId"         uuid NOT NULL,
        "action"          "checkout_order_logs_action_enum" NOT NULL,
        "previousStatus"  varchar(50),
        "newStatus"       varchar(50),
        "performedBy"     varchar(100) NOT NULL,
        "performerType"   varchar(50) NOT NULL DEFAULT 'system',
        "message"         text,
        "metadata"        jsonb,
        "createdAt"       timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_checkout_order_logs" PRIMARY KEY ("id")
      );
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_checkout_order_logs_orderId" ON "checkout_order_logs" ("orderId")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "checkout_order_logs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "checkout_payments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "checkout_orders"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "checkout_order_logs_action_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "checkout_payments_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "checkout_orders_paymentstatus_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "checkout_orders_status_enum"`);
  }
}
