import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-QR-LANDING-PAGE-V1
 *
 * store_qr_codes 테이블 생성.
 * 매장 QR 코드 (Display Domain).
 * Neture FK 금지 — library_item_id는 논리적 참조만.
 */
export class CreateStoreQrCodes1709304120000 implements MigrationInterface {
  name = 'CreateStoreQrCodes20260304120000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS store_qr_codes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL DEFAULT 'product',
        title VARCHAR(300) NOT NULL,
        description TEXT,
        library_item_id UUID,
        landing_type VARCHAR(50) NOT NULL DEFAULT 'product',
        landing_target_id VARCHAR(500),
        slug VARCHAR(200) NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_store_qr_codes_slug"
        ON store_qr_codes (slug)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_store_qr_codes_org"
        ON store_qr_codes (organization_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_store_qr_codes_org_active"
        ON store_qr_codes (organization_id, is_active)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_store_qr_codes_org_active"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_store_qr_codes_org"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_store_qr_codes_slug"`);
    await queryRunner.query(`DROP TABLE IF EXISTS store_qr_codes`);
  }
}
