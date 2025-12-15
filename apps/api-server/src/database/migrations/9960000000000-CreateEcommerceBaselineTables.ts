import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Gate 3-Fix-2: Create E-commerce Core Baseline Tables
 *
 * Purpose:
 * - Create ecommerce_orders table (판매 원장 - SSOT)
 * - Create ecommerce_order_items table (주문 항목)
 * - Create ecommerce_payments table (결제 기록)
 *
 * This is a baseline migration - creates tables from scratch
 * All tables use IF NOT EXISTS for idempotency
 */
export class CreateEcommerceBaselineTables9960000000000 implements MigrationInterface {
  name = 'CreateEcommerceBaselineTables9960000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // =====================================================
    // 1. Create ENUM types
    // =====================================================
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE order_type AS ENUM ('retail', 'dropshipping', 'b2b', 'subscription');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE order_status AS ENUM (
          'created', 'pending_payment', 'paid', 'confirmed',
          'processing', 'shipped', 'delivered', 'completed',
          'cancelled', 'refunded'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded', 'partial_refund');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE buyer_type AS ENUM ('user', 'organization');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE seller_type AS ENUM ('individual', 'organization');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE payment_method AS ENUM (
          'card', 'bank_transfer', 'virtual_account',
          'phone', 'point', 'coupon', 'cash', 'other'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE payment_transaction_status AS ENUM (
          'pending', 'processing', 'completed', 'failed',
          'cancelled', 'refunded', 'partial_refund'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE order_item_status AS ENUM (
          'pending', 'confirmed', 'processing',
          'shipped', 'delivered', 'cancelled', 'refunded'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // =====================================================
    // 2. Create ecommerce_orders table (판매 원장)
    // =====================================================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ecommerce_orders (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "orderNumber" varchar(50) NOT NULL,
        "externalOrderId" varchar(255),

        -- 당사자 정보
        "buyerId" uuid NOT NULL,
        "buyerType" buyer_type DEFAULT 'user',
        "sellerId" uuid NOT NULL,
        "sellerType" seller_type DEFAULT 'organization',

        -- 금액 정보
        subtotal numeric(12,2) DEFAULT 0,
        "shippingFee" numeric(10,2) DEFAULT 0,
        discount numeric(10,2) DEFAULT 0,
        "totalAmount" numeric(12,2) NOT NULL,
        currency varchar(3) DEFAULT 'KRW',

        -- 결제 정보
        "paymentStatus" payment_status DEFAULT 'pending',
        "paymentMethod" varchar(50),
        "paidAt" timestamp,

        -- 주문 유형 및 상태
        "orderType" order_type DEFAULT 'retail',
        status order_status DEFAULT 'created',

        -- 배송 정보
        "shippingAddress" jsonb,

        -- 메타데이터
        metadata jsonb,

        -- 타임스탬프
        "confirmedAt" timestamp,
        "completedAt" timestamp,
        "cancelledAt" timestamp,
        "createdAt" timestamp DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" timestamp DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT ecommerce_orders_order_number_unique UNIQUE ("orderNumber")
      );
    `);

    // Create indexes for ecommerce_orders
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_ecommerce_orders_order_type
      ON ecommerce_orders ("orderType");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_ecommerce_orders_buyer
      ON ecommerce_orders ("buyerId");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_ecommerce_orders_seller
      ON ecommerce_orders ("sellerId");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_ecommerce_orders_status
      ON ecommerce_orders (status);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_ecommerce_orders_payment_status
      ON ecommerce_orders ("paymentStatus");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_ecommerce_orders_created_at
      ON ecommerce_orders ("createdAt" DESC);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_ecommerce_orders_external
      ON ecommerce_orders ("externalOrderId");
    `);

    // =====================================================
    // 3. Create ecommerce_order_items table (주문 항목)
    // =====================================================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ecommerce_order_items (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "orderId" uuid NOT NULL,

        -- 상품 정보
        "productId" uuid,
        "externalProductId" varchar(255),
        "productName" varchar(500) NOT NULL,
        sku varchar(100),
        options jsonb,

        -- 수량 및 금액
        quantity integer NOT NULL,
        "unitPrice" numeric(10,2) NOT NULL,
        discount numeric(10,2) DEFAULT 0,
        subtotal numeric(12,2) NOT NULL,

        -- 상태
        status order_item_status DEFAULT 'pending',

        -- 메타데이터 (listingId, offerId 등)
        metadata jsonb,

        -- 타임스탬프
        "createdAt" timestamp DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" timestamp DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create indexes for ecommerce_order_items
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_ecommerce_order_items_order
      ON ecommerce_order_items ("orderId");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_ecommerce_order_items_product
      ON ecommerce_order_items ("productId");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_ecommerce_order_items_status
      ON ecommerce_order_items (status);
    `);

    // =====================================================
    // 4. Create ecommerce_payments table (결제 기록)
    // =====================================================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ecommerce_payments (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "orderId" uuid NOT NULL,

        -- 트랜잭션 정보
        "transactionId" varchar(100) NOT NULL,
        "externalPaymentId" varchar(255),

        -- 결제 수단 및 상태
        "paymentMethod" payment_method DEFAULT 'card',
        status payment_transaction_status DEFAULT 'pending',

        -- 금액 정보
        "requestedAmount" numeric(12,2) NOT NULL,
        "paidAmount" numeric(12,2) DEFAULT 0,
        "refundedAmount" numeric(12,2) DEFAULT 0,
        currency varchar(3) DEFAULT 'KRW',

        -- PG/카드 정보
        "pgProvider" varchar(50),
        "cardCompany" varchar(50),
        "cardNumber" varchar(20),
        "installmentMonths" integer DEFAULT 0,

        -- 실패/환불 사유
        "failureReason" text,
        "refundReason" text,

        -- 메타데이터
        metadata jsonb,

        -- 타임스탬프
        "requestedAt" timestamp,
        "paidAt" timestamp,
        "failedAt" timestamp,
        "refundedAt" timestamp,
        "createdAt" timestamp DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" timestamp DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT ecommerce_payments_transaction_unique UNIQUE ("transactionId")
      );
    `);

