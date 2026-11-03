import type { MigrationInterface, QueryRunner } from "typeorm";

const COLUMNS = [
  ["kyc_documents", "user_id"],
  ["forum_category_requests", "requester_id"],
  ["forum_comment", "author_id"],
  ["assistant_tasks", "requested_by_user_id"],
  ["o4o_asset_snapshots", "created_by"],
  ["store_products", "created_by"],
] as const;
/** Attribution may disappear without cascading employer/forum/course resources. */
export class SeparateMemberResourceOwnership1793691490120
  implements MigrationInterface
{
  name = "SeparateMemberResourceOwnership1793691490120";
  async up(q: QueryRunner): Promise<void> {
    for (const [table, column] of COLUMNS) {
      await q.query(
        `ALTER TABLE public."${table}" ALTER COLUMN "${column}" DROP NOT NULL`,
      );
      const constraints = await q.query(
        `SELECT c.conname FROM pg_constraint c JOIN pg_attribute a
        ON a.attrelid=c.conrelid AND a.attnum=ANY(c.conkey)
        WHERE c.contype='f' AND c.conrelid=to_regclass('public.'||$1)
        AND c.confrelid='public.users'::regclass AND a.attname=$2`,
        [table, column],
      );
      for (const { conname } of constraints) {
        const safe = '"' + String(conname).replace(/"/g, '""') + '"';
        await q.query(`ALTER TABLE public."${table}" DROP CONSTRAINT ${safe}`);
        await q.query(
          `ALTER TABLE public."${table}" ADD CONSTRAINT ${safe} FOREIGN KEY("${column}") REFERENCES public.users(id) ON DELETE SET NULL`,
        );
      }
    }
    await q.query(
      `ALTER TABLE assistant_tasks ADD CONSTRAINT assistant_tasks_personal_requester_required CHECK(ownership_scope<>'USER' OR requested_by_user_id IS NOT NULL)`,
    );
    await q.query(`CREATE TABLE public.store_closure_file_tasks(
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      case_id uuid NOT NULL REFERENCES store_owner_termination_cases(id) ON DELETE CASCADE,
      document_id uuid REFERENCES kyc_documents(id) ON DELETE SET NULL,
      object_hash char(64) NOT NULL, bucket text NOT NULL, object_path text NOT NULL,
      generation text, state text NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','deleted','already_absent')),
      error_code text, updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(case_id,object_hash))`);
    await q.query(
      `CREATE TRIGGER account_erasure_write_fence BEFORE INSERT OR UPDATE ON public.store_closure_file_tasks FOR EACH ROW EXECUTE FUNCTION public.account_erasure_write_fence()`,
    );
  }
  async down(q: QueryRunner): Promise<void> {
    // Refuse rollback when anonymized resources or pending file manifests exist.
    const [files] = await q.query(
      "SELECT EXISTS(SELECT 1 FROM store_closure_file_tasks) AS present",
    );
    if (files.present)
      throw new Error("CLOSURE_MANIFEST_ROLLBACK_REVIEW_REQUIRED");
    for (const [table, column] of COLUMNS) {
      const [rows] = await q.query(
        `SELECT EXISTS(SELECT 1 FROM public."${table}" WHERE "${column}" IS NULL) AS present`,
      );
      if (rows.present)
        throw new Error("RESOURCE_ATTRIBUTION_ROLLBACK_REVIEW_REQUIRED");
    }
    await q.query("DROP TABLE public.store_closure_file_tasks");
    await q.query(
      "ALTER TABLE assistant_tasks DROP CONSTRAINT assistant_tasks_personal_requester_required",
    );
    for (const [table, column] of COLUMNS) {
      const constraints = await q.query(
        `SELECT c.conname FROM pg_constraint c JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=ANY(c.conkey) WHERE c.contype='f' AND c.conrelid=to_regclass('public.'||$1) AND c.confrelid='public.users'::regclass AND a.attname=$2`,
        [table, column],
      );
      for (const { conname } of constraints) {
        const safe = '"' + String(conname).replace(/"/g, '""') + '"';
        await q.query(`ALTER TABLE public."${table}" DROP CONSTRAINT ${safe}`);
        await q.query(
          `ALTER TABLE public."${table}" ADD CONSTRAINT ${safe} FOREIGN KEY("${column}") REFERENCES public.users(id) ON DELETE ${table === "forum_comment" ? "NO ACTION" : "CASCADE"}`,
        );
      }
      await q.query(
        `ALTER TABLE public."${table}" ALTER COLUMN "${column}" SET NOT NULL`,
      );
    }
  }
}
