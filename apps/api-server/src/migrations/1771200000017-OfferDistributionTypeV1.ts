import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-NETURE-OFFER-DISTRIBUTION-TYPE-V1
 *
 * 동일 ProductMaster에 대해 같은 Supplier가 여러 Offer 생성 가능하도록
 * UNIQUE(master_id, supplier_id) 제약 제거
 */
export class OfferDistributionTypeV11771200000017 implements MigrationInterface {
  name = 'OfferDistributionTypeV11771200000017';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE supplier_product_offers DROP CONSTRAINT IF EXISTS uq_supplier_product_offers_master_supplier`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE supplier_product_offers ADD CONSTRAINT uq_supplier_product_offers_master_supplier UNIQUE (master_id, supplier_id)`
    );
  }
}