    // Create indexes for ecommerce_payments
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_ecommerce_payments_order
      ON ecommerce_payments ("orderId");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_ecommerce_payments_status
      ON ecommerce_payments (status);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_ecommerce_payments_method
      ON ecommerce_payments ("paymentMethod");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_ecommerce_payments_external
      ON ecommerce_payments ("externalPaymentId");
    `);

    // =====================================================
    // 5. Analyze tables for query planner
    // =====================================================
    await queryRunner.query(`ANALYZE ecommerce_orders;`);
    await queryRunner.query(`ANALYZE ecommerce_order_items;`);
    await queryRunner.query(`ANALYZE ecommerce_payments;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop in reverse order (dependencies first)
    await queryRunner.query(`DROP TABLE IF EXISTS ecommerce_payments;`);
    await queryRunner.query(`DROP TABLE IF EXISTS ecommerce_order_items;`);
    await queryRunner.query(`DROP TABLE IF EXISTS ecommerce_orders;`);

    // Drop enum types
    await queryRunner.query(`DROP TYPE IF EXISTS order_item_status;`);
    await queryRunner.query(`DROP TYPE IF EXISTS payment_transaction_status;`);
    await queryRunner.query(`DROP TYPE IF EXISTS payment_method;`);
    await queryRunner.query(`DROP TYPE IF EXISTS seller_type;`);
    await queryRunner.query(`DROP TYPE IF EXISTS buyer_type;`);
    await queryRunner.query(`DROP TYPE IF EXISTS payment_status;`);
    await queryRunner.query(`DROP TYPE IF EXISTS order_status;`);
    await queryRunner.query(`DROP TYPE IF EXISTS order_type;`);
  }
}
