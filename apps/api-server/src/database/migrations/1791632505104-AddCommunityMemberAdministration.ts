import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Approved individual admin/operator policy; existing operators become admins.
 * Forward-only once roles, suspensions or audit events are in use. No other ledger is updated.
 */
export class AddCommunityMemberAdministration1791632505104 implements MigrationInterface {
  name = 'AddCommunityMemberAdministration1791632505104';
  async up(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE community_memberships DROP CONSTRAINT community_memberships_role_check,
      DROP CONSTRAINT community_memberships_status_check,
      ADD CONSTRAINT community_memberships_role_check CHECK (role IN ('admin','operator','member')),
      ADD CONSTRAINT community_memberships_status_check CHECK (status IN ('pending','active','rejected','suspended','withdrawn'))`);
    await q.query(`CREATE TABLE community_membership_changes (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      community_id uuid NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
      membership_id uuid NOT NULL REFERENCES community_memberships(id) ON DELETE CASCADE,
      actor_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
      action varchar(32) NOT NULL CHECK (action IN ('role','approve','reject','suspend','restore','withdraw','create','migration')),
      before_role varchar(16), after_role varchar(16) NOT NULL,
      before_status varchar(16), after_status varchar(16) NOT NULL,
      reason varchar(1000), created_at timestamptz NOT NULL DEFAULT now()
    )`);
    await q.query('CREATE INDEX idx_community_membership_changes_scope ON community_membership_changes (community_id, membership_id, created_at)');
    await q.query(`INSERT INTO community_membership_changes
      (community_id, membership_id, action, before_role, after_role, before_status, after_status)
      SELECT community_id, id, 'migration', role, 'admin', status, status FROM community_memberships WHERE role = 'operator'`);
    await q.query("UPDATE community_memberships SET role = 'admin', updated_at = NOW() WHERE role = 'operator'");
  }
  async down(q: QueryRunner): Promise<void> {
    const [row] = await q.query(`SELECT EXISTS (SELECT 1 FROM community_membership_changes)
      OR EXISTS (SELECT 1 FROM community_memberships WHERE role = 'admin' OR status = 'suspended') AS in_use`);
    if (row.in_use) throw new Error('Community administration is in use; reviewed forward repair is required.');
    await q.query('DROP TABLE community_membership_changes');
    await q.query(`ALTER TABLE community_memberships DROP CONSTRAINT community_memberships_role_check,
      DROP CONSTRAINT community_memberships_status_check,
      ADD CONSTRAINT community_memberships_role_check CHECK (role IN ('operator','member')),
      ADD CONSTRAINT community_memberships_status_check CHECK (status IN ('pending','active','rejected','withdrawn'))`);
  }
}
