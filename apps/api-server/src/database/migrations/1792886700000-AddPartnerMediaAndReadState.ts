import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddPartnerMediaAndReadState1792886700000
  implements MigrationInterface
{
  name = "AddPartnerMediaAndReadState1792886700000";
  async up(q: QueryRunner): Promise<void> {
    await q.query(
      "ALTER TABLE partner_support_events ADD COLUMN sequence bigserial UNIQUE",
    );
    await q.query(`CREATE TABLE partner_support_files (
      id uuid PRIMARY KEY, space_id uuid NOT NULL REFERENCES partner_support_spaces(id) ON DELETE CASCADE,
      asset_id uuid NOT NULL, group_id uuid NOT NULL, version integer NOT NULL CHECK(version>0),
      name varchar(250) NOT NULL, mime varchar(100) NOT NULL, size integer NOT NULL CHECK(size>0),
      sha256 char(64) NOT NULL, created_by uuid REFERENCES users(id) ON DELETE SET NULL,
      created_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz,
      UNIQUE(group_id,version)
    )`);
    await q.query(
      "CREATE INDEX partner_support_files_asset ON partner_support_files(space_id,asset_id)",
    );
    await q.query(`CREATE TABLE partner_support_reads (
      space_id uuid NOT NULL REFERENCES partner_support_spaces(id) ON DELETE CASCADE,
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      last_event_seq bigint NOT NULL DEFAULT 0 CHECK(last_event_seq>=0), PRIMARY KEY(space_id,user_id)
    )`);
    // Required by the global account-erasure writer manifest, including empty tables.
    for (const table of ["partner_support_files", "partner_support_reads"]) {
      await q.query(`CREATE TRIGGER account_erasure_write_fence BEFORE INSERT OR UPDATE ON ${table} FOR EACH ROW EXECUTE FUNCTION account_erasure_write_fence()`);
    }
  }
  async down(q: QueryRunner): Promise<void> {
    await q.query(`DO $$ BEGIN IF EXISTS(SELECT 1 FROM partner_support_files) OR EXISTS(SELECT 1 FROM partner_support_reads)
      THEN RAISE EXCEPTION 'PARTNER_MEDIA_DATA_EXISTS'; END IF; END $$`);
    await q.query("DROP TABLE partner_support_reads");
    await q.query("DROP TABLE partner_support_files");
    await q.query("ALTER TABLE partner_support_events DROP COLUMN sequence");
  }
}
