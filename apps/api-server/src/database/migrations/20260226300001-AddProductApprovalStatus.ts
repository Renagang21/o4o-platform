import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-NETURE-SUPPLIER-AND-PRODUCT-APPROVAL-BETA-V1
 *
 * 1. ProductApprovalStatus enum 생성 (PENDING, APPROVED, REJECTED)
 * 2. approval_status, approval_note 컬럼 추가
 * 3. 기존 is_active=true 상품 → APPROVED (데이터 보호)
 * 4. is_active 기본값 false 변경 (신규 INSERT만 영향)
 */
export class AddProductApprovalStatus20260226300001
  implements MigrationInterface
{
  name = 'AddProductApprovalStatus20260226300001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Create enum type
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'neture_supplier_products_approval_status_enum') THEN
          CREATE TYPE neture_supplier_products_approval_status_enum AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
        END IF;
      END $$;
    `);

    // Step 2: Add columns
    await queryRunner.query(`
      ALTER TABLE neture_supplier_products
        ADD COLUMN IF NOT EXISTS approval_status neture_supplier_products_approval_status_enum DEFAULT 'PENDING',
        ADD COLUMN IF NOT EXISTS approval_note text;
    `);

    // Step 3: Existing active products → APPROVED (기존 데이터 보호)
    await queryRunner.query(`
      UPDATE neture_supplier_products
      SET approval_status = 'APPROVED'
      WHERE is_active = true AND approval_status = 'PENDING';
    `);

    // Step 4: Change is_active default for new inserts
    await queryRunner.query(`
      ALTER TABLE neture_supplier_products ALTER COLUMN is_active SET DEFAULT false;
    `);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL does not support removing enum types easily.
    // Columns can be dropped if needed but not recommended.
  }
}
