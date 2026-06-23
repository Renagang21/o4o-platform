import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-FOREIGN-VISITOR-PARTNER-MODEL-V1
 *
 * 외국인 관광객 "유입 파트너" 마스터 — 매장(organization_id) + service_key 단위.
 * Neture 의 seller/supplier partner 테이블과 무관한 신규 도메인 테이블.
 * 결제/커미션 정산과 무관(O4O 결제 없음). 후속 PartnerQrCode/ScanEvent 가 partner_id 로 참조 예정.
 */
export class CreateForeignVisitorPartnersTable20261121000000 implements MigrationInterface {
  name = 'CreateForeignVisitorPartnersTable20261121000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS foreign_visitor_partners (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        service_key VARCHAR(50) NOT NULL,
        organization_id UUID NOT NULL,
        partner_type VARCHAR(40) NOT NULL,
        partner_name VARCHAR(200) NOT NULL,
        contact_name VARCHAR(100),
        contact_phone VARCHAR(40),
        contact_email VARCHAR(200),
        status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
        memo TEXT,
        created_by UUID,
        updated_by UUID,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        deleted_at TIMESTAMP
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_fvp_org_service ON foreign_visitor_partners (organization_id, service_key)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_fvp_service_status ON foreign_visitor_partners (service_key, status)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_fvp_partner_type ON foreign_visitor_partners (partner_type)`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS foreign_visitor_partners`);
  }
}
