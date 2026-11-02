import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Explicit workspace consent alongside an existing service/organization role, without changing that role. */
export class AddAdminOperationsDelegation1793586897000 implements MigrationInterface {
  name = 'AddAdminOperationsDelegation1793586897000';
  async up(q: QueryRunner): Promise<void> {
    await q.query('ALTER TABLE central_operation_menu_grants ADD COLUMN admin_operations boolean NOT NULL DEFAULT false');
  }
  async down(q: QueryRunner): Promise<void> {
    await q.query('LOCK TABLE central_operation_menu_grants IN ACCESS EXCLUSIVE MODE');
    if ((await q.query('SELECT 1 FROM central_operation_menu_grants WHERE admin_operations=true LIMIT 1')).length)
      throw new Error('Explicit workspace delegations exist; rollback requires reviewed policy migration.');
    await q.query('ALTER TABLE central_operation_menu_grants DROP COLUMN admin_operations');
  }
}
