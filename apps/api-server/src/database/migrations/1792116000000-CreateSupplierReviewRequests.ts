import type { MigrationInterface, QueryRunner } from "typeorm";

/** Additive supplier Business workflow; no supplier approval/membership state changes. */
export class CreateSupplierReviewRequests1792116000000
  implements MigrationInterface
{
  name = "CreateSupplierReviewRequests1792116000000";
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`CREATE TABLE public.neture_supplier_review_requests (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      supplier_id uuid NOT NULL REFERENCES public.neture_suppliers(id) ON DELETE CASCADE,
      items jsonb NOT NULL CHECK (jsonb_typeof(items) = 'array' AND jsonb_array_length(items) BETWEEN 1 AND 8),
      request_note text NOT NULL CHECK (length(request_note) BETWEEN 1 AND 2000),
      response_note text, resolution_note text,
      state varchar(20) NOT NULL DEFAULT 'requested' CHECK (state IN ('requested','submitted','resolved')),
      version integer NOT NULL DEFAULT 1 CHECK (version > 0),
      requested_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
      submitted_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
      resolved_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
      submitted_at timestamptz, resolved_at timestamptz,
      CONSTRAINT supplier_review_request_dates CHECK (
        (state = 'requested' AND submitted_at IS NULL AND resolved_at IS NULL) OR
        (state = 'submitted' AND submitted_at IS NOT NULL AND resolved_at IS NULL) OR
        (state = 'resolved' AND resolved_at IS NOT NULL))
    )`);
    // New business records participate in the existing erasure writer fence.
    await runner.query(`CREATE TRIGGER account_erasure_write_fence
      BEFORE INSERT OR UPDATE ON public.neture_supplier_review_requests
      FOR EACH ROW EXECUTE FUNCTION public.account_erasure_write_fence()`);
    await runner.query(
      `CREATE UNIQUE INDEX supplier_review_one_open ON public.neture_supplier_review_requests(supplier_id) WHERE resolved_at IS NULL`,
    );
    await runner.query(
      `CREATE INDEX supplier_review_history ON public.neture_supplier_review_requests(supplier_id, created_at DESC, id DESC)`,
    );
  }
  async down(runner: QueryRunner): Promise<void> {
    await runner.query("DROP TABLE public.neture_supplier_review_requests");
  }
}
