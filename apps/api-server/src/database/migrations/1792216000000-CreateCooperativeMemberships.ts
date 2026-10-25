import type { MigrationInterface, QueryRunner } from "typeorm";

/** Individual cooperative enrollment is deliberately separate from pharmacy organizations. */
export class CreateCooperativeMemberships1792216000000
  implements MigrationInterface
{
  name = "CreateCooperativeMemberships1792216000000";
  async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE TABLE public.cooperatives (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      slug varchar(63) NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND slug NOT IN ('cooperatives','about','operator','preview','login','assets','api')),
      name varchar(255) NOT NULL,
      introduction text NOT NULL DEFAULT '',
      eligibility_description text NOT NULL DEFAULT '',
      semi_franchise_id uuid NOT NULL UNIQUE REFERENCES public.semi_franchises(id) ON DELETE RESTRICT,
      status varchar(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended')),
      created_at timestamptz NOT NULL DEFAULT now()
    )`);
    await q.query(`CREATE TABLE public.cooperative_memberships (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      cooperative_id uuid NOT NULL REFERENCES public.cooperatives(id) ON DELETE CASCADE,
      user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      status varchar(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','rejected','suspended','withdrawn')),
      created_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (cooperative_id, user_id)
    )`);
    await q.query(`CREATE TRIGGER account_erasure_write_fence BEFORE INSERT OR UPDATE ON public.cooperative_memberships
      FOR EACH ROW EXECUTE FUNCTION public.account_erasure_write_fence()`);
    await q.query(
      "CREATE INDEX cooperative_memberships_user ON public.cooperative_memberships(user_id)",
    );
  }
  async down(q: QueryRunner): Promise<void> {
    await q.query("DROP TABLE public.cooperative_memberships");
    await q.query("DROP TABLE public.cooperatives");
  }
}
