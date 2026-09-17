/**
 * WO-O4O-PRIVACY-DATA-RETENTION-ENFORCEMENT-V1
 *
 * 개인정보 보유기간 집행: cutoff 계산 · env 는 정본보다 길게만 · dry-run 은 DELETE 를 실행하지 않음 · 배치 반복 종료 ·
 * contact_inquiries 의 처리완료 anchor(handled_at + 종결 status) · UNRESOLVED 보고 · 경계값(365일 ±1일) ·
 * job 의 mode 해석(기본 dry-run · 'apply' 정확히 일치할 때만 apply).
 * 단위 부분은 DB 없이, 통합 부분은 automation-job.spec 과 같은 일회성 PostgreSQL(MEDIA_V2_TEST_PORT=55439).
 */
// 프로덕션(Cloud Run)은 UTC 로 돈다. timestamp(without tz) 컬럼의 왕복이 로컬 TZ 에 흔들리지 않도록 테스트도 UTC 로 고정한다.
process.env.TZ = 'UTC';
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { randomUUID } from 'crypto';
import {
  PrivacyRetentionService,
  RETENTION_TARGETS,
  computeCutoff,
  resolveRetentionDays,
  retentionEnvName,
} from '../services/privacy-retention.service.js';
import { resolvePrivacyRetentionMode, isPrivacyRetentionEnabled } from '../jobs/privacy-retention.job.js';

