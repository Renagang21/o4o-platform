import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCatalogImportTables20260307100000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Enum types
    await queryRunner.query(`
      CREATE TYPE "catalog_import_job_status_enum"
        AS ENUM ('UPLOADED', 'VALIDATING', 'VALIDATED', 'APPLYING', 'APPLIED', 'FAILED')
    `);

    await queryRunner.query(`
      CREATE TYPE "catalog_import_row_status_enum"
        AS ENUM ('PENDING', 'VALID', 'WARNING', 'REJECTED')
    `);

    await queryRunner.query(`
      CREATE TYPE "catalog_import_row_action_enum"
        AS ENUM ('LINK_EXISTING', 'CREATE_MASTER', 'REJECT')
    `);

    // 2. catalog_import_jobs
    await queryRunner.query(`
      CREATE TABLE "catalog_import_jobs" (
        "id"            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "supplier_id"   UUID NOT NULL
          REFERENCES "neture_suppliers"("id") ON DELETE CASCADE,
        "uploaded_by"   UUID NOT NULL,
        "file_name"     VARCHAR(255),
        "extension_key" VARCHAR(50) NOT NULL,
        "total_rows"    INT NOT NULL DEFAULT 0,
        "valid_rows"    INT NOT NULL DEFAULT 0,
        "warning_rows"  INT NOT NULL DEFAULT 0,
        "rejected_rows" INT NOT NULL DEFAULT 0,
        "status"        "catalog_import_job_status_enum" NOT NULL DEFAULT 'UPLOADED',
        "created_at"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "validated_at"  TIMESTAMPTZ,
        "applied_at"    TIMESTAMPTZ
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_catalog_import_jobs_supplier"
        ON "catalog_import_jobs" ("supplier_id")
    `);

    // 3. catalog_import_rows
    await queryRunner.query(`
      CREATE TABLE "catalog_import_rows" (
        "id"                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "job_id"                  UUID NOT NULL
          REFERENCES "catalog_import_jobs"("id") ON DELETE CASCADE,
        "row_number"              INT NOT NULL,
        "raw_json"                JSONB NOT NULL,
        "parsed_barcode"          VARCHAR(50),
        "parsed_product_name"     VARCHAR(500),
        "parsed_price"            INT,
        "parsed_distribution_type" VARCHAR(20),
        "parsed_manufacturer_name" VARCHAR(255),
        "parsed_brand_name"       VARCHAR(255),
        "parsed_supplier_sku"     VARCHAR(100),
        "parsed_image_urls"       JSONB,
        "validation_status"       "catalog_import_row_status_enum" NOT NULL DEFAULT 'PENDING',
        "validation_error"        VARCHAR(500),
        "master_id"               UUID,
        "action_type"             "catalog_import_row_action_enum",
        "created_at"              TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_catalog_import_rows_job"
        ON "catalog_import_rows" ("job_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_catalog_import_rows_barcode"
        ON "catalog_import_rows" ("parsed_barcode")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "catalog_import_rows"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "catalog_import_jobs"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "catalog_import_row_action_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "catalog_import_row_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "catalog_import_job_status_enum"`);
  }
}
