import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-PARTNER-HUB-CORE-V1
 *
 * partner_referrals 테이블 생성
 *
 * 파트너 Affiliate 링크 추적
 * - referral_token: URL query ?ref=TOKEN 에 사용되는 고유 토큰
 * - product_id: 홍보 대상 제품 (supplier_product_offers.id)
 * - store_id: 매장 컨텍스트 (nullable for V1)
 */
export class CreatePartnerReferralsTable20260308510000 implements MigrationInterface {
  name = 'CreatePartnerReferralsTable20260308510000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS partner_referrals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        partner_id UUID NOT NULL,
        store_id UUID,
        product_id UUID NOT NULL,
        referral_token VARCHAR(20) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_pr_partner
        ON partner_referrals (partner_id)
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_pr_token
        ON partner_referrals (referral_token)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_pr_token`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_pr_partner`);
    await queryRunner.query(`DROP TABLE IF EXISTS partner_referrals`);
  }
}
