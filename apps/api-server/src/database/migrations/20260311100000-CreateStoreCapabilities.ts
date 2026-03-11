import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-STORE-CAPABILITY-SYSTEM-V1
 * 매장(Store) 단위 기능 제어 테이블 생성
 */
export class CreateStoreCapabilities20260311100000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS store_capabilities (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL,
        capability_key VARCHAR(50) NOT NULL,
        enabled BOOLEAN NOT NULL DEFAULT true,
        source VARCHAR(20) NOT NULL DEFAULT 'system',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

        CONSTRAINT "UQ_store_capability_org_key"
          UNIQUE (organization_id, capability_key),

        CONSTRAINT "FK_store_capability_org"
          FOREIGN KEY (organization_id)
          REFERENCES organizations(id)
          ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS "IDX_store_capability_org_id"
        ON store_capabilities (organization_id);

      CREATE INDEX IF NOT EXISTS "IDX_store_capability_key_enabled"
        ON store_capabilities (capability_key, enabled);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS store_capabilities;
    `);
  }
}
