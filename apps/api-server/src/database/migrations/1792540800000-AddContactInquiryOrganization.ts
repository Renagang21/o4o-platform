import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Nullable scope dimension: existing service inquiries remain unchanged. No data backfill. */
export class AddContactInquiryOrganization1792540800000 implements MigrationInterface {
  name = 'AddContactInquiryOrganization1792540800000';
  async up(q: QueryRunner): Promise<void> {
    await q.query('ALTER TABLE contact_inquiries ADD COLUMN organization_id uuid');
    await q.query('CREATE INDEX contact_inquiries_scope_status ON contact_inquiries(service_key, organization_id, status, created_at)');
  }
  async down(q: QueryRunner): Promise<void> {
    // Do not silently turn organization-private inquiries into service-wide inquiries.
    await q.query(`DO $$ BEGIN IF EXISTS(SELECT 1 FROM contact_inquiries WHERE organization_id IS NOT NULL) THEN RAISE EXCEPTION 'SCOPED_CONTACT_INQUIRIES_EXIST'; END IF; END $$`);
    await q.query('DROP INDEX contact_inquiries_scope_status');
    await q.query('ALTER TABLE contact_inquiries DROP COLUMN organization_id');
  }
}
