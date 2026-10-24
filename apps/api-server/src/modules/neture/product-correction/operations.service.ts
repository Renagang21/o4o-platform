import { randomUUID } from 'node:crypto';
import type { DataSource } from 'typeorm';
import type {
  ProductCorrectionRun,
  ProductCorrectionRunSummary,
  ProductCorrectionRule,
  ProductCorrectionScope,
  ProductCorrectionOperationFilter,
  ProductCorrectionOperations,
  ProductCorrectionTaskVersion,
} from '@o4o/types';
import { z } from 'zod';
import { preview } from './preview.js';
import { read, insert, replace } from './records.js';
import {
  CorrectionError,
  ruleKey,
  RULE_TYPE,
  runKey,
  RUN_TYPE,
  BATCH_TYPE,
  TASK_VERSION_TYPE,
  previewSchema,
} from './contracts.js';

const inputSchema = z.object({ revision: z.number().int().positive(), scope: previewSchema }).strict();
export class ProductCorrectionOperationsService {
  constructor(private db: DataSource) {}
  async execute(
    ruleId: string,
    input: unknown,
    actorId: string,
    retryOf?: string,
  ): Promise<ProductCorrectionRun> {
    const data = inputSchema.parse(input);
    const rule = await read<ProductCorrectionRule>(this.db, ruleKey(ruleId), RULE_TYPE);
    if (rule.revision !== data.revision) throw new CorrectionError('RULE_CHANGED', 409);
    if (!rule.enabled) throw new CorrectionError('RULE_DISABLED', 409);
    const record: ProductCorrectionRun = {
      id: randomUUID(),
      ruleSnapshot: rule,
      scope: data.scope as ProductCorrectionScope,
      status: 'running',
      startedAt: new Date().toISOString(),
      finishedAt: null,
      actorId,
      totalCandidates: null,
      returnedCount: 0,
      ...(retryOf ? { retryOf } : {}),
    };
    await insert(this.db, runKey(record.id), RUN_TYPE, record);
    try {
      // Count and displayed page come from one database snapshot. This is a page inspection, not a full review.
      const result = await this.db.transaction(async (manager) => {
        await manager.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
        await manager.query("SET LOCAL statement_timeout='30s'");
        return preview(manager, rule, record.scope);
      });
      result.runId = record.id;
      result.items = result.items.map((item) => ({ ...item, runId: record.id }));
      Object.assign(record, {
        status: 'completed',
        result,
        totalCandidates: result.total,
        returnedCount: result.items.length,
      });
    } catch {
      Object.assign(record, { status: 'failed', errorCode: 'CHECK_FAILED' });
    }
    record.finishedAt = new Date().toISOString();
    const saved = await this.db.query(
      `UPDATE settings SET value=$1::jsonb,"updatedAt"=NOW() WHERE key=$2 AND type=$3 AND value->>'status'='running' RETURNING value`,
      [JSON.stringify(record), runKey(record.id), RUN_TYPE],
    );
    // A late worker must not overwrite an interrupted execution recovered by another request.
    return saved[0]?.value ?? (await this.run(record.id));
  }
  run(id: string) {
    return read<ProductCorrectionRun>(this.db, runKey(id), RUN_TYPE);
  }
  async retry(id: string, actorId: string) {
    const original = await this.db.transaction(async (manager) => {
      const record = await read<ProductCorrectionRun>(manager, runKey(id), RUN_TYPE, true);
      if (record.status === 'running' && Date.now() - new Date(record.startedAt).getTime() >= 5 * 60 * 1000) {
        record.status = 'failed';
        record.errorCode = 'INTERRUPTED';
        record.finishedAt = new Date().toISOString();
        await replace(manager, runKey(id), RUN_TYPE, record);
      }
      if (record.status !== 'failed') throw new CorrectionError('RUN_NOT_FAILED', 409);
      return record;
    });
    return this.execute(
      original.ruleSnapshot.id,
      { revision: original.ruleSnapshot.revision, scope: original.scope },
      actorId,
      id,
    );
  }
  async runs(page = 1) {
    const count = await this.db.query(
      'SELECT COUNT(*)::int AS total FROM settings WHERE type=$1 AND key LIKE $2',
      [RUN_TYPE, 'product-correction:run:%'],
    );
    const rows = await this.db.query(
      `SELECT (value - 'result' - 'ruleSnapshot') || jsonb_build_object(
      'ruleTitle',value->'ruleSnapshot'->>'title','ruleId',value->'ruleSnapshot'->>'id','ruleRevision',(value->'ruleSnapshot'->>'revision')::int) AS value
      FROM settings WHERE type=$1 AND key LIKE $2 ORDER BY value->>'startedAt' DESC,key DESC LIMIT 10 OFFSET $3`,
      [RUN_TYPE, 'product-correction:run:%', (page - 1) * 10],
    );
    return {
      items: rows.map((r: { value: ProductCorrectionRunSummary }) => r.value),
      total: count[0].total,
      page,
      pageSize: 10,
    };
  }
  async taskVersions(batchId: string, taskId: string, page = 1) {
    const rows = await this.db.query(
      `SELECT value FROM settings WHERE type=$1 AND key LIKE $2 AND value->>'batchId'=$3
      ORDER BY (value->>'batchRevision')::int DESC LIMIT 10 OFFSET $4`,
      [TASK_VERSION_TYPE, `product-correction:task-version:${taskId}:%`, batchId, (page - 1) * 10],
    );
    return rows.map((r: { value: ProductCorrectionTaskVersion }) => r.value);
  }
  async operations(
    filter: ProductCorrectionOperationFilter = 'all',
    page = 1,
  ): Promise<ProductCorrectionOperations> {
    // Latest task per product + criterion, including older rule versions as explicit recheck candidates.
    const cte = `WITH entries AS (
      SELECT b.value->>'id' AS batch_id,t,b.value->'ruleSnapshot' AS rule,
        r.value AS current_rule,b."createdAt" AS created_at
      FROM settings b CROSS JOIN LATERAL jsonb_array_elements(b.value->'items') t
      JOIN settings r ON r.key='product-correction:rule:' || (b.value->'ruleSnapshot'->>'id') AND r.type=$2
      WHERE b.type=$1 AND b.key LIKE 'product-correction:batch:%' AND r.value->>'enabled'='true'
    ), latest AS (
      SELECT DISTINCT ON (rule->>'id',t->'product'->>'id') * FROM entries
      ORDER BY rule->>'id',t->'product'->>'id',(rule->>'revision')::int DESC,created_at DESC,t->>'updatedAt' DESC,batch_id DESC
    ), marked AS (
      SELECT *, (rule->>'revision')::int <> (current_rule->>'revision')::int AS outdated,
        t->>'state' IN ('no_change','reviewed','excluded') AS closed FROM latest
    ), flags AS (
      SELECT *, (NOT closed) AS open,
        (NOT outdated AND closed AND NULLIF(t->>'nextReviewAt','')::timestamptz <= NOW()) AS due,
        (t->>'state' IN ('needs_source','deferred') AND NULLIF(t->>'followUpAt','')::timestamptz <= NOW()) AS followup,
        (closed AND NOT outdated) AS reviewed FROM marked
    )`;
    const predicates = {
      all: 'true',
      open: 'open',
      due: 'due',
      followup: 'followup',
      reviewed: 'reviewed',
      outdated: 'outdated',
    };
    const where = predicates[filter];
    const counts = await this.db.query(
      `${cte} SELECT COUNT(*)::int AS total,COUNT(DISTINCT t->'product'->>'id')::int AS products,
      COUNT(*) FILTER(WHERE open)::int AS open,COUNT(*) FILTER(WHERE due)::int AS due,
      COUNT(*) FILTER(WHERE followup)::int AS followup,COUNT(*) FILTER(WHERE reviewed)::int AS reviewed,
      COUNT(*) FILTER(WHERE outdated)::int AS outdated FROM flags`,
      [BATCH_TYPE, RULE_TYPE],
    );
    const total = await this.db.query(`${cte} SELECT COUNT(*)::int AS total FROM flags WHERE ${where}`, [
      BATCH_TYPE,
      RULE_TYPE,
    ]);
    const rows = await this.db.query(
      `${cte} SELECT batch_id AS "batchId",t->>'id' AS "taskId",t->'product'->>'id' AS "productId",
      t->'product'->>'name' AS "productName",rule->>'id' AS "ruleId",rule->>'title' AS "ruleTitle",(rule->>'revision')::int AS "ruleRevision",
      t->>'state' AS state,t->>'followUpAt' AS "followUpAt",t->>'reviewedAt' AS "reviewedAt",t->>'nextReviewAt' AS "nextReviewAt",outdated
      FROM flags WHERE ${where} ORDER BY COALESCE(t->>'followUpAt',t->>'nextReviewAt',t->>'updatedAt'),batch_id,t->>'id' LIMIT 10 OFFSET $3`,
      [BATCH_TYPE, RULE_TYPE, (page - 1) * 10],
    );
    return { counts: counts[0], items: rows, total: total[0].total, page, pageSize: 10 };
  }
}
