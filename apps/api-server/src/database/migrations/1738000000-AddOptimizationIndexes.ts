import { MigrationInterface, QueryRunner } from "typeorm";

export class AddOptimizationIndexes1738000000 implements MigrationInterface {
    name = 'AddOptimizationIndexes1738000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // User 테이블 인덱스
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_user_email" ON "user" ("email")
        `);
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_user_status" ON "user" ("status")
        `);
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_user_role" ON "user" ("role")
        `);
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_user_created_at" ON "user" ("createdAt")
        `);

        // RefreshToken 테이블 인덱스
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_refresh_token_user_id" ON "refresh_token" ("userId")
        `);
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_refresh_token_expires_at" ON "refresh_token" ("expiresAt")
        `);

        // Product 테이블 인덱스
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_product_status" ON "product" ("status")
        `);
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_product_created_at" ON "product" ("createdAt")
        `);
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_product_category_id" ON "product" ("categoryId")
        `);
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_product_price" ON "product" ("price")
        `);

        // Order 테이블 인덱스
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_order_user_id" ON "order" ("userId")
        `);
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_order_status" ON "order" ("status")
        `);
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_order_created_at" ON "order" ("createdAt")
        `);
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_order_payment_status" ON "order" ("paymentStatus")
        `);

        // ForumPost 테이블 인덱스
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_forum_post_author_id" ON "forum_post" ("authorId")
        `);
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_forum_post_category_id" ON "forum_post" ("categoryId")
        `);
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_forum_post_status" ON "forum_post" ("status")
        `);
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_forum_post_created_at" ON "forum_post" ("createdAt")
        `);

        // FundingProject 테이블 인덱스
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_funding_project_creator_id" ON "funding_project" ("creatorId")
        `);
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_funding_project_status" ON "funding_project" ("status")
        `);
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_funding_project_end_date" ON "funding_project" ("endDate")
        `);

        // Composite indexes for common queries
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_user_email_status" ON "user" ("email", "status")
        `);
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_order_user_status_created" ON "order" ("userId", "status", "createdAt")
        `);
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_product_status_created" ON "product" ("status", "createdAt")
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop all indexes in reverse order
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_product_status_created"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_order_user_status_created"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_user_email_status"`);
        
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_funding_project_end_date"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_funding_project_status"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_funding_project_creator_id"`);
        
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_forum_post_created_at"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_forum_post_status"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_forum_post_category_id"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_forum_post_author_id"`);
        
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_order_payment_status"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_order_created_at"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_order_status"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_order_user_id"`);
        
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_product_price"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_product_category_id"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_product_created_at"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_product_status"`);
        
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_refresh_token_expires_at"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_refresh_token_user_id"`);
        
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_user_created_at"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_user_role"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_user_status"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_user_email"`);
    }
}