import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-STORE-PAID-FEATURE-ENTITLEMENT-V1
 *
 * 매장(조직)별 유료 기능 이용권 테이블.
 * - 소유 단위: organization_id + service_key (Boundary Policy: Store Ops = organizationId)
 * - organization_id 는 hard FK 없이 plain UUID + index (organization_core FROZEN 비침범,
 *   기존 neture_suppliers.organization_id 와 동일 패턴).
 * - 결제 컬럼 없음 — 결제(Toss) 연동은 후속 WO.
 *
 * SSOT: docs/investigations/IR-O4O-TOSS-PAYMENT-SCOPE-AND-TYPE-SEPARATION-V1.md
 */
export class CreateStorePaidFeatureEntitlements20260621000000 implements MigrationInterface {
  name = 'CreateStorePaidFeatureEntitlements20260621000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS store_paid_feature_entitlements (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL,
        service_key VARCHAR(50) NOT NULL,
        plan_code VARCHAR(100) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
        starts_at TIMESTAMP,
        ends_at TIMESTAMP,
        source VARCHAR(100),
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE (organization_id, service_key, plan_code)
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_spfe_org_service ON store_paid_feature_entitlements (organization_id, service_key)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_spfe_service_plan_status ON store_paid_feature_entitlements (service_key, plan_code, status)`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS store_paid_feature_entitlements`);
  }
}
