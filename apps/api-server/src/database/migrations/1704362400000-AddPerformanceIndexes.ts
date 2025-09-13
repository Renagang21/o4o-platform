import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPerformanceIndexes1704362400000 implements MigrationInterface {
    name = 'AddPerformanceIndexes1704362400000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // CONCURRENTLY 인덱스는 트랜잭션 외부에서 실행되어야 함
        // TypeORM은 트랜잭션으로 마이그레이션을 실행하므로 일반 인덱스로 생성
        
        // 테이블 존재 여부 확인
        const hasProductTable = await queryRunner.hasTable('product');
        const hasOrderTable = await queryRunner.hasTable('order');
        const hasCartTable = await queryRunner.hasTable('cart');
        const hasCartItemTable = await queryRunner.hasTable('cart_item');
        const hasOrderItemTable = await queryRunner.hasTable('order_item');
        const hasUsersTable = await queryRunner.hasTable('users');
        
        // 상품 관련 인덱스
        if (hasProductTable) {
            await queryRunner.query(`
                CREATE INDEX IF NOT EXISTS "IDX_product_category_status" 
                ON "product" ("categoryId", "isActive") 
                WHERE "isActive" = true
            `);

            await queryRunner.query(`
                CREATE INDEX IF NOT EXISTS "IDX_product_price_range" 
                ON "product" ("retailPrice", "isActive") 
                WHERE "isActive" = true
            `);

            await queryRunner.query(`
                CREATE INDEX IF NOT EXISTS "IDX_product_stock_management" 
                ON "product" ("manageStock", "stockQuantity") 
                WHERE "manageStock" = true
            `);

            await queryRunner.query(`
                CREATE INDEX IF NOT EXISTS "IDX_product_search_text" 
                ON "product" USING gin(to_tsvector('english', "name" || ' ' || COALESCE("description", ''))
            `);
        }

        // 주문 관련 인덱스
        if (hasOrderTable) {
            await queryRunner.query(`
                CREATE INDEX IF NOT EXISTS "IDX_order_user_status" 
                ON "order" ("userId", "status", "created_at")
            `);

            await queryRunner.query(`
                CREATE INDEX IF NOT EXISTS "IDX_order_payment_status" 
                ON "order" ("paymentStatus", "created_at")
            `);

            await queryRunner.query(`
                CREATE INDEX IF NOT EXISTS "IDX_order_date_range" 
                ON "order" ("created_at", "status") 
                WHERE "status" IN ('confirmed', 'completed')
            `);
        }

        // 결제 관련 인덱스 (payment 테이블이 없을 수 있으므로 주석 처리)
        /*
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_payment_transaction" 
            ON "payment" ("transactionId") 
        `);
        */

        // 가격 정책 관련 인덱스 (price_policy 테이블이 없을 수 있으므로 주석 처리)
        /*
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_price_policy_active_priority" 
            ON "price_policy" ("isActive", "priority", "startDate", "endDate") 
            WHERE "isActive" = true
        `);
        */

        // 장바구니 관련 인덱스
        if (hasCartTable) {
            await queryRunner.query(`
                CREATE INDEX IF NOT EXISTS "IDX_cart_user" 
                ON "cart" ("userId") 
            `);
        }

        if (hasCartItemTable) {
            await queryRunner.query(`
                CREATE INDEX IF NOT EXISTS "IDX_cart_item_user_product" 
                ON "cart_item" ("cartId", "productId")
            `);
        }

        // 사용자 관련 인덱스
        if (hasUsersTable) {
            await queryRunner.query(`
                CREATE INDEX IF NOT EXISTS "IDX_user_email_active" 
                ON "users" ("email", "status") 
                WHERE "status" = 'approved'
            `);

            await queryRunner.query(`
                CREATE INDEX IF NOT EXISTS "IDX_user_role_active" 
                ON "users" ("role", "status") 
                WHERE "status" = 'approved'
            `);
        }

        // 복합 인덱스 (자주 함께 조회되는 컬럼들)
        if (hasOrderItemTable) {
            await queryRunner.query(`
                CREATE INDEX IF NOT EXISTS "IDX_order_items_product_order" 
                ON "order_item" ("orderId", "productId", "quantity")
            `);
        }

        if (hasProductTable) {
            await queryRunner.query(`
                CREATE INDEX IF NOT EXISTS "IDX_product_category_price_stock" 
                ON "product" ("categoryId", "retailPrice", "stockQuantity", "isActive") 
                WHERE "isActive" = true
            `);
        }

        // 부분 인덱스 (조건부 인덱스)
        if (hasOrderTable) {
            await queryRunner.query(`
                CREATE INDEX IF NOT EXISTS "IDX_order_recent_active" 
                ON "order" ("created_at" DESC, "userId") 
                WHERE "created_at" > NOW() - INTERVAL '30 days' AND "status" != 'cancelled'
            `);
        }

        // JSON 컬럼 인덱스 (메타데이터 검색용)
        if (hasProductTable) {
            await queryRunner.query(`
                CREATE INDEX IF NOT EXISTS "IDX_product_tags" 
                ON "product" USING gin("tags") 
                WHERE "tags" IS NOT NULL
            `);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // 인덱스 삭제 (역순으로)
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_product_tags"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_order_recent_active"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_product_category_price_stock"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_order_items_product_order"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_user_role_active"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_user_email_active"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_cart_item_user_product"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_cart_user"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_order_date_range"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_order_payment_status"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_order_user_status"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_product_search_text"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_product_stock_management"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_product_price_range"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_product_category_status"`);
    }
}