import type { MigrationInterface, QueryRunner } from "typeorm";

/** Supplier → assigned business operator inbox; existing operator-authored contents stay unchanged. */
export class CreateBusinessContentSubmissions1792200000000
  implements MigrationInterface
{
  name = "CreateBusinessContentSubmissions1792200000000";
  async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE TABLE public.semi_franchise_content_submissions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      semi_franchise_id uuid NOT NULL REFERENCES public.semi_franchises(id) ON DELETE CASCADE,
      supplier_id uuid NOT NULL REFERENCES public.neture_suppliers(id) ON DELETE CASCADE,
      source_library_item_id uuid NOT NULL,
      content_snapshot jsonb NOT NULL CHECK (jsonb_typeof(content_snapshot) = 'object'),
      status varchar(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
      published_content_id uuid UNIQUE REFERENCES public.semi_franchise_contents(id) ON DELETE SET NULL,
      reason text,
      requested_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
      reviewed_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
      reviewed_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now()
    )`);
    await q.query(`CREATE UNIQUE INDEX business_content_one_open_submission
      ON public.semi_franchise_content_submissions(semi_franchise_id, supplier_id, source_library_item_id)
      WHERE status IN ('pending','approved')`);
    await q.query(`CREATE INDEX business_content_submission_inbox
      ON public.semi_franchise_content_submissions(semi_franchise_id, status, created_at DESC)`);
    await q.query(`CREATE TRIGGER account_erasure_write_fence
      BEFORE INSERT OR UPDATE ON public.semi_franchise_content_submissions
      FOR EACH ROW EXECUTE FUNCTION public.account_erasure_write_fence()`);
  }
  async down(q: QueryRunner): Promise<void> {
    await q.query("DROP TABLE public.semi_franchise_content_submissions");
  }
}
