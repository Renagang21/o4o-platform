import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Approved Core WO code/local scope. Production metadata cleanup needs separate execution approval.
 * Contact hashes are not restore UUIDs. Retire all legacy states; preserve UUID markers/audit/evidence.
 */
export class RetireLegacyErasureIdentityHashes1791795139475 implements MigrationInterface {
  name = 'RetireLegacyErasureIdentityHashes1791795139475';
  async up(q:QueryRunner):Promise<void> {
    await q.query("DELETE FROM account_erasure_reference_keys WHERE key_kind='identity'");
    // A restored subject/owned-record UUID is fenced; contact reuse is not a restore.
    await q.query(`CREATE OR REPLACE FUNCTION account_erasure_write_fence() RETURNS trigger LANGUAGE plpgsql AS $$
      DECLARE op_id text; hit uuid;
      BEGIN
        PERFORM pg_advisory_xact_lock_shared(hashtextextended('o4o-account-erasure-writes',0));
        op_id := current_setting('o4o.erasure_operation', true);
        SELECT o.id INTO hit FROM public.account_erasure_operations o
        WHERE EXISTS (SELECT 1 FROM regexp_matches(lower(to_jsonb(NEW)::text),
          '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', 'g') AS r
          WHERE encode(public.digest(r[1], 'sha256'), 'hex') = o.subject_hash OR EXISTS (
            SELECT 1 FROM public.account_erasure_reference_keys k WHERE k.operation_id=o.id AND k.key_kind='uuid'
            AND k.key_hash=encode(public.digest(r[1], 'sha256'), 'hex')))
        AND NOT (o.id::text = COALESCE(op_id,'') AND o.state = 'processing')
        AND (o.expires_at IS NULL OR o.expires_at > now()) LIMIT 1;
        IF hit IS NOT NULL THEN RAISE EXCEPTION USING ERRCODE='P0001', MESSAGE='ACCOUNT_ERASURE_PENDING'; END IF;
        RETURN NEW;
      END $$`);
  }
  async down():Promise<void> {
    // Do not restore deliberately retired contact data or make a personal-data backup.
    throw new Error('Retired identity hashes cannot be restored; reviewed forward repair required');
  }
}
