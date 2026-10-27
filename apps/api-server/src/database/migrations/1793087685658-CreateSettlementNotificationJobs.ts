import type { MigrationInterface, QueryRunner } from "typeorm";
export class CreateSettlementNotificationJobs1793087685658
  implements MigrationInterface
{
  name = "CreateSettlementNotificationJobs1793087685658";
  async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE TABLE public.neture_settlement_notification_jobs (
      settlement_id uuid PRIMARY KEY REFERENCES public.neture_settlements(id) ON DELETE CASCADE,
      state varchar(20) NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','failed','delivered')),
      attempts integer NOT NULL DEFAULT 0 CHECK(attempts>=0),
      delivered_count integer NOT NULL DEFAULT 0 CHECK(delivered_count>=0),
      last_error_code varchar(50) CHECK(last_error_code IN ('NO_CURRENT_OWNER','NOTIFICATION_STORAGE_FAILED')),
      delivered_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      CHECK ((state='delivered' AND delivered_at IS NOT NULL AND last_error_code IS NULL)
        OR (state<>'delivered' AND delivered_at IS NULL))
    )`);
    await q.query(
      "CREATE INDEX neture_settlement_notification_jobs_pending ON public.neture_settlement_notification_jobs(state,updated_at)",
    );
    await q.query(`CREATE TRIGGER account_erasure_write_fence BEFORE INSERT OR UPDATE ON public.neture_settlement_notification_jobs
      FOR EACH ROW EXECUTE FUNCTION public.account_erasure_write_fence()`);
  }
  async down(q: QueryRunner): Promise<void> {
    await q.query(
      "LOCK TABLE public.neture_settlement_notification_jobs IN ACCESS EXCLUSIVE MODE",
    );
    const [row] = await q.query(
      "SELECT EXISTS(SELECT 1 FROM public.neture_settlement_notification_jobs) AS occupied",
    );
    if (row.occupied)
      throw new Error("SETTLEMENT_NOTIFICATION_HISTORY_MUST_BE_PRESERVED");
    await q.query("DROP TABLE public.neture_settlement_notification_jobs");
  }
}
