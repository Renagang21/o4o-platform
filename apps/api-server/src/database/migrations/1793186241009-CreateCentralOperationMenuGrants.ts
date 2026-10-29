import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Per-assignment restriction beside existing RBAC; no new platform-wide operator role. */
export class CreateCentralOperationMenuGrants1793186241009 implements MigrationInterface {
  name = 'CreateCentralOperationMenuGrants1793186241009';
  async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE TABLE central_operation_menu_grants (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      assignment_id uuid UNIQUE REFERENCES role_assignments(id) ON DELETE CASCADE,
      invitation_id uuid UNIQUE REFERENCES service_operator_invitations(id) ON DELETE CASCADE,
      menu_keys text[] NOT NULL DEFAULT '{}',
      created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp NOT NULL DEFAULT now(),
      CONSTRAINT central_menu_grant_owner CHECK (num_nonnulls(assignment_id,invitation_id)=1),
      CONSTRAINT central_menu_grant_keys CHECK (cardinality(menu_keys)<=256 AND array_position(menu_keys,NULL) IS NULL)
    )`);
    await q.query(`CREATE TRIGGER account_erasure_write_fence BEFORE INSERT OR UPDATE ON central_operation_menu_grants
      FOR EACH ROW EXECUTE FUNCTION public.account_erasure_write_fence()`);
  }
  async down(q: QueryRunner): Promise<void> {
    await q.query('LOCK TABLE central_operation_menu_grants IN ACCESS EXCLUSIVE MODE');
    if ((await q.query('SELECT 1 FROM central_operation_menu_grants LIMIT 1')).length) throw new Error('Central menu restrictions exist; rollback requires reviewed policy migration.');
    await q.query('DROP TABLE central_operation_menu_grants');
  }
}
