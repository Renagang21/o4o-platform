import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Create kpa_contents + kpa_working_contents tables.
 * WO-O4O-KPA-CONTENT-HUB-FOUNDATION-V1
 *
 * Replaces file-storage paradigm (kpa_branch_docs) with
 * structured block-based content (kpa_contents).
 */
export class CreateKpaContentHub20260410400000 implements MigrationInterface {
  name = 'CreateKpaContentHub20260410400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── kpa_contents ───────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "kpa_contents" (
        "id"               uuid        NOT NULL DEFAULT gen_random_uuid(),
        "title"            varchar(300) NOT NULL,
        "summary"          text,
        "blocks"           jsonb        NOT NULL DEFAULT '[]',
        "tags"             jsonb        NOT NULL DEFAULT '[]',
        "category"         varchar(100),
        "thumbnail_url"    varchar(500),
        "source_type"      varchar(20)  NOT NULL DEFAULT 'manual',
        "source_url"       varchar(500),
        "source_file_name" varchar(200),
        "status"           varchar(20)  NOT NULL DEFAULT 'draft',
        "created_by"       uuid,
        "is_deleted"       boolean      NOT NULL DEFAULT false,
        "created_at"       TIMESTAMP    NOT NULL DEFAULT now(),
        "updated_at"       TIMESTAMP    NOT NULL DEFAULT now(),
        CONSTRAINT "PK_kpa_contents" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_kpa_contents_created_by" ON "kpa_contents" ("created_by", "is_deleted")`);
    await queryRunner.query(`CREATE INDEX "IDX_kpa_contents_category"   ON "kpa_contents" ("category", "is_deleted")`);
    await queryRunner.query(`CREATE INDEX "IDX_kpa_contents_status"     ON "kpa_contents" ("status", "is_deleted")`);

    // ── kpa_working_contents ───────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "kpa_working_contents" (
        "id"                uuid        NOT NULL DEFAULT gen_random_uuid(),
        "source_content_id" uuid        NOT NULL,
        "owner_id"          uuid        NOT NULL,
        "title"             varchar(300) NOT NULL,
        "edited_blocks"     jsonb        NOT NULL DEFAULT '[]',
        "tags"              jsonb        NOT NULL DEFAULT '[]',
        "category"          varchar(100),
        "created_at"        TIMESTAMP    NOT NULL DEFAULT now(),
        "updated_at"        TIMESTAMP    NOT NULL DEFAULT now(),
        CONSTRAINT "PK_kpa_working_contents" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_kpa_working_contents_owner"  ON "kpa_working_contents" ("owner_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_kpa_working_contents_source" ON "kpa_working_contents" ("source_content_id")`);

    console.log('[Migration] kpa_contents + kpa_working_contents created');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_kpa_working_contents_source"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_kpa_working_contents_owner"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "kpa_working_contents"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_kpa_contents_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_kpa_contents_category"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_kpa_contents_created_by"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "kpa_contents"`);

    console.log('[Migration] kpa_contents + kpa_working_contents dropped');
  }
}
