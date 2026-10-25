/** Dedicated local PostgreSQL, synthetic products only. Never use a shared database. */
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import type { DataSource } from 'typeorm';
import type { ProductCorrectionProposal, ProductCorrectionRule } from '@o4o/types';
import { ProductCorrectionPeriodicService } from './periodic.service.js';
import { ProductDescriptionRenewalService, enqueueDescriptionRenewals } from './renewal.service.js';
import { ProductCorrectionWorkspace } from './workspace.service.js';
import { bulkKey } from './periodic.contracts.js';
const integration = process.env.CORRECTION_TEST_DATABASE_URL ? describe : describe.skip;
integration('상품 정기 운영 — isolated PostgreSQL', () => {
  const schema = `o4o_periodic_${randomUUID().replace(/-/g, '')}`;
  let pool: Pool,
    db: DataSource,
    service: ProductCorrectionPeriodicService,
    renewals: ProductDescriptionRenewalService,
    workspace: ProductCorrectionWorkspace;
  let schemaCreated = false,
    failPreview = false,
    failRenewal = false,
    failPopulation = false;
  const actor = randomUUID(),
    ids = Array.from({ length: 28 }, () => randomUUID());
  const definition = {
    title: '합성 정기 기준',
    instructions: '출처 확인',
    purpose: 'professional',
    regulatoryTypes: [],
    descriptionType: 'STORE',
    language: 'ko',
    cadenceDays: 30,
    enabled: true,
    check: { kind: 'manual' },
  };
  beforeAll(async () => {
    const url = new URL(process.env.CORRECTION_TEST_DATABASE_URL!);
    if (!['127.0.0.1', 'localhost'].includes(url.hostname) || url.pathname !== '/correction_review')
      throw new Error('Dedicated local correction_review required');
    pool = new Pool({
      connectionString: url.toString(),
      options: `-c search_path=${schema},public`,
      max: 8,
    });
    await pool.query(`CREATE SCHEMA "${schema}"`);
    schemaCreated = true;
    await pool.query(`CREATE TABLE settings (key text PRIMARY KEY,value jsonb NOT NULL,type text,description text,"createdAt" timestamptz DEFAULT now(),"updatedAt" timestamptz DEFAULT now());
      CREATE TABLE product_masters(id uuid PRIMARY KEY,name text,regulatory_type text,manufacturer_name text,specification text,barcode text,status text,updated_at timestamptz DEFAULT now());
      CREATE TABLE shared_product_descriptions(id uuid PRIMARY KEY,master_id uuid,description_type text,language text,status text,content text,summary text,source_type text,source_ref_id uuid,updated_at timestamptz DEFAULT now(),deleted_at timestamptz);`);
    for (const [i, id] of ids.entries())
      await pool.query(
        "INSERT INTO product_masters(id,name,regulatory_type,manufacturer_name,specification,barcode,status) VALUES($1,$2,'건강기능식품','합성 제조사','500mg',$3,'ACTIVE')",
        [id, `상품 ${i.toString().padStart(2, '0')}`, `SYNTHETIC-${i}`],
      );
    await pool.query(
      "INSERT INTO shared_product_descriptions(id,master_id,description_type,language,status,content,summary,source_type) VALUES($1,$2,'STORE','ko','canonical','원문','요약','manual'),($3,$2,'B2B','ko','canonical','전문 원문',NULL,'manual')",
      [randomUUID(), ids[0], randomUUID()],
    );
    db = {
      query: async (sql: string, args?: unknown[]) => (await pool.query(sql, args)).rows,
      transaction: async (fn: (manager: unknown) => Promise<unknown>) => {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          const result = await fn({
            query: async (sql: string, args?: unknown[]) => {
              if (failPopulation && sql.startsWith('SELECT m.id'))
                throw new Error('synthetic population failure');
              if (failPreview && sql.includes('COUNT(*)') && sql.includes('FROM product_masters'))
                throw new Error('synthetic preview failure');
              if (
                failRenewal &&
                sql.startsWith('INSERT INTO settings') &&
                args?.[2] === 'product_description_renewal'
              )
                throw new Error('synthetic renewal failure');
              return (await client.query(sql, args)).rows;
            },
          });
          await client.query('COMMIT');
          return result;
        } catch (e) {
          await client.query('ROLLBACK');
          throw e;
        } finally {
          client.release();
        }
      },
    } as unknown as DataSource;
    service = new ProductCorrectionPeriodicService(db);
    renewals = new ProductDescriptionRenewalService(db);
    workspace = new ProductCorrectionWorkspace(db);
  });
  beforeEach(async () => {
    failPreview = false;
    failRenewal = false;
    failPopulation = false;
    await pool.query('TRUNCATE settings');
    await pool.query("UPDATE product_masters SET status='ACTIVE'");
  });
  afterAll(async () => {
    if (!pool) return;
    try {
      if (schemaCreated) {
        await pool.query(`DROP SCHEMA "${schema}" CASCADE`);
        expect(
          (await pool.query('SELECT 1 FROM pg_namespace WHERE nspname=$1', [schema])).rows,
        ).toHaveLength(0);
      }
    } finally {
      await pool.end();
    }
  });
  const rule = () => workspace.saveRule(definition, actor);
  const create = (r: ProductCorrectionRule) =>
    service.create({ ruleId: r.id, revision: r.revision, search: '' }, actor);
  it('freezes the population, paginates by cursor without duplicates, and creates selectable P1 run results', async () => {
    const r = await rule(),
      job = await create(r);
    expect(job.total).toBe(28);
    await pool.query("UPDATE product_masters SET status='ARCHIVED' WHERE id=$1", [ids[0]]);
    const first = await service.step(job.id);
    const second = await service.step(job.id);
    expect(second).toMatchObject({ cursor: 28, matched: 27, skipped: 1, status: 'completed' });
    expect(first!.cursor).toBe(25);
    const pages = [await service.pages(job.id, 1), await service.pages(job.id, 2)];
    const products = pages.flatMap((p) => p.run!.result!.items);
    expect(new Set(products.map((p) => p.id)).size).toBe(27);
    const product = products[0];
    const batch = await workspace.createBatch(
      {
        title: '결과 선택',
        ruleId: r.id,
        ruleRevision: r.revision,
        scope: { search: '', page: 1 },
        selected: [{ id: product.id, fingerprint: product.fingerprint, runId: product.runId }],
      },
      actor,
    );
    expect(batch.items[0].product.id).toBe(product.id);
    expect((await service.notices()).items.filter((n) => n.kind === 'bulk-completed')).toHaveLength(
      1,
    );
  });
  it('serializes competing workers and prevents duplicated cursor pages', async () => {
    const job = await create(await rule());
    await Promise.all([service.step(job.id), service.step(job.id), service.step(job.id)]);
    let current = await service.job(job.id);
    if (current.status !== 'completed') current = (await service.step(job.id))!;
    expect(current.cursor).toBe(28);
    expect((await service.pages(job.id)).totalPages).toBe(2);
    const rows = await pool.query(
      "SELECT value->>'bulkPage' AS page FROM settings WHERE type='product_correction_run'",
    );
    expect(new Set(rows.rows.map((r) => r.page)).size).toBe(rows.rowCount);
  });
  it('pauses, rejects stale controls, resumes from the same cursor and preserves cancelled results', async () => {
    const job = await create(await rule());
    const first = (await service.step(job.id))!;
    const paused = await service.control(job.id, { revision: first.revision, action: 'pause' });
    expect(await service.step(job.id)).toBeNull();
    await expect(
      service.control(job.id, { revision: job.revision, action: 'resume' }),
    ).rejects.toMatchObject({ code: 'BULK_CHANGED' });
    const resumed = await service.control(job.id, { revision: paused.revision, action: 'resume' });
    const cancelled = await service.control(job.id, {
      revision: resumed.revision,
      action: 'cancel',
    });
    expect(cancelled.cursor).toBe(25);
    expect((await service.pages(job.id, 1)).run!.returnedCount).toBe(25);
    await expect(
      service.control(job.id, { revision: cancelled.revision, action: 'resume' }),
    ).rejects.toMatchObject({ code: 'BULK_TERMINAL' });
  });
  it('rolls back failed pages, retries at most three times and permits explicit manual resume', async () => {
    const job = await create(await rule());
    failPreview = true;
    for (let i = 1; i <= 3; i++) {
      if (i > 1)
        await pool.query(
          "UPDATE settings SET value=jsonb_set(value,'{nextRetryAt}',to_jsonb((NOW()-INTERVAL '1 minute')::text)) WHERE key=$1",
          [bulkKey(job.id)],
        );
      const failed = await service.step(job.id);
      expect(failed).toMatchObject({
        cursor: 0,
        attempts: i,
        status: i === 3 ? 'failed' : 'retry_wait',
      });
    }
    expect((await service.pages(job.id)).totalPages).toBe(0);
    expect(await service.step(job.id)).toBeNull();
    failPreview = false;
    const latest = await service.job(job.id);
    await service.control(job.id, { revision: latest.revision, action: 'resume' });
    expect((await service.step(job.id))!.cursor).toBe(25);
  });
  it('pins old rule versions and refuses to pretend old results use a new rule', async () => {
    const r = await rule(),
      job = await create(r);
    await workspace.saveRule({ ...definition, instructions: '수정 지침' }, actor, r.id, r.revision);
    await service.step(job.id);
    expect((await service.job(job.id)).ruleSnapshot.revision).toBe(1);
    const product = (await service.pages(job.id)).run!.result!.items[0];
    await expect(
      workspace.createBatch(
        {
          title: '선택',
          ruleId: r.id,
          ruleRevision: 1,
          scope: { search: '', page: 1 },
          selected: [{ id: product.id, fingerprint: product.fingerprint, runId: product.runId }],
        },
        actor,
      ),
    ).rejects.toMatchObject({ code: 'RULE_CHANGED' });
  });
  it('starts each due schedule once across workers and coalesces missed Korean-time intervals', async () => {
    const r = await rule(),
      due = new Date(Date.now() + 60000);
    await service.saveSchedule(
      r.id,
      {
        revision: 0,
        enabled: true,
        intervalDays: 1,
        timeZone: 'Asia/Seoul',
        nextDueAt: due.toISOString(),
      },
      actor,
    );
    const future = new Date(due.getTime() + 3 * 86400000 + 1000);
    await Promise.all([service.tick(future), service.tick(future)]);
    expect((await service.jobs()).total).toBe(1);
    const schedule = (await service.schedules()).items[0];
    expect(schedule.missedOccurrences).toBe(3);
    expect(new Date(schedule.nextDueAt).getTime()).toBeGreaterThan(future.getTime());
    expect(
      (await service.notices()).items.filter((n) => n.kind === 'schedule-delayed'),
    ).toHaveLength(1);
    const reservation = await pool.query(
      "SELECT * FROM settings WHERE type='product_correction_occurrence'",
    );
    expect(reservation.rowCount).toBe(1);
  });
  it('does not start another occurrence while the prior execution is paused', async () => {
    const r = await rule(),
      due = new Date(Date.now() + 60000);
    await service.saveSchedule(
      r.id,
      {
        revision: 0,
        enabled: true,
        intervalDays: 1,
        timeZone: 'Asia/Seoul',
        nextDueAt: due.toISOString(),
      },
      actor,
    );
    // Prevent tick from finishing the small synthetic job, then pause its retry-wait state.
    failPreview = true;
    await service.tick(due);
    failPreview = false;
    const job = (await service.jobs()).items[0];
    await service.control(job.id, { revision: job.revision, action: 'pause' });
    await service.tick(new Date(due.getTime() + 2 * 86400000));
    expect((await service.jobs()).total).toBe(1);
    expect((await service.job(job.id)).status).toBe('paused');
  });
  it('exposes schedule errors, permits disabling, and acknowledges notices without completing work', async () => {
    const r = await rule(),
      due = new Date(Date.now() + 60000);
    const schedule = await service.saveSchedule(
      r.id,
      {
        revision: 0,
        enabled: true,
        intervalDays: 1,
        timeZone: 'Asia/Seoul',
        nextDueAt: due.toISOString(),
      },
      actor,
    );
    await expect(
      service.saveSchedule(
        r.id,
        {
          revision: 0,
          enabled: false,
          intervalDays: 1,
          timeZone: 'Asia/Seoul',
          nextDueAt: due.toISOString(),
        },
        actor,
      ),
    ).rejects.toMatchObject({ code: 'SCHEDULE_CHANGED' });
    await service.saveSchedule(
      r.id,
      {
        revision: schedule.revision,
        enabled: false,
        intervalDays: 1,
        timeZone: 'Asia/Seoul',
        nextDueAt: due.toISOString(),
      },
      actor,
    );
    await service.tick(due);
    expect((await service.jobs()).total).toBe(0);
    const job = await create(r);
    while ((await service.job(job.id)).status !== 'completed') await service.step(job.id);
    const n = (await service.notices()).items[0];
    await service.acknowledge(n.id);
    await service.acknowledge(n.id);
    expect((await service.job(job.id)).status).toBe('completed');
    expect(
      (await service.notices()).items.find((v) => v.id === n.id)!.acknowledgedAt,
    ).toBeDefined();
  });
  it('enqueues related type/language renewals atomically, keeps QR separate, and guards review source changes', async () => {
    const r = await rule(),
      proposal = {
        id: randomUUID(),
        productId: ids[0],
        batchId: randomUUID(),
        taskId: randomUUID(),
        ruleSnapshot: r,
        appliedFields: ['specification'],
        baseline: { values: { name: '원본 상품' } },
        changes: [{ field: 'name', after: '선택하지 않은 이름' }],
      } as ProductCorrectionProposal;
    await db.transaction((manager) => enqueueDescriptionRenewals(manager, proposal));
    const list = await renewals.list('open');
    expect(list.total).toBe(2);
    expect(list.items.every((v) => v.productName === '원본 상품')).toBe(true);
    const detail = await renewals.detail(list.items[0].id);
    const updated = await renewals.update(
      detail.record.id,
      {
        revision: 1,
        fingerprint: detail.fingerprint,
        state: 'done',
        purposes: ['professional', 'consumer-qr'],
        notes: '원문 확인, 내용 변경 불필요',
      },
      actor,
    );
    expect(updated.state).toBe('done');
    expect((await renewals.list('open')).total).toBe(1);
    await expect(
      renewals.update(
        detail.record.id,
        {
          revision: 1,
          fingerprint: detail.fingerprint,
          state: 'excluded',
          purposes: ['professional'],
          notes: '기록',
        },
        actor,
      ),
    ).rejects.toMatchObject({ code: 'RENEWAL_CHANGED' });
    const stale = await renewals.detail(list.items[1].id);
    await pool.query("UPDATE product_masters SET specification='변경된 규격' WHERE id=$1", [
      ids[0],
    ]);
    await expect(
      renewals.update(
        stale.record.id,
        {
          revision: 1,
          fingerprint: stale.fingerprint,
          state: 'done',
          purposes: ['professional'],
          notes: '검토',
        },
        actor,
      ),
    ).rejects.toMatchObject({ code: 'PRODUCT_SOURCE_CHANGED' });
    failRenewal = true;
    const failedId = randomUUID();
    await expect(
      db.transaction((manager) =>
        enqueueDescriptionRenewals(manager, { ...proposal, id: failedId }),
      ),
    ).rejects.toThrow('synthetic renewal failure');
    expect(
      (await pool.query("SELECT * FROM settings WHERE value->>'proposalId'=$1", [failedId]))
        .rowCount,
    ).toBe(0);
  });
  it('rejects oversized populations without silently truncating or leaving partial jobs', async () => {
    const r = await rule();
    try {
      await pool.query(
        "INSERT INTO product_masters(id,name,regulatory_type,status) SELECT md5('periodic-cap-'||g)::uuid,'oversize-'||g,'건강기능식품','ACTIVE' FROM generate_series(1,50001) g",
      );
      await expect(
        service.create({ ruleId: r.id, revision: r.revision, search: 'oversize-' }, actor),
      ).rejects.toMatchObject({ code: 'BULK_SCOPE_TOO_LARGE' });
      expect((await service.jobs()).total).toBe(0);
      expect(
        (await pool.query("SELECT * FROM settings WHERE type='product_correction_population'"))
          .rowCount,
      ).toBe(0);
    } finally {
      await pool.query("DELETE FROM product_masters WHERE name LIKE 'oversize-%'");
    }
  });
  it('records failed reservation starts and retries the unclaimed occurrence after backoff', async () => {
    const r = await rule(),
      due = new Date(Date.now() + 60000);
    await service.saveSchedule(
      r.id,
      {
        revision: 0,
        enabled: true,
        intervalDays: 1,
        timeZone: 'Asia/Seoul',
        nextDueAt: due.toISOString(),
      },
      actor,
    );
    failPopulation = true;
    await service.tick(due);
    expect((await service.schedule(r.id))!.errorCode).toBe('SCHEDULE_START_FAILED');
    expect((await service.jobs()).total).toBe(0);
    expect(
      (await pool.query("SELECT * FROM settings WHERE type='product_correction_occurrence'"))
        .rowCount,
    ).toBe(0);
    failPopulation = false;
    await service.tick(new Date(due.getTime() + 6 * 60000));
    expect((await service.jobs()).total).toBe(1);
    expect((await service.schedule(r.id))!.errorCode).toBeUndefined();
  });
  it('never mutates product originals when preparing, running, scheduling or acknowledging', async () => {
    const before = JSON.stringify(
      (await pool.query('SELECT * FROM product_masters ORDER BY id')).rows,
    );
    await pool.query(`CREATE FUNCTION forbid_writes() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN RAISE EXCEPTION 'forbidden product write'; END;$$;
      CREATE TRIGGER no_product_writes BEFORE INSERT OR UPDATE OR DELETE ON product_masters FOR EACH ROW EXECUTE FUNCTION forbid_writes();
      CREATE TRIGGER no_description_writes BEFORE INSERT OR UPDATE OR DELETE ON shared_product_descriptions FOR EACH ROW EXECUTE FUNCTION forbid_writes();`);
    try {
      const r = await rule(),
        job = await create(r);
      await service.tick();
      expect((await service.job(job.id)).status).toBe('completed');
      expect(
        JSON.stringify((await pool.query('SELECT * FROM product_masters ORDER BY id')).rows),
      ).toBe(before);
    } finally {
      await pool.query(
        'DROP TRIGGER no_product_writes ON product_masters; DROP TRIGGER no_description_writes ON shared_product_descriptions; DROP FUNCTION forbid_writes()',
      );
    }
  });
});
