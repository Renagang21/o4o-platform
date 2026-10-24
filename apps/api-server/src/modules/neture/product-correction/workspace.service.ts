import { randomUUID } from 'node:crypto';
import type { DataSource, EntityManager } from 'typeorm';
import type {
  ProductCorrectionBatch,
  ProductCorrectionBatchSummary,
  ProductCorrectionRule,
  ProductCorrectionScope,
} from '@o4o/types';
import {
  batchKey,
  batchSchema,
  BATCH_TYPE,
  CorrectionError,
  parseRule,
  previewSchema,
  ruleKey,
  RULE_TYPE,
  taskSchema,
  versionKey,
  VERSION_TYPE,
} from './contracts.js';
import { preview } from './preview.js';

type Db = Pick<DataSource | EntityManager, 'query'>;
/** Only this namespace of settings is writable. No product, description, identifier or candidate mutations. */
async function read<T>(db: Db, key: string, type: string, lock = false): Promise<T> {
  const rows = await db.query(
    `SELECT value FROM settings WHERE key=$1 AND type=$2${lock ? ' FOR UPDATE' : ''}`,
    [key, type],
  );
  if (!rows[0]) throw new CorrectionError('NOT_FOUND', 404);
  return rows[0].value as T;
}
async function insert(db: Db, key: string, type: string, value: unknown) {
  await db.query('INSERT INTO settings(key,value,type,description) VALUES($1,$2::jsonb,$3,$4)', [
    key,
    JSON.stringify(value),
    type,
    '상품 보정 기준·작업 기록 (원본 적용 없음)',
  ]);
}
async function replace(db: Db, key: string, type: string, value: unknown) {
  await db.query('UPDATE settings SET value=$1::jsonb,"updatedAt"=NOW() WHERE key=$2 AND type=$3', [
    JSON.stringify(value),
    key,
    type,
  ]);
}
export class ProductCorrectionWorkspace {
  constructor(private db: DataSource) {}
  async rules(): Promise<ProductCorrectionRule[]> {
    const rows = await this.db.query(
      "SELECT value FROM settings WHERE type=$1 AND key LIKE $2 ORDER BY value->>'updatedAt' DESC,key",
      [RULE_TYPE, 'product-correction:rule:%'],
    );
    return rows.map((r: { value: ProductCorrectionRule; ProductCorrectionScope }) => r.value);
  }
  rule(id: string, db: Db = this.db, lock = false) {
    return read<ProductCorrectionRule>(db, ruleKey(id), RULE_TYPE, lock);
  }
  async saveRule(input: unknown, actorId: string, id?: string, expectedRevision?: number) {
    const definition = parseRule(input);
    return this.db.transaction(async (db) => {
      const existing = id ? await this.rule(id, db, true) : null;
      if (existing && existing.revision !== expectedRevision) throw new CorrectionError('RULE_CHANGED', 409);
      const rule: ProductCorrectionRule = {
        ...definition,
        id: id ?? randomUUID(),
        revision: (existing?.revision ?? 0) + 1,
        updatedAt: new Date().toISOString(),
        updatedBy: actorId,
      };
      if (existing) await replace(db, ruleKey(rule.id), RULE_TYPE, rule);
      else await insert(db, ruleKey(rule.id), RULE_TYPE, rule);
      await insert(db, versionKey(rule.id, rule.revision), VERSION_TYPE, rule);
      return rule;
    });
  }
  async versions(id: string) {
    await this.rule(id);
    const rows = await this.db.query(
      "SELECT value FROM settings WHERE type=$1 AND key LIKE $2 ORDER BY (value->>'revision')::int DESC",
      [VERSION_TYPE, `product-correction:version:${id}:%`],
    );
    return rows.map((r: { value: ProductCorrectionRule; ProductCorrectionScope }) => r.value);
  }
  async preview(id: string, scope: unknown) {
    return preview(this.db, await this.rule(id), previewSchema.parse(scope) as ProductCorrectionScope);
  }
  async batches(page = 1) {
    const total = await this.db.query(
      'SELECT COUNT(*)::int AS total FROM settings WHERE type=$1 AND key LIKE $2',
      [BATCH_TYPE, 'product-correction:batch:%'],
    );
    const rows = await this.db.query(
      `SELECT value->>'id' AS id,value->>'title' AS title,
      value->'ruleSnapshot'->>'id' AS "ruleId",(value->'ruleSnapshot'->>'revision')::int AS "ruleRevision",
      value->>'createdAt' AS "createdAt",value->>'updatedAt' AS "updatedAt",jsonb_array_length(value->'items') AS "itemCount"
      FROM settings WHERE type=$1 AND key LIKE $2 ORDER BY value->>'createdAt' DESC,key LIMIT 10 OFFSET $3`,
      [BATCH_TYPE, 'product-correction:batch:%', (page - 1) * 10],
    );
    return {
      items: rows as ProductCorrectionBatchSummary[],
      total: total[0].total as number,
      page,
      pageSize: 10,
    };
  }
  batch(id: string, db: Db = this.db, lock = false) {
    return read<ProductCorrectionBatch>(db, batchKey(id), BATCH_TYPE, lock);
  }
  async createBatch(input: unknown, actorId: string) {
    const data = batchSchema.parse(input);
    const scope = data.scope as ProductCorrectionScope;
    if (new Set(data.selected.map((p) => p.id)).size !== data.selected.length)
      throw new CorrectionError('DUPLICATE_PRODUCT');
    return this.db.transaction(async (db) => {
      const rule = await this.rule(data.ruleId, db, true);
      if (rule.revision !== data.ruleRevision) throw new CorrectionError('RULE_CHANGED', 409);
      const matches = await preview(
        db,
        rule,
        scope,
        data.selected.map((p) => p.id),
      );
      if (
        matches.items.length !== data.selected.length ||
        matches.items.some((p) => data.selected.find((s) => s.id === p.id)?.fingerprint !== p.fingerprint)
      ) {
        throw new CorrectionError('PRODUCT_SOURCE_CHANGED', 409);
      }
      const now = new Date().toISOString();
      const batch: ProductCorrectionBatch = {
        id: randomUUID(),
        revision: 1,
        title: data.title,
        ruleSnapshot: rule,
        scope,
        createdBy: actorId,
        createdAt: now,
        updatedAt: now,
        items: matches.items.map((product) => ({
          id: randomUUID(),
          product,
          state: 'pending',
          draft: '',
          notes: '',
          sources: '',
          updatedAt: now,
          updatedBy: actorId,
        })),
      };
      await insert(db, batchKey(batch.id), BATCH_TYPE, batch);
      return batch;
    });
  }
  async saveTask(batchId: string, taskId: string, input: unknown, actorId: string) {
    const data = taskSchema.parse(input);
    return this.db.transaction(async (db) => {
      const batch = await this.batch(batchId, db, true);
      if (batch.revision !== data.revision) throw new CorrectionError('BATCH_CHANGED', 409);
      const item = batch.items.find((i) => i.id === taskId);
      if (!item) throw new CorrectionError('TASK_NOT_FOUND', 404);
      const now = new Date().toISOString();
      Object.assign(item, {
        state: data.state,
        draft: data.draft,
        notes: data.notes,
        sources: data.sources,
        updatedBy: actorId,
        updatedAt: now,
      });
      batch.revision++;
      batch.updatedAt = now;
      await replace(db, batchKey(batchId), BATCH_TYPE, batch);
      return batch;
    });
  }
}
