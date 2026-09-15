/**
 * DB 상태 분류기 schema drift 강화 · 접속 로그 비노출 회귀 테스트
 * (WO-O4O-DATABASE-STATE-CLASSIFIER-SCHEMA-DRIFT-AND-CONNECTION-LOG-HARDENING-V1)
 *
 * 네 층으로 나뉜다.
 *   1. 정적 계약 — expected schema state registry ↔ incremental manifest lockstep,
 *      historical name 목록 ↔ frozen JSON manifest lockstep, legacy history facts 무결성,
 *      migrate.ts 소스에 접속 정보 문자열 보간 없음.
 *   2. 순수 단위 — contiguous prefix 규칙(gap / skip / reversal / duplicate), legacy name 검증,
 *      에러 요약 redaction.
 *   3. 로그 비노출(§8.3) — 가짜 자격정보로 `migrate.ts --status` 를 실제 실행해 stdout/stderr 에
 *      host / database / user / password 가 한 번도 나타나지 않음을 확인한다.
 *   4. 격리 PostgreSQL(§8.2) — `O4O_ISOLATED_PG_URL` 이 있을 때만: 실제 DB 상태 16종을 만들어
 *      분류기 판정을 검증하고, `--status` 가 DB 에 쓰기 0건임을 pg_stat 카운터로 확인하며,
 *      빈 DB 에서 bootstrap → incremental → POST 단언 전체 시퀀스를 실행한다.
 *      env 가 없으면 명시적으로 skip 을 출력한다(조용히 PASS 로 위장하지 않는다).
 */

import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { EXPECTED_SCHEMA_STATES, expectedSchemaStateFor, expectedSchemaStateLabel } from '../database/incremental/expected-schema-states.js';
import { HISTORICAL_MIGRATION_NAMES } from '../database/incremental/historical-migration-names.js';
import { LEGACY_HISTORY_KNOWN_DUPLICATES, LEGACY_HISTORY_RETIRED_NAMES } from '../database/incremental/legacy-history.facts.js';
import { incrementalMigrationNames } from '../database/incremental/manifest.js';
import { CANONICAL_SCHEMA_BASELINE_META } from '../database/bootstrap/canonical-schema-baseline.meta.js';
import { resolveIncrementalPrefix, validateLegacyHistoryNames } from '../database/bootstrap/incremental-history.js';
import { formatSafeErrorSummary, redactDatabaseDetails, summarizeDatabaseError } from '../database/bootstrap/safe-db-error.js';
import { classifyDatabaseState } from '../database/bootstrap/database-state.js';
import {
  ISOLATED_PG_ENV,
  IsolatedPgHarness,
  isolatedPgUrl,
  legacyHistoryFixture,
  historyInsertSql,
  renderScenarioTable,
  standardScenarios,
} from './helpers/isolated-pg-classifier-harness.js';

const API_ROOT = path.resolve(__dirname, '..', '..');
const REPO_ROOT = path.resolve(API_ROOT, '..', '..');
const SRC = path.join(API_ROOT, 'src');
const read = (rel: string) => fs.readFileSync(path.join(SRC, rel), 'utf8');
const TSX_CLI = path.join(REPO_ROOT, 'node_modules', 'tsx', 'dist', 'cli.mjs');

interface HistoricalEntry { file: string; className: string; name: string }
const historical = JSON.parse(read('database/incremental/historical-migrations.manifest.json')) as { count: number; entries: HistoricalEntry[] };
const manifest = incrementalMigrationNames();

/** Run src/migrate.ts as the job would, with a fully controlled environment. Returns combined output. */
function runMigrate(args: string[], env: Record<string, string>) {
  const r = spawnSync(process.execPath, [TSX_CLI, 'src/migrate.ts', ...args], {
    cwd: API_ROOT,
    env: { PATH: process.env.PATH, SYSTEMROOT: process.env.SYSTEMROOT ?? '', NODE_ENV: 'test', ...env },
    encoding: 'utf8',
    timeout: 180_000,
  });
  return { status: r.status, out: `${r.stdout}\n${r.stderr}` };
}
const reported = (out: string, key: string) => (new RegExp(`${key} = (.+)$`, 'm').exec(out)?.[1] ?? '').trim();

