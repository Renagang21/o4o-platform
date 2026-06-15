import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-SUPPLIER-MAIL-ORDER-REPORTING-FIELDS-V1
 *
 * Adds 통신판매업(mail-order sales business) reporting fields to neture_suppliers.
 * These are operator-confirmed reference fields and are NOT a blocking condition
 * for ACTIVE transition. The mail-order report PDF is stored privately and
 * referenced through a kyc_documents row.
 *
 * mail_order_sales_status: 'not_applicable' | 'reported' | 'pending'
 */
export class AddSupplierMailOrderReporting20260615140000
  implements MigrationInterface
{
  name = 'AddSupplierMailOrderReporting20260615140000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE neture_suppliers
        ADD COLUMN IF NOT EXISTS mail_order_sales_status varchar(20),
        ADD COLUMN IF NOT EXISTS mail_order_sales_registration_number varchar(100),
        ADD COLUMN IF NOT EXISTS mail_order_sales_document_id uuid;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'FK_neture_suppliers_mail_order_sales_document'
        ) THEN
          ALTER TABLE neture_suppliers
            ADD CONSTRAINT "FK_neture_suppliers_mail_order_sales_document"
            FOREIGN KEY (mail_order_sales_document_id)
            REFERENCES kyc_documents(id)
            ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS IDX_neture_suppliers_mail_order_sales_document
        ON neture_suppliers (mail_order_sales_document_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS IDX_neture_suppliers_mail_order_sales_document`);
    await queryRunner.query(`
      ALTER TABLE neture_suppliers
        DROP CONSTRAINT IF EXISTS "FK_neture_suppliers_mail_order_sales_document";
    `);
    await queryRunner.query(`
      ALTER TABLE neture_suppliers
        DROP COLUMN IF EXISTS mail_order_sales_document_id,
        DROP COLUMN IF EXISTS mail_order_sales_registration_number,
        DROP COLUMN IF EXISTS mail_order_sales_status;
    `);
  }
}
