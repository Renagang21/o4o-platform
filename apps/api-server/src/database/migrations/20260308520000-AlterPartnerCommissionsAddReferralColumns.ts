import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-PARTNER-HUB-CORE-V1
 *
 * partner_commissions 테이블에 referral 관련 컬럼 추가
 *
 * 기존 batch commission (contract_id + commission_rate)과 공존
 * 새 referral commission은 product_id + quantity + commission_per_unit 사용
 * 모든 컬럼 nullable — 기존 레코드 호환
 */
export class AlterPartnerCommissionsAddReferralColumns20260308520000 implements MigrationInterface {
  name = 'AlterPartnerCommissionsAddReferralColumns20260308520000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE partner_commissions ADD COLUMN IF NOT EXISTS product_id UUID`);
    await queryRunner.query(`ALTER TABLE partner_commissions ADD COLUMN IF NOT EXISTS store_id UUID`);
    await queryRunner.query(`ALTER TABLE partner_commissions ADD COLUMN IF NOT EXISTS quantity INT`);
    await queryRunner.query(`ALTER TABLE partner_commissions ADD COLUMN IF NOT EXISTS commission_per_unit INT`);
    await queryRunner.query(`ALTER TABLE partner_commissions ADD COLUMN IF NOT EXISTS referral_token VARCHAR(20)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE partner_commissions DROP COLUMN IF EXISTS referral_token`);
    await queryRunner.query(`ALTER TABLE partner_commissions DROP COLUMN IF EXISTS commission_per_unit`);
    await queryRunner.query(`ALTER TABLE partner_commissions DROP COLUMN IF EXISTS quantity`);
    await queryRunner.query(`ALTER TABLE partner_commissions DROP COLUMN IF EXISTS store_id`);
    await queryRunner.query(`ALTER TABLE partner_commissions DROP COLUMN IF EXISTS product_id`);
  }
}
