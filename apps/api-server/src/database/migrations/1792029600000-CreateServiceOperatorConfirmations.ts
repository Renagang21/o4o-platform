import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Email consent is separate from users/credentials and never activates a role before acceptance. */
export class CreateServiceOperatorConfirmations1792029600000
  implements MigrationInterface
{
  name = 'CreateServiceOperatorConfirmations1792029600000';
  async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE TABLE service_operator_invitations (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      invited_email varchar(255) NOT NULL,
      service_key varchar(64) NOT NULL,
      role varchar(64) NOT NULL,
      target_user_id uuid REFERENCES users(id) ON DELETE CASCADE,
      invited_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
      accepted_user_id uuid REFERENCES users(id) ON DELETE CASCADE,
      purpose varchar(16) NOT NULL CHECK (purpose IN ('assignment','confirmation')),
      status varchar(16) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','cancelled')),
      token_hash varchar(64) NOT NULL UNIQUE,
      expires_at timestamptz NOT NULL,
      accepted_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT service_operator_invite_acceptance CHECK ((status='accepted')=(accepted_user_id IS NOT NULL AND accepted_at IS NOT NULL)),
      CONSTRAINT service_operator_invite_confirmation CHECK (purpose<>'confirmation' OR target_user_id IS NOT NULL)
    )`);
    await q.query(`CREATE UNIQUE INDEX service_operator_invite_pending ON service_operator_invitations
      (lower(invited_email),service_key,role) WHERE status='pending'`);
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
