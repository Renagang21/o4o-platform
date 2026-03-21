import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-NETURE-FIRSTMALL-BASIC-BULK-IMPORT-ENABLEMENT-V1
 *
 * Add parsed_msrp, parsed_stock_qty, parsed_description to catalog_import_rows
 * for First Mall bulk import field mapping support.
 */
export class AddFieldsToCatalogImportRows20260321100000
  implements MigrationInterface
{
  name = 'AddFieldsToCatalogImportRows20260321100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "catalog_import_rows" ADD COLUMN IF NOT EXISTS "parsed_msrp" INT`,
    );
    await queryRunner.query(
      `ALTER TABLE "catalog_import_rows" ADD COLUMN IF NOT EXISTS "parsed_stock_qty" INT`,
    );
    await queryRunner.query(
      `ALTER TABLE "catalog_import_rows" ADD COLUMN IF NOT EXISTS "parsed_description" TEXT`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "catalog_import_rows" DROP COLUMN IF EXISTS "parsed_description"`,
    );
    await queryRunner.query(
      `ALTER TABLE "catalog_import_rows" DROP COLUMN IF EXISTS "parsed_stock_qty"`,
    );
    await queryRunner.query(
      `ALTER TABLE "catalog_import_rows" DROP COLUMN IF EXISTS "parsed_msrp"`,
    );
  }
}
