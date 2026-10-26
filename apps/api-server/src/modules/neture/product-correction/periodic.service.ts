import { randomUUID } from 'node:crypto';
import type { DataSource } from 'typeorm';
import type {
  ProductCorrectionBulkJob,
  ProductCorrectionRule,
  ProductCorrectionRun,
  ProductCorrectionSchedule,
  ProductCorrectionNotice,
} from '@o4o/types';
import { BATCH_TYPE, CorrectionError, RULE_TYPE, ruleKey, RUN_TYPE, runKey } from './contracts.js';
import { preview, previewQuery } from './preview.js';
import { read, insert, replace, type Db } from './records.js';
import {
  BULK,
  bulkKey,
  POPULATION,
  populationKey,
  SCHEDULE,
  scheduleKey,
  NOTICE,
  noticeKey,
  RENEWAL,
  bulkSchema,
  controlSchema,
  scheduleSchema,
} from './periodic.contracts.js';
import { notice } from './renewal.service.js';

const DAY = 86400000;
export const BULK_LIMIT = 50000;
const terminal = ['completed', 'cancelled'];
const heartbeatKey = 'product-correction:worker';
export class ProductCorrectionPeriodicService {
  constructor(private db: DataSource) {}
  private async createInTransaction(
    db: Db,
    rule: ProductCorrectionRule,
    search: string,
    actor: string,
    schedule?: { id: string; occurrenceAt: string },
  ): Promise<ProductCorrectionBulkJob> {
    if (!rule.enabled) throw new CorrectionError('RULE_DISABLED', 409);
    await db.query("SET LOCAL statement_timeout='30s'");
    const { from, params } = previewQuery(rule, { search, page: 1 });
    const rows = await db.query(
      `SELECT m.id ${from} ORDER BY m.id LIMIT ${BULK_LIMIT + 1}`,
      params,
    );
    if (rows.length > BULK_LIMIT) throw new CorrectionError('BULK_SCOPE_TOO_LARGE');
    const now = new Date().toISOString(),
      id = randomUUID();
    const job: ProductCorrectionBulkJob = {
      id,
      revision: 1,
      ruleSnapshot: rule,
      search,
      status: rows.length ? 'queued' : 'completed',
      total: rows.length,
      cursor: 0,
      matched: 0,
      skipped: 0,
      attempts: 0,
      createdAt: now,
      updatedAt: now,
      createdBy: actor,
      ...(schedule ? { scheduleId: schedule.id, occurrenceAt: schedule.occurrenceAt } : {}),
    };
    const pages: string[][] = [];
    for (let offset = 0; offset < rows.length; offset += 25)
      pages.push(rows.slice(offset, offset + 25).map((r: { id: string }) => r.id));
    await insert(db, populationKey(id), POPULATION, { pages });
    await insert(db, bulkKey(id), BULK, job);
    if (!rows.length)
      await notice(
        db,
        `bulk-completed:${id}`,
        'bulk-completed',
        id,
        '대량 후보 점검 완료: 대상 0개 (사람의 검토 완료 아님)',
      );
    return job;
  }
  async create(input: unknown, actor: string) {
    const data = bulkSchema.parse(input);
    return this.db.transaction(async (db) => {
      await db.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
      const rule = await read<ProductCorrectionRule>(db, ruleKey(data.ruleId), RULE_TYPE);
      if (rule.revision !== data.revision) throw new CorrectionError('RULE_CHANGED', 409);
      return this.createInTransaction(db, rule, data.search, actor);
    });
  }
  async jobs(page = 1) {
    return this.list<ProductCorrectionBulkJob>(BULK, page);
  }
  job(id: string) {
    return read<ProductCorrectionBulkJob>(this.db, bulkKey(id), BULK);
  }
  private async list<T>(type: string, page: number) {
    const count = await this.db.query('SELECT COUNT(*)::int AS total FROM settings WHERE type=$1', [
      type,
    ]);
    const rows = await this.db.query(
      `SELECT value FROM settings WHERE type=$1 ORDER BY "createdAt" DESC,key DESC LIMIT 10 OFFSET $2`,
      [type, (page - 1) * 10],
    );
    return {
      items: rows.map((r: { value: T }) => r.value),
      total: count[0].total,
      page,
      pageSize: 10,
    };
  }
  async controls(id: string) {
    await this.job(id);
    const rows = await this.db.query(
      "SELECT value FROM settings WHERE type='product_correction_bulk_control' AND value->>'jobId'=$1 ORDER BY (value->>'revision')::int DESC LIMIT 20",
      [id],
    );
    return rows.map(
      (r: {
        value: {
          action: 'pause' | 'resume' | 'cancel';
          actor: string | null;
          cursor: number;
          at: string;
        };
      }) => r.value,
    );
  }
  async pages(id: string, page = 1) {
    const job = await this.job(id);
    const rows = await this.db.query(
      `SELECT value FROM settings WHERE type=$1 AND value->>'bulkJobId'=$2 ORDER BY (value->>'bulkPage')::int LIMIT 1 OFFSET $3`,
      [RUN_TYPE, id, page - 1],
    );
    return {
      job,
      run: (rows[0]?.value ?? null) as ProductCorrectionRun | null,
      totalPages: Math.ceil(job.cursor / 25),
      page,
    };
  }
  async control(id: string, input: unknown, actor?: string) {
    const data = controlSchema.parse(input);
    return this.db.transaction(async (db) => {
      const job = await read<ProductCorrectionBulkJob>(db, bulkKey(id), BULK, true);
      if (job.revision !== data.revision) throw new CorrectionError('BULK_CHANGED', 409);
      if (terminal.includes(job.status)) throw new CorrectionError('BULK_TERMINAL', 409);
      if (data.action === 'pause') job.status = 'paused';
      if (data.action === 'cancel') job.status = 'cancelled';
      if (data.action === 'resume') {
        job.status = 'queued';
        job.attempts = 0;
        delete job.nextRetryAt;
        delete job.errorCode;
      }
      job.revision++;
      job.updatedAt = new Date().toISOString();
      await insert(
        db,
        `${bulkKey(id)}:control:${job.revision}`,
        'product_correction_bulk_control',
        {
          jobId: id,
          revision: job.revision,
          action: data.action,
          at: job.updatedAt,
          actor: actor ?? null,
          cursor: job.cursor,
        },
      );
      await replace(db, bulkKey(id), BULK, job);
      return job;
    });
  }
  /** One bounded page per transaction. The row lock prevents duplicate cursors across instances. */
  async step(id?: string): Promise<ProductCorrectionBulkJob | null> {
    let attempted: ProductCorrectionBulkJob | null = null;
    try {
      return await this.db.transaction(async (db) => {
        await db.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
        await db.query("SET LOCAL statement_timeout='30s'");
        const rows = await db.query(
          `SELECT value FROM settings WHERE type=$1 ${id ? 'AND key=$2' : ''}
          AND (value->>'status' IN ('queued','running') OR (value->>'status'='retry_wait' AND (value->>'nextRetryAt')::timestamptz<=NOW()))
          ORDER BY value->>'updatedAt',key LIMIT 1 FOR UPDATE SKIP LOCKED`,
          id ? [BULK, bulkKey(id)] : [BULK],
        );
        if (!rows[0]) return null;
        const job = rows[0].value as ProductCorrectionBulkJob;
        attempted = structuredClone(job);
        const population = await db.query(
          `SELECT value->'pages'->$2::int AS ids FROM settings WHERE key=$1 AND type=$3`,
          [populationKey(job.id), Math.floor(job.cursor / 25), POPULATION],
        );
        const ids = population[0]?.ids as string[] | undefined;
        if (!ids?.length) throw new CorrectionError('BULK_POPULATION_MISSING');
        const scope = { search: job.search, page: 1 };
        const result = await preview(db, job.ruleSnapshot, scope, ids);
        const runId = randomUUID(),
          now = new Date().toISOString();
        result.runId = runId;
        result.items = result.items.map((p) => ({ ...p, runId }));
        const run: ProductCorrectionRun & { bulkJobId: string; bulkPage: number } = {
          id: runId,
          ruleSnapshot: job.ruleSnapshot,
          scope,
          status: 'completed',
          startedAt: now,
          finishedAt: now,
          actorId: job.createdBy,
          totalCandidates: result.total,
          returnedCount: result.items.length,
          result,
          bulkJobId: job.id,
          bulkPage: Math.floor(job.cursor / 25) + 1,
        };
        await insert(db, runKey(runId), RUN_TYPE, run);
        job.cursor += ids.length;
        job.matched += result.items.length;
        job.skipped += ids.length - result.items.length;
        job.status = job.cursor >= job.total ? 'completed' : 'running';
        job.attempts = 0;
        job.revision++;
        job.updatedAt = now;
        delete job.errorCode;
        delete job.nextRetryAt;
        await replace(db, bulkKey(job.id), BULK, job);
        if (job.status === 'completed')
          await notice(
            db,
            `bulk-completed:${job.id}`,
            'bulk-completed',
            job.id,
            '대량 후보 점검 완료: 상품 선택·사람의 검토가 필요합니다.',
          );
        return job;
      });
    } catch (error) {
      // REPEATABLE READ may reject an otherwise unlocked row changed after this snapshot.
      // No page was claimed: defer to a fresh tick instead of reporting a failed inspection.
      if (!attempted && (error as { code?: string })?.code === '40001') return null;
      // The failed page, result and cursor all rolled back. A late failure cannot overwrite a control action.
      if (!attempted) throw new CorrectionError('BULK_STEP_FAILED', 503);
      const original = attempted as ProductCorrectionBulkJob;
      return this.db.transaction(async (db) => {
        const job = await read<ProductCorrectionBulkJob>(db, bulkKey(original.id), BULK, true);
        if (job.revision !== original.revision) return job;
        job.attempts++;
        job.status = job.attempts < 3 ? 'retry_wait' : 'failed';
        job.errorCode = 'BULK_STEP_FAILED';
        if (job.status === 'failed') delete job.nextRetryAt;
        else job.nextRetryAt = new Date(Date.now() + job.attempts * 60000).toISOString();
        job.updatedAt = new Date().toISOString();
        job.revision++;
        await replace(db, bulkKey(job.id), BULK, job);
        await notice(
          db,
          `bulk-failed:${job.id}:${job.revision}`,
          'bulk-failed',
          job.id,
          job.status === 'failed'
            ? '대량 점검 자동 재시도 한도 도달: 수동 재개·취소가 필요합니다.'
            : '대량 점검 실패: 같은 페이지를 재시도 대기합니다.',
        );
        return job;
      });
    }
  }
  async schedule(id: string) {
    const rows = await this.db.query('SELECT value FROM settings WHERE key=$1 AND type=$2', [
      scheduleKey(id),
      SCHEDULE,
    ]);
    return (rows[0]?.value ?? null) as ProductCorrectionSchedule | null;
  }
  schedules(page = 1) {
    return this.list<ProductCorrectionSchedule>(SCHEDULE, page);
  }
  async saveSchedule(ruleId: string, input: unknown, actor: string) {
    const data = scheduleSchema.parse(input);
    if (data.enabled && new Date(data.nextDueAt).getTime() <= Date.now())
      throw new CorrectionError('SCHEDULE_FUTURE_REQUIRED');
    return this.db.transaction(async (db) => {
      const rule = await read<ProductCorrectionRule>(db, ruleKey(ruleId), RULE_TYPE, true);
      if (data.enabled && !rule.enabled) throw new CorrectionError('RULE_DISABLED', 409);
      const rows = await db.query(
        'SELECT value FROM settings WHERE key=$1 AND type=$2 FOR UPDATE',
        [scheduleKey(ruleId), SCHEDULE],
      );
      const existing = rows[0]?.value as ProductCorrectionSchedule | undefined;
      if ((existing?.revision ?? 0) !== data.revision)
        throw new CorrectionError('SCHEDULE_CHANGED', 409);
      const schedule: ProductCorrectionSchedule = {
        id: ruleId,
        ruleId,
        revision: data.revision + 1,
        enabled: data.enabled,
        intervalDays: data.intervalDays,
        timeZone: data.timeZone,
        nextDueAt: data.nextDueAt,
        missedOccurrences: existing?.missedOccurrences ?? 0,
        updatedBy: actor,
        ...(existing?.lastJobId
          ? { lastJobId: existing.lastJobId, lastStartedAt: existing.lastStartedAt }
          : {}),
      };
      if (existing) await replace(db, scheduleKey(ruleId), SCHEDULE, schedule);
      else await insert(db, scheduleKey(ruleId), SCHEDULE, schedule);
      return schedule;
    });
  }
  private async startDue(now: Date) {
    let attempted: ProductCorrectionSchedule | null = null;
    try {
      return await this.db.transaction(async (db) => {
        await db.query("SET LOCAL statement_timeout='30s'");
        const rows = await db.query(
          `SELECT s.value FROM settings s WHERE s.type=$1 AND s.value->>'enabled'='true'
          AND (s.value->>'nextDueAt')::timestamptz<=$2::timestamptz
          AND (s.value->>'nextAttemptAt' IS NULL OR (s.value->>'nextAttemptAt')::timestamptz<=$2::timestamptz)
          AND NOT EXISTS(SELECT 1 FROM settings b WHERE b.type=$3 AND b.value->>'scheduleId'=s.value->>'id' AND b.value->>'status' NOT IN ('completed','cancelled'))
          ORDER BY s.value->>'nextDueAt',s.key LIMIT 1 FOR UPDATE OF s SKIP LOCKED`,
          [SCHEDULE, now.toISOString(), BULK],
        );
        if (!rows[0]) return null;
        const schedule = rows[0].value as ProductCorrectionSchedule;
        attempted = structuredClone(schedule);
        const rule = await read<ProductCorrectionRule>(db, ruleKey(schedule.ruleId), RULE_TYPE);
        if (!rule.enabled) {
          schedule.enabled = false;
          schedule.errorCode = 'RULE_DISABLED';
          schedule.revision++;
          await replace(db, scheduleKey(schedule.id), SCHEDULE, schedule);
          return schedule;
        }
        const occurrenceAt = schedule.nextDueAt;
        const reservation = `product-correction:occurrence:${schedule.id}:${occurrenceAt}`;
        const claimed = await db.query(
          `INSERT INTO settings(key,type,value,description) VALUES($1,'product_correction_occurrence',$2::jsonb,'상품 점검 예약 회차') ON CONFLICT(key) DO NOTHING RETURNING key`,
          [reservation, JSON.stringify({ scheduleId: schedule.id, occurrenceAt })],
        );
        if (!claimed.length) throw new CorrectionError('SCHEDULE_OCCURRENCE_EXISTS');
        const job = await this.createInTransaction(db, rule, '', schedule.updatedBy, {
          id: schedule.id,
          occurrenceAt,
        });
        const missed = Math.floor(
          (now.getTime() - new Date(occurrenceAt).getTime()) / (schedule.intervalDays * DAY),
        );
        schedule.nextDueAt = new Date(
          new Date(occurrenceAt).getTime() + (missed + 1) * schedule.intervalDays * DAY,
        ).toISOString();
        schedule.lastJobId = job.id;
        schedule.lastStartedAt = now.toISOString();
        schedule.missedOccurrences += missed;
        schedule.revision++;
        delete schedule.errorCode;
        await replace(db, scheduleKey(schedule.id), SCHEDULE, schedule);
        if (missed)
          await notice(
            db,
            `schedule-delayed:${job.id}`,
            'schedule-delayed',
            job.id,
            `예약 지연 회차 ${missed}개를 이번 점검으로 합쳤습니다.`,
          );
        return schedule;
      });
    } catch (error) {
      if (!attempted) throw error;
      const original = attempted as ProductCorrectionSchedule;
      await this.db.transaction(async (db) => {
        const rows = await db.query(
          'SELECT value FROM settings WHERE key=$1 AND type=$2 FOR UPDATE',
          [scheduleKey(original.id), SCHEDULE],
        );
        const schedule = rows[0]?.value;
        if (!schedule || schedule.revision !== original.revision) return;
        schedule.errorCode =
          error instanceof CorrectionError ? error.code : 'SCHEDULE_START_FAILED';
        schedule.nextAttemptAt = new Date(now.getTime() + 5 * 60000).toISOString();
        schedule.revision++;
        await replace(db, scheduleKey(schedule.id), SCHEDULE, schedule);
        await notice(
          db,
          `schedule-error:${schedule.id}:${original.nextDueAt}`,
          'schedule-delayed',
          schedule.id,
          '예약 점검 시작 실패: 범위·기준을 확인하세요.',
        );
      });
      return null;
    }
  }
  /** Transaction-scoped DB mutex also coordinates independent job processes; cursor rows remain durable. */
  async tick(now = new Date(), source: 'server' | 'job' = 'server') {
    const started = Date.now();
    try {
      return await this.db.transaction(async (guard) => {
        const lock = await guard.query('SELECT pg_try_advisory_xact_lock(825104, 1) AS claimed');
        if (!lock[0]?.claimed) return { status: 'busy' as const, pagesProcessed: 0, schedulesStarted: 0 };
        const result = await this.processTick(now);
        await this.recordHeartbeat({ lastTickAt: now.toISOString(), lastSucceededAt: new Date().toISOString(),
          lastStartedAt: now.toISOString(), lastDurationMs: Date.now() - started, source,
          lastErrorCode: null, ...result });
        return { status: 'completed' as const, ...result };
      });
    } catch (error) {
      try {
        await this.recordHeartbeat({ lastFailedAt: new Date().toISOString(), lastErrorCode: 'WORKER_TICK_FAILED', source });
      } catch { /* A database outage must not hide the original failure. */ }
      throw error;
    }
  }
  private recordHeartbeat(value: Record<string, unknown>) {
    return this.db.query(
      `INSERT INTO settings(key,type,value,description) VALUES($1,'product_correction_worker',$2::jsonb,'상품 관리 worker 상태')
       ON CONFLICT(key) DO UPDATE SET value=settings.value || EXCLUDED.value,"updatedAt"=NOW()`,
      [heartbeatKey, JSON.stringify(value)],
    );
  }
  private async processTick(now: Date) {
    let schedulesStarted = 0, pagesProcessed = 0;
    for (let i = 0; i < 4; i++) {
      const schedule = await this.startDue(now);
      if (!schedule) break;
      schedulesStarted++;
    }
    for (let i = 0; i < 4; i++) {
      if (!(await this.step())) break;
      pagesProcessed++;
    }
    const day = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' });
    const existing = await this.db.query('SELECT 1 FROM settings WHERE key=$1 AND type=$2', [
      noticeKey(`backlog:${day}`),
      NOTICE,
    ]);
    if (!existing.length) {
      const summary = await this.dashboard();
      if (
        summary.renewalOpen ||
        summary.evidenceWaiting ||
        summary.proposalUnapplied ||
        summary.bulkFailed ||
        summary.scheduleDue
      )
        await notice(
          this.db,
          `backlog:${day}`,
          'backlog',
          day,
          '미처리 상품 관리 작업이 있습니다. 갱신·근거·승인·실패·예약 지연 현황을 확인하세요.',
        );
    }
    return { schedulesStarted, pagesProcessed };
  }
  async notices(page = 1) {
    return this.list<ProductCorrectionNotice>(NOTICE, page);
  }
  async acknowledge(id: string, actor?: string) {
    return this.db.transaction(async (db) => {
      const record = await read<ProductCorrectionNotice>(db, noticeKey(id), NOTICE, true);
      if (!record.acknowledgedAt) {
        record.acknowledgedAt = new Date().toISOString();
        record.acknowledgedBy = actor;
        await replace(db, noticeKey(id), NOTICE, record);
      }
      return record;
    });
  }
  async dashboard() {
    const count = async (type: string, condition = 'true') =>
      (
        await this.db.query(
          `SELECT COUNT(*)::int AS total FROM settings WHERE type=$1 AND ${condition}`,
          [type],
        )
      )[0].total as number;
    const heartbeat = await this.db.query('SELECT value FROM settings WHERE key=$1', [
      heartbeatKey,
    ]);
    const stats = {
      renewalOpen: await count(RENEWAL, "value->>'state' NOT IN ('done','excluded')"),
      proposalPending: await count('product_correction_proposal', "value->>'reviewedAt' IS NULL"),
      proposalUnapplied: await count(
        'product_correction_proposal',
        "value->>'reviewedAt' IS NOT NULL AND value->>'appliedAt' IS NULL",
      ),
      proposalFailed: await count(
        'product_correction_proposal',
        "value->>'appliedAt' IS NULL AND EXISTS(SELECT 1 FROM settings a WHERE a.type='product_correction_apply_attempt' AND a.value->>'proposalId'=settings.value->>'id')",
      ),
      bulkOpen: await count(BULK, "value->>'status' IN ('queued','running','retry_wait')"),
      bulkFailed: await count(BULK, "value->>'status'='failed'"),
      bulkPaused: await count(BULK, "value->>'status'='paused'"),
      scheduleDue: await count(
        SCHEDULE,
        "value->>'enabled'='true' AND (value->>'nextDueAt')::timestamptz<=NOW()",
      ),
      noticeUnread: await count(NOTICE, "value->>'acknowledgedAt' IS NULL"),
    };
    const evidence = await this.db.query(
      `SELECT COUNT(*)::int AS total FROM settings b CROSS JOIN LATERAL jsonb_array_elements(b.value->'items') t WHERE b.type=$1 AND t->>'state'='needs_source'`,
      [BATCH_TYPE],
    );
    return {
      ...stats,
      evidenceWaiting: evidence[0].total as number,
      lastTickAt: heartbeat[0]?.value?.lastTickAt ?? null,
      worker: heartbeat[0]?.value ?? null,
    };
  }
}
