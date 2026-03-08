import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-PARTNER-HUB-CORE-V1
 *
 * supplier_partner_commissions 테이블 생성
 *
 * 공급자가 제품별 파트너 커미션 단가를 설정하는 정책 테이블
 * - commission_per_unit: 수량당 고정 금액 (KRW)
 * - start_date / end_date: 정책 유효 기간
 */
export class CreateSupplierPartnerCommissionsTable20260308500000 implements MigrationInterface {
  name = 'CreateSupplierPartnerCommissionsTable20260308500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS supplier_partner_commissions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        supplier_product_id UUID NOT NULL,
        commission_per_unit INT NOT NULL DEFAULT 0,
        start_date DATE NOT NULL DEFAULT CURRENT_DATE,
        end_date DATE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_spc_product
        ON supplier_partner_commissions (supplier_product_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_spc_dates
        ON supplier_partner_commissions (start_date, end_date)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_spc_dates`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_spc_product`);
    await queryRunner.query(`DROP TABLE IF EXISTS supplier_partner_commissions`);
  }
}
