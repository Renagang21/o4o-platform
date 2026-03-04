import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-SUPPLIER-CONTENT-REMOVAL-V1
 *
 * Drop the neture_supplier_contents table.
 * All supplier content CRUD code has been removed from the codebase.
 */
export class DropNetureSupplierContents1709420400000 implements MigrationInterface {
  name = 'DropNetureSupplierContents1709420400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "neture_supplier_contents" CASCADE`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "neture_supplier_contents" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "supplierId" uuid NOT NULL,
        "type" varchar NOT NULL DEFAULT 'article',
        "title" varchar NOT NULL,
        "description" text NOT NULL DEFAULT '',
        "body" text NOT NULL DEFAULT '',
        "imageUrl" varchar NOT NULL DEFAULT '',
        "status" varchar NOT NULL DEFAULT 'draft',
        "availableServices" text[] NOT NULL DEFAULT '{}',
        "availableAreas" text[] NOT NULL DEFAULT '{}',
        "publishedAt" timestamp,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_neture_supplier_contents" PRIMARY KEY ("id")
      )
    `);
  }
}
