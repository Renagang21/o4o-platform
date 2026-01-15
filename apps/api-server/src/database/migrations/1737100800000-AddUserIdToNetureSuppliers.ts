/**
 * Migration: Add user_id column to neture_suppliers
 * Link suppliers to user accounts for authentication flow
 *
 * WO-NETURE-SUPPLIER-AUTH-FIX-V1
 */
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserIdToNetureSuppliers1737100800000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ============================================================
    // 1. Add user_id column to neture_suppliers
    // ============================================================
    const columnExists = await queryRunner.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'neture_suppliers' AND column_name = 'user_id'
    `);

    if (columnExists.length === 0) {
      await queryRunner.query(`
        ALTER TABLE neture_suppliers
        ADD COLUMN user_id UUID
      `);
      console.log('Added user_id column to neture_suppliers');
    }

    // ============================================================
    // 2. Link test supplier user to first supplier (farmfresh-korea)
    // ============================================================
    const supplierUser = await queryRunner.query(`
      SELECT id FROM users WHERE email = 'supplier@neture.test'
    `);

    if (supplierUser.length > 0) {
      const userId = supplierUser[0].id;

      // Find first supplier (farmfresh-korea)
      const supplier = await queryRunner.query(`
        SELECT id FROM neture_suppliers WHERE slug = 'farmfresh-korea'
      `);

      if (supplier.length > 0) {
        await queryRunner.query(`
          UPDATE neture_suppliers SET user_id = $1 WHERE id = $2
        `, [userId, supplier[0].id]);
        console.log(`Linked supplier@neture.test to farmfresh-korea supplier`);
      }
    }

    // ============================================================
    // 3. Link partner user to second supplier (health-plus)
    // ============================================================
    const partnerUser = await queryRunner.query(`
      SELECT id FROM users WHERE email = 'partner@neture.test'
    `);

    if (partnerUser.length > 0) {
      const userId = partnerUser[0].id;

      // Find second supplier (health-plus)
      const supplier = await queryRunner.query(`
        SELECT id FROM neture_suppliers WHERE slug = 'health-plus'
      `);

      if (supplier.length > 0) {
        await queryRunner.query(`
          UPDATE neture_suppliers SET user_id = $1 WHERE id = $2
        `, [userId, supplier[0].id]);
        console.log(`Linked partner@neture.test to health-plus supplier`);
      }
    }

    // ============================================================
    // 4. Create index on user_id for performance
    // ============================================================
    const indexExists = await queryRunner.query(`
      SELECT indexname FROM pg_indexes
      WHERE tablename = 'neture_suppliers' AND indexname = 'idx_neture_suppliers_user_id'
    `);

    if (indexExists.length === 0) {
      await queryRunner.query(`
        CREATE INDEX idx_neture_suppliers_user_id ON neture_suppliers (user_id)
      `);
      console.log('Created index on neture_suppliers.user_id');
    }

    console.log('');
    console.log('=== Neture Supplier Auth Fix Complete ===');
    console.log('Test supplier accounts now linked to suppliers:');
    console.log('  - supplier@neture.test -> farmfresh-korea');
    console.log('  - partner@neture.test -> health-plus');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove index
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_neture_suppliers_user_id
    `);

    // Remove user_id column
    await queryRunner.query(`
      ALTER TABLE neture_suppliers
      DROP COLUMN IF EXISTS user_id
    `);

    console.log('Removed user_id column from neture_suppliers');
  }
}
