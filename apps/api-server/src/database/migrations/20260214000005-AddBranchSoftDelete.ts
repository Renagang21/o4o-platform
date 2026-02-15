import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-KPA-C-BRANCH-CMS-HARDENING-V1
 *
 * Creates branch CMS tables if they don't exist (production gap fix),
 * then adds is_deleted column for soft delete support.
 *
 * Tables: kpa_branch_news, kpa_branch_officers, kpa_branch_docs, kpa_branch_settings
 * These were created by synchronize:true in dev but never had explicit migrations.
 */
export class AddBranchSoftDelete20260214000005 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── Helper: check if table exists ──
    const tableExists = async (tableName: string): Promise<boolean> => {
      const result = await queryRunner.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = $1
        ) AS "exists"`,
        [tableName]
      );
      return result[0]?.exists === true;
    };

    const columnExists = async (tableName: string, columnName: string): Promise<boolean> => {
      const result = await queryRunner.query(
        `SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = $2`,
        [tableName, columnName]
      );
      return result.length > 0;
    };

    // ── 1. kpa_branch_news ──
    if (!(await tableExists('kpa_branch_news'))) {
      await queryRunner.query(`
        CREATE TABLE "kpa_branch_news" (
          "id" uuid NOT NULL DEFAULT gen_random_uuid(),
          "organization_id" uuid NOT NULL,
          "title" varchar(300) NOT NULL,
          "content" text,
          "category" varchar(50) NOT NULL DEFAULT 'notice',
          "author" varchar(200),
          "author_id" uuid,
          "is_pinned" boolean NOT NULL DEFAULT false,
          "is_published" boolean NOT NULL DEFAULT true,
          "view_count" int NOT NULL DEFAULT 0,
          "is_deleted" boolean NOT NULL DEFAULT false,
          "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
          "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
          CONSTRAINT "PK_kpa_branch_news" PRIMARY KEY ("id")
        )
      `);
      await queryRunner.query(`
        CREATE INDEX "IDX_branch_news_org_published_created"
        ON "kpa_branch_news" ("organization_id", "is_published", "created_at")
      `);
      console.log('[AddBranchSoftDelete] Created kpa_branch_news table');
    } else if (!(await columnExists('kpa_branch_news', 'is_deleted'))) {
      await queryRunner.query(
        `ALTER TABLE "kpa_branch_news" ADD COLUMN "is_deleted" boolean NOT NULL DEFAULT false`
      );
    }

    // ── 2. kpa_branch_officers ──
    if (!(await tableExists('kpa_branch_officers'))) {
      await queryRunner.query(`
        CREATE TABLE "kpa_branch_officers" (
          "id" uuid NOT NULL DEFAULT gen_random_uuid(),
          "organization_id" uuid NOT NULL,
          "name" varchar(100) NOT NULL,
          "position" varchar(100) NOT NULL,
          "role" varchar(50) NOT NULL,
          "pharmacy_name" varchar(200),
          "phone" varchar(50),
          "email" varchar(200),
          "term_start" date,
          "term_end" date,
          "is_active" boolean NOT NULL DEFAULT true,
          "sort_order" int NOT NULL DEFAULT 0,
          "is_deleted" boolean NOT NULL DEFAULT false,
          "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
          "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
          CONSTRAINT "PK_kpa_branch_officers" PRIMARY KEY ("id")
        )
      `);
      await queryRunner.query(`
        CREATE INDEX "IDX_branch_officers_org_active_sort"
        ON "kpa_branch_officers" ("organization_id", "is_active", "sort_order")
      `);
      console.log('[AddBranchSoftDelete] Created kpa_branch_officers table');
    } else if (!(await columnExists('kpa_branch_officers', 'is_deleted'))) {
      await queryRunner.query(
        `ALTER TABLE "kpa_branch_officers" ADD COLUMN "is_deleted" boolean NOT NULL DEFAULT false`
      );
    }

    // ── 3. kpa_branch_docs ──
    if (!(await tableExists('kpa_branch_docs'))) {
      await queryRunner.query(`
        CREATE TABLE "kpa_branch_docs" (
          "id" uuid NOT NULL DEFAULT gen_random_uuid(),
          "organization_id" uuid NOT NULL,
          "title" varchar(300) NOT NULL,
          "description" text,
          "category" varchar(50) NOT NULL DEFAULT 'general',
          "file_url" varchar(500),
          "file_name" varchar(200),
          "file_size" bigint NOT NULL DEFAULT 0,
          "is_public" boolean NOT NULL DEFAULT true,
          "download_count" int NOT NULL DEFAULT 0,
          "is_deleted" boolean NOT NULL DEFAULT false,
          "uploaded_by" uuid,
          "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
          "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
          CONSTRAINT "PK_kpa_branch_docs" PRIMARY KEY ("id")
        )
      `);
      await queryRunner.query(`
        CREATE INDEX "IDX_branch_docs_org_public_created"
        ON "kpa_branch_docs" ("organization_id", "is_public", "created_at")
      `);
      console.log('[AddBranchSoftDelete] Created kpa_branch_docs table');
    } else if (!(await columnExists('kpa_branch_docs', 'is_deleted'))) {
      await queryRunner.query(
        `ALTER TABLE "kpa_branch_docs" ADD COLUMN "is_deleted" boolean NOT NULL DEFAULT false`
      );
    }

    // ── 4. kpa_branch_settings ──
    if (!(await tableExists('kpa_branch_settings'))) {
      await queryRunner.query(`
        CREATE TABLE "kpa_branch_settings" (
          "id" uuid NOT NULL DEFAULT gen_random_uuid(),
          "organization_id" uuid NOT NULL,
          "address" varchar(200),
          "phone" varchar(50),
          "fax" varchar(50),
          "email" varchar(200),
          "working_hours" varchar(100),
          "description" text,
          "membership_fee_deadline" varchar(10),
          "annual_report_deadline" varchar(10),
          "fee_settings" jsonb,
          "is_active" boolean NOT NULL DEFAULT true,
          "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
          "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
          CONSTRAINT "PK_kpa_branch_settings" PRIMARY KEY ("id"),
          CONSTRAINT "UQ_kpa_branch_settings_org" UNIQUE ("organization_id")
        )
      `);
      console.log('[AddBranchSoftDelete] Created kpa_branch_settings table');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "kpa_branch_news" DROP COLUMN IF EXISTS "is_deleted"`);
    await queryRunner.query(`ALTER TABLE "kpa_branch_officers" DROP COLUMN IF EXISTS "is_deleted"`);
    await queryRunner.query(`ALTER TABLE "kpa_branch_docs" DROP COLUMN IF EXISTS "is_deleted"`);
  }
}
