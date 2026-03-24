import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateOfferServiceApprovals20260325300000 implements MigrationInterface {
  name = 'CreateOfferServiceApprovals20260325300000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS offer_service_approvals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        offer_id UUID NOT NULL REFERENCES supplier_product_offers(id) ON DELETE CASCADE,
        service_key VARCHAR(50) NOT NULL,
        approval_status VARCHAR(20) NOT NULL DEFAULT 'pending',
        decided_by UUID,
        decided_at TIMESTAMP,
        reason TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE (offer_id, service_key)
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_osa_status ON offer_service_approvals (approval_status)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_osa_service_key ON offer_service_approvals (service_key)`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS offer_service_approvals');
  }
}
