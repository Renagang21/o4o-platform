import type { MigrationInterface, QueryRunner } from "typeorm";
/** Photo business records only. Product promotion and external program originals stay separate. */
export class CreatePhotoTransactionLedger1794618000000
  implements MigrationInterface
{
  name = "CreatePhotoTransactionLedger1794618000000";
  async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE TABLE photo_transaction_invoices (
   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
   created_by uuid REFERENCES users(id) ON DELETE SET NULL,confirmed_by uuid REFERENCES users(id) ON DELETE SET NULL,
   origin varchar(20) NOT NULL CHECK(origin IN ('o4o_chat','chatgpt')),state varchar(20) NOT NULL DEFAULT 'draft' CHECK(state IN ('draft','confirmed','duplicate')),
   invoice jsonb NOT NULL,sources jsonb NOT NULL DEFAULT '[]',version integer NOT NULL DEFAULT 1,revision varchar(64) NOT NULL,
   photo_fingerprint varchar(64),document_fingerprint varchar(64),content_fingerprint varchar(64),confirmed_at timestamptz,confirmation_request uuid,confirmation_fingerprint varchar(64),
   program_status varchar(30) NOT NULL DEFAULT 'unknown' CHECK(program_status IN ('unknown','not_recorded','recorded_in_program')),
   missing_original_ack boolean NOT NULL DEFAULT false,duplicate_reason text,
   created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now())`);
    await q.query(
      `CREATE INDEX photo_invoice_org_recent ON photo_transaction_invoices(organization_id,created_at DESC,id)`,
    );
    await q.query(
      `CREATE INDEX photo_invoice_document ON photo_transaction_invoices(organization_id,document_fingerprint) WHERE state='confirmed'`,
    );
    await q.query(
      `CREATE INDEX photo_invoice_content ON photo_transaction_invoices(organization_id,content_fingerprint) WHERE state='confirmed'`,
    );
    await q.query(
      `CREATE INDEX photo_invoice_photo ON photo_transaction_invoices(organization_id,photo_fingerprint) WHERE state='confirmed'`,
    );
    await q.query(`CREATE TABLE photo_transaction_revisions (
   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),invoice_id uuid NOT NULL REFERENCES photo_transaction_invoices(id) ON DELETE CASCADE,
   version integer NOT NULL,actor_id uuid REFERENCES users(id) ON DELETE SET NULL,invoice jsonb NOT NULL,sources jsonb NOT NULL,revision varchar(64) NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(invoice_id,version))`);
    await q.query(`CREATE TABLE photo_transaction_images (
   invoice_id uuid NOT NULL REFERENCES photo_transaction_invoices(id) ON DELETE CASCADE,page integer NOT NULL CHECK(page BETWEEN 1 AND 500),
   sha256 varchar(64) NOT NULL,mime_type varchar(30) NOT NULL,image_bytes bytea NOT NULL,PRIMARY KEY(invoice_id,page,sha256))`);
    await q.query(`CREATE TABLE photo_transaction_requests (
   organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,request_id uuid NOT NULL,
   fingerprint varchar(64) NOT NULL,invoice_id uuid NOT NULL REFERENCES photo_transaction_invoices(id) ON DELETE CASCADE,PRIMARY KEY(organization_id,request_id))`);
    for(const table of ['photo_transaction_invoices','photo_transaction_requests'])await q.query(`CREATE TRIGGER store_closure_write_fence_organization_id BEFORE INSERT OR UPDATE ON ${table} FOR EACH ROW EXECUTE FUNCTION public.o4o_closed_pharmacy_write_fence('organization_id')`);
    for (const table of [
      "photo_transaction_invoices",
      "photo_transaction_revisions",
      "photo_transaction_images",
      "photo_transaction_requests",
    ])
      await q.query(
        `CREATE TRIGGER account_erasure_write_fence BEFORE INSERT OR UPDATE ON ${table} FOR EACH ROW EXECUTE FUNCTION public.account_erasure_write_fence()`,
      );
  }
  async down(q: QueryRunner): Promise<void> {
    for (const table of [
      "photo_transaction_requests",
      "photo_transaction_images",
      "photo_transaction_revisions",
      "photo_transaction_invoices",
    ])
      await q.query(`DROP TABLE ${table}`);
  }
}
