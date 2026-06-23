import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-FOREIGN-VISITOR-AFFILIATE-QR-TEMPLATE-V1
 *
 * 외국인 관광객 유입 파트너별 제휴마케팅 QR. partner_id → foreign_visitor_partners.
 * landing/scan event/수수료와 무관(후속). 결제용 QR 아님. short_code 는 public 식별자(unique).
 */
export class CreateForeignVisitorPartnerQrCodesTable20261122000000 implements MigrationInterface {
  name = 'CreateForeignVisitorPartnerQrCodesTable20261122000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS foreign_visitor_partner_qr_codes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL,
        service_key VARCHAR(50) NOT NULL,
        partner_id UUID NOT NULL,
        qr_template_type VARCHAR(40) NOT NULL DEFAULT 'AFFILIATE_MARKETING',
        qr_code_name VARCHAR(200) NOT NULL,
        campaign_name VARCHAR(200),
        landing_url VARCHAR(500) NOT NULL,
        short_code VARCHAR(40) NOT NULL,
        language VARCHAR(20),
        status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
        valid_from TIMESTAMP,
        valid_to TIMESTAMP,
        created_by UUID,
        updated_by UUID,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        deleted_at TIMESTAMP,
        CONSTRAINT uq_fvpqr_short_code UNIQUE (short_code)
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_fvpqr_org_service ON foreign_visitor_partner_qr_codes (organization_id, service_key)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_fvpqr_partner ON foreign_visitor_partner_qr_codes (partner_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_fvpqr_service_status ON foreign_visitor_partner_qr_codes (service_key, status)`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS foreign_visitor_partner_qr_codes`);
  }
}
