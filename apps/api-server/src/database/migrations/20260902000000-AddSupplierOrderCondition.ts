import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-NETURE-B2B-SUPPLIER-ORDER-CONDITION-V1
 *
 * Add B2B order condition fields to neture_suppliers:
 *   - min_order_amount       (KRW, integer): minimum order subtotal per supplier
 *   - min_order_surcharge    (KRW, integer): logistics fee added when below minimum
 *   - order_condition_note   (text)        : optional guidance text
 *
 * NULL means "no condition" — UI shows "조건 없음" and skips the surcharge guidance.
 */
export class AddSupplierOrderCondition20260902000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE neture_suppliers
        ADD COLUMN IF NOT EXISTS min_order_amount integer,
        ADD COLUMN IF NOT EXISTS min_order_surcharge integer,
        ADD COLUMN IF NOT EXISTS order_condition_note text
    `);
    console.log('[Migration] neture_suppliers: added min_order_amount, min_order_surcharge, order_condition_note');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE neture_suppliers
        DROP COLUMN IF EXISTS min_order_amount,
        DROP COLUMN IF EXISTS min_order_surcharge,
        DROP COLUMN IF EXISTS order_condition_note
    `);
  }
}
