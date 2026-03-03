import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-STORE-EVENT-MINIMAL-V1
 *
 * store_events 테이블 생성.
 * 매장 이벤트 관리용 Display Domain 엔티티.
 * Commerce Object가 아니며, Checkout/EcommerceOrder와 연결 금지.
 */
export class CreateStoreEvents1709301200000 implements MigrationInterface {
  name = 'CreateStoreEvents20260301200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS store_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        title VARCHAR(300) NOT NULL,
        description TEXT,
        image_url VARCHAR(500),
        start_date TIMESTAMPTZ,
        end_date TIMESTAMPTZ,
        is_active BOOLEAN NOT NULL DEFAULT true,
        sort_order INT NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_store_events_org"
        ON store_events (organization_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_store_events_org_active"
        ON store_events (organization_id, is_active)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_store_events_org_active"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_store_events_org"`);
    await queryRunner.query(`DROP TABLE IF EXISTS store_events`);
  }
}
