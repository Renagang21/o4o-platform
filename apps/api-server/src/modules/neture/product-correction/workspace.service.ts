import { randomUUID } from 'node:crypto';
import type { DataSource } from 'typeorm';
import type {
  ProductCorrectionBatch,
  ProductCorrectionBatchSummary,
  ProductCorrectionBatchResult,
  ProductCorrectionRun,
  ProductCorrectionTask,
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
  CLOSED_STATES,
  runKey,
  RUN_TYPE,
  taskVersionKey,
  TASK_VERSION_TYPE,
} from './contracts.js';
import { preview } from './preview.js';

import { read, insert, replace, type Db } from './records.js';
export class ProductCorrectionWorkspace {
  constructor(private db: DataSource) {}
  async rules(): Promise<ProductCorrectionRule[]> {
    const rows = await this.db.query(
      "SELECT value FROM settings WHERE type=$1 AND key LIKE $2 ORDER BY value->>'updatedAt' DESC,key",
      [RULE_TYPE, 'product-correction:rule:%'],
    );
    return rows.map((r: { value: ProductCorrectionRule }) => r.value);
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
    return rows.map((r: { value: ProductCorrectionRule }) => r.value);
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
      for (const selected of data.selected) {
        if (!selected.runId) continue; // compatibility with the original read-only preview client
        const run = await read<ProductCorrectionRun>(db, runKey(selected.runId), RUN_TYPE);
        if (
          run.status !== 'completed' ||
          run.ruleSnapshot.id !== rule.id ||
          run.ruleSnapshot.revision !== rule.revision ||
          run.scope.search !== scope.search ||
          !run.result?.items.some((p) => p.id === selected.id && p.fingerprint === selected.fingerprint)
        )
          throw new CorrectionError('INVALID_RUN_SELECTION', 409);
      }
      const reused: NonNullable<ProductCorrectionBatchResult['selectionResult']>['reused'] = [];
      const fresh = [] as typeof matches.items;
      for (const product of matches.items) {
        const existing = await db.query(
          `SELECT b.value->>'id' AS "batchId",t->>'id' AS "taskId",t->'product'->>'name' AS "productName"
          FROM settings b CROSS JOIN LATERAL jsonb_array_elements(b.value->'items') t
          WHERE b.type=$1 AND b.key LIKE 'product-correction:batch:%' AND b.value->'ruleSnapshot'->>'id'=$2
            AND (b.value->'ruleSnapshot'->>'revision')::int=$3 AND t->'product'->>'id'=$4 AND t->'product'->>'fingerprint'=$5
            AND (t->>'state' NOT IN ('no_change','reviewed','excluded') OR NULLIF(t->>'nextReviewAt','')::timestamptz>NOW())
          ORDER BY (t->>'state' NOT IN ('no_change','reviewed','excluded')) DESC,b."createdAt" DESC,t->>'updatedAt' DESC,b.key LIMIT 1`,
          [BATCH_TYPE, rule.id, rule.revision, product.id, product.fingerprint],
        );
        if (existing[0]) reused.push(existing[0]);
        else
          fresh.push({
            ...product,
            ...(data.selected.find((p) => p.id === product.id)?.runId
              ? { runId: data.selected.find((p) => p.id === product.id)!.runId }
              : {}),
          });
      }
      if (!fresh.length)
        return {
          ...(await this.batch(reused[0].batchId, db)),
          selectionResult: { createdCount: 0, reused },
        } as ProductCorrectionBatchResult;
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
        items: fresh.map((product) => ({
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
      return {
        ...batch,
        selectionResult: { createdCount: fresh.length, reused },
      } as ProductCorrectionBatchResult;
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
      const followUpAt = ['needs_source', 'deferred'].includes(data.state) ? (data.followUpAt ?? null) : null;
      if (followUpAt && new Date(followUpAt).getTime() <= Date.now())
        throw new CorrectionError('FOLLOWUP_MUST_BE_FUTURE');
      const unchanged =
        item.state === data.state &&
        item.draft === data.draft &&
        item.notes === data.notes &&
        item.sources === data.sources &&
        (item.followUpAt ?? null) === followUpAt;
      if (unchanged) return batch;
      // Preserve the previous saved version, including legacy records on their first edit.
      const previousKey = taskVersionKey(item.id, batch.revision);
      await db.query(
        `INSERT INTO settings(key,value,type,description) VALUES($1,$2::jsonb,$3,$4) ON CONFLICT(key) DO NOTHING`,
        [
          previousKey,
          JSON.stringify({ batchId, batchRevision: batch.revision, task: item }),
          TASK_VERSION_TYPE,
          '상품 검토 기록 이력',
        ],
      );
      const closed = CLOSED_STATES.includes(data.state);
      Object.assign(item, {
        state: data.state,
        draft: data.draft,
        notes: data.notes,
        sources: data.sources,
        updatedBy: actorId,
        updatedAt: now,
        followUpAt,
        reviewedAt: closed ? now : null,
        nextReviewAt: closed
          ? new Date(new Date(now).getTime() + batch.ruleSnapshot.cadenceDays * 86400000).toISOString()
          : null,
      } satisfies Partial<ProductCorrectionTask>);
      batch.revision++;
      batch.updatedAt = now;
      await replace(db, batchKey(batchId), BATCH_TYPE, batch);
      await insert(db, taskVersionKey(item.id, batch.revision), TASK_VERSION_TYPE, {
        batchId,
        batchRevision: batch.revision,
        task: item,
      });
      return batch;
    });
  }
}
