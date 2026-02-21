import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-KPA-A-PHARMACY-REQUEST-STRUCTURE-REALIGN-V1
 *
 * pharmacy_join은 "조직 가입"이 아니라 "개인 신원 확장"이다.
 * OrganizationJoinRequest에서 분리하여 독립 테이블로 관리.
 */
export class CreateKpaPharmacyRequests20260219000005 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Guard: skip if table already exists
    const tableExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'kpa_pharmacy_requests'
      )
    `);
    if (tableExists[0]?.exists) return;

    await queryRunner.query(`
      CREATE TABLE kpa_pharmacy_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id),
        pharmacy_name VARCHAR(100) NOT NULL,
        business_number VARCHAR(20) NOT NULL,
        pharmacy_phone VARCHAR(20),
        owner_phone VARCHAR(20),
        tax_invoice_email VARCHAR(100),
        payload JSONB,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        review_note TEXT,
        approved_by UUID,
        approved_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_kpa_pharmacy_requests_user_status
      ON kpa_pharmacy_requests (user_id, status)
    `);

    await queryRunner.query(`
      CREATE INDEX idx_kpa_pharmacy_requests_status
      ON kpa_pharmacy_requests (status)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS kpa_pharmacy_requests`);
  }
}
