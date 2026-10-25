import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import { Pool } from 'pg';
import { ProductCorrectionPeriodicService } from './periodic.service.js';
import { ProductCorrectionWorkspace } from './workspace.service.js';
import { ProductCorrectionProposalService } from './proposal.service.js';
import { ProductCorrectionProductWorkspace } from './product-workspace.service.js';
import { runCorrectionWorker } from './worker-runner.js';

const integration = process.env.CORRECTION_TEST_DATABASE_URL ? describe : describe.skip;
integration('정기 운영 완성 — actual PostgreSQL, synthetic 50,000 products', () => {
  const schema = `o4o_recurring_${randomUUID().replace(/-/g, '')}`;
  const actor = randomUUID();
  let pool: Pool, db: DataSource, periodic: ProductCorrectionPeriodicService, workspace: ProductCorrectionWorkspace;
  let created = false;
  const definition = { title: '합성 기준', instructions: '원문 근거 확인', purpose: 'professional', regulatoryTypes: [],
    descriptionType: 'STORE', language: 'ko', cadenceDays: 30, enabled: true, check: { kind: 'manual' } };
  const productId = async (n = 1) => (await db.query('SELECT md5($1)::uuid AS id', [`product-${n}`]))[0].id as string;
  beforeAll(async () => {
    const url = new URL(process.env.CORRECTION_TEST_DATABASE_URL!);
    if (!['127.0.0.1', 'localhost'].includes(url.hostname) || url.pathname !== '/correction_review')
      throw Error('Dedicated local correction_review required');
    pool = new Pool({ connectionString: url.toString() });
    await pool.query(`CREATE SCHEMA "${schema}"`); created = true;
    db = new DataSource({ type: 'postgres', url: url.toString(), entities: [], synchronize: false,
      migrationsRun: false, installExtensions: false, extra: { max: 8, options: `-c search_path=${schema},public` } });
    await db.initialize();
    await db.query(`CREATE TABLE settings(key varchar(100) PRIMARY KEY,type varchar(50),value jsonb NOT NULL,description text,"createdAt" timestamptz DEFAULT now(),"updatedAt" timestamptz DEFAULT now());
      CREATE TABLE product_masters(id uuid PRIMARY KEY,name text,barcode text,manufacturer_name text,specification text,regulatory_type text,status text,brand_name text,origin_country text,tags jsonb DEFAULT '[]',updated_at timestamptz DEFAULT now());
      CREATE TABLE shared_product_descriptions(id uuid PRIMARY KEY,master_id uuid,description_type text,language text,status text,content text,summary text,source_type text,source_ref_id uuid,updated_at timestamptz DEFAULT now(),deleted_at timestamptz);
      INSERT INTO product_masters(id,name,barcode,manufacturer_name,specification,regulatory_type,status)
        SELECT md5('product-'||n)::uuid,'합성'||lpad(n::text,6,'0'),'SYNTHETIC-'||n,'합성 제조사','500mg','GENERAL','ACTIVE' FROM generate_series(1,50000) n;
      CREATE FUNCTION forbid_product_write() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic source must stay unchanged'; END $$;
      CREATE TRIGGER source_unchanged BEFORE UPDATE OR DELETE ON product_masters FOR EACH ROW EXECUTE FUNCTION forbid_product_write();
      CREATE TRIGGER description_unchanged BEFORE UPDATE OR DELETE ON shared_product_descriptions FOR EACH ROW EXECUTE FUNCTION forbid_product_write();`);
    periodic = new ProductCorrectionPeriodicService(db);
    workspace = new ProductCorrectionWorkspace(db);
  }, 30000);
  afterAll(async () => {
    if (db?.isInitialized) await db.destroy();
    if (created) await pool.query(`DROP SCHEMA "${schema}" CASCADE`);
    await pool?.end();
  });
  beforeEach(async () => { await db.query('TRUNCATE settings'); });
  it('provides product-scoped source, evidence, tasks and renewal links with stable pagination and no writes', async () => {
    const id = await productId(), otherId = await productId(2);
    await db.query(`INSERT INTO shared_product_descriptions(id,master_id,description_type,language,status,content,summary,source_type)
      VALUES($1,$2,'STORE','ko','canonical',$3,'요약','manual')`, [randomUUID(), id, '가'.repeat(20001)]);
    const rule = await workspace.saveRule(definition, actor);
    const preview = await workspace.preview(rule.id, { search: '합성000001', page: 1 });
    const batch = await workspace.createBatch({ title: '검토', ruleId: rule.id, ruleRevision: rule.revision,
      scope: { search: '합성000001', page: 1 }, selected: preview.items.map(p => ({ id: p.id, fingerprint: p.fingerprint })) }, actor);
    const evidenceId = randomUUID();
    const task = batch.items[0], proposals = new ProductCorrectionProposalService(db);
    const context = await proposals.context(batch.id, task.id);
    const proposal = await proposals.create(batch.id, task.id, { fingerprint: context.fingerprint,
      evidence: [{ id: evidenceId, kind: 'product-fact', source: '합성 포장', checkedOn: '2026-10-25', status: 'confirmed', fields: ['name'] }],
      changes: [{ field: 'name', after: '수정 제안', reason: '근거 확인', evidenceIds: [evidenceId] }] }, actor);
    const hub = new ProductCorrectionProductWorkspace(db);
    expect((await hub.detail(id, 'descriptions', 1)).items[0]).toMatchObject({ truncated: true, sourceType: 'manual', content: '가'.repeat(20000) });
    expect((await hub.detail(id, 'tasks', 1)).items[0].href).toContain(`task=${task.id}`);
    expect((await hub.detail(id, 'proposals', 1)).items[0]).toMatchObject({ id: proposal.id, evidence: [{ source: '합성 포장' }] });
    expect((await hub.detail(otherId, 'proposals', 1)).total).toBe(0);
    for (let n = 0; n < 12; n++) await db.query("INSERT INTO settings(key,type,value) VALUES($1,'product_description_renewal',$2)",
      [`synthetic-renewal-${n}`, JSON.stringify({ id: `renewal:${n}`, productId: id, descriptionType: 'STORE', language: 'ko', state: 'pending', purposes: [], notes: '', updatedAt: new Date(n * 1000).toISOString() })]);
    const page1 = await hub.detail(id, 'renewals', 1), page2 = await hub.detail(id, 'renewals', 2);
    expect(page1).toMatchObject({ total: 12, pageSize: 10 });
    expect(page2.items).toHaveLength(2);
    expect(new Set([...page1.items, ...page2.items].map(i => i.id)).size).toBe(12);
    expect(page1.items[0].href).toContain('renewal=renewal%3A11');
    expect((await db.query('SELECT name FROM product_masters WHERE id=$1', [id]))[0].name).toBe('합성000001');
  });
  it('coordinates server/job processes using a database lock and leaves a busy invocation untouched', async () => {
    const guard = db.createQueryRunner(); await guard.connect(); await guard.startTransaction();
    try {
      await guard.query('SELECT pg_advisory_xact_lock(825104,1)');
      expect(await periodic.tick(new Date(), 'job')).toMatchObject({ status: 'busy', pagesProcessed: 0 });
      expect(await db.query("SELECT 1 FROM settings WHERE type='product_correction_worker'")).toHaveLength(0);
    } finally { await guard.rollbackTransaction(); await guard.release(); }
    await periodic.tick(new Date(), 'job');
    expect((await periodic.dashboard()).worker).toMatchObject({ source: 'job', lastErrorCode: null });
  });
  it('records an interrupted tick and resumes the committed cursor in a fresh service without duplicates', async () => {
    const rule = await workspace.saveRule(definition, actor);
    const job = await periodic.create({ ruleId: rule.id, revision: rule.revision, search: '합성000001' }, actor);
    const original = periodic.step.bind(periodic);
    const step = jest.spyOn(periodic, 'step').mockImplementationOnce(async () => { await original(); throw Error('synthetic interruption'); });
    try { await expect(periodic.tick()).rejects.toThrow('synthetic interruption'); } finally { step.mockRestore(); }
    expect((await periodic.job(job.id)).cursor).toBe(1);
    expect((await periodic.dashboard()).worker).toMatchObject({ lastErrorCode: 'WORKER_TICK_FAILED' });
    await new ProductCorrectionPeriodicService(db).tick(new Date(), 'job');
    expect((await periodic.dashboard()).worker).toMatchObject({ source: 'job', lastErrorCode: null });
    expect((await db.query("SELECT count(*)::int AS total FROM settings WHERE type='product_correction_run'"))[0].total).toBe(1);
  });
  it('drains 50,000 synthetic products through bounded ticks, preserving every source and unique result', async () => {
    const rule = await workspace.saveRule(definition, actor);
    const before = (await db.query("SELECT md5(string_agg(id::text||name||barcode,',' ORDER BY id)) AS digest FROM product_masters"))[0].digest;
    const start = Date.now();
    const job = await periodic.create({ ruleId: rule.id, revision: rule.revision, search: '합성' }, actor);
    expect(job.total).toBe(50000);
    const result = await runCorrectionWorker(periodic, { maxTicks: 510, maxSeconds: 540 });
    const complete = await periodic.job(job.id);
    expect(complete).toMatchObject({ status: 'completed', cursor: 50000, matched: 50000, skipped: 0 });
    expect(result.pagesProcessed).toBe(2000);
    const rows = await db.query(`SELECT count(*)::int AS total,count(DISTINCT p->>'id')::int AS distinct_products
      FROM settings r CROSS JOIN LATERAL jsonb_array_elements(r.value->'result'->'items') p WHERE r.type='product_correction_run'`);
    expect(rows[0]).toEqual({ total: 50000, distinct_products: 50000 });
    expect((await db.query("SELECT md5(string_agg(id::text||name||barcode,',' ORDER BY id)) AS digest FROM product_masters"))[0].digest).toBe(before);
    console.log('PRODUCT_RECURRING_SYNTHETIC_LOAD', JSON.stringify({ products: 50000, pages: 2000, durationMs: Date.now() - start }));
  }, 600000);
});
