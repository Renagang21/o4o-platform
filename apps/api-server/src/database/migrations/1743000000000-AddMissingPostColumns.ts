import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMissingPostColumns1743000000000 implements MigrationInterface {
  name = 'AddMissingPostColumns1743000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add missing columns to posts table
    await queryRunner.query(`
      ALTER TABLE "posts" 
      ADD COLUMN IF NOT EXISTS "format" varchar(50) DEFAULT 'standard',
      ADD COLUMN IF NOT EXISTS "template" varchar(100),
      ADD COLUMN IF NOT EXISTS "tags" text,
      ADD COLUMN IF NOT EXISTS "seo" json,
      ADD COLUMN IF NOT EXISTS "customFields" json,
      ADD COLUMN IF NOT EXISTS "postMeta" json,
      ADD COLUMN IF NOT EXISTS "scheduledAt" timestamp,
      ADD COLUMN IF NOT EXISTS "views" integer DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "password" varchar(255),
      ADD COLUMN IF NOT EXISTS "passwordProtected" boolean DEFAULT false,
      ADD COLUMN IF NOT EXISTS "allowComments" boolean DEFAULT true,
      ADD COLUMN IF NOT EXISTS "commentStatus" varchar(20) DEFAULT 'open',
      ADD COLUMN IF NOT EXISTS "featured" boolean DEFAULT false,
      ADD COLUMN IF NOT EXISTS "sticky" boolean DEFAULT false,
      ADD COLUMN IF NOT EXISTS "featuredImage" varchar(500),
      ADD COLUMN IF NOT EXISTS "readingTime" integer,
      ADD COLUMN IF NOT EXISTS "layoutSettings" json,
      ADD COLUMN IF NOT EXISTS "revisions" json
    `);

    // Create indexes for better performance
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_posts_status" ON "posts" ("status");
      CREATE INDEX IF NOT EXISTS "IDX_posts_type" ON "posts" ("type");
      CREATE INDEX IF NOT EXISTS "IDX_posts_publishedAt" ON "posts" ("published_at");
      CREATE INDEX IF NOT EXISTS "IDX_posts_authorId" ON "posts" ("author_id");
      CREATE INDEX IF NOT EXISTS "IDX_posts_slug" ON "posts" ("slug");
      CREATE INDEX IF NOT EXISTS "IDX_posts_featured" ON "posts" ("featured");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_posts_featured";
      DROP INDEX IF EXISTS "IDX_posts_slug";
      DROP INDEX IF EXISTS "IDX_posts_authorId";
      DROP INDEX IF EXISTS "IDX_posts_publishedAt";
      DROP INDEX IF EXISTS "IDX_posts_type";
      DROP INDEX IF EXISTS "IDX_posts_status";
    `);

    // Drop columns
    await queryRunner.query(`
      ALTER TABLE "posts" 
      DROP COLUMN IF EXISTS "format",
      DROP COLUMN IF EXISTS "template",
      DROP COLUMN IF EXISTS "tags",
      DROP COLUMN IF EXISTS "seo",
      DROP COLUMN IF EXISTS "customFields",
      DROP COLUMN IF EXISTS "postMeta",
      DROP COLUMN IF EXISTS "scheduledAt",
      DROP COLUMN IF EXISTS "views",
      DROP COLUMN IF EXISTS "password",
      DROP COLUMN IF EXISTS "passwordProtected",
      DROP COLUMN IF EXISTS "allowComments",
      DROP COLUMN IF EXISTS "commentStatus",
      DROP COLUMN IF EXISTS "featured",
      DROP COLUMN IF EXISTS "sticky",
      DROP COLUMN IF EXISTS "featuredImage",
      DROP COLUMN IF EXISTS "readingTime",
      DROP COLUMN IF EXISTS "layoutSettings",
      DROP COLUMN IF EXISTS "revisions"
    `);
  }
}