// ───────────────────────────── 1. 정적 계약
describe('expected schema state registry ↔ incremental manifest lockstep', () => {
  it('has baseline + one entry per incremental migration, in manifest order', () => {
    expect(EXPECTED_SCHEMA_STATES.length).toBe(manifest.length + 1);
    expect(EXPECTED_SCHEMA_STATES[0].appliedThrough).toBeNull();
    expect(EXPECTED_SCHEMA_STATES[0].fingerprint).toBe(CANONICAL_SCHEMA_BASELINE_META.expectedFingerprint);
    expect(EXPECTED_SCHEMA_STATES[0].fingerprintLineCount).toBe(CANONICAL_SCHEMA_BASELINE_META.expectedFingerprintLineCount);
    manifest.forEach((name, i) => expect(EXPECTED_SCHEMA_STATES[i + 1].appliedThrough).toBe(name));
    expect(EXPECTED_SCHEMA_STATES[EXPECTED_SCHEMA_STATES.length - 1].appliedThrough).toBe(manifest[manifest.length - 1]);
  });

  it('every entry carries a 64-hex sha256 and a positive line count; fingerprints are distinct', () => {
    for (const s of EXPECTED_SCHEMA_STATES) {
      expect(s.fingerprint).toMatch(/^[0-9a-f]{64}$/);
      expect(Number.isInteger(s.fingerprintLineCount) && s.fingerprintLineCount > 0).toBe(true);
    }
    expect(new Set(EXPECTED_SCHEMA_STATES.map((s) => s.fingerprint)).size).toBe(EXPECTED_SCHEMA_STATES.length);
  });

  it('expectedSchemaStateFor resolves prefix lengths and rejects invalid ones', () => {
    expect(expectedSchemaStateFor(0)).toBe(EXPECTED_SCHEMA_STATES[0]);
    expect(expectedSchemaStateFor(manifest.length)).toBe(EXPECTED_SCHEMA_STATES[manifest.length]);
    expect(expectedSchemaStateFor(manifest.length + 1)).toBeUndefined();
    expect(expectedSchemaStateFor(-1)).toBeUndefined();
    expect(expectedSchemaStateLabel(undefined)).toBe('UNREGISTERED');
    expect(expectedSchemaStateLabel(EXPECTED_SCHEMA_STATES[0])).toContain(CANONICAL_SCHEMA_BASELINE_META.baselineVersion);
  });
});

describe('historical migration names ↔ frozen JSON manifest lockstep', () => {
  it('generated name list equals name ∪ className of every historical entry (first-occurrence order)', () => {
    const derived: string[] = [];
    const seen = new Set<string>();
    for (const e of historical.entries) for (const n of [e.name, e.className]) if (n && !seen.has(n)) { seen.add(n); derived.push(n); }
    expect([...HISTORICAL_MIGRATION_NAMES]).toEqual(derived);
    expect(historical.count).toBe(historical.entries.length);
  });

  it('historical names, retired facts and incremental names are pairwise disjoint; duplicates are historical; retired names have no file', () => {
    const hist = new Set(HISTORICAL_MIGRATION_NAMES);
    const inc = new Set(manifest);
    for (const n of LEGACY_HISTORY_RETIRED_NAMES) {
      expect(hist.has(n)).toBe(false);
      expect(inc.has(n)).toBe(false);
    }
    for (const n of manifest) expect(hist.has(n)).toBe(false);
    for (const n of LEGACY_HISTORY_KNOWN_DUPLICATES) expect(hist.has(n)).toBe(true);
    expect(new Set(LEGACY_HISTORY_RETIRED_NAMES).size).toBe(LEGACY_HISTORY_RETIRED_NAMES.length);
    const migrationSrc = fs.readdirSync(path.join(SRC, 'database', 'migrations')).map((f) => read(`database/migrations/${f}`)).join('\n');
    for (const n of LEGACY_HISTORY_RETIRED_NAMES) expect(migrationSrc.includes(`class ${n}`)).toBe(false);
  });
});

