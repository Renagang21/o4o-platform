import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-QR-SCAN-ANALYTICS-V1
 *
 * store_qr_scan_events 테이블 생성.
 * QR 스캔 이벤트 로그 (이벤트 로그 패턴: 불변, FK 없음).
 */
export class CreateStoreQrScanEvents1709304130000 implements MigrationInterface {
  name = 'CreateStoreQrScanEvents20260304130000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS store_qr_scan_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL,
        qr_code_id UUID NOT NULL,
        device_type VARCHAR(20) NOT NULL DEFAULT 'desktop',
        user_agent TEXT,
        referer TEXT,
        ip_hash VARCHAR(64),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_qr_scan_events_qr_time"
        ON store_qr_scan_events (qr_code_id, created_at DESC)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_qr_scan_events_org_time"
        ON store_qr_scan_events (organization_id, created_at DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_qr_scan_events_org_time"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_qr_scan_events_qr_time"`);
    await queryRunner.query(`DROP TABLE IF EXISTS store_qr_scan_events`);
  }
}
