import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Optional business copies, not Assistant Memory or an order/payment ledger. */
export class CreateAssistantWorkData1793257200000 implements MigrationInterface {
  name = 'CreateAssistantWorkData1793257200000';
  async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE SEQUENCE assistant_work_data_version_seq`);
    await q.query(`CREATE TABLE assistant_work_data_consents (
      owner_key varchar(80) PRIMARY KEY,
      user_id uuid REFERENCES users(id) ON DELETE CASCADE,
      organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
      granted_by uuid REFERENCES users(id) ON DELETE SET NULL,
      epoch uuid NOT NULL DEFAULT gen_random_uuid(), enabled boolean NOT NULL DEFAULT false,
      updated_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT chk_awd_owner CHECK (
        (user_id IS NOT NULL AND organization_id IS NULL AND owner_key='user:'||user_id::text)
        OR (user_id IS NULL AND organization_id IS NOT NULL AND owner_key='organization:'||organization_id::text)
      )
    )`);
    await q.query(`CREATE TABLE assistant_work_data_records (
      owner_key varchar(80) NOT NULL REFERENCES assistant_work_data_consents(owner_key) ON DELETE CASCADE,
      lane varchar(16) NOT NULL CHECK(lane IN ('imported','user')),
      kind varchar(32) NOT NULL, id varchar(64) NOT NULL,
      entry jsonb NOT NULL CHECK(jsonb_typeof(entry)='object'),
      version bigint NOT NULL DEFAULT nextval('assistant_work_data_version_seq'),
      mutation_id varchar(80) NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY(owner_key,lane,kind,id)
    )`);
    await q.query(`CREATE INDEX idx_awd_changes ON assistant_work_data_records(owner_key,version)`);
    await q.query(`CREATE INDEX idx_awd_kind ON assistant_work_data_records(owner_key,kind,id)`);
    await q.query(`CREATE UNIQUE INDEX uq_awd_source ON assistant_work_data_records(owner_key,kind,(entry->'origin'->>'program'),(entry->'origin'->>'source_key')) WHERE lane='imported'`);
    await q.query(`CREATE TABLE assistant_method_sharing_consents (
      user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      enabled boolean NOT NULL DEFAULT false,updated_at timestamptz NOT NULL DEFAULT now()
    )`);
    for(const table of ['assistant_work_data_consents','assistant_work_data_records','assistant_method_sharing_consents']) {
      await q.query(`CREATE TRIGGER account_erasure_write_fence BEFORE INSERT OR UPDATE ON public.${table}
        FOR EACH ROW EXECUTE FUNCTION public.account_erasure_write_fence()`);
    }
    await q.query(`COMMENT ON TABLE assistant_work_data_records IS 'User-permitted business copies for assistance; no credentials, patient records or execution traces. Revocation deletes cloud copies.'`);
  }
  async down(q: QueryRunner): Promise<void> {
    await q.query('LOCK TABLE assistant_work_data_records,assistant_work_data_consents,assistant_method_sharing_consents IN ACCESS EXCLUSIVE MODE');
    for(const table of ['assistant_work_data_records','assistant_work_data_consents','assistant_method_sharing_consents']) {
      if((await q.query(`SELECT 1 FROM ${table} LIMIT 1`)).length)throw new Error('Assistant work copies or consents exist; rollback requires a reviewed data migration.');
    }
    await q.query('DROP TABLE assistant_method_sharing_consents');
    await q.query('DROP TABLE assistant_work_data_records');
    await q.query('DROP TABLE assistant_work_data_consents');
    await q.query('DROP SEQUENCE assistant_work_data_version_seq');
  }
}
