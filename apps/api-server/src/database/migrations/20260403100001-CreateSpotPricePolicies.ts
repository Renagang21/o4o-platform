import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-NETURE-SPOT-PRICE-POLICY-FOUNDATION-V1
 * spot_price_policies 테이블 생성 — 상품별 기간 한정 스팟 가격 정책
 *
 * 원본: src/migrations/1771200000023 — 잘못된 디렉토리에 배치되어 프로덕션 미실행.
 */
export class CreateSpotPricePolicies20260403100001 implements MigrationInterface {
  name = 'CreateSpotPricePolicies20260403100001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS spot_price_policies (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        offer_id UUID NOT NULL,
        supplier_id UUID NOT NULL,
        policy_name VARCHAR(200) NOT NULL,
        spot_price INT NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
        start_at TIMESTAMPTZ NOT NULL,
        end_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT chk_spot_price_positive CHECK (spot_price > 0),
        CONSTRAINT chk_spot_date_range CHECK (end_at > start_at)
      );
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_spot_price_policies_offer" ON spot_price_policies (offer_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_spot_price_policies_supplier" ON spot_price_policies (supplier_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_spot_price_policies_status" ON spot_price_policies (status);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS spot_price_policies;`);
  }
}
