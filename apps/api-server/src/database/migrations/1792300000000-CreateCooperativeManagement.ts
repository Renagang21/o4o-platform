import type { MigrationInterface, QueryRunner } from "typeorm";

/** Scoped cooperative administration; no global role grants or legacy operator backfill. */
export class CreateCooperativeManagement1792300000000
  implements MigrationInterface
{
  name = "CreateCooperativeManagement1792300000000";
  async up(q: QueryRunner): Promise<void> {
    await q.query(
      `ALTER TABLE cooperatives DROP CONSTRAINT cooperatives_status_check`,
    );
    await q.query(
      `ALTER TABLE cooperatives ADD CONSTRAINT cooperatives_status_check CHECK(status IN ('pending','active','rejected','suspended'))`,
    );
    await q.query(`CREATE TABLE cooperative_roles (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      cooperative_id uuid NOT NULL REFERENCES cooperatives(id) ON DELETE CASCADE,
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role varchar(20) NOT NULL CHECK(role IN ('admin','operator')),
      created_at timestamptz NOT NULL DEFAULT now(),
      revoked_at timestamptz
    )`);
    await q.query(
      `CREATE UNIQUE INDEX cooperative_roles_active ON cooperative_roles(cooperative_id,user_id) WHERE revoked_at IS NULL`,
    );
    await q.query(
      `CREATE INDEX cooperative_roles_user ON cooperative_roles(user_id) WHERE revoked_at IS NULL`,
    );
    await q.query(`CREATE TABLE cooperative_management_events (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      cooperative_id uuid NOT NULL REFERENCES cooperatives(id) ON DELETE CASCADE,
      actor_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      subject_id uuid REFERENCES users(id) ON DELETE CASCADE,
      action varchar(40) NOT NULL,
      reason text NOT NULL CHECK(length(reason) BETWEEN 1 AND 2000),
      previous_state varchar(20), next_state varchar(20),
      created_at timestamptz NOT NULL DEFAULT now()
    )`);
    await q.query(
      `CREATE INDEX cooperative_management_events_coop ON cooperative_management_events(cooperative_id,created_at DESC)`,
    );
    await q.query(
      `CREATE TRIGGER account_erasure_write_fence BEFORE INSERT OR UPDATE ON cooperative_roles FOR EACH ROW EXECUTE FUNCTION public.account_erasure_write_fence()`,
    );
    await q.query(
      `CREATE TRIGGER account_erasure_write_fence BEFORE INSERT OR UPDATE ON cooperative_management_events FOR EACH ROW EXECUTE FUNCTION public.account_erasure_write_fence()`,
    );
  }
  async down(q: QueryRunner): Promise<void> {
    // Never silently discard pending/rejected affiliations on rollback.
    await q.query(
      `DO $$ BEGIN IF EXISTS(SELECT 1 FROM cooperatives WHERE status IN ('pending','rejected')) THEN RAISE EXCEPTION 'COOPERATIVE_PENDING_AFFILIATIONS_EXIST'; END IF; END $$`,
    );
    await q.query("DROP TABLE cooperative_management_events");
    await q.query("DROP TABLE cooperative_roles");
    await q.query(
      "ALTER TABLE cooperatives DROP CONSTRAINT cooperatives_status_check",
    );
    await q.query(
      `ALTER TABLE cooperatives ADD CONSTRAINT cooperatives_status_check CHECK(status IN ('active','suspended'))`,
    );
  }
}
