import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import { recordEnrollmentApplication, recordEnrollmentPolicies } from '../service-enrollment-policy.service.js';
import { computePolicyContentHash } from '../policy-acceptance.service.js';
const port = Number(process.env.O4O_SIGNUP_TEST_PORT);
const integration = Number.isInteger(port) && port > 1024 && ![5432, 5442].includes(port) ? describe : describe.skip;
integration('application policy atomicity (owned loopback PostgreSQL)', () => {
  let ds: DataSource; let userId: string; let docId: string; let privacyId: string;
  beforeAll(async () => {
    ds = new DataSource({ type: 'postgres', host: '127.0.0.1', port, username: 'o4o_fixture', database: 'o4o_policy_evidence_test', entities: [], synchronize: false });
    await ds.initialize();
    await ds.query(`CREATE TABLE IF NOT EXISTS users(id uuid PRIMARY KEY);
      CREATE TABLE IF NOT EXISTS service_policy_documents(id uuid PRIMARY KEY,service_key text,document_type text,version int,title text,content text,slug text,status text,published_at timestamptz DEFAULT now());
      CREATE TABLE IF NOT EXISTS user_policy_acceptances(id uuid DEFAULT gen_random_uuid() PRIMARY KEY,user_id uuid REFERENCES users(id),service_key text,policy_document_id uuid REFERENCES service_policy_documents(id),document_type text,version int,content_hash char(64),acceptance_kind text,accepted_at timestamptz DEFAULT now(),UNIQUE(user_id,service_key,policy_document_id));
      CREATE TABLE IF NOT EXISTS action_logs(id uuid DEFAULT gen_random_uuid() PRIMARY KEY,service_key text,user_id uuid,action_key text,source text,status text,meta jsonb);
      CREATE TABLE IF NOT EXISTS fixture_applications(id uuid PRIMARY KEY,user_id uuid REFERENCES users(id))`);
    await ds.query('ALTER TABLE service_policy_documents ADD COLUMN IF NOT EXISTS slug text');
  });
  beforeEach(async () => {
    userId = randomUUID(); docId = randomUUID(); privacyId = randomUUID();
    await ds.query('INSERT INTO users(id) VALUES($1)', [userId]);
    await ds.query("INSERT INTO service_policy_documents(id,service_key,document_type,version,title,content,slug,status) VALUES($1,'supplier','terms',2,'Supplier application terms','Exact application body','supplier-service-terms','published')", [docId]);
    await ds.query("INSERT INTO service_policy_documents(id,service_key,document_type,version,title,content,slug,status) VALUES($1,'supplier','privacy',2,'Privacy application notice','Exact privacy body','supplier-service-privacy','published')", [privacyId]);
  });
  afterEach(async () => {
    for (const table of ['action_logs', 'fixture_applications', 'user_policy_acceptances', 'service_policy_documents', 'users']) await ds.query(`DELETE FROM ${table}`);
  });
  afterAll(async () => { if (ds?.isInitialized) await ds.destroy(); });
  async function apply(service = 'supplier') {
    return ds.transaction(async m => {
      const id = randomUUID();
      const policies = await recordEnrollmentPolicies(m, userId, service, [{ policyDocumentId: docId, version: 2, documentType: 'terms' }, { policyDocumentId: privacyId, version: 2, documentType: 'privacy' }]);
      await m.query('INSERT INTO fixture_applications(id,user_id) VALUES($1,$2)', [id, userId]);
      await recordEnrollmentApplication(m, userId, service, { type: 'fixture_application', id, resourceId: 'fixture-resource' }, policies);
      return id;
    });
  }
  it.each(['supplier', 'community', 'funding', 'kpa-society', 'lecture'])('%s preserves exact agreement and a separate application association', async service => {
    await ds.query("UPDATE service_policy_documents SET service_key=$1,slug=$1||'-service-'||document_type", [service]);
    const id = await apply(service);
    expect(await ds.query('SELECT service_key,version,content_hash,acceptance_kind FROM user_policy_acceptances')).toEqual(expect.arrayContaining([{ service_key: service, version: 2, content_hash: computePolicyContentHash('Exact application body'), acceptance_kind: 'agreement' }, { service_key: service, version: 2, content_hash: computePolicyContentHash('Exact privacy body'), acceptance_kind: 'acknowledgement' }]));
    expect((await ds.query('SELECT meta FROM action_logs'))[0].meta).toMatchObject({ application: { id, resourceId: 'fixture-resource' }, policies: expect.arrayContaining([expect.objectContaining({ policyDocumentId: docId, version: 2 })]) });
  });
  it('rolls policy evidence and application back together when the application write fails', async () => {
    await expect(ds.transaction(async m => {
      await recordEnrollmentPolicies(m, userId, 'supplier', [{ policyDocumentId: docId, version: 2, documentType: 'terms' }, { policyDocumentId: privacyId, version: 2, documentType: 'privacy' }]);
      await m.query('INSERT INTO fixture_applications(id,user_id) VALUES($1,$2)', [randomUUID(), randomUUID()]);
    })).rejects.toThrow();
    expect(await ds.query('SELECT * FROM user_policy_acceptances')).toHaveLength(0);
    expect(await ds.query('SELECT * FROM fixture_applications')).toHaveLength(0);
  });
  it('waits for concurrent publication, rejects the stale form and leaves no partial application', async () => {
    const publisher = ds.createQueryRunner(); await publisher.connect(); await publisher.startTransaction();
    try {
      await publisher.query('SELECT pg_advisory_xact_lock(hashtext($1))', ['service-policy:supplier']);
      const result = apply().then(() => ({ success: true }), error => ({ code: error.code }));
      let blocked = false;
      for (let i = 0; i < 100; i++) {
        blocked = (await publisher.query("SELECT 1 FROM pg_locks WHERE locktype='advisory' AND NOT granted")).length > 0;
        if (blocked) break;
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      expect(blocked).toBe(true);
      await publisher.query("UPDATE service_policy_documents SET status='draft'");
      await publisher.query("INSERT INTO service_policy_documents(id,service_key,document_type,version,title,content,slug,status) VALUES($1,'supplier','terms',3,'New application terms','New body','supplier-service-terms','published')", [randomUUID()]);
      await publisher.query("INSERT INTO service_policy_documents(id,service_key,document_type,version,title,content,slug,status) VALUES($1,'supplier','privacy',3,'New privacy','New privacy body','supplier-service-privacy','published')", [randomUUID()]);
      await publisher.commitTransaction();
      expect(await result).toEqual({ code: 'POLICY_VERSION_MISMATCH' });
      expect(await ds.query('SELECT * FROM user_policy_acceptances')).toHaveLength(0);
      expect(await ds.query('SELECT * FROM fixture_applications')).toHaveLength(0);
      expect(await ds.query('SELECT * FROM action_logs')).toHaveLength(0);
    } finally { if (publisher.isTransactionActive) await publisher.rollbackTransaction(); await publisher.release(); }
  });
  it('rejects a partially published service set without writing the application or any evidence', async () => {
    await ds.query("UPDATE service_policy_documents SET status='draft' WHERE document_type='privacy'");
    await expect(apply()).rejects.toHaveProperty('code', 'POLICY_UNAVAILABLE');
    for (const table of ['user_policy_acceptances', 'fixture_applications', 'action_logs']) expect(await ds.query(`SELECT * FROM ${table}`)).toHaveLength(0);
  });
  it('keeps separate append-only snapshots when the same application is retried', async () => {
    const id = await apply();
    for (const conditions of ['first reviewed conditions', 'second reviewed conditions']) {
      await ds.transaction(async m => {
        const policies = await recordEnrollmentPolicies(m, userId, 'supplier', [{ policyDocumentId: docId, version: 2, documentType: 'terms' }, { policyDocumentId: privacyId, version: 2, documentType: 'privacy' }]);
        await recordEnrollmentApplication(m, userId, 'supplier', { type: 'fixture_application', id, conditions: { content: conditions } }, policies);
      });
    }
    const logs = await ds.query('SELECT meta FROM action_logs ORDER BY id');
    expect(logs).toHaveLength(3);
    expect(logs.map((row: any) => row.meta.application.conditions?.content).filter(Boolean).sort()).toEqual(['first reviewed conditions', 'second reviewed conditions']);
    expect(await ds.query('SELECT * FROM user_policy_acceptances')).toHaveLength(2);
  });

});