describe('migrate.ts source: no connection detail logging', () => {
  const src = read('migrate.ts').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  it('never interpolates DB_HOST / DB_NAME / DB_PORT / DB_USERNAME / DB_PASSWORD into a string', () => {
    for (const k of ['DB_HOST', 'DB_NAME', 'DB_PORT', 'DB_USERNAME', 'DB_PASSWORD', 'DATABASE_URL']) {
      expect(src).not.toMatch(new RegExp(`\\$\\{\\s*(process\\.env\\.)?${k}\\s*\\}`));
    }
    expect(src).not.toMatch(/\berror\.stack\b/);
    expect(src).not.toMatch(/console\.(log|error)\((error|err|closeError)\)/);
  });
  it('reports transport / assertion lines and uses the safe error summary', () => {
    for (const lit of [
      "Database transport: ${isCloudSQLSocket ? 'CLOUD_SQL_SOCKET' : 'TCP'}", 'Database configuration: COMPLETE', 'Database connection: SUCCESS',
      "'CLASSIFICATION'", "'CURRENT_INCREMENTAL_PREFIX'", "'EXPECTED_SCHEMA_STATE'", "'EXPECTED_FINGERPRINT'", "'LIVE_FINGERPRINT'",
      "'PRE_MIGRATION_SCHEMA_ASSERTION'", "'POST_MIGRATION_SCHEMA_ASSERTION'", "'MANUAL_INVESTIGATION_REQUIRED', 'YES'",
      "'EXPECTED_LIVE_FINGERPRINT_MATCH'", "'UNKNOWN_HISTORY_NAMES'", "'DB_WRITES', 0", 'summarizeDatabaseError(', 'formatSafeErrorSummary(',
      "case 'UNKNOWN_PARTIAL'", "'HISTORICAL_REPLAY', 'ZERO'", "transaction: 'each'", 'process.exit(1)',
    ]) expect(src).toContain(lit);
  });
  it('scripts/db/check-migration-contract.mjs passes including C21–C24', () => {
    const r = spawnSync(process.execPath, [path.join(REPO_ROOT, 'scripts', 'db', 'check-migration-contract.mjs')], { encoding: 'utf8', cwd: REPO_ROOT });
    const out = r.stdout + r.stderr;
    expect({ status: r.status, fail: out.split('\n').filter((l) => l.startsWith('FAIL')) }).toEqual({ status: 0, fail: [] });
    for (const id of ['C21', 'C22', 'C23', 'C24']) expect(out).toMatch(new RegExp(`^PASS \\[${id}\\]`, 'm'));
  });
});

// ───────────────────────────── 2. 순수 단위
describe('incremental prefix rule', () => {
  const M = ['M1', 'M2', 'M3'];
  const hist = (...inc: string[]) => ['H1', 'H2', ...inc];
  it.each([
    [[], 0, ['M1', 'M2', 'M3']],
    [['M1'], 1, ['M2', 'M3']],
    [['M1', 'M2'], 2, ['M3']],
    [['M1', 'M2', 'M3'], 3, []],
  ])('accepts contiguous prefix %j', (applied, prefixLength, pending) => {
    const r = resolveIncrementalPrefix(hist(...(applied as string[])), M);
    expect({ contiguous: r.contiguous, prefixLength: r.prefixLength, pending: r.pending, problems: r.problems }).toEqual({ contiguous: true, prefixLength, pending, problems: [] });
  });
  it.each([
    [['M2'], 'gap'],
    [['M1', 'M3'], 'skip'],
    [['M3', 'M2'], 'reversal'],
    [['M2', 'M1'], 'reversal (complete set, wrong order)'],
    [['M1', 'M1'], 'duplicate'],
    [['M1', 'M2', 'M1'], 'duplicate after progress'],
  ])('rejects %j (%s)', (applied) => {
    const r = resolveIncrementalPrefix(hist(...(applied as string[])), M);
    expect(r.contiguous).toBe(false);
    expect(r.prefixLength).toBe(-1);
    expect(r.pending).toEqual([]);
    expect(r.problems.length).toBeGreaterThan(0);
  });
});

