import type { MigrationInterface, QueryRunner } from "typeorm";
// Journals remain writable after closure; business writers and affiliations do not.
const INVENTORY = `SELECT n.nspname AS schema_name,c.relname AS table_name,a.attname AS column_name
 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace JOIN pg_attribute a ON a.attrelid=c.oid
 WHERE c.relkind='r' AND n.nspname IN ('public','neture','cosmetics') AND a.attnum>0 AND NOT a.attisdropped
 AND a.attname IN ('organization_id','organizationId','store_id','storeId') AND a.atttypid='uuid'::regtype
 AND c.relname NOT IN ('store_owner_termination_cases','action_logs') ORDER BY 1,2,3`;
const quote = (s: string) => '"' + s.replace(/"/g, '""') + '"';
export class FenceClosedPharmacyWriters1793698990120
  implements MigrationInterface
{
  name = "FenceClosedPharmacyWriters1793698990120";
  async up(q: QueryRunner): Promise<void> {
    await q.query(
      "ALTER TABLE public.organizations ADD COLUMN full_closure_at timestamptz",
    );
    await q.query(`CREATE FUNCTION public.o4o_closed_pharmacy_write_fence() RETURNS trigger LANGUAGE plpgsql AS $$
  DECLARE organization_key uuid; operation_key text; closed boolean;
  BEGIN
    IF TG_TABLE_SCHEMA='public' AND TG_TABLE_NAME='organizations' THEN
      organization_key := NEW.id;
      IF TG_OP='UPDATE' AND OLD.full_closure_at IS NOT NULL AND
        (NEW.full_closure_at IS DISTINCT FROM OLD.full_closure_at OR NEW."isActive"=true) THEN
        RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='PHARMACY_FULLY_CLOSED';
      END IF;
      closed := NEW.full_closure_at IS NOT NULL;
    ELSE
      organization_key := NULLIF(to_jsonb(NEW)->>TG_ARGV[0],'')::uuid;
      IF organization_key IS NULL THEN RETURN NEW; END IF;
    END IF;
    PERFORM pg_advisory_xact_lock_shared(hashtextextended('store-full-closure:'||organization_key::text,0));
    IF closed OR EXISTS(SELECT 1 FROM public.organizations o WHERE o.id=organization_key AND o.full_closure_at IS NOT NULL) THEN
      operation_key := current_setting('o4o.closure_operation',true);
      IF NOT EXISTS(SELECT 1 FROM public.store_owner_termination_cases c WHERE c.id::text=operation_key
        AND c.organization_id=organization_key AND c.status IN ('terminated','failed')) THEN
        RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='PHARMACY_FULLY_CLOSED';
      END IF;
    END IF;
    RETURN NEW;
  END $$`);
    await q.query(`CREATE TRIGGER store_closure_write_fence BEFORE INSERT OR UPDATE ON public.organizations
    FOR EACH ROW EXECUTE FUNCTION public.o4o_closed_pharmacy_write_fence('id')`);
    for (const row of await q.query(INVENTORY))
      await q.query(`CREATE TRIGGER ${quote("store_closure_write_fence_" + row.column_name)}
    BEFORE INSERT OR UPDATE ON ${quote(row.schema_name)}.${quote(row.table_name)} FOR EACH ROW
    EXECUTE FUNCTION public.o4o_closed_pharmacy_write_fence('${row.column_name}')`);
  }
  async down(q: QueryRunner): Promise<void> {
    const [closed] = await q.query(
      "SELECT EXISTS(SELECT 1 FROM public.organizations WHERE full_closure_at IS NOT NULL) AS present",
    );
    if (closed.present)
      throw new Error("FULL_CLOSURE_ROLLBACK_REVIEW_REQUIRED");
    await q.query(
      "DROP TRIGGER store_closure_write_fence ON public.organizations",
    );
    for (const row of await q.query(INVENTORY))
      await q.query(
        `DROP TRIGGER ${quote("store_closure_write_fence_" + row.column_name)} ON ${quote(row.schema_name)}.${quote(row.table_name)}`,
      );
    await q.query("DROP FUNCTION public.o4o_closed_pharmacy_write_fence()");
    await q.query(
      "ALTER TABLE public.organizations DROP COLUMN full_closure_at",
    );
  }
}
