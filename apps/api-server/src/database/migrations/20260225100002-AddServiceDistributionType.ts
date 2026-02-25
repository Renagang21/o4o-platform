import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-PRODUCT-POLICY-V2-SERVICE-LAYER-INTRODUCTION-V1
 *
 * Adds SERVICE value to neture_supplier_products_distribution_type_enum.
 *
 * DistributionType 정책:
 * - PUBLIC: HUB 공개, 승인 불필요, 즉시 리스팅 가능
 * - SERVICE: 서비스 범위 공개, 운영자 승인 필요
 * - PRIVATE: 지정 판매자 전용, 공급자 지정 필요
 *
 * Additive only — existing enum values (PUBLIC, PRIVATE) untouched.
 */
export class AddServiceDistributionType20260225100002
  implements MigrationInterface
{
  name = 'AddServiceDistributionType20260225100002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'SERVICE'
          AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'neture_supplier_products_distribution_type_enum'))
        THEN
          ALTER TYPE neture_supplier_products_distribution_type_enum ADD VALUE 'SERVICE';
        END IF;
      END $$;
    `);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL does not support removing enum values.
    // To revert, ensure no rows use 'SERVICE' before manual type recreation.
  }
}
