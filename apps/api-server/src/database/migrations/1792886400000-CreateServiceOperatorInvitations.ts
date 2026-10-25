import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Email consent is separate from users/credentials and never activates a role before acceptance. */
export class CreateServiceOperatorInvitations1792886400000
  implements MigrationInterface
{
  name = 'CreateServiceOperatorInvitations1792886400000';
  async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE TABLE service_operator_invitations (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      invited_email varchar(255),
      service_key varchar(64) NOT NULL,
      scope_type varchar(16) NOT NULL DEFAULT 'platform' CHECK (scope_type IN ('platform','service','branch','cooperative')),
      scope_key varchar(64) NOT NULL DEFAULT '',
      role varchar(64) NOT NULL,
      target_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
      invited_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
      accepted_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
      purpose varchar(16) NOT NULL CHECK (purpose IN ('assignment','confirmation','revocation')),
      status varchar(16) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','cancelled','expired','revoked')),
      token_hash varchar(64) UNIQUE,
      expires_at timestamptz NOT NULL,
      accepted_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT service_operator_invite_acceptance CHECK ((status='accepted')=(accepted_at IS NOT NULL)),
      CONSTRAINT service_operator_invite_privacy CHECK (
        (status='pending' AND invited_email IS NOT NULL AND token_hash IS NOT NULL) OR
        (status<>'pending' AND invited_email IS NULL AND token_hash IS NULL)
      ),
      CONSTRAINT service_operator_invite_confirmation CHECK (purpose<>'confirmation' OR status<>'pending' OR target_user_id IS NOT NULL)
    )`);
    await q.query(`CREATE UNIQUE INDEX service_operator_invite_pending ON service_operator_invitations
      (lower(invited_email),service_key,role,scope_type,scope_key) WHERE status='pending'`);
    await q.query(
      'CREATE TRIGGER account_erasure_write_fence BEFORE INSERT OR UPDATE ON service_operator_invitations FOR EACH ROW EXECUTE FUNCTION account_erasure_write_fence()',
    );
  }
  async down(q: QueryRunner): Promise<void> {
    if (!q.isTransactionActive)
      throw new Error('Operator confirmation rollback requires a transaction');
    await q.query(
      'LOCK TABLE service_operator_invitations IN ACCESS EXCLUSIVE MODE',
    );
    const [row] = await q.query(
      'SELECT EXISTS(SELECT 1 FROM service_operator_invitations) AS in_use',
    );
    if (row.in_use)
      throw new Error(
        'Operator confirmation rollback requires an empty table; reviewed forward repair required',
      );
    await q.query('DROP TABLE service_operator_invitations');
  }
}
