import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPerformanceIndexes1704362400000 implements MigrationInterface {
    name = 'AddPerformanceIndexes1704362400000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 상품 관련 인덱스
        await queryRunner.query(`
            CREATE INDEX CONCURRENTLY IF NOT EXISTS "IDX_product_category_status" 
            ON "product" ("categoryId", "isActive") 
            WHERE "isActive" = true
        `);

        await queryRunner.query(`
            CREATE INDEX CONCURRENTLY IF NOT EXISTS "IDX_product_price_range" 
            ON "product" ("retailPrice", "isActive") 
            WHERE "isActive" = true
        `);

        await queryRunner.query(`
            CREATE INDEX CONCURRENTLY IF NOT EXISTS "IDX_product_stock_management" 
            ON "product" ("manageStock", "stockQuantity") 
            WHERE "manageStock" = true
        `);

        await queryRunner.query(`
            CREATE INDEX CONCURRENTLY IF NOT EXISTS "IDX_product_search_text" 
            ON "product" USING gin(to_tsvector('english', "name" || ' ' || COALESCE("description", '')))
        `);

        // 주문 관련 인덱스
        await queryRunner.query(`
            CREATE INDEX CONCURRENTLY IF NOT EXISTS "IDX_order_user_status" 
            ON "order" ("userId", "status", "createdAt")
        `);

        await queryRunner.query(`
            CREATE INDEX CONCURRENTLY IF NOT EXISTS "IDX_order_payment_status" 
            ON "order" ("paymentStatus", "createdAt")
        `);

        await queryRunner.query(`
            CREATE INDEX CONCURRENTLY IF NOT EXISTS "IDX_order_date_range" 
            ON "order" ("createdAt", "status") 
            WHERE "status" IN ('confirmed', 'completed')
        `);

        // 결제 관련 인덱스
        await queryRunner.query(`
            CREATE INDEX CONCURRENTLY IF NOT EXISTS "IDX_payment_transaction" 
            ON "payment" ("transactionId") 
        `);

        await queryRunner.query(`
            CREATE INDEX CONCURRENTLY IF NOT EXISTS "IDX_payment_gateway_transaction" 
            ON "payment" ("gatewayTransactionId") 
            WHERE "gatewayTransactionId" IS NOT NULL
        `);

        await queryRunner.query(`
            CREATE INDEX CONCURRENTLY IF NOT EXISTS "IDX_payment_user_status" 
            ON "payment" ("userId", "status", "createdAt")
        `);

        await queryRunner.query(`
            CREATE INDEX CONCURRENTLY IF NOT EXISTS "IDX_payment_order_type" 
            ON "payment" ("orderId", "type", "status")
        `);

        // 가격 정책 관련 인덱스
        await queryRunner.query(`
            CREATE INDEX CONCURRENTLY IF NOT EXISTS "IDX_price_policy_active_priority" 
            ON "price_policy" ("isActive", "priority", "startDate", "endDate") 
            WHERE "isActive" = true
        `);

        await queryRunner.query(`
            CREATE INDEX CONCURRENTLY IF NOT EXISTS "IDX_price_policy_product" 
            ON "price_policy" ("productId", "isActive") 
            WHERE "productId" IS NOT NULL AND "isActive" = true
        `);

        await queryRunner.query(`
            CREATE INDEX CONCURRENTLY IF NOT EXISTS "IDX_price_policy_user_role" 
            ON "price_policy" ("targetRole", "isActive") 
            WHERE "targetRole" IS NOT NULL AND "isActive" = true
        `);

        await queryRunner.query(`
            CREATE INDEX CONCURRENTLY IF NOT EXISTS "IDX_price_policy_date_range" 
            ON "price_policy" ("startDate", "endDate", "isActive") 
            WHERE "isActive" = true
        `);

        // 장바구니 관련 인덱스
        await queryRunner.query(`
            CREATE INDEX CONCURRENTLY IF NOT EXISTS "IDX_cart_user" 
            ON "cart" ("userId") 
        `);

        await queryRunner.query(`
            CREATE INDEX CONCURRENTLY IF NOT EXISTS "IDX_cart_item_user_product" 
            ON "cart_item" ("cartId", "productId")
        `);

        // 사용자 관련 인덱스
        await queryRunner.query(`
            CREATE INDEX CONCURRENTLY IF NOT EXISTS "IDX_user_email_active" 
            ON "user" ("email", "isActive") 
            WHERE "isActive" = true
        `);

        await queryRunner.query(`
            CREATE INDEX CONCURRENTLY IF NOT EXISTS "IDX_user_role_active" 
            ON "user" ("role", "isActive") 
            WHERE "isActive" = true
        `);

        // 복합 인덱스 (자주 함께 조회되는 컬럼들)
        await queryRunner.query(`
            CREATE INDEX CONCURRENTLY IF NOT EXISTS "IDX_order_items_product_order" 
            ON "order_item" ("orderId", "productId", "quantity")
        `);

        await queryRunner.query(`
            CREATE INDEX CONCURRENTLY IF NOT EXISTS "IDX_product_category_price_stock" 
            ON "product" ("categoryId", "retailPrice", "stockQuantity", "isActive") 
            WHERE "isActive" = true
        `);

        // 부분 인덱스 (조건부 인덱스)
        await queryRunner.query(`
            CREATE INDEX CONCURRENTLY IF NOT EXISTS "IDX_payment_pending" 
            ON "payment" ("createdAt", "userId") 
            WHERE "status" = 'pending'
        `);

        await queryRunner.query(`
            CREATE INDEX CONCURRENTLY IF NOT EXISTS "IDX_order_recent_active" 
            ON "order" ("createdAt" DESC, "userId") 
            WHERE "createdAt" > NOW() - INTERVAL '30 days' AND "status" != 'cancelled'
        `);

        // JSON 컬럼 인덱스 (메타데이터 검색용)
        await queryRunner.query(`
            CREATE INDEX CONCURRENTLY IF NOT EXISTS "IDX_payment_metadata_amount" 
            ON "payment" USING gin(("metadata"::jsonb)) 
            WHERE "metadata" IS NOT NULL
        `);

        await queryRunner.query(`
            CREATE INDEX CONCURRENTLY IF NOT EXISTS "IDX_product_tags" 
            ON "product" USING gin("tags") 
            WHERE "tags" IS NOT NULL
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // 인덱스 삭제 (역순으로)
        await queryRunner.query(`DROP INDEX CONCURRENTLY IF EXISTS "IDX_product_tags"`);
        await queryRunner.query(`DROP INDEX CONCURRENTLY IF EXISTS "IDX_payment_metadata_amount"`);
        await queryRunner.query(`DROP INDEX CONCURRENTLY IF EXISTS "IDX_order_recent_active"`);
        await queryRunner.query(`DROP INDEX CONCURRENTLY IF EXISTS "IDX_payment_pending"`);
        await queryRunner.query(`DROP INDEX CONCURRENTLY IF EXISTS "IDX_product_category_price_stock"`);
        await queryRunner.query(`DROP INDEX CONCURRENTLY IF EXISTS "IDX_order_items_product_order"`);
        await queryRunner.query(`DROP INDEX CONCURRENTLY IF EXISTS "IDX_user_role_active"`);
        await queryRunner.query(`DROP INDEX CONCURRENTLY IF EXISTS "IDX_user_email_active"`);
        await queryRunner.query(`DROP INDEX CONCURRENTLY IF EXISTS "IDX_cart_item_user_product"`);
        await queryRunner.query(`DROP INDEX CONCURRENTLY IF EXISTS "IDX_cart_user"`);
        await queryRunner.query(`DROP INDEX CONCURRENTLY IF EXISTS "IDX_price_policy_date_range"`);
        await queryRunner.query(`DROP INDEX CONCURRENTLY IF EXISTS "IDX_price_policy_user_role"`);
        await queryRunner.query(`DROP INDEX CONCURRENTLY IF EXISTS "IDX_price_policy_product"`);
        await queryRunner.query(`DROP INDEX CONCURRENTLY IF EXISTS "IDX_price_policy_active_priority"`);
        await queryRunner.query(`DROP INDEX CONCURRENTLY IF EXISTS "IDX_payment_order_type"`);
        await queryRunner.query(`DROP INDEX CONCURRENTLY IF EXISTS "IDX_payment_user_status"`);
        await queryRunner.query(`DROP INDEX CONCURRENTLY IF EXISTS "IDX_payment_gateway_transaction"`);
        await queryRunner.query(`DROP INDEX CONCURRENTLY IF EXISTS "IDX_payment_transaction"`);
        await queryRunner.query(`DROP INDEX CONCURRENTLY IF EXISTS "IDX_order_date_range"`);
        await queryRunner.query(`DROP INDEX CONCURRENTLY IF EXISTS "IDX_order_payment_status"`);
        await queryRunner.query(`DROP INDEX CONCURRENTLY IF EXISTS "IDX_order_user_status"`);
        await queryRunner.query(`DROP INDEX CONCURRENTLY IF EXISTS "IDX_product_search_text"`);
        await queryRunner.query(`DROP INDEX CONCURRENTLY IF EXISTS "IDX_product_stock_management"`);
        await queryRunner.query(`DROP INDEX CONCURRENTLY IF EXISTS "IDX_product_price_range"`);
        await queryRunner.query(`DROP INDEX CONCURRENTLY IF EXISTS "IDX_product_category_status"`);
    }
}