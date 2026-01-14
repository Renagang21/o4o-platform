import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-NETURE-SUPPLIER-DASHBOARD-P0
 *
 * Add missing columns to neture_supplier_products table:
 * - purpose (enum)
 * - is_active (boolean)
 * - accepts_applications (boolean)
 * - updated_at (timestamp)
 */
export class AddNetureProductColumns1737100500000 implements MigrationInterface {
  name = 'AddNetureProductColumns1737100500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if table exists
    const tableExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'neture_supplier_products'
      );
    `);

    if (!tableExists[0]?.exists) {
      console.log('[AddNetureProductColumns] Table does not exist, skipping');
      return;
    }

    // Check if columns already exist
    const columnsExist = await queryRunner.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'neture_supplier_products'
      AND column_name IN ('purpose', 'is_active', 'accepts_applications', 'updated_at')
    `);

    const existingColumns = columnsExist.map((c: any) => c.column_name);
    console.log('[AddNetureProductColumns] Existing columns:', existingColumns);

    // Create enum if not exists
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "neture_product_purpose_enum" AS ENUM ('CATALOG', 'APPLICATION', 'ACTIVE_SALES');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Add purpose column
    if (!existingColumns.includes('purpose')) {
      await queryRunner.query(`
        ALTER TABLE neture_supplier_products
        ADD COLUMN purpose neture_product_purpose_enum DEFAULT 'CATALOG'
      `);
      console.log('[AddNetureProductColumns] Added purpose column');
    }

    // Add is_active column
    if (!existingColumns.includes('is_active')) {
      await queryRunner.query(`
        ALTER TABLE neture_supplier_products
        ADD COLUMN is_active boolean DEFAULT true
      `);
      console.log('[AddNetureProductColumns] Added is_active column');
    }

    // Add accepts_applications column
    if (!existingColumns.includes('accepts_applications')) {
      await queryRunner.query(`
        ALTER TABLE neture_supplier_products
        ADD COLUMN accepts_applications boolean DEFAULT false
      `);
      console.log('[AddNetureProductColumns] Added accepts_applications column');
    }

    // Add updated_at column
    if (!existingColumns.includes('updated_at')) {
      await queryRunner.query(`
        ALTER TABLE neture_supplier_products
        ADD COLUMN updated_at timestamp DEFAULT CURRENT_TIMESTAMP
      `);
      console.log('[AddNetureProductColumns] Added updated_at column');
    }

    console.log('[AddNetureProductColumns] Migration complete');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE neture_supplier_products
      DROP COLUMN IF EXISTS purpose,
      DROP COLUMN IF EXISTS is_active,
      DROP COLUMN IF EXISTS accepts_applications,
      DROP COLUMN IF EXISTS updated_at
    `);

    await queryRunner.query(`
      DROP TYPE IF EXISTS neture_product_purpose_enum
    `);
  }
}