describe('legacy history name validation', () => {
  const facts = { historical: ['H1', 'H2', 'DUP'], retired: ['R1'], knownDuplicates: ['DUP'] };
  it('accepts historical ∪ retired ∪ manifest with known duplicates at most twice', () => {
    expect(validateLegacyHistoryNames(['H1', 'DUP', 'DUP', 'R1', 'H2', 'M1'], ['M1'], facts)).toEqual({ unknown: [], duplicateProblems: [] });
  });
  it('flags unknown names, a third duplicate and a repeated ordinary name', () => {
    const r = validateLegacyHistoryNames(['H1', 'H1', 'DUP', 'DUP', 'DUP', 'X9'], ['M1'], facts);
    expect(r.unknown).toEqual(['X9']);
    expect(r.duplicateProblems).toHaveLength(2);
  });
  it('production-shaped fixture (historical + retired + duplicates + prefix) is fully known with the real facts', () => {
    const rows = legacyHistoryFixture(manifest);
    expect(validateLegacyHistoryNames(rows, manifest)).toEqual({ unknown: [], duplicateProblems: [] });
    expect(resolveIncrementalPrefix(rows, manifest).prefixLength).toBe(manifest.length);
    expect(historyInsertSql(rows)[0]).toMatch(/^DELETE FROM public\.typeorm_migrations$/);
  });
});

describe('safe database error summary', () => {
  const env = { DB_HOST: 'test-secret-host', DB_NAME: 'test-secret-database', DB_USERNAME: 'test-secret-user', DB_PASSWORD: 'test-secret-password', DB_PORT: '5432' };
  it('replaces env values, quoted database/user, socket paths, URLs and getaddrinfo hosts', () => {
    const text = 'getaddrinfo ENOTFOUND test-secret-host; database "test-secret-database" does not exist; password authentication failed for user "test-secret-user"; postgres://test-secret-user:test-secret-password@test-secret-host:5432/test-secret-database; /cloudsql/proj:region:inst/.s.PGSQL.5432; connect ECONNREFUSED 10.0.0.9:5432';
    const out = redactDatabaseDetails(text, env);
    for (const v of Object.values(env).filter((v) => v !== '5432')) expect(out).not.toContain(v);
    expect(out).not.toContain('10.0.0.9');
    expect(out).not.toContain('/cloudsql/proj');
    expect(out).toContain('<DB_HOST>');
    expect(out).toContain('<DATABASE_URL>');
    expect(out).toContain('<CLOUD_SQL_SOCKET>');
  });
  it('summarizes an Error with code and redacted frames; never returns the raw object', () => {
    const e = Object.assign(new Error('connect ECONNREFUSED test-secret-host:5432'), { code: 'ECONNREFUSED' });
    const s = summarizeDatabaseError(e, env);
    expect(s.code).toBe('ECONNREFUSED');
    expect(s.message).not.toContain('test-secret-host');
    const txt = formatSafeErrorSummary(s);
    expect(txt.startsWith('Error [ECONNREFUSED]: ')).toBe(true);
    expect(txt).not.toContain('test-secret-host');
    expect(summarizeDatabaseError('plain test-secret-password', env).message).toBe('plain <DB_PASSWORD>');
  });
});

