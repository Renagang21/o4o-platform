import type { MigrationInterface, QueryRunner } from "typeorm";
/** Existing profiles are not auto-approved. The boolean is a compatibility projection, not a new role. */
export class AddPharmacistQualificationDecisions1793165158540
  implements MigrationInterface
{
  name = "AddPharmacistQualificationDecisions1793165158540";
  async up(q: QueryRunner): Promise<void> {
    if (!q.isTransactionActive)
      throw new Error("Qualification migration requires a transaction");
    await q.query(`ALTER TABLE kpa_pharmacist_profiles
    ADD COLUMN qualification_status varchar(16) NOT NULL DEFAULT 'unrequested',
    ADD COLUMN qualification_reason text,
    ADD CONSTRAINT pharmacist_qualification_status_check CHECK (qualification_status IN ('unrequested','pending','approved','rejected','revoked')),
    ADD CONSTRAINT pharmacist_qualification_approval_check CHECK (qualification_status<>'approved' OR
      (license_verified=true AND NULLIF(BTRIM(license_number),'') IS NOT NULL AND verified_at IS NOT NULL AND verified_by IS NOT NULL)),
    ADD CONSTRAINT pharmacist_qualification_reason_check CHECK (qualification_status NOT IN ('approved','rejected','revoked') OR
      (qualification_reason IS NOT NULL AND length(BTRIM(qualification_reason)) BETWEEN 1 AND 2000))`);
    await q.query(
      `CREATE UNIQUE INDEX ux_pharmacist_approved_license ON kpa_pharmacist_profiles(BTRIM(license_number)) WHERE qualification_status='approved' AND license_verified=true`,
    );
  }
  async down(q: QueryRunner): Promise<void> {
    if (!q.isTransactionActive)
      throw new Error("Qualification rollback requires a transaction");
    await q.query(
      "LOCK TABLE kpa_pharmacist_profiles IN SHARE ROW EXCLUSIVE MODE",
    );
    const [row] = await q.query(
      "SELECT EXISTS(SELECT 1 FROM kpa_pharmacist_profiles WHERE qualification_status<>'unrequested') AS in_use",
    );
    if (row?.in_use)
      throw new Error(
        "Qualification decisions exist; reviewed forward repair required",
      );
    await q.query("DROP INDEX ux_pharmacist_approved_license");
    await q.query(`ALTER TABLE kpa_pharmacist_profiles DROP CONSTRAINT pharmacist_qualification_reason_check,
    DROP CONSTRAINT pharmacist_qualification_approval_check,DROP CONSTRAINT pharmacist_qualification_status_check,
    DROP COLUMN qualification_reason,DROP COLUMN qualification_status`);
  }
}
