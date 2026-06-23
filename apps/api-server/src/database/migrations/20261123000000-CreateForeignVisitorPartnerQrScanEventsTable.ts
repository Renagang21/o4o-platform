import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-FOREIGN-VISITOR-AFFILIATE-QR-SCAN-EVENT-V1
 *
 * 제휴 QR public landing 익명 스캔 이벤트. partner/QR 기준 유입 추적.
 * 개인정보 최소화: IP 원문 미저장(ip_hash 만), userAgent hash/요약만. 방문/구매/수수료 무관.
 * resolve 성공 시에만 기록. CREATE TABLE IF NOT EXISTS — 재적용 안전.
 */
export class CreateForeignVisitorPartnerQrScanEventsTable20261123000000 implements MigrationInterface {
  name = 'CreateForeignVisitorPartnerQrScanEventsTable20261123000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS foreign_visitor_partner_qr_scan_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL,
        service_key VARCHAR(50) NOT NULL,
        partner_id UUID NOT NULL,
        qr_code_id UUID NOT NULL,
        short_code VARCHAR(40) NOT NULL,
        campaign_name VARCHAR(200),
        language VARCHAR(20),
        landing_path VARCHAR(300),
        referrer VARCHAR(500),
        ip_hash VARCHAR(64),
        user_agent_hash VARCHAR(64),
        user_agent_summary VARCHAR(160),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_fvpqse_qr_created ON foreign_visitor_partner_qr_scan_events (qr_code_id, created_at)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_fvpqse_partner_created ON foreign_visitor_partner_qr_scan_events (partner_id, created_at)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_fvpqse_org_service_created ON foreign_visitor_partner_qr_scan_events (organization_id, service_key, created_at)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_fvpqse_short_code ON foreign_visitor_partner_qr_scan_events (short_code)`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS foreign_visitor_partner_qr_scan_events`);
  }
}