// ───────────────────────────── 3. 로그 비노출 (§8.3)
describe('migrate.ts --status with fake credentials never echoes them (§8.3)', () => {
  const fake = { DB_HOST: 'test-secret-host', DB_NAME: 'test-secret-database', DB_USERNAME: 'test-secret-user', DB_PASSWORD: 'test-secret-password', DB_PORT: '5432' };
  it('fails to connect (exit 1) and the output contains no host / database / user / password / connection string', () => {
    const { status, out } = runMigrate(['--status'], fake);
    expect(status).toBe(1);
    for (const v of Object.values(fake).filter((v) => v !== '5432')) expect(out).not.toContain(v);
    expect(out).not.toMatch(/postgres(ql)?:\/\//);
    expect(out).toContain('Database transport: TCP');
    expect(out).toContain('Database configuration: COMPLETE');
    expect(out).toContain('Migration Job - FAILED');
  }, 180_000);
  it('missing variables are reported as SET / MISSING only', () => {
    const { status, out } = runMigrate(['--status'], { DB_HOST: 'test-secret-host', DB_NAME: 'test-secret-database' });
    expect(status).toBe(1);
    expect(out).toContain('DB_HOST: SET');
    expect(out).toContain('DB_USERNAME: MISSING');
    expect(out).toContain('DB_PASSWORD: MISSING');
    expect(out).not.toContain('test-secret-host');
    expect(out).not.toContain('test-secret-database');
  }, 180_000);
});

// ───────────────────────────── 4. 격리 PostgreSQL (§8.2)
const isolatedUrl = isolatedPgUrl();
const describeIsolated = isolatedUrl ? describe : describe.skip;
if (!isolatedUrl) {
  console.warn(`[classifier-harness] ${ISOLATED_PG_ENV} not set — §8.2 isolated-PostgreSQL scenarios SKIPPED (not passed).`);
}

describeIsolated('isolated PostgreSQL classifier scenarios (§8.2)', () => {
  // describe.skip still evaluates this body, so the harness (which validates the URL in its
  // constructor) must only be built when the block actually runs.
  let harness: IsolatedPgHarness;
  beforeAll(() => {
    harness = new IsolatedPgHarness(isolatedUrl ?? '');
  });
  afterAll(async () => {
    await harness?.cleanup();
  }, 120_000);

  it('classifies all standard scenarios as expected (real PostgreSQL verdicts)', async () => {
    const results = await harness.runScenarios((qr, c) => classifyDatabaseState(qr, c));
    console.log(renderScenarioTable(results));
    expect(results.map((r) => `${r.id} ${r.actual}`)).toEqual(standardScenarios().map((s) => `${s.id} ${s.expect}`));
  }, 600_000);

  it('--status on a legacy-established database: LEGACY_ESTABLISHED, PRE assertion PASS, zero writes, no connection details in the log', async () => {
    const templates = await harness.buildTemplates();
    const db = await harness.createDatabase('status_zero_writes', templates.bootstrap_inc);
    await harness.execute(db, ['DROP TABLE public.o4o_schema_baselines', ...historyInsertSql(legacyHistoryFixture(manifest))]);
    const stat = async () => (await harness.query<{ ins: string; upd: string; del: string }>(db, `SELECT tup_inserted::text AS ins, tup_updated::text AS upd, tup_deleted::text AS del FROM pg_stat_database WHERE datname = current_database()`))[0];
    const snapshot = async () => ({
      stat: await stat(),
      history: (await harness.query<{ n: string }>(db, 'SELECT count(*)::text AS n FROM public.typeorm_migrations'))[0].n,
      fingerprint: await harness.fingerprintOf(db),
    });
    const before = await snapshot();
    const c = harness.connection(db);
    const { status, out } = runMigrate(['--status'], { DB_HOST: c.host, DB_PORT: String(c.port), DB_USERNAME: c.user, DB_PASSWORD: c.password, DB_NAME: c.database });
    const after = await snapshot();
    expect(status).toBe(0);
    expect(reported(out, 'DATABASE_STATE')).toBe('LEGACY_ESTABLISHED');
    expect(reported(out, 'PRE_MIGRATION_SCHEMA_ASSERTION')).toBe('PASS');
    expect(reported(out, 'EXPECTED_LIVE_FINGERPRINT_MATCH')).toBe('YES');
    expect(reported(out, 'CURRENT_INCREMENTAL_PREFIX')).toBe(`${manifest.length} / ${manifest.length}`);
    expect(reported(out, 'INCREMENTAL_PENDING')).toBe('0');
    expect(reported(out, 'UNKNOWN_HISTORY_NAMES')).toBe('0');
    expect(reported(out, 'DB_WRITES')).toBe('0');
    expect(reported(out, 'MIGRATION_JOB')).toBe('STATUS_ONLY');
    expect(after).toEqual(before);
    for (const secret of [c.database, c.user, c.password]) expect(out).not.toContain(secret);
    expect(out).toContain('Database transport: TCP');
    expect(out).toContain('Database connection: SUCCESS');
  }, 600_000);

  it('fresh database full sequence: FRESH_EMPTY → bootstrap → incremental → POST assertion PASS (§9)', async () => {
    const db = await harness.createDatabase('fresh_full_sequence');
    const c = harness.connection(db);
    const env = { DB_HOST: c.host, DB_PORT: String(c.port), DB_USERNAME: c.user, DB_PASSWORD: c.password, DB_NAME: c.database };
    const first = runMigrate([], env);
    expect(first.status).toBe(0);
    expect(reported(first.out, 'DATABASE_STATE')).toBe('FRESH_EMPTY');
    expect(reported(first.out, 'PRE_MIGRATION_SCHEMA_ASSERTION')).toBe('NOT_APPLICABLE');
    expect(reported(first.out, 'BOOTSTRAP_EXECUTION')).toBe('EXECUTED');
    expect(reported(first.out, 'INCREMENTAL_EXECUTED')).toBe(String(manifest.length));
    expect(reported(first.out, 'POST_MIGRATION_SCHEMA_ASSERTION')).toBe('PASS');
    expect(reported(first.out, 'MIGRATION_JOB')).toBe('SUCCESS');
    const finalState = EXPECTED_SCHEMA_STATES[manifest.length];
    expect(await harness.fingerprintOf(db)).toEqual({ hash: finalState.fingerprint, lineCount: finalState.fingerprintLineCount });
    // second run is a verified no-op
    const second = runMigrate([], env);
    expect(second.status).toBe(0);
    expect(reported(second.out, 'DATABASE_STATE')).toBe('BOOTSTRAPPED');
    expect(reported(second.out, 'PRE_MIGRATION_SCHEMA_ASSERTION')).toBe('PASS');
    expect(reported(second.out, 'INCREMENTAL_EXECUTED')).toBe('0');
    expect(reported(second.out, 'POST_MIGRATION_SCHEMA_ASSERTION')).toBe('PASS');
    for (const secret of [c.database, c.user, c.password]) expect(`${first.out}${second.out}`).not.toContain(secret);
  }, 600_000);

  it('drifted database: PRE assertion FAILED → UNKNOWN_PARTIAL, nothing executed, MANUAL_INVESTIGATION_REQUIRED', async () => {
    const templates = await harness.buildTemplates();
    const db = await harness.createDatabase('drift_refused', templates.bootstrap_inc);
    await harness.execute(db, ['ALTER TABLE public.store_tablet_devices DROP COLUMN last_seen_at']);
    const before = await harness.fingerprintOf(db);
    const c = harness.connection(db);
    const { status, out } = runMigrate([], { DB_HOST: c.host, DB_PORT: String(c.port), DB_USERNAME: c.user, DB_PASSWORD: c.password, DB_NAME: c.database });
    expect(status).toBe(1);
    expect(reported(out, 'DATABASE_STATE')).toBe('UNKNOWN_PARTIAL');
    expect(reported(out, 'PRE_MIGRATION_SCHEMA_ASSERTION')).toBe('FAILED');
    expect(reported(out, 'BOOTSTRAP_EXECUTION')).toBe('REFUSED');
    expect(reported(out, 'INCREMENTAL_EXECUTED')).toBe('0');
    expect(reported(out, 'MANUAL_INVESTIGATION_REQUIRED')).toBe('YES');
    expect(reported(out, 'MIGRATION_JOB')).toBe('FAILED');
    expect(await harness.fingerprintOf(db)).toEqual(before);
  }, 600_000);
});
