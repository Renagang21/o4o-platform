import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-SUPPLIER-REGULATED-CATEGORY-DOCUMENTS-V1
 *
 * Creates neture_supplier_regulated_categories — per-supplier per-category
 * (의약품/의료기기/건기식/화장품 등 품목군) onboarding rows with evidence PDF
 * (kyc_documents reference) and an O4O-internal review status.
 *
 * status: 'not_requested' | 'submitted' | 'approved' | 'rejected' | 'needs_update' | 'suspended'
 * O4O 는 법적 허가를 인증하지 않으며, 내부 등록 가능 상태만 관리한다.
 * 본 WO 에서는 제품 등록 gate 와 연결하지 않는다.
 */
export class AddSupplierRegulatedCategories20260615150000
  implements MigrationInterface
{
  name = 'AddSupplierRegulatedCategories20260615150000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS neture_supplier_regulated_categories (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        supplier_id uuid NOT NULL,
        category varchar(50) NOT NULL,
        status varchar(20) NOT NULL DEFAULT 'not_requested',
        evidence_document_id uuid,
        registration_number varchar(100),
        reviewed_by uuid,
        reviewed_at timestamptz,
        review_note text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'UQ_supplier_regulated_category'
        ) THEN
          ALTER TABLE neture_supplier_regulated_categories
            ADD CONSTRAINT "UQ_supplier_regulated_category" UNIQUE (supplier_id, category);
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_supplier_regulated_category_supplier'
        ) THEN
          ALTER TABLE neture_supplier_regulated_categories
            ADD CONSTRAINT "FK_supplier_regulated_category_supplier"
            FOREIGN KEY (supplier_id) REFERENCES neture_suppliers(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_supplier_regulated_category_evidence_document'
        ) THEN
          ALTER TABLE neture_supplier_regulated_categories
            ADD CONSTRAINT "FK_supplier_regulated_category_evidence_document"
            FOREIGN KEY (evidence_document_id) REFERENCES kyc_documents(id) ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS IDX_supplier_regulated_category_supplier
        ON neture_supplier_regulated_categories (supplier_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS neture_supplier_regulated_categories`);
  }
}
