import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-NETURE-SUPPLIER-ONBOARDING-REALIGN-V1
 *
 * 1. SupplierStatus enum에 PENDING, REJECTED 추가
 * 2. approved_by, approved_at, rejected_reason 컬럼 추가
 * 3. 기본값을 ACTIVE → PENDING으로 변경 (신규 INSERT만 영향, 기존 행 불변)
 */
export class AddSupplierOnboardingColumns20260226200001
  implements MigrationInterface
{
  name = 'AddSupplierOnboardingColumns20260226200001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Add PENDING to enum
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'PENDING'
          AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'neture_supplier_status_enum'))
        THEN
          ALTER TYPE neture_supplier_status_enum ADD VALUE 'PENDING';
        END IF;
      END $$;
    `);

    // Step 2: Add REJECTED to enum
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'REJECTED'
          AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'neture_supplier_status_enum'))
        THEN
          ALTER TYPE neture_supplier_status_enum ADD VALUE 'REJECTED';
        END IF;
      END $$;
    `);

    // Commit enum additions so new values are visible in subsequent statements
    await queryRunner.query('COMMIT');
    await queryRunner.query('BEGIN');

    // Step 3: Add approval metadata columns
    await queryRunner.query(`
      ALTER TABLE neture_suppliers
        ADD COLUMN IF NOT EXISTS approved_by uuid,
        ADD COLUMN IF NOT EXISTS approved_at timestamp,
        ADD COLUMN IF NOT EXISTS rejected_reason text;
    `);

    // Step 4: Change default for new inserts (existing rows unaffected)
    await queryRunner.query(`
      ALTER TABLE neture_suppliers ALTER COLUMN status SET DEFAULT 'PENDING';
    `);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL does not support removing enum values.
    // Columns can be dropped if needed but not recommended.
  }
}
