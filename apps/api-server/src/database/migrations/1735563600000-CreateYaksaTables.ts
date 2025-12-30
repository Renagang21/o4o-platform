import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Yaksa Tables Migration
 *
 * Phase A-2: Yaksa DB Schema Implementation
 * Creates tables for Yaksa pharmacist association forum
 *
 * Tables:
 * - yaksa_categories: Post categories
 * - yaksa_posts: Forum posts
 * - yaksa_post_logs: Audit logs for post changes
 */
export class CreateYaksaTables1735563600000 implements MigrationInterface {
  name = 'CreateYaksaTables1735563600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ============================================================================
    // yaksa_categories table
    // ============================================================================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "yaksa_categories" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "name" varchar(100) NOT NULL,
        "slug" varchar(100) NOT NULL UNIQUE,
        "description" text,
        "status" varchar(20) NOT NULL DEFAULT 'active',
        "sort_order" integer NOT NULL DEFAULT 0,
        "created_by_user_id" uuid,
        "created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_yaksa_categories_status" ON "yaksa_categories" ("status")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_yaksa_categories_slug" ON "yaksa_categories" ("slug")
    `);

    // ============================================================================
    // yaksa_posts table
    // ============================================================================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "yaksa_posts" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "category_id" uuid NOT NULL,
        "title" varchar(255) NOT NULL,
        "content" text NOT NULL,
        "status" varchar(20) NOT NULL DEFAULT 'draft',
        "is_pinned" boolean NOT NULL DEFAULT false,
        "is_notice" boolean NOT NULL DEFAULT false,
        "view_count" integer NOT NULL DEFAULT 0,
        "created_by_user_id" uuid,
        "created_by_user_name" varchar(100),
        "updated_by_user_id" uuid,
        "updated_by_user_name" varchar(100),
        "created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "published_at" timestamp,
        CONSTRAINT "fk_yaksa_posts_category" FOREIGN KEY ("category_id")
          REFERENCES "yaksa_categories" ("id") ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_yaksa_posts_category_id" ON "yaksa_posts" ("category_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_yaksa_posts_status" ON "yaksa_posts" ("status")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_yaksa_posts_is_pinned" ON "yaksa_posts" ("is_pinned")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_yaksa_posts_created_at" ON "yaksa_posts" ("created_at" DESC)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_yaksa_posts_published_at" ON "yaksa_posts" ("published_at" DESC)
    `);

    // ============================================================================
    // yaksa_post_logs table
    // ============================================================================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "yaksa_post_logs" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "post_id" uuid NOT NULL,
        "action" varchar(50) NOT NULL,
        "before_data" jsonb,
        "after_data" jsonb,
        "reason" text,
        "changed_by_user_id" uuid,
        "changed_by_user_name" varchar(100),
        "created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "fk_yaksa_post_logs_post" FOREIGN KEY ("post_id")
          REFERENCES "yaksa_posts" ("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_yaksa_post_logs_post_id" ON "yaksa_post_logs" ("post_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_yaksa_post_logs_created_at" ON "yaksa_post_logs" ("created_at" DESC)
    `);

    console.log('[Migration] Yaksa tables created successfully');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "yaksa_post_logs" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "yaksa_posts" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "yaksa_categories" CASCADE`);

    console.log('[Migration] Yaksa tables dropped');
  }
}