jest.mock('../utils/logger.js', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date('2026-09-17T00:00:00.000Z');

describe('privacy-retention — 단위', () => {
  it('6 테이블 모두 정본 365일 · anchor 컬럼이 정의돼 있다', () => {
    expect(RETENTION_TARGETS.map((t) => t.table)).toEqual([
      'contact_inquiries', 'email_logs', 'audit_logs', 'action_logs', 'kpa_operator_audit_logs', 'ai_usage_logs',
    ]);
    for (const t of RETENTION_TARGETS) {
      expect(t.policyDays).toBe(365);
      expect(t.anchorSql.length).toBeGreaterThan(0);
    }
    const ci = RETENTION_TARGETS.find((t) => t.key === 'contact_inquiries')!;
    expect(ci.eligibleExtraSql).toContain('handled_at IS NOT NULL');
    expect(ci.unresolvedSql).toContain('handled_at IS NULL');
  }, 30000);

  it('cutoff = now − days', () => {
    expect(computeCutoff(NOW, 365).toISOString()).toBe(new Date(NOW.getTime() - 365 * DAY).toISOString());
  }, 30000);

  it('env: 미설정 → 정본 · 정본 이상 정수 → 연장 · 단축/0/음수/비정수/무기한 → 정본으로 강제', () => {
    const t = RETENTION_TARGETS[2]; // audit_logs
    const name = retentionEnvName(t.key);
    expect(name).toBe('PRIVACY_RETENTION_DAYS_AUDIT_LOGS');
    expect(resolveRetentionDays(t, {})).toBe(365);
    expect(resolveRetentionDays(t, { [name]: '730' })).toBe(730);
    expect(resolveRetentionDays(t, { [name]: '365' })).toBe(365);
    for (const bad of ['364', '90', '0', '-1', '', 'abc', '1.5', 'Infinity']) {
      expect(resolveRetentionDays(t, { [name]: bad })).toBe(365);
    }
  }, 30000);

  it('dry-run 은 DELETE 를 한 번도 실행하지 않는다', async () => {
    const query = jest.fn(async (sql: string) => {
      if (/^\s*DELETE/i.test(sql)) throw new Error('DELETE must not run in dry-run');
      if (/AS total_rows/.test(sql)) return [{ total_rows: 10, eligible: 3, oldest: '2025-01-01T00:00:00Z', newest: '2025-06-01T00:00:00Z' }];
      return [{ n: 1 }];
    });
    const svc = new PrivacyRetentionService({ query } as unknown as DataSource);
    const r = await svc.dryRun(NOW);
    expect(r.mode).toBe('dry-run');
    expect(r.tables).toHaveLength(6);
    expect(r.total_deleted).toBe(0);
    expect(r.total_eligible).toBe(18);
    expect(r.tables[0].unresolved_count).toBe(1); // contact_inquiries 만 unresolved 쿼리
    expect(r.tables[1].unresolved_count).toBe(0);
    expect(query.mock.calls.some(([sql]) => /DELETE/i.test(sql))).toBe(false);
  }, 30000);

  it('apply: 배치가 batchSize 미만을 반환할 때까지 반복한 뒤 종료한다', async () => {
    const deletes: number[] = [];
    let remaining = 7;
    const query = jest.fn(async (sql: string, params?: unknown[]) => {
      if (/^\s*DELETE/i.test(sql)) {
        const n = Math.min(remaining, params![1] as number);
        remaining -= n;
        deletes.push(n);
        return [[], n]; // TypeORM postgres DELETE 결과 형태 [rows, rowCount]
      }
      if (/AS total_rows/.test(sql)) return [{ total_rows: 7, eligible: sql.includes('email_logs') ? 7 : 0, oldest: null, newest: null }];
      return [{ n: 0 }];
    });
    const svc = new PrivacyRetentionService({ query } as unknown as DataSource, { batchSize: 3 });
    const r = await svc.apply(NOW);
    expect(deletes).toEqual([3, 3, 1]);
    expect(r.total_deleted).toBe(7);
    expect(r.tables.find((t) => t.table === 'email_logs')!.deleted_count).toBe(7);
    // eligible 0 인 테이블은 DELETE 를 시도하지 않는다
    expect(query.mock.calls.filter(([sql]) => /^\s*DELETE/i.test(sql)).every(([sql]) => sql.includes('email_logs'))).toBe(true);
  }, 30000);

  it('job mode: 기본 dry-run · 정확히 apply 일 때만 apply · kill-switch', () => {
    expect(resolvePrivacyRetentionMode({})).toBe('dry-run');
    expect(resolvePrivacyRetentionMode({ PRIVACY_RETENTION_MODE: 'dry-run' })).toBe('dry-run');
    expect(resolvePrivacyRetentionMode({ PRIVACY_RETENTION_MODE: 'APPLY' })).toBe('dry-run');
    expect(resolvePrivacyRetentionMode({ PRIVACY_RETENTION_MODE: 'true' })).toBe('dry-run');
    expect(resolvePrivacyRetentionMode({ PRIVACY_RETENTION_MODE: 'apply' })).toBe('apply');
    expect(isPrivacyRetentionEnabled({})).toBe(true);
    expect(isPrivacyRetentionEnabled({ PRIVACY_RETENTION_ENABLED: 'false' })).toBe(false);
  }, 30000);
});

const integration = process.env.MEDIA_V2_TEST_PORT === '55439' ? describe : describe.skip;
integration('privacy-retention — 격리 PostgreSQL', () => {
  let ds: DataSource;
  const at = (daysAgo: number) => new Date(NOW.getTime() - daysAgo * DAY).toISOString();

  beforeAll(async () => {
    const connection = { type: 'postgres' as const, host: '127.0.0.1', port: 55439, username: 'media_test', database: 'postgres' };
    const admin = await new DataSource(connection).initialize();
    const database = 'privacy_retention_' + Date.now();
    await admin.query('CREATE DATABASE ' + database);
    await admin.destroy();
    ds = await new DataSource({ ...connection, database, synchronize: false, extra: { options: '-c TimeZone=UTC' } }).initialize();
    // 프로덕션 canonical-schema 의 anchor 컬럼명·타입만 최소 재현(다른 컬럼은 이 job 과 무관)
    await ds.query(`
      CREATE TABLE contact_inquiries (id uuid PRIMARY KEY, status varchar(20) NOT NULL DEFAULT 'received', handled_at timestamp NULL, created_at timestamp NOT NULL DEFAULT now());
      CREATE TABLE email_logs (id serial PRIMARY KEY, "sentAt" timestamp NULL, "createdAt" timestamp NOT NULL DEFAULT now());
      CREATE TABLE audit_logs (id uuid PRIMARY KEY, "createdAt" timestamp NOT NULL DEFAULT now());
      CREATE TABLE action_logs (id uuid PRIMARY KEY, created_at timestamptz NOT NULL DEFAULT now());
      CREATE TABLE kpa_operator_audit_logs (id uuid PRIMARY KEY, created_at timestamptz NOT NULL DEFAULT now());
      CREATE TABLE ai_usage_logs (id uuid PRIMARY KEY, "createdAt" timestamp NOT NULL DEFAULT now());
    `);
  }, 30000);
  afterAll(async () => {
    if (ds?.isInitialized) await ds.destroy();
  }, 30000);
  beforeEach(async () => {
    await ds.query('TRUNCATE contact_inquiries, email_logs, audit_logs, action_logs, kpa_operator_audit_logs, ai_usage_logs');
  }, 30000);

  const count = async (table: string) => Number((await ds.query(`SELECT COUNT(*)::int AS n FROM ${table}`))[0].n);

  it('contact_inquiries: 종결+handled_at 366일 전만 대상 · 364일은 보존 · open 은 보존 · 종결+handled_at NULL 은 UNRESOLVED', async () => {
    const rows: Array<[string, string | null]> = [
      ['answered', at(366)], ['closed', at(366)], ['spam', at(366)], // eligible 3
      ['answered', at(364)], // 보존 (경계)
      ['received', at(400)], ['in_review', at(400)], // open — handled_at 이 오래돼도 미처리이므로 보존
      ['closed', null], ['answered', null], // UNRESOLVED_RETENTION_ANCHOR 2
    ];
    for (const [status, handled] of rows) {
      await ds.query('INSERT INTO contact_inquiries (id, status, handled_at, created_at) VALUES ($1, $2, $3, $4)', [randomUUID(), status, handled, at(500)]);
    }
    const svc = new PrivacyRetentionService(ds);
    const dry = await svc.dryRun(NOW);
    const ci = dry.tables[0];
    expect(ci.total_rows).toBe(8);
    expect(ci.eligible_for_deletion_count).toBe(3);
    expect(ci.unresolved_count).toBe(2);
    expect(ci.open_count).toBe(2);
    expect(ci.oldest_eligible_date).toMatch(/^2025-09-16 00:00:00/); // PG text 그대로(세션 TZ=UTC)
    expect(ci.newest_eligible_date).toMatch(/^2025-09-16 00:00:00/);
    expect(await count('contact_inquiries')).toBe(8); // dry-run 무삭제

    const applied = await svc.apply(NOW);
    expect(applied.tables[0].deleted_count).toBe(3);
    expect(await count('contact_inquiries')).toBe(5);
    const left = await ds.query('SELECT status, handled_at FROM contact_inquiries ORDER BY status');
    expect(left.filter((r: { handled_at: unknown }) => r.handled_at === null)).toHaveLength(2); // unresolved 는 남는다
  }, 30000);

  it('email_logs: sentAt 우선, 없으면 createdAt · 경계값 ±1일', async () => {
    await ds.query('INSERT INTO email_logs ("sentAt", "createdAt") VALUES ($1, $2)', [at(366), at(10)]); // sentAt 오래됨 → 대상
    await ds.query('INSERT INTO email_logs ("sentAt", "createdAt") VALUES ($1, $2)', [at(10), at(366)]); // sentAt 최근 → 보존
    await ds.query('INSERT INTO email_logs ("sentAt", "createdAt") VALUES (NULL, $1)', [at(366)]); // createdAt fallback → 대상
    await ds.query('INSERT INTO email_logs ("sentAt", "createdAt") VALUES (NULL, $1)', [at(364)]); // 보존
    const svc = new PrivacyRetentionService(ds);
    const dry = (await svc.dryRun(NOW)).tables[1];
    expect(dry.eligible_for_deletion_count).toBe(2);
    expect(await count('email_logs')).toBe(4);
    await svc.apply(NOW);
    expect(await count('email_logs')).toBe(2);
  }, 30000);

  it('감사 4 테이블: 366일 삭제 · 364일 보존 · 배치 반복', async () => {
    for (const [table, col] of [['audit_logs', '"createdAt"'], ['action_logs', 'created_at'], ['kpa_operator_audit_logs', 'created_at'], ['ai_usage_logs', '"createdAt"']]) {
      for (let i = 0; i < 5; i++) await ds.query(`INSERT INTO ${table} (id, ${col}) VALUES ($1, $2)`, [randomUUID(), at(366 + i)]);
      for (let i = 0; i < 2; i++) await ds.query(`INSERT INTO ${table} (id, ${col}) VALUES ($1, $2)`, [randomUUID(), at(364 - i)]);
    }
    const svc = new PrivacyRetentionService(ds, { batchSize: 2 });
    const dry = await svc.dryRun(NOW);
    for (const t of dry.tables.slice(2)) {
      expect(t.total_rows).toBe(7);
      expect(t.eligible_for_deletion_count).toBe(5);
      expect(t.unresolved_count).toBe(0);
    }
    const applied = await svc.apply(NOW);
    expect(applied.total_deleted).toBe(20);
    for (const table of ['audit_logs', 'action_logs', 'kpa_operator_audit_logs', 'ai_usage_logs']) {
      expect(await count(table)).toBe(2);
    }
  }, 30000);

  it('env 로 730일 연장 시 366일 row 는 보존된다(정본보다 짧게는 불가)', async () => {
    await ds.query('INSERT INTO audit_logs (id, "createdAt") VALUES ($1, $2)', [randomUUID(), at(366)]);
    await ds.query('INSERT INTO audit_logs (id, "createdAt") VALUES ($1, $2)', [randomUUID(), at(731)]);
    const svc = new PrivacyRetentionService(ds, { env: { PRIVACY_RETENTION_DAYS_AUDIT_LOGS: '730' } });
    const t = (await svc.dryRun(NOW)).tables[2];
    expect(t.retention_days).toBe(730);
    expect(t.eligible_for_deletion_count).toBe(1);
    const short = new PrivacyRetentionService(ds, { env: { PRIVACY_RETENTION_DAYS_AUDIT_LOGS: '30' } });
    expect((await short.dryRun(NOW)).tables[2].retention_days).toBe(365);
  }, 30000);
});
