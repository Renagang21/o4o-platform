"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostManagementApiMigration1750000000001 = void 0;
class PostManagementApiMigration1750000000001 {
    constructor() {
        this.name = 'PostManagementApiMigration1750000000001';
    }
    async up(queryRunner) {
        // Phase 1: Add new fields while keeping existing ones
        // 1. Add new WordPress-compatible fields to posts table
        await queryRunner.query(`
      ALTER TABLE "posts" 
      ADD COLUMN IF NOT EXISTS "author_id" uuid,
      ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
      ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
      ADD COLUMN IF NOT EXISTS "published_at" timestamp,
      ADD COLUMN IF NOT EXISTS "featured_media" varchar(500),
      ADD COLUMN IF NOT EXISTS "comment_status" varchar(20) DEFAULT 'open',
      ADD COLUMN IF NOT EXISTS "ping_status" varchar(20) DEFAULT 'open',
      ADD COLUMN IF NOT EXISTS "meta" json
    `);
        // 2. Copy data from old fields to new fields
        await queryRunner.query(`
      UPDATE "posts" SET
        "author_id" = "author_id",
        "created_at" = "created_at",
        "updated_at" = "updated_at", 
        "published_at" = "published_at",
        "featured_media" = "featuredImage"
      WHERE "author_id" IS NULL
    `);
        // 3. Update status values for WordPress compatibility
        await queryRunner.query(`
      UPDATE "posts" SET "status" = 'publish' WHERE "status" = 'publish'
    `);
        // 4. Create tags table (rename from post_tags for clarity)
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "tags" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" varchar(100) UNIQUE NOT NULL,
        "slug" varchar(100) UNIQUE NOT NULL,
        "description" text,
        "count" int DEFAULT 0,
        "meta" json,
        "created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
        "updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
      )
    `);
        // 5. Copy data from post_tags to tags if post_tags exists
        const postTagsExists = await queryRunner.hasTable('post_tags');
        if (postTagsExists) {
            await queryRunner.query(`
        INSERT INTO "tags" ("id", "name", "slug", "description", "count", "created_at", "updated_at")
        SELECT "id", "name", "slug", "description", 
               COALESCE("usageCount", 0) as "count",
               "created_at", "updated_at"
        FROM "post_tags"
        ON CONFLICT ("id") DO NOTHING
      `);
        }
        // 6. Create post_autosaves table
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "post_autosaves" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "post_id" uuid NOT NULL,
        "title" varchar(255),
        "content" text,
        "excerpt" text,
        "saved_at" timestamp DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE
      )
    `);
        // 7. Update junction table names for consistency
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "post_tags_new" (
        "post_id" uuid NOT NULL,
        "tag_id" uuid NOT NULL,
        PRIMARY KEY ("post_id", "tag_id"),
        FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE,
        FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE
      )
    `);
        // 8. Copy data from old junction tables if they exist
        const postTagRelExists = await queryRunner.hasTable('post_post_tags');
        if (postTagRelExists) {
            await queryRunner.query(`
        INSERT INTO "post_tags_new" ("post_id", "tag_id")
        SELECT "postId", "postTagId" FROM "post_post_tags"
        ON CONFLICT DO NOTHING
      `);
        }
        // 9. Create indexes for performance
        await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_posts_author_id" ON "posts" ("author_id");
      CREATE INDEX IF NOT EXISTS "IDX_posts_created_at" ON "posts" ("created_at");
      CREATE INDEX IF NOT EXISTS "IDX_posts_published_at" ON "posts" ("published_at");
      CREATE INDEX IF NOT EXISTS "IDX_posts_status_new" ON "posts" ("status");
      
      CREATE INDEX IF NOT EXISTS "IDX_tags_name" ON "tags" ("name");
      CREATE INDEX IF NOT EXISTS "IDX_tags_slug" ON "tags" ("slug");
      CREATE INDEX IF NOT EXISTS "IDX_tags_count" ON "tags" ("count");
      
      CREATE INDEX IF NOT EXISTS "IDX_post_autosaves_post_id" ON "post_autosaves" ("post_id");
      CREATE INDEX IF NOT EXISTS "IDX_post_autosaves_saved_at" ON "post_autosaves" ("saved_at");
    `);
    }
    async down(queryRunner) {
        // Remove new tables
        await queryRunner.dropTable('post_autosaves', true);
        await queryRunner.dropTable('post_tags_new', true);
        await queryRunner.dropTable('tags', true);
        // Remove new columns from posts
        await queryRunner.query(`
      ALTER TABLE "posts" 
      DROP COLUMN IF EXISTS "author_id",
      DROP COLUMN IF EXISTS "created_at",
      DROP COLUMN IF EXISTS "updated_at", 
      DROP COLUMN IF EXISTS "published_at",
      DROP COLUMN IF EXISTS "featured_media",
      DROP COLUMN IF EXISTS "comment_status",
      DROP COLUMN IF EXISTS "ping_status",
      DROP COLUMN IF EXISTS "meta"
    `);
        // Revert status values
        await queryRunner.query(`
      UPDATE "posts" SET "status" = 'publish' WHERE "status" = 'publish'
    `);
    }
}
exports.PostManagementApiMigration1750000000001 = PostManagementApiMigration1750000000001;
//# sourceMappingURL=1750000000001-PostManagementApiMigration.js.map