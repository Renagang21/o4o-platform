/** Synthetic PostgreSQL only. Run with CORRECTION_TEST_DATABASE_URL; never point at a shared database. */
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import type { DataSource } from 'typeorm';
import { ProductCorrectionWorkspace } from './workspace.service.js';
import { parseRule } from './contracts.js';

const integration = process.env.CORRECTION_TEST_DATABASE_URL ? describe : describe.skip;
integration('상품 보정 작업 공간 — isolated PostgreSQL', () => {
  let pool: Pool;
  let service: ProductCorrectionWorkspace;
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
            query: async (sql: string, args?: unknown[]) => (await client.query(sql, args)).rows,
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
});
