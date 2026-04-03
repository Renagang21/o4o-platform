import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-NETURE-APPROVED-PRODUCT-SOFT-DELETE-AND-RECYCLE-BIN-FLOW-V1
 *
 * supplier_product_offers 테이블에 soft delete 컬럼 추가:
 * - deleted_at: TypeORM @DeleteDateColumn (soft delete 기준)
 * - deleted_by: 삭제 수행자 UUID
 * - delete_reason: 삭제 사유
 */
export class AddSoftDeleteToSupplierProductOffers1712134800000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE supplier_product_offers
        ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL,
        ADD COLUMN IF NOT EXISTS deleted_by UUID DEFAULT NULL,
        ADD COLUMN IF NOT EXISTS delete_reason TEXT DEFAULT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE supplier_product_offers
        DROP COLUMN IF EXISTS delete_reason,
        DROP COLUMN IF EXISTS deleted_by,
        DROP COLUMN IF EXISTS deleted_at
    `);
  }
}
