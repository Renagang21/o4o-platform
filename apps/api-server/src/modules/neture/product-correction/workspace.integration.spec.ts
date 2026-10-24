/** Synthetic PostgreSQL only. Run with CORRECTION_TEST_DATABASE_URL; never point at a shared database. */
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import type { DataSource } from 'typeorm';
import { ProductCorrectionWorkspace } from './workspace.service.js';
import { ProductCorrectionOperationsService } from './operations.service.js';
import { parseRule } from './contracts.js';

const integration = process.env.CORRECTION_TEST_DATABASE_URL ? describe : describe.skip;
integration('상품 보정 작업 공간 — isolated PostgreSQL', () => {
  let pool: Pool;
  let service: ProductCorrectionWorkspace;
  let operations: ProductCorrectionOperationsService;
  let failPreview = false;
  let pausePreview: (() => Promise<void>) | null = null;
  const ids = Array.from({ length: 28 }, () => randomUUID());
  const definition = {
    title: '정기 확인',
    instructions: '수치와 기준량의 연결 근거를 확인한다.',
    purpose: 'ai-support',
    regulatoryTypes: [],
    descriptionType: 'STORE',
    language: 'ko',
    cadenceDays: 30,
    enabled: true,
    check: { kind: 'manual' },
  };
  let before: string;
  const snapshot = async () =>
    JSON.stringify(
      (
        await pool.query(
          `SELECT (SELECT jsonb_agg(t ORDER BY id) FROM product_masters t) AS products,(SELECT jsonb_agg(t ORDER BY id) FROM shared_product_descriptions t) AS descriptions`,
        )
      ).rows,
    );
  beforeAll(async () => {
    const url = new URL(process.env.CORRECTION_TEST_DATABASE_URL!);
    if (!['127.0.0.1', 'localhost'].includes(url.hostname) || url.pathname !== '/correction_review')
      throw new Error('Only the dedicated local correction_review database is allowed');
    pool = new Pool({ connectionString: url.toString() });
    await pool.query(`CREATE TABLE settings(key varchar(100) PRIMARY KEY,value jsonb,type varchar(50),description text,"createdAt" timestamp DEFAULT NOW(),"updatedAt" timestamp DEFAULT NOW());
      CREATE TABLE product_masters(id uuid PRIMARY KEY,name text,status text,regulatory_type text,manufacturer_name text,specification text,barcode text);
      CREATE TABLE shared_product_descriptions(id uuid PRIMARY KEY,master_id uuid,content text,updated_at timestamptz,source_type text,source_ref_id text,description_type text,language text,status text,deleted_at timestamptz);`);
    for (let i = 0; i < ids.length; i++) {
      await pool.query('INSERT INTO product_masters VALUES($1,$2,$3,$4,$5,$6,$7)', [
        ids[i],
        `상품${String(i).padStart(2, '0')}`,
        i === 27 ? 'ARCHIVED' : 'ACTIVE',
        i < 2 ? 'DRUG' : 'GENERAL',
        i === 0 ? null : '제조사',
        '500mg',
        null,
      ]);
      if (i !== 1)
        await pool.query(
          `INSERT INTO shared_product_descriptions VALUES($1,$2,$3,NOW()-INTERVAL '100 days','official','source-id','STORE','ko','canonical',NULL)`,
          [randomUUID(), ids[i], i === 0 ? '125μg / 600mg 100% 검토' : '일반 안내'],
        );
    }
    await pool.query(
      `INSERT INTO shared_product_descriptions SELECT $1,master_id,content,updated_at,source_type,source_ref_id,'B2B',language,status,deleted_at FROM shared_product_descriptions WHERE master_id=$2`,
      [randomUUID(), ids[0]],
    );
    before = await snapshot();
    // Any accidental product mutation fails the transaction, even when values would be unchanged.
    await pool.query(`CREATE FUNCTION forbid_product_write() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'product write forbidden'; END $$;
      CREATE TRIGGER immutable_products BEFORE INSERT OR UPDATE OR DELETE ON product_masters FOR EACH STATEMENT EXECUTE FUNCTION forbid_product_write();
      CREATE TRIGGER immutable_descriptions BEFORE INSERT OR UPDATE OR DELETE ON shared_product_descriptions FOR EACH STATEMENT EXECUTE FUNCTION forbid_product_write();`);
    const db = {
      query: async (sql: string, args?: unknown[]) => (await pool.query(sql, args)).rows,
      transaction: async (fn: (manager: unknown) => Promise<unknown>) => {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          const result = await fn({
            query: async (sql: string, args?: unknown[]) => {
              if (pausePreview && sql.includes('FROM product_masters')) {
                const pause = pausePreview;
                pausePreview = null;
                await pause();
              }
              if (failPreview && sql.includes('FROM product_masters')) {
                failPreview = false;
                throw new Error('synthetic query failure');
              }
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
    service = new ProductCorrectionWorkspace(db);
    operations = new ProductCorrectionOperationsService(db);
  });
  afterAll(async () => {
    if (pool) {
      expect(await snapshot()).toBe(before);
      await pool.end();
    }
  });

  it('paginates active candidates and filters literal text, groups and missing fields', async () => {
    const rule = await service.saveRule(definition, 'admin');
    expect((await service.preview(rule.id, { search: '', page: 1 })).items).toHaveLength(25);
    const second = await service.preview(rule.id, { search: '', page: 2 });
    expect(second.total).toBe(27);
    expect(second.items).toHaveLength(2);
    for (const [check, count] of [
      [{ kind: 'missing_field', field: 'manufacturer_name' }, 1],
      [{ kind: 'missing_description' }, 1],
      [{ kind: 'stale_description', days: 30 }, 26],
      [{ kind: 'copied_b2b' }, 1],
      [{ kind: 'text', terms: ['100%'], match: 'all' }, 1],
      [{ kind: 'text', terms: ['100%', 'absent'], match: 'all' }, 0],
    ] as const) {
      const saved = await service.saveRule({ ...definition, check }, 'admin');
      expect((await service.preview(saved.id, { search: '', page: 1 })).total).toBe(count);
    }
    const drug = await service.saveRule({ ...definition, regulatoryTypes: ['DRUG'] }, 'admin');
    expect((await service.preview(drug.id, { search: '', page: 1 })).total).toBe(2);
    expect((await service.preview(rule.id, { search: "' OR true --", page: 1 })).total).toBe(0);
    expect((await service.preview(rule.id, { search: '%', page: 1 })).total).toBe(0);
  });
  it('preserves rule versions and serializes concurrent edits', async () => {
    const rule = await service.saveRule(definition, 'admin');
    const results = await Promise.allSettled([
      service.saveRule({ ...definition, instructions: '새 기준 A' }, 'admin', rule.id, 1),
      service.saveRule({ ...definition, instructions: '새 기준 B' }, 'admin', rule.id, 1),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect((results.find((r) => r.status === 'rejected') as PromiseRejectedResult).reason.code).toBe(
      'RULE_CHANGED',
    );
    const versions = await service.versions(rule.id);
    expect(versions.map((v) => v.revision)).toEqual([2, 1]);
    expect(versions[1].instructions).toBe(definition.instructions);
  });
  it('snapshots selected products and criteria; saves drafts only; rejects stale writes', async () => {
    const rule = await service.saveRule(definition, 'admin');
    const matches = await service.preview(rule.id, { search: '', page: 1 });
    const input = {
      title: '10월 정기 점검',
      ruleId: rule.id,
      ruleRevision: 1,
      scope: { search: '', page: 1 },
      selected: matches.items.slice(0, 2).map((p) => ({ id: p.id, fingerprint: p.fingerprint })),
    };
    await expect(
      service.createBatch(
        { ...input, selected: [{ ...input.selected[0], fingerprint: '0'.repeat(64) }] },
        'admin',
      ),
    ).rejects.toMatchObject({ code: 'PRODUCT_SOURCE_CHANGED' });
    await expect(
      service.createBatch({ ...input, selected: [input.selected[0], input.selected[0]] }, 'admin'),
    ).rejects.toMatchObject({ code: 'DUPLICATE_PRODUCT' });
    const batch = await service.createBatch(input, 'admin');
    expect(batch.items).toHaveLength(2);
    await service.saveRule({ ...definition, instructions: '차기 지침' }, 'admin', rule.id, 1);
    expect((await service.batch(batch.id)).ruleSnapshot.instructions).toBe(definition.instructions);
    await expect(service.createBatch(input, 'admin')).rejects.toMatchObject({ code: 'RULE_CHANGED' });
    await expect(
      service.saveTask(
        batch.id,
        batch.items[0].id,
        { revision: 1, state: 'review_ready', draft: '초안', notes: '', sources: '' },
        'admin',
      ),
    ).rejects.toThrow();
    const saved = await service.saveTask(
      batch.id,
      batch.items[0].id,
      {
        revision: 1,
        state: 'review_ready',
        draft: '보완 초안',
        notes: '수치 기준 확인 필요',
        sources: '검토용 자료',
      },
      'admin',
    );
    expect(saved.revision).toBe(2);
    expect((await service.batch(batch.id)).items[0].draft).toBe('보완 초안');
    await expect(
      service.saveTask(
        batch.id,
        batch.items[0].id,
        { revision: 1, state: 'pending', draft: '', notes: '', sources: '' },
        'admin',
      ),
    ).rejects.toMatchObject({ code: 'BATCH_CHANGED' });
    expect((await service.batches()).items.some((b) => b.id === batch.id)).toBe(true);
    expect(await snapshot()).toBe(before);
  });
  it('rejects executable/unknown conditions and disabled rules', async () => {
    expect(() =>
      parseRule({
        ...definition,
        check: { kind: 'missing_field', field: 'name); DELETE FROM product_masters;' },
      }),
    ).toThrow();
    expect(() => parseRule({ ...definition, check: { kind: 'text', terms: [], match: 'any' } })).toThrow();
    const rule = await service.saveRule({ ...definition, enabled: false }, 'admin');
    await expect(service.preview(rule.id, { search: '', page: 1 })).rejects.toMatchObject({
      code: 'RULE_DISABLED',
    });
  });
  it('records page inspection, preserves failures, and retries only the failed scope', async () => {
    const rule = await service.saveRule(definition, 'admin');
    const run = await operations.execute(rule.id, { revision: 1, scope: { search: '', page: 2 } }, 'admin');
    expect(run.status).toBe('completed');
    expect(run.totalCandidates).toBe(27);
    expect(run.returnedCount).toBe(2);
    expect(run.result!.items.every((p) => p.runId === run.id)).toBe(true);
    expect((await operations.runs()).items[0]).not.toHaveProperty('result');
    failPreview = true;
    const failed = await operations.execute(
      rule.id,
      { revision: 1, scope: { search: '商品', page: 1 } },
      'admin',
    );
    expect(failed.status).toBe('failed');
    expect(failed.totalCandidates).toBeNull();
    expect(failed.errorCode).toBe('CHECK_FAILED');
    const retried = await operations.retry(failed.id, 'admin');
    expect(retried.status).toBe('completed');
    expect(retried.scope).toEqual(failed.scope);
    expect(retried.retryOf).toBe(failed.id);
    expect((await operations.run(failed.id)).status).toBe('failed');
    await expect(operations.retry(run.id, 'admin')).rejects.toMatchObject({ code: 'RUN_NOT_FAILED' });
    const interruptedId = randomUUID();
    await pool.query('INSERT INTO settings(key,value,type) VALUES($1,$2::jsonb,$3)', [
      'product-correction:run:' + interruptedId,
      JSON.stringify({
        ...run,
        id: interruptedId,
        status: 'running',
        result: undefined,
        startedAt: '2000-01-01T00:00:00.000Z',
        finishedAt: null,
      }),
      'product_correction_run',
    ]);
    expect((await operations.retry(interruptedId, 'admin')).status).toBe('completed');
    expect((await operations.run(interruptedId)).errorCode).toBe('INTERRUPTED');

    await service.saveRule({ ...definition, instructions: 'new version' }, 'admin', rule.id, 1);
    await expect(operations.retry(failed.id, 'admin')).rejects.toMatchObject({ code: 'RULE_CHANGED' });
  });
  it('serializes concurrent selections and connects existing tasks instead of duplicating them', async () => {
    const rule = await service.saveRule(definition, 'admin');
    const run = await operations.execute(rule.id, { revision: 1, scope: { search: '', page: 1 } }, 'admin');
    const selected = run
      .result!.items.slice(0, 2)
      .map((p) => ({ id: p.id, fingerprint: p.fingerprint, runId: run.id }));
    const input = {
      title: 'duplicate selection',
      ruleId: rule.id,
      ruleRevision: 1,
      scope: { search: '', page: 1 },
      selected,
    };
    const result = await Promise.all([
      service.createBatch(input, 'admin'),
      service.createBatch(input, 'admin'),
    ]);
    expect(result[0].id).toBe(result[1].id);
    expect(result.map((b) => b.selectionResult!.createdCount).sort()).toEqual([0, 2]);
    expect(result.find((b) => b.selectionResult!.createdCount === 0)!.selectionResult!.reused).toHaveLength(
      2,
    );
    const forged = {
      ...input,
      selected: [
        {
          ...selected[0],
          runId: (
            await operations.execute(rule.id, { revision: 1, scope: { search: 'absent', page: 1 } }, 'admin')
          ).id,
        },
      ],
    };
    await expect(service.createBatch(forged, 'admin')).rejects.toMatchObject({
      code: 'INVALID_RUN_SELECTION',
    });
    const mixed = await service.createBatch(
      {
        ...input,
        selected: [
          selected[0],
          { id: run.result!.items[2].id, fingerprint: run.result!.items[2].fingerprint, runId: run.id },
        ],
      },
      'admin',
    );
    expect(mixed.items).toHaveLength(1);
    expect(mixed.selectionResult!.reused).toHaveLength(1);
  });
  it('records verified outcomes, dates, history and latest-work operations without product writes', async () => {
    const rule = await service.saveRule(definition, 'admin');
    const page = await service.preview(rule.id, { search: '', page: 1 });
    const input = {
      title: 'periodic operations',
      ruleId: rule.id,
      ruleRevision: 1,
      scope: { search: '', page: 1 },
      selected: page.items.slice(0, 2).map((p) => ({ id: p.id, fingerprint: p.fingerprint })),
    };
    let batch = await service.createBatch(input, 'admin');
    const taskId = batch.items[0].id;
    await expect(
      service.saveTask(
        batch.id,
        taskId,
        { revision: 1, state: 'no_change', draft: '', notes: 'confirmed', sources: '' },
        'admin',
      ),
    ).rejects.toThrow();
    batch = await service.saveTask(
      batch.id,
      taskId,
      {
        revision: 1,
        state: 'no_change',
        draft: '',
        notes: 'confirmed source',
        sources: 'official reference',
      },
      'admin',
    );
    const reviewed = batch.items[0];
    expect(new Date(reviewed.nextReviewAt!).getTime() - new Date(reviewed.reviewedAt!).getTime()).toBe(
      30 * 86400000,
    );
    const same = await service.saveTask(
      batch.id,
      taskId,
      {
        revision: 2,
        state: 'no_change',
        draft: '',
        notes: 'confirmed source',
        sources: 'official reference',
      },
      'admin',
    );
    expect(same.revision).toBe(2);
    expect(same.items[0].reviewedAt).toBe(reviewed.reviewedAt);
    expect((await service.createBatch(input, 'admin')).selectionResult!.createdCount).toBe(0);
    const other = batch.items[1].id;
    await expect(
      service.saveTask(
        batch.id,
        other,
        {
          revision: 2,
          state: 'needs_source',
          draft: '',
          notes: 'waiting',
          sources: '',
          followUpAt: '2000-01-01T00:00:00.000Z',
        },
        'admin',
      ),
    ).rejects.toMatchObject({ code: 'FOLLOWUP_MUST_BE_FUTURE' });
    batch = await service.saveTask(
      batch.id,
      other,
      {
        revision: 2,
        state: 'needs_source',
        draft: '',
        notes: 'waiting on source',
        sources: '',
        followUpAt: new Date(Date.now() + 86400000).toISOString(),
      },
      'admin',
    );
    expect(batch.items[1].reviewedAt).toBeNull();
    expect(batch.items[1].nextReviewAt).toBeNull();
    const history = await operations.taskVersions(batch.id, taskId);
    expect(history.map((v) => v.batchRevision)).toEqual([2, 1]);
    expect(history[1].task.state).toBe('pending');
    // Advance only synthetic workflow metadata to test due filters; original product triggers remain active.
    await pool.query(
      `UPDATE settings SET value=jsonb_set(jsonb_set(value,'{items,0,nextReviewAt}','"2000-01-01T00:00:00.000Z"'),'{items,1,followUpAt}','"2000-01-01T00:00:00.000Z"') WHERE key=$1`,
      ['product-correction:batch:' + batch.id],
    );
    expect((await operations.operations('due')).items.some((i) => i.taskId === taskId)).toBe(true);
    expect((await operations.operations('followup')).items.some((i) => i.taskId === other)).toBe(true);
    const renewed = await service.createBatch({ ...input, selected: [input.selected[0]] }, 'admin');
    expect(renewed.selectionResult!.createdCount).toBe(1);
    expect((await operations.operations('due')).items.some((i) => i.taskId === taskId)).toBe(false);
    await service.saveTask(
      batch.id,
      taskId,
      {
        revision: batch.revision,
        state: 'no_change',
        draft: '',
        notes: '과거 작업 메모 보완',
        sources: '공식 원문',
      },
      'admin',
    );
    expect((await operations.operations('open')).items.some((i) => i.taskId === renewed.items[0].id)).toBe(
      true,
    );
    expect((await service.createBatch({ ...input, selected: [input.selected[0]] }, 'admin')).id).toBe(
      renewed.id,
    );

    await service.saveRule({ ...definition, instructions: 'updated criterion' }, 'admin', rule.id, 1);
    const outdated = await operations.operations('outdated');
    expect(outdated.items.some((i) => i.ruleId === rule.id)).toBe(true);
    expect((await service.batch(batch.id)).ruleSnapshot.revision).toBe(1);
    expect(await snapshot()).toBe(before);
  });
  it('does not let a late inspection worker overwrite recovered interruption history', async () => {
    const rule = await service.saveRule(definition, 'admin');
    let release!: () => void;
    let entered!: () => void;
    const started = new Promise<void>((resolve) => {
      entered = resolve;
    });
    const barrier = new Promise<void>((resolve) => {
      release = resolve;
    });
    pausePreview = async () => {
      entered();
      await barrier;
    };
    const pending = operations.execute(rule.id, { revision: 1, scope: { search: '', page: 1 } }, 'admin');
    await started;
    const row = (
      await pool.query(
        `SELECT key,value FROM settings WHERE type='product_correction_run' AND value->'ruleSnapshot'->>'id'=$1`,
        [rule.id],
      )
    ).rows[0];
    await pool.query(
      `UPDATE settings SET value=jsonb_set(value,'{startedAt}','"2000-01-01T00:00:00.000Z"') WHERE key=$1`,
      [row.key],
    );
    try {
      const retry = await operations.retry(row.value.id, 'admin');
      expect(retry.status).toBe('completed');
    } finally {
      release();
    }
    expect((await pending).status).toBe('failed');
    expect((await operations.run(row.value.id)).errorCode).toBe('INTERRUPTED');
  });
});
