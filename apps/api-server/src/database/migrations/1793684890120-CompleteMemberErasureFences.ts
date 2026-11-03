import type { MigrationInterface, QueryRunner } from "typeorm";

const TABLES = [
  "ai_usage_reservations",
  "external_ai_clients",
  "external_ai_connections",
  "external_ai_credentials",
  "external_ai_errors",
  "external_ai_requests",
  "external_ai_settings",
  "personal_mail_accounts",
  "personal_mail_job_items",
  "personal_mail_jobs",
  "personal_mail_messages",
  "personal_mail_oauth_flows",
  "personal_mail_rules",
] as const;

/** Forward schema repair; no account or business data is deleted or reassigned. */
export class CompleteMemberErasureFences1793684890120
  implements MigrationInterface
{
  name = "CompleteMemberErasureFences1793684890120";
  async up(q: QueryRunner): Promise<void> {
    const duplicates =
      await q.query(`SELECT m.user_id FROM organization_members m JOIN organizations o ON o.id=m.organization_id
      WHERE m.left_at IS NULL AND o.type IN ('store','pharmacy','supplier','semi_franchise') AND m.role IN ('staff','accepted','admin','manager','owner')
      GROUP BY m.user_id HAVING count(DISTINCT m.organization_id)>1 AND bool_or(m.role IN ('staff','accepted','admin','manager')) LIMIT 1`);
    if (duplicates.length)
      throw new Error("SINGLE_EMPLOYER_DATA_REVIEW_REQUIRED");
    for (const table of TABLES) {
      const [state] = await q.query(
        `SELECT to_regclass('public.'||$1) IS NOT NULL AS present,
        EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid=to_regclass('public.'||$1)
          AND tgname='account_erasure_write_fence') AS installed`,
        [table],
      );
      if (!state.present || state.installed)
        throw new Error("ERASURE_FENCE_SCHEMA_REVIEW_REQUIRED");
      await q.query(`CREATE TRIGGER account_erasure_write_fence BEFORE INSERT OR UPDATE ON public."${table}"
        FOR EACH ROW EXECUTE FUNCTION public.account_erasure_write_fence()`);
    }
    await q.query(`CREATE FUNCTION public.o4o_single_employer_guard() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF NEW.left_at IS NOT NULL OR NEW.role NOT IN ('staff','accepted','owner','admin','manager') THEN RETURN NEW; END IF;
        IF NOT EXISTS(SELECT 1 FROM public.organizations WHERE id=NEW.organization_id AND type IN ('store','pharmacy','supplier','semi_franchise')) THEN RETURN NEW; END IF;
        PERFORM pg_advisory_xact_lock_shared(hashtextextended('o4o-account-erasure-writes',0));
        PERFORM pg_advisory_xact_lock(hashtextextended('store-member:'||NEW.user_id::text,0));
        IF EXISTS(SELECT 1 FROM public.organization_members m JOIN public.organizations o ON o.id=m.organization_id
          WHERE m.user_id=NEW.user_id AND m.organization_id<>NEW.organization_id AND m.left_at IS NULL
          AND o.type IN ('store','pharmacy','supplier','semi_franchise') AND m.role IN ('staff','accepted','owner','admin','manager')
          AND (NEW.role IN ('staff','accepted','admin','manager') OR m.role IN ('staff','accepted','admin','manager'))) THEN
          RAISE EXCEPTION USING ERRCODE='P0001', MESSAGE='OTHER_EMPLOYER_EXISTS';
        END IF;
        RETURN NEW;
      END $$`);
    await q.query(`CREATE TRIGGER o4o_single_employer_guard BEFORE INSERT OR UPDATE ON public.organization_members
      FOR EACH ROW EXECUTE FUNCTION public.o4o_single_employer_guard()`);
  }
  async down(q: QueryRunner): Promise<void> {
    await q.query(
      "DROP TRIGGER o4o_single_employer_guard ON public.organization_members",
    );
    await q.query("DROP FUNCTION public.o4o_single_employer_guard()");
    for (const table of TABLES)
      await q.query(
        `DROP TRIGGER account_erasure_write_fence ON public."${table}"`,
      );
  }
}
