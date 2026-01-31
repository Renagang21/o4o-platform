/**
 * WO-PARTNER-DASHBOARD-PHASE1-V1
 * Create neture_partner_dashboard_items table for product-based dashboard items
 */
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateNeturePartnerDashboardItems2026013100001 implements MigrationInterface {
  name = 'CreateNeturePartnerDashboardItems2026013100001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS neture_partner_dashboard_items (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        partner_user_id UUID NOT NULL,
        product_id UUID NOT NULL,
        service_id VARCHAR(50) NOT NULL DEFAULT 'glycopharm',
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(partner_user_id, product_id)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_neture_pdi_partner"
      ON neture_partner_dashboard_items (partner_user_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_neture_pdi_partner"`);
    await queryRunner.query(`DROP TABLE IF EXISTS neture_partner_dashboard_items`);
  }
}
