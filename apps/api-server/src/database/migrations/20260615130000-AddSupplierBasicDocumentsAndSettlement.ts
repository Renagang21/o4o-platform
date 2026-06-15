import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-SUPPLIER-ONBOARDING-BASIC-DOCUMENTS-AND-SETTLEMENT-V1
 *
 * Adds minimal supplier onboarding fields for private KYC documents and
 * settlement account information. Document bytes are stored privately and
 * referenced through kyc_documents rows.
 */
export class AddSupplierBasicDocumentsAndSettlement20260615130000
  implements MigrationInterface
{
  name = 'AddSupplierBasicDocumentsAndSettlement20260615130000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE neture_suppliers
        ADD COLUMN IF NOT EXISTS business_registration_document_id uuid,
        ADD COLUMN IF NOT EXISTS settlement_bank_name varchar(100),
        ADD COLUMN IF NOT EXISTS settlement_account_number varchar(100),
        ADD COLUMN IF NOT EXISTS settlement_account_holder varchar(100),
        ADD COLUMN IF NOT EXISTS settlement_bankbook_document_id uuid,
        ADD COLUMN IF NOT EXISTS settlement_contact_name varchar(100),
        ADD COLUMN IF NOT EXISTS settlement_contact_email varchar(255);
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'FK_neture_suppliers_business_registration_document'
        ) THEN
          ALTER TABLE neture_suppliers
            ADD CONSTRAINT "FK_neture_suppliers_business_registration_document"
            FOREIGN KEY (business_registration_document_id)
            REFERENCES kyc_documents(id)
            ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'FK_neture_suppliers_settlement_bankbook_document'
        ) THEN
          ALTER TABLE neture_suppliers
            ADD CONSTRAINT "FK_neture_suppliers_settlement_bankbook_document"
            FOREIGN KEY (settlement_bankbook_document_id)
            REFERENCES kyc_documents(id)
            ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS IDX_neture_suppliers_business_registration_document
        ON neture_suppliers (business_registration_document_id);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS IDX_neture_suppliers_settlement_bankbook_document
        ON neture_suppliers (settlement_bankbook_document_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS IDX_neture_suppliers_settlement_bankbook_document`);
    await queryRunner.query(`DROP INDEX IF EXISTS IDX_neture_suppliers_business_registration_document`);
    await queryRunner.query(`
      ALTER TABLE neture_suppliers
        DROP CONSTRAINT IF EXISTS "FK_neture_suppliers_settlement_bankbook_document",
        DROP CONSTRAINT IF EXISTS "FK_neture_suppliers_business_registration_document";
    `);
    await queryRunner.query(`
      ALTER TABLE neture_suppliers
        DROP COLUMN IF EXISTS settlement_contact_email,
        DROP COLUMN IF EXISTS settlement_contact_name,
        DROP COLUMN IF EXISTS settlement_bankbook_document_id,
        DROP COLUMN IF EXISTS settlement_account_holder,
        DROP COLUMN IF EXISTS settlement_account_number,
        DROP COLUMN IF EXISTS settlement_bank_name,
        DROP COLUMN IF EXISTS business_registration_document_id;
    `);
  }
}
