/** Local synthetic PostgreSQL only; independently owned schema and finally cleanup. */
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import type { DataSource } from 'typeorm';
import type { ProductCorrectionBatch, ProductCorrectionField } from '@o4o/types';
import { ProductCorrectionProposalService } from './proposal.service.js';
import { proposalSchema } from './proposal.contracts.js';
import { batchKey, BATCH_TYPE } from './contracts.js';

const integration = process.env.CORRECTION_TEST_DATABASE_URL ? describe : describe.skip;
integration('수동 변경안 선택 반영 — isolated PostgreSQL', () => {
  let pool: Pool;
  let service: ProductCorrectionProposalService;
  let batch: ProductCorrectionBatch;
  let schemaCreated = false;
  let failAudit = false;
  const schema = `o4o_apply_${randomUUID().replace(/-/g, '')}`;
  const productId = randomUUID(),
    taskId = randomUUID(),
    batchId = randomUUID(),
    actor = randomUUID();
  const descriptionId = randomUUID(),
    otherId = randomUUID();
  beforeAll(async () => {
    const url = new URL(process.env.CORRECTION_TEST_DATABASE_URL!);
    if (!['localhost', '127.0.0.1'].includes(url.hostname) || url.pathname !== '/correction_review')
      throw new Error('Dedicated local correction_review required');
    pool = new Pool({
      connectionString: url.toString(),
      options: `-c search_path=${schema},public`,
      max: 6,
    });
    await pool.query(`CREATE SCHEMA "${schema}"`);
    schemaCreated = true;
    await pool.query(`CREATE TABLE settings (key text PRIMARY KEY,value jsonb NOT NULL,type text,description text,"createdAt" timestamptz DEFAULT now(),"updatedAt" timestamptz DEFAULT now());
      CREATE TABLE product_masters (id uuid PRIMARY KEY,name varchar(255),brand_name varchar(255),specification text,origin_country varchar(100),tags jsonb DEFAULT '[]',status text DEFAULT 'ACTIVE',barcode text,manufacturer_name text,updated_at timestamptz DEFAULT now());
      CREATE TABLE shared_product_descriptions (id uuid PRIMARY KEY,master_id uuid,description_type text,language text,content text,summary text,source_type text,source_ref_id uuid,status text,created_by uuid,updated_by uuid,curated_by uuid,curated_at timestamptz,updated_at timestamptz DEFAULT now(),created_at timestamptz DEFAULT now(),deleted_at timestamptz);
      CREATE UNIQUE INDEX canonical_unique ON shared_product_descriptions(master_id,description_type,COALESCE(language,'ko')) WHERE status='canonical' AND deleted_at IS NULL;`);
    batch = {
      id: batchId,
      revision: 1,
      title: '합성 작업',
      scope: { search: '', page: 1 },
      ruleSnapshot: {
        id: randomUUID(),
        revision: 1,
        title: '수동 확인',
        instructions: '상품 사실과 전문 참고 구분',
        purpose: 'professional',
        regulatoryTypes: [],
        descriptionType: 'STORE',
        language: 'ko',
        cadenceDays: 30,
        enabled: true,
        check: { kind: 'manual' },
        updatedAt: new Date().toISOString(),
        updatedBy: actor,
      },
      items: [
        {
          id: taskId,
          product: { id: productId } as never,
          state: 'pending',
          draft: '',
          notes: '',
          sources: '',
          updatedAt: new Date().toISOString(),
          updatedBy: actor,
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: actor,
    };
    await pool.query('INSERT INTO settings(key,type,value) VALUES($1,$2,$3)', [
      batchKey(batchId),
      BATCH_TYPE,
      batch,
    ]);
    const db = {
      query: async (sql: string, args?: unknown[]) => (await pool.query(sql, args)).rows,
      transaction: async (fn: (db: unknown) => Promise<unknown>) => {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          const result = await fn({
            query: async (sql: string, args?: unknown[]) => {
              if (
                failAudit &&
                sql.startsWith('INSERT INTO settings') &&
                args?.[2] === 'product_correction_proposal_version'
              )
                throw new Error('synthetic audit failure');
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
    service = new ProductCorrectionProposalService(db);
  });
  beforeEach(async () => {
    failAudit = false;
    await pool.query('TRUNCATE product_masters,shared_product_descriptions');
    await pool.query(
      "INSERT INTO product_masters(id,name,brand_name,specification,origin_country,tags,barcode,manufacturer_name) VALUES($1,'원본 상품','원본 브랜드','500mg','KR','[\"원본\"]','SYNTHETIC','합성 제조사')",
      [productId],
    );
    await pool.query(
      "INSERT INTO shared_product_descriptions(id,master_id,description_type,language,content,summary,status) VALUES($1,$2,'STORE','ko','<p>원본</p>','기존 요약','canonical'),($3,$2,'B2B','ko','전문 원본',NULL,'canonical')",
      [descriptionId, productId, otherId],
    );
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
  const input = async (selected: ProductCorrectionField[] = ['name', 'descriptionContent']) => {
    const current = await service.context(batchId, taskId),
      evidenceId = randomUUID();
    return {
      fingerprint: current.fingerprint,
      evidence: [
        {
          id: evidenceId,
          kind: 'product-fact',
          source: '합성 포장 원문',
          checkedOn: '2026-10-24',
          fields: selected,
          status: 'confirmed',
        },
      ],
      changes: selected.map((field) => ({
        field,
        after:
          field === 'descriptionContent'
            ? '<p>보완 설명</p><script>bad()</script>'
            : field === 'tags'
              ? ['보완']
              : '보완 상품',
        reason: '합성 근거와 대조',
        evidenceIds: [evidenceId],
      })),
    };
  };
  const approved = async (fields?: ProductCorrectionField[]) => {
    const proposal = await service.create(batchId, taskId, await input(fields), actor);
    return service.review(
      proposal.id,
      {
        revision: proposal.revision,
        note: '원문 대조 완료',
        decisions: proposal.changes.map((c) => ({
          field: c.field,
          decision: 'approved',
        })),
      },
      actor,
    );
  };
  it('keeps create/review read-only, applies only selected approved fields, and preserves protected fields and other descriptions', async () => {
    const proposal = await approved();
    expect((await pool.query('SELECT name FROM product_masters')).rows[0].name).toBe('원본 상품');
    expect(proposal.changes[1].after).toBe('<p>보완 설명</p>');
    const applied = await service.apply(
      proposal.id,
      { revision: proposal.revision, fields: ['name'] },
      actor,
    );
    expect(applied.appliedFields).toEqual(['name']);
    const row = (await pool.query('SELECT * FROM product_masters')).rows[0];
    expect(row).toMatchObject({
      name: '보완 상품',
      specification: '500mg',
      barcode: 'SYNTHETIC',
      manufacturer_name: '합성 제조사',
    });
    expect(
      (
        await pool.query('SELECT content FROM shared_product_descriptions WHERE id=$1', [
          descriptionId,
        ])
      ).rows[0].content,
    ).toBe('<p>원본</p>');
    expect(await service.versions(proposal.id)).toHaveLength(3);
  });
  it('replaces only the chosen language/type canonical and preserves the previous resource', async () => {
    const proposal = await approved();
    const result = await service.apply(
      proposal.id,
      { revision: proposal.revision, fields: ['descriptionContent', 'name'] },
      actor,
    );
    expect(
      (
        await pool.query('SELECT status FROM shared_product_descriptions WHERE id=$1', [
          descriptionId,
        ])
      ).rows[0].status,
    ).toBe('candidate');
    expect(
      (
        await pool.query('SELECT content,status FROM shared_product_descriptions WHERE id=$1', [
          otherId,
        ])
      ).rows[0],
    ).toEqual({ content: '전문 원본', status: 'canonical' });
    expect(
      (
        await pool.query(
          'SELECT content,status,summary FROM shared_product_descriptions WHERE id=$1',
          [result.resultingDescriptionId],
        )
      ).rows[0],
    ).toEqual({
      content: '<p>보완 설명</p>',
      status: 'canonical',
      summary: '기존 요약',
    });
  });
  it('blocks stale save/apply without rebasing or losing the proposal', async () => {
    const stale = await input();
    await pool.query("UPDATE product_masters SET specification='변경됨' WHERE id=$1", [productId]);
    await expect(service.create(batchId, taskId, stale, actor)).rejects.toMatchObject({
      code: 'PRODUCT_SOURCE_CHANGED',
    });
    const proposal = await approved();
    await pool.query("UPDATE shared_product_descriptions SET content='다른 편집' WHERE id=$1", [
      descriptionId,
    ]);
    await expect(
      service.apply(proposal.id, { revision: proposal.revision, fields: ['name'] }, actor),
    ).rejects.toMatchObject({ code: 'PRODUCT_SOURCE_CHANGED' });
    expect((await service.versions(proposal.id))[0].revision).toBe(proposal.revision);
    expect(await service.attempts(proposal.id)).toEqual([
      expect.objectContaining({ code: 'PRODUCT_SOURCE_CHANGED' }),
    ]);
  });
  it('requires explicit approval and confirmed product-fact evidence for basic fields', async () => {
    const data = await input(['name']);
    data.evidence[0].kind = 'professional-reference';
    const proposal = await service.create(batchId, taskId, data, actor);
    await expect(
      service.apply(proposal.id, { revision: 1, fields: ['name'] }, actor),
    ).rejects.toMatchObject({ code: 'APPROVAL_REQUIRED' });
    await expect(
      service.review(
        proposal.id,
        {
          revision: 1,
          note: '검토',
          decisions: [{ field: 'name', decision: 'approved' }],
        },
        actor,
      ),
    ).rejects.toMatchObject({ code: 'CONFIRMED_EVIDENCE_REQUIRED' });
    const rejected = await service.review(
      proposal.id,
      {
        revision: 1,
        note: '상품 근거 부족',
        decisions: [{ field: 'name', decision: 'rejected' }],
      },
      actor,
    );
    await expect(
      service.apply(proposal.id, { revision: rejected.revision, fields: ['name'] }, actor),
    ).rejects.toMatchObject({ code: 'APPROVAL_REQUIRED' });
  });
  it('serializes identical apply requests idempotently and rejects a different replay selection', async () => {
    const proposal = await approved();
    const request = {
      revision: proposal.revision,
      fields: ['name', 'descriptionContent'],
    };
    const results = await Promise.all([
      service.apply(proposal.id, request, actor),
      service.apply(proposal.id, request, actor),
    ]);
    expect(results[0]).toEqual(results[1]);
    expect(
      (
        await pool.query('SELECT * FROM shared_product_descriptions WHERE master_id=$1', [
          productId,
        ])
      ).rowCount,
    ).toBe(3);
    await expect(
      service.apply(proposal.id, { revision: proposal.revision, fields: ['name'] }, actor),
    ).rejects.toMatchObject({ code: 'ALREADY_APPLIED' });
  });
  it('rolls back product, canonical replacement and status if audit persistence fails, then permits retry', async () => {
    const proposal = await approved();
    failAudit = true;
    await expect(
      service.apply(
        proposal.id,
        { revision: proposal.revision, fields: ['name', 'descriptionContent'] },
        actor,
      ),
    ).rejects.toThrow('synthetic audit failure');
    expect((await pool.query('SELECT name FROM product_masters')).rows[0].name).toBe('원본 상품');
    expect(
      (
        await pool.query('SELECT status FROM shared_product_descriptions WHERE id=$1', [
          descriptionId,
        ])
      ).rows[0].status,
    ).toBe('canonical');
    expect((await service.versions(proposal.id))[0].appliedAt).toBeUndefined();
    expect(await service.attempts(proposal.id)).toEqual([
      expect.objectContaining({ code: 'APPLY_FAILED', actor }),
    ]);
    expect(
      (await service.queue('failed', 1)).items.some((p: { id: string }) => p.id === proposal.id),
    ).toBe(true);
    expect((await pool.query("SELECT * FROM settings WHERE type='product_description_renewal' AND value->>'proposalId'=$1", [proposal.id])).rowCount).toBe(0);
    failAudit = false;
    expect(
      (await service.apply(proposal.id, { revision: proposal.revision, fields: ['name'] }, actor))
        .appliedAt,
    ).toBeDefined();
  });
  it('rejects the second of competing proposals against the same original', async () => {
    const first = await approved(['name']);
    const second = await approved(['tags']);
    const results = await Promise.allSettled([
      service.apply(first.id, { revision: first.revision, fields: ['name'] }, actor),
      service.apply(second.id, { revision: second.revision, fields: ['tags'] }, actor),
    ]);
    expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1);
    const rejected = results.find(r => r.status === 'rejected') as PromiseRejectedResult;
    expect(rejected.reason).toMatchObject({ code: 'PRODUCT_SOURCE_CHANGED' });
  });
  it('creates a first description without modifying a different type canonical', async () => {
    await pool.query('DELETE FROM shared_product_descriptions WHERE id=$1', [descriptionId]);
    const proposal = await approved(['descriptionContent']);
    expect(proposal.baseline.descriptionId).toBeNull();
    const applied = await service.apply(proposal.id, { revision: proposal.revision, fields: ['descriptionContent'] }, actor);
    expect(applied.resultingDescriptionId).toBeDefined();
    expect((await pool.query("SELECT status FROM shared_product_descriptions WHERE id=$1", [otherId])).rows[0].status).toBe('canonical');
  });
  it('checks review revisions, duplicates, empty sanitized HTML, inactive products and protected fields', async () => {
    const proposal = await approved(['tags']);
    await expect(
      service.review(
        proposal.id,
        {
          revision: 1,
          note: '검토',
          decisions: [{ field: 'tags', decision: 'rejected' }],
        },
        actor,
      ),
    ).rejects.toMatchObject({ code: 'PROPOSAL_CHANGED' });
    const data = await input(['name']);
    expect(
      proposalSchema.safeParse({
        ...data,
        changes: [{ ...data.changes[0], field: 'barcode' }],
      }).success,
    ).toBe(false);
    expect(
      proposalSchema.safeParse({
        ...data,
        evidence: [{ ...data.evidence[0], checkedOn: '2026-02-30' }],
      }).success,
    ).toBe(false);
    await expect(
      service.create(
        batchId,
        taskId,
        { ...data, changes: [data.changes[0], data.changes[0]] },
        actor,
      ),
    ).rejects.toMatchObject({ code: 'DUPLICATE_FIELD_OR_EVIDENCE' });
    const html = await input(['descriptionContent']);
    html.changes[0].after = '<script>bad()</script>';
    await expect(service.create(batchId, taskId, html, actor)).rejects.toMatchObject({
      code: 'INVALID_FIELD_VALUE',
    });
    await pool.query("UPDATE product_masters SET status='ARCHIVED' WHERE id=$1", [productId]);
    await expect(
      service.apply(proposal.id, { revision: proposal.revision, fields: ['tags'] }, actor),
    ).rejects.toMatchObject({ code: 'PRODUCT_NOT_ACTIVE' });
  });
});
