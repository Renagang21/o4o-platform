export class CreateProductContentTable9700000000000 {
    name = 'CreateProductContentTable9700000000000';
    async up(queryRunner) {
        // Create uuid-ossp extension if not exists
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
        // Create the product contents table
        await queryRunner.query(`
      CREATE TABLE "lms_marketing_product_contents" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "supplierId" varchar(255) NOT NULL,
        "bundleId" varchar(255) NOT NULL,
        "title" varchar(500) NOT NULL,
        "sku" varchar(100),
        "brand" varchar(255),
        "category" varchar(255),
        "isActive" boolean DEFAULT true,
        "isPublished" boolean DEFAULT false,
        "targeting" jsonb DEFAULT '{"targets": ["all"]}',
        "metadata" jsonb DEFAULT '{}',
        "publishedAt" timestamptz,
        "createdAt" timestamptz DEFAULT now(),
        "updatedAt" timestamptz DEFAULT now()
      )
    `);
        // Create indexes
        await queryRunner.query(`
      CREATE INDEX "IDX_lms_marketing_product_contents_supplierId"
      ON "lms_marketing_product_contents" ("supplierId")
    `);
        await queryRunner.query(`
      CREATE INDEX "IDX_lms_marketing_product_contents_bundleId"
      ON "lms_marketing_product_contents" ("bundleId")
    `);
        await queryRunner.query(`
      CREATE INDEX "IDX_lms_marketing_product_contents_isActive"
      ON "lms_marketing_product_contents" ("isActive")
    `);
        await queryRunner.query(`
      CREATE INDEX "IDX_lms_marketing_product_contents_isPublished"
      ON "lms_marketing_product_contents" ("isPublished")
    `);
        console.log('[lms-marketing] Migration: Created lms_marketing_product_contents table');
    }
    async down(queryRunner) {
        // Drop indexes
        await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_lms_marketing_product_contents_isPublished"
    `);
        await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_lms_marketing_product_contents_isActive"
    `);
        await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_lms_marketing_product_contents_bundleId"
    `);
        await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_lms_marketing_product_contents_supplierId"
    `);
        // Drop table
        await queryRunner.query(`
      DROP TABLE IF EXISTS "lms_marketing_product_contents"
    `);
        console.log('[lms-marketing] Migration: Dropped lms_marketing_product_contents table');
    }
}
//# sourceMappingURL=9700000000000-CreateProductContentTable.js.map