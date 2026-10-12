import type { MigrationInterface, QueryRunner } from 'typeorm';

/** CORE_CHANGE_REQUIRED — WO-O4O-TWO-STAGE-ACCOUNT-ERASURE-CORE-V1, code/local approval 2026-10-12.
 * Production migration/apply is a separate approval. No account data is deleted by this migration.
 */
export class CreateAccountErasureOperations1791777540800 implements MigrationInterface {
  name = 'CreateAccountErasureOperations1791777540800';
  async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE TABLE account_erasure_operations (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), subject_id uuid UNIQUE,
      subject_hash varchar(64) NOT NULL UNIQUE, requested_by_key uuid NOT NULL,
      state varchar(24) NOT NULL DEFAULT 'pending' CHECK (state IN ('pending','processing','review_required','retry_required','completed')),
      review_codes jsonb NOT NULL DEFAULT '[]', error_code varchar(64),
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
      review_due_at timestamptz NOT NULL DEFAULT now() + interval '24 hours',
      completed_at timestamptz, expires_at timestamptz,
      CHECK ((state = 'completed' AND subject_id IS NULL AND completed_at IS NOT NULL AND expires_at IS NOT NULL)
        OR (state <> 'completed' AND subject_id IS NOT NULL AND completed_at IS NULL AND expires_at IS NULL))
    )`);
    await q.query(`CREATE TABLE account_erasure_file_tasks (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), operation_id uuid NOT NULL REFERENCES account_erasure_operations(id) ON DELETE CASCADE,
      object_hash varchar(64) NOT NULL, bucket text, object_path text, generation text,
      state varchar(24) NOT NULL DEFAULT 'pending' CHECK (state IN ('pending','deleted','already_absent','retry_required')),
      error_code varchar(64), attempts integer NOT NULL DEFAULT 0,
      updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(operation_id,object_hash),
      CHECK ((state IN ('deleted','already_absent') AND bucket IS NULL AND object_path IS NULL AND generation IS NULL)
        OR (state IN ('pending','retry_required') AND bucket IS NOT NULL AND object_path IS NOT NULL))
    )`);
    await q.query(`CREATE TABLE account_erasure_reference_keys (
      operation_id uuid NOT NULL REFERENCES account_erasure_operations(id) ON DELETE CASCADE,
      reference_id uuid, key_hash varchar(64) NOT NULL, PRIMARY KEY(operation_id,key_hash)
    )`);
    await q.query(`CREATE TABLE account_erasure_community_evidence (
      source_event_id uuid PRIMARY KEY, community_id uuid NOT NULL,
      subject_key uuid NOT NULL, actor_key uuid,
      action varchar(32) NOT NULL CHECK (action IN ('role','approve','reject','suspend','restore','withdraw','create','migration')),
      before_role varchar(16), after_role varchar(16) NOT NULL,
      before_status varchar(16), after_status varchar(16) NOT NULL,
      occurred_at timestamptz NOT NULL, expires_at timestamptz NOT NULL,
      retention_years smallint NOT NULL CHECK (retention_years IN (1,2)),
      policy_basis varchar(100) NOT NULL,
      hold_basis varchar(100), hold_owner_key uuid, hold_until timestamptz,
      hold_end_event varchar(40) CHECK (hold_end_event IN ('dispute_closed','statutory_obligation_ended')),
      hold_review_at timestamptz, hold_ended_at timestamptz,
      CHECK (expires_at > occurred_at),
      CHECK ((hold_basis IS NULL AND hold_owner_key IS NULL AND hold_until IS NULL AND hold_end_event IS NULL AND hold_review_at IS NULL AND hold_ended_at IS NULL)
        OR (hold_basis IS NOT NULL AND hold_owner_key IS NOT NULL AND hold_review_at IS NOT NULL
          AND (hold_until IS NOT NULL OR hold_end_event IS NOT NULL)))
    )`);
    await q.query('CREATE INDEX idx_account_erasure_evidence_expiry ON account_erasure_community_evidence(expires_at)');
    await q.query(`CREATE TABLE account_erasure_audit_events (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), operation_id uuid NOT NULL,
      subject_hash varchar(64) NOT NULL, actor_key uuid NOT NULL,
      action varchar(16) NOT NULL CHECK (action IN ('requested','completed')),
      occurred_at timestamptz NOT NULL, expires_at timestamptz NOT NULL,
      retention_years smallint NOT NULL CHECK (retention_years IN (1,2)), policy_basis varchar(100) NOT NULL,
      UNIQUE(operation_id,action), CHECK(expires_at>occurred_at)
    )`);
    await q.query('CREATE INDEX idx_account_erasure_audit_expiry ON account_erasure_audit_events(expires_at)');
    // Independent evidence has no user/membership/community FK, no names or free-text reason.
    // Database fence covers UUID references in structured and JSON writers already in flight.
    // Only the locked worker's own operation can bypass its own subject fence.
    await q.query(`CREATE FUNCTION account_erasure_write_fence() RETURNS trigger LANGUAGE plpgsql AS $$
      DECLARE op_id text; hit uuid;
      BEGIN
        -- Existing writers finish before the erasure manifest's exclusive barrier.
        PERFORM pg_advisory_xact_lock_shared(hashtextextended('o4o-account-erasure-writes',0));
        op_id := current_setting('o4o.erasure_operation', true);
        SELECT o.id INTO hit FROM public.account_erasure_operations o
        WHERE EXISTS (SELECT 1 FROM regexp_matches(lower(to_jsonb(NEW)::text),
          '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', 'g') AS r
          WHERE encode(public.digest(r[1], 'sha256'), 'hex') = o.subject_hash OR EXISTS (
            SELECT 1 FROM public.account_erasure_reference_keys k WHERE k.operation_id=o.id
            AND k.key_hash=encode(public.digest(r[1], 'sha256'), 'hex')))
        AND NOT (o.id::text = COALESCE(op_id,'') AND o.state = 'processing')
        AND (o.expires_at IS NULL OR o.expires_at > now()) LIMIT 1;
        IF hit IS NOT NULL THEN RAISE EXCEPTION USING ERRCODE='P0001', MESSAGE='ACCOUNT_ERASURE_PENDING'; END IF;
        RETURN NEW;
      END $$`);
    const tables: Array<{ schema_name: string; table_name: string }> = await q.query(`
      SELECT n.nspname AS schema_name,c.relname AS table_name FROM pg_class c
      JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE c.relkind='r' AND n.nspname IN ('public','neture','cosmetics')
      AND c.relname NOT IN ('o4o_schema_baselines','typeorm_migrations')
      AND c.relname NOT LIKE 'account_erasure_%' ORDER BY n.nspname,c.relname`);
    for (const t of tables) {
      const quote = (s: string) => '"' + s.replace(/"/g, '""') + '"';
      await q.query(`CREATE TRIGGER account_erasure_write_fence BEFORE INSERT OR UPDATE ON ${quote(t.schema_name)}.${quote(t.table_name)}
        FOR EACH ROW EXECUTE FUNCTION account_erasure_write_fence()`);
    }
  }
  async down(q: QueryRunner): Promise<void> {
    const [r] = await q.query('SELECT EXISTS(SELECT 1 FROM account_erasure_operations) OR EXISTS(SELECT 1 FROM account_erasure_community_evidence) OR EXISTS(SELECT 1 FROM account_erasure_audit_events) AS in_use');
    if (r.in_use) throw new Error('Account erasure is in use; reviewed forward repair required');
    await q.query('DROP FUNCTION account_erasure_write_fence() CASCADE');
    await q.query('DROP TABLE account_erasure_file_tasks, account_erasure_reference_keys, account_erasure_community_evidence, account_erasure_audit_events, account_erasure_operations');
  }
}
