import type { MigrationInterface, QueryRunner } from "typeorm";

/** No new role/table/data conversion. Existing global and organization scopes remain unchanged. */
export class AllowCentralOperatingDelegation1793164501481
  implements MigrationInterface
{
  name = "AllowCentralOperatingDelegation1793164501481";
  async up(q: QueryRunner): Promise<void> {
    if (!q.isTransactionActive)
      throw new Error("Central delegation requires a migration transaction");
    await q.query("ALTER TABLE role_assignments DROP CONSTRAINT chk_org_scope");
    await q.query(`ALTER TABLE role_assignments ADD CONSTRAINT chk_org_scope CHECK (
      (scope_type='global' AND scope_id IS NULL) OR
      (scope_type='organization' AND scope_id IS NOT NULL) OR scope_type IS NULL OR
      (scope_type='o4o-direct' AND scope_id IS NULL AND role IN (
        'neture:admin','neture:operator','supplier:admin','supplier:operator',
        'funding:admin','funding:operator','lecture:admin','lecture:operator',
        'community:admin','community:operator','partner-support:admin','partner-support:operator',
        'neture:pharmcoop_admin','neture:pharmcoop_operator'
      ))
    )`);
  }
  async down(q: QueryRunner): Promise<void> {
    if (!q.isTransactionActive)
      throw new Error("Central delegation rollback requires a transaction");
    await q.query("LOCK TABLE role_assignments IN SHARE ROW EXCLUSIVE MODE");
    const [row] = await q.query(
      `SELECT EXISTS(SELECT 1 FROM role_assignments WHERE scope_type='o4o-direct') AS in_use`,
    );
    if (row?.in_use)
      throw new Error(
        "Central delegations still exist; reviewed forward repair required",
      );
    await q.query("ALTER TABLE role_assignments DROP CONSTRAINT chk_org_scope");
    await q.query(`ALTER TABLE role_assignments ADD CONSTRAINT chk_org_scope CHECK (
      (scope_type='global' AND scope_id IS NULL) OR (scope_type='organization' AND scope_id IS NOT NULL) OR scope_type IS NULL
    )`);
  }
}
