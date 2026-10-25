import type { MigrationInterface, QueryRunner } from "typeorm";

/** Greenfield support tools. No legacy Partner role, commerce or commission restoration. */
export class CreatePartnerSupportSpaces1792886600000
  implements MigrationInterface
{
  name = "CreatePartnerSupportSpaces1792886600000";
  async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE TABLE partner_support_spaces (
      id uuid PRIMARY KEY, owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name varchar(250) NOT NULL, revision integer NOT NULL DEFAULT 0 CHECK(revision >= 0),
      workspace jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
    )`);
    await q.query(
      "CREATE INDEX partner_support_spaces_owner ON partner_support_spaces(owner_id)",
    );
    await q.query(`CREATE TABLE partner_support_members (
      space_id uuid NOT NULL REFERENCES partner_support_spaces(id) ON DELETE CASCADE,
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role varchar(10) NOT NULL CHECK(role IN ('editor','viewer')), joined_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY(space_id,user_id)
    )`);
    await q.query(
      "CREATE INDEX partner_support_members_user ON partner_support_members(user_id)",
    );
    await q.query(`CREATE TABLE partner_support_invites (
      id uuid PRIMARY KEY, space_id uuid NOT NULL REFERENCES partner_support_spaces(id) ON DELETE CASCADE,
      token_hash char(64) NOT NULL UNIQUE, role varchar(10) NOT NULL CHECK(role IN ('editor','viewer')),
      created_by uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at timestamptz NOT NULL, consumed_at timestamptz, revoked_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now()
    )`);
    await q.query(
      "CREATE INDEX partner_support_invites_space ON partner_support_invites(space_id)",
    );
    await q.query(`CREATE TABLE partner_support_events (
      id uuid PRIMARY KEY, space_id uuid NOT NULL REFERENCES partner_support_spaces(id) ON DELETE CASCADE,
      actor_id uuid REFERENCES users(id) ON DELETE SET NULL, kind varchar(40) NOT NULL,
      revision integer NOT NULL, changes jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now()
    )`);
    await q.query(
      "CREATE INDEX partner_support_events_space ON partner_support_events(space_id, created_at DESC)",
    );
    // Required by the global account-erasure writer manifest, including empty tables.
    for (const table of ["partner_support_spaces", "partner_support_members", "partner_support_invites", "partner_support_events"]) {
      await q.query(`CREATE TRIGGER account_erasure_write_fence BEFORE INSERT OR UPDATE ON ${table} FOR EACH ROW EXECUTE FUNCTION account_erasure_write_fence()`);
    }
  }
  async down(q: QueryRunner): Promise<void> {
    await q.query(`DO $$ BEGIN IF EXISTS(SELECT 1 FROM partner_support_spaces)
      THEN RAISE EXCEPTION 'PARTNER_SUPPORT_DATA_EXISTS'; END IF; END $$`);
    for (const table of [
      "partner_support_events",
      "partner_support_invites",
      "partner_support_members",
      "partner_support_spaces",
    ])
      await q.query(`DROP TABLE ${table}`);
  }
}
