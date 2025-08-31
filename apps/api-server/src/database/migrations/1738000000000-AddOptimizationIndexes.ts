import { MigrationInterface, QueryRunner } from "typeorm";

export class AddOptimizationIndexes1738000000000 implements MigrationInterface {
    name = 'AddOptimizationIndexes1738000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Check tables and create indexes only if they exist
        
        // User 테이블 인덱스
        if (await queryRunner.hasTable('users') {
            await queryRunner.query(`
                CREATE INDEX IF NOT EXISTS "IDX_user_email" ON "users" ("email")
            `);
            await queryRunner.query(`
                CREATE INDEX IF NOT EXISTS "IDX_user_status" ON "users" ("status")
            `);
            await queryRunner.query(`
                CREATE INDEX IF NOT EXISTS "IDX_user_role" ON "users" ("role")
            `);
            await queryRunner.query(`
                CREATE INDEX IF NOT EXISTS "IDX_user_created_at" ON "users" ("createdAt")
            `);
        }

        // RefreshToken 테이블 인덱스
        if (await queryRunner.hasTable('refresh_token') {
            await queryRunner.query(`
                CREATE INDEX IF NOT EXISTS "IDX_refresh_token_user_id" ON "refresh_token" ("userId")
            `);
            await queryRunner.query(`
                CREATE INDEX IF NOT EXISTS "IDX_refresh_token_expires_at" ON "refresh_token" ("expiresAt")
            `);
        }

        // Product 테이블 인덱스
        if (await queryRunner.hasTable('product') {
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
        } else if (await queryRunner.hasTable('products') {
            // Some systems might use plural
            await queryRunner.query(`
                CREATE INDEX IF NOT EXISTS "IDX_product_status" ON "products" ("status")
            `);
            await queryRunner.query(`
                CREATE INDEX IF NOT EXISTS "IDX_product_created_at" ON "products" ("createdAt")
            `);
            await queryRunner.query(`
                CREATE INDEX IF NOT EXISTS "IDX_product_category_id" ON "products" ("categoryId")
            `);
            await queryRunner.query(`
                CREATE INDEX IF NOT EXISTS "IDX_product_price" ON "products" ("price")
            `);
        }

        // Order 테이블 인덱스
        if (await queryRunner.hasTable('order') {
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
        } else if (await queryRunner.hasTable('orders') {
            // Some systems might use plural
            await queryRunner.query(`
                CREATE INDEX IF NOT EXISTS "IDX_order_user_id" ON "orders" ("userId")
            `);
            await queryRunner.query(`
                CREATE INDEX IF NOT EXISTS "IDX_order_status" ON "orders" ("status")
            `);
            await queryRunner.query(`
                CREATE INDEX IF NOT EXISTS "IDX_order_created_at" ON "orders" ("createdAt")
            `);
            await queryRunner.query(`
                CREATE INDEX IF NOT EXISTS "IDX_order_payment_status" ON "orders" ("paymentStatus")
            `);
        }

        // ForumPost 테이블 인덱스
        if (await queryRunner.hasTable('forum_post') {
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
        } else if (await queryRunner.hasTable('forum_posts') {
            // Some systems might use plural
            await queryRunner.query(`
                CREATE INDEX IF NOT EXISTS "IDX_forum_post_author_id" ON "forum_posts" ("authorId")
            `);
            await queryRunner.query(`
                CREATE INDEX IF NOT EXISTS "IDX_forum_post_category_id" ON "forum_posts" ("categoryId")
            `);
            await queryRunner.query(`
                CREATE INDEX IF NOT EXISTS "IDX_forum_post_status" ON "forum_posts" ("status")
            `);
            await queryRunner.query(`
                CREATE INDEX IF NOT EXISTS "IDX_forum_post_created_at" ON "forum_posts" ("createdAt")
            `);
        }

        // FundingProject 테이블 인덱스
        if (await queryRunner.hasTable('funding_project') {
            await queryRunner.query(`
                CREATE INDEX IF NOT EXISTS "IDX_funding_project_creator_id" ON "funding_project" ("creatorId")
            `);
            await queryRunner.query(`
                CREATE INDEX IF NOT EXISTS "IDX_funding_project_status" ON "funding_project" ("status")
            `);
            await queryRunner.query(`
                CREATE INDEX IF NOT EXISTS "IDX_funding_project_end_date" ON "funding_project" ("endDate")
            `);
        } else if (await queryRunner.hasTable('funding_projects') {
            // Some systems might use plural
            await queryRunner.query(`
                CREATE INDEX IF NOT EXISTS "IDX_funding_project_creator_id" ON "funding_projects" ("creatorId")
            `);
            await queryRunner.query(`
                CREATE INDEX IF NOT EXISTS "IDX_funding_project_status" ON "funding_projects" ("status")
            `);
            await queryRunner.query(`
                CREATE INDEX IF NOT EXISTS "IDX_funding_project_end_date" ON "funding_projects" ("endDate")
            `);
        }

        // Composite indexes for common queries - check tables before creating
        if (await queryRunner.hasTable('users') {
            await queryRunner.query(`
                CREATE INDEX IF NOT EXISTS "IDX_user_email_status" ON "users" ("email", "status")
            `);
        }
        
        if (await queryRunner.hasTable('order') {
            await queryRunner.query(`
                CREATE INDEX IF NOT EXISTS "IDX_order_user_status_created" ON "order" ("userId", "status", "createdAt")
            `);
        } else if (await queryRunner.hasTable('orders') {
            await queryRunner.query(`
                CREATE INDEX IF NOT EXISTS "IDX_order_user_status_created" ON "orders" ("userId", "status", "createdAt")
            `);
        }
        
        if (await queryRunner.hasTable('product') {
            await queryRunner.query(`
                CREATE INDEX IF NOT EXISTS "IDX_product_status_created" ON "product" ("status", "createdAt")
            `);
        } else if (await queryRunner.hasTable('products') {
            await queryRunner.query(`
                CREATE INDEX IF NOT EXISTS "IDX_product_status_created" ON "products" ("status", "createdAt")
            `);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop all indexes in reverse order - no error if they don't exist
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