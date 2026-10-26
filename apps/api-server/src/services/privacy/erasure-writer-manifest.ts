/** Same conservative table boundary in preflight and the final erasure scan. */
export const ERASURE_WRITER_GAPS_SQL = `SELECT c.oid FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE c.relkind='r' AND n.nspname IN ('public','neture','cosmetics')
  AND c.relname NOT IN ('o4o_schema_baselines','typeorm_migrations') AND c.relname NOT LIKE 'account_erasure_%'
  AND NOT EXISTS(SELECT 1 FROM pg_trigger tr WHERE tr.tgrelid=c.oid
    AND tr.tgname='account_erasure_write_fence' AND tr.tgenabled='O'
    AND tr.tgfoid=to_regproc('public.account_erasure_write_fence'))`;
