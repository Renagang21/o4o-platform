/**
 * WO-PARTNER-CONTENT-LINK-PHASE1-V1
 * Create join table for partner dashboard item ↔ content links
 */
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePartnerDashboardItemContents2026013100002 implements MigrationInterface {
  name = 'CreatePartnerDashboardItemContents2026013100002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS neture_partner_dashboard_item_contents (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        dashboard_item_id UUID NOT NULL REFERENCES neture_partner_dashboard_items(id) ON DELETE CASCADE,
        content_id UUID NOT NULL,
        content_source VARCHAR(20) NOT NULL DEFAULT 'cms',
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(dashboard_item_id, content_id, content_source)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_npdic_dashboard_item"
      ON neture_partner_dashboard_item_contents (dashboard_item_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_npdic_dashboard_item"`);
    await queryRunner.query(`DROP TABLE IF EXISTS neture_partner_dashboard_item_contents`);
  }
}
