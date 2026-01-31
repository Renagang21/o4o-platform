/**
 * WO-PARTNER-CONTENT-ORDER-PHASE2-V1
 * Add sort_order and is_primary columns to content links
 */
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOrderAndPrimaryToItemContents2026013100003 implements MigrationInterface {
  name = 'AddOrderAndPrimaryToItemContents2026013100003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE neture_partner_dashboard_item_contents
        ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS is_primary BOOLEAN NOT NULL DEFAULT false
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE neture_partner_dashboard_item_contents
        DROP COLUMN IF EXISTS is_primary,
        DROP COLUMN IF EXISTS sort_order
    `);
  }
}
