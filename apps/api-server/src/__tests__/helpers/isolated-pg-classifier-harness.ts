/**
 * Isolated-PostgreSQL classifier harness
 * (WO-O4O-DATABASE-STATE-CLASSIFIER-SCHEMA-DRIFT-AND-CONNECTION-LOG-HARDENING-V1 §8.2,
 *  rewritten for the ordered history fingerprint by
 *  WO-O4O-RETIRED-SERVICE-MIGRATION-HISTORY-SQUASH-AND-BASELINE-FINAL-CLOSURE-V1 §37)
 *
 * Builds real database states in a throw-away PostgreSQL instance and runs the classifier
 * against each of them. Never points at production: the target comes ONLY from
 * `O4O_ISOLATED_PG_URL` (a local/docker superuser-ish connection, e.g. postgres:15) and every
 * database created here is prefixed `o4o_hz_`. The URL is never logged.
 *
 * One template is built once (canonical bootstrap; the incremental manifest is empty since the
 * 2026-09-18-id685 rollover) and each scenario is `CREATE DATABASE … TEMPLATE …` + a mutation.
 *
 * History provenance is synthetic by design: the repository holds no plaintext legacy migration
 * names, so legacy scenarios insert a SYNTHETIC legacy history and inject a matching
 * `legacyBaseline` (hashed by the ONE canonical helper) through the classifier contract.
 * Incremental-prefix scenarios likewise inject a synthetic 3-name manifest whose migrations
 * change nothing, so every synthetic expected state reuses the baseline fingerprint.
 *
 * The production-equivalent legacy check (real 684-row history, real LEGACY_HISTORY_BASELINE) is
 * opt-in: `O4O_LEGACY_HISTORY_FILE` points at a local, untracked, newline-separated name list
 * captured read-only from production. It is never committed.
 */

import fs from 'fs';
import { Client } from 'pg';
import { DataSource, type QueryRunner } from 'typeorm';
import { runCanonicalBootstrap } from '../../database/bootstrap/bootstrap-runner.js';
import { computeSchemaFingerprint } from '../../database/bootstrap/schema-fingerprint.js';
import { BASELINE_MARKER_TABLE } from '../../database/bootstrap/baseline-marker.js';
import { hashOrderedHistoryNames } from '../../database/bootstrap/legacy-history-fingerprint.js';
import { INCREMENTAL_MIGRATIONS } from '../../database/incremental/manifest.js';
import { EXPECTED_SCHEMA_STATES, type ExpectedSchemaState } from '../../database/incremental/expected-schema-states.js';
import type { LegacyHistoryBaseline } from '../../database/incremental/legacy-history-baseline.js';

export const ISOLATED_PG_ENV = 'O4O_ISOLATED_PG_URL';
export const LEGACY_HISTORY_FILE_ENV = 'O4O_LEGACY_HISTORY_FILE';
export const HARNESS_DB_PREFIX = 'o4o_hz_';

export interface ClassifyOutcome {
  readonly state: string;
  readonly reasons: readonly string[];
  readonly facts?: Record<string, unknown>;
}

export interface ClassifierContractOverride {
  readonly manifestNames?: readonly string[];
  readonly expectedStates?: readonly ExpectedSchemaState[];
  readonly legacyBaseline?: LegacyHistoryBaseline;
}

export type ClassifyFn = (queryRunner: QueryRunner, contract?: ClassifierContractOverride) => Promise<ClassifyOutcome>;

export interface Scenario {
  readonly id: string;
  readonly description: string;
  /** 'fresh' = empty database; otherwise a template name. */
  readonly base: 'fresh' | 'bootstrap';
  /** SQL statements applied after cloning (each in autocommit). */
  readonly mutate?: readonly string[];
  /** Synthetic contract (manifest / expected states / legacy baseline). */
  readonly contract?: ClassifierContractOverride;
  readonly expect: string;
}

export interface ScenarioResult {
  readonly id: string;
  readonly description: string;
  readonly expect: string;
  readonly actual: string;
  readonly pass: boolean;
  readonly reasons: readonly string[];
  readonly database: string;
}

const silentLog = { info: () => {}, warn: () => {}, error: () => {} };

function parseUrl(url: string) {
  const u = new URL(url);
  return {
    host: u.hostname,
    port: Number(u.port || 5432),
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: u.pathname.replace(/^\//, '') || 'postgres',
  };
}

export function isolatedPgUrl(): string | undefined {
  const v = process.env[ISOLATED_PG_ENV];
  return v && v.trim() ? v.trim() : undefined;
}

/** Local, untracked production history capture (id order, one name per line); undefined when absent. */
export function realLegacyHistoryNames(): readonly string[] | undefined {
  const p = process.env[LEGACY_HISTORY_FILE_ENV];
  if (!p || !p.trim() || !fs.existsSync(p.trim())) return undefined;
  return fs.readFileSync(p.trim(), 'utf8').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
}

// ───────────────────────────── synthetic fixtures

/** Synthetic legacy history: `size` rows in id order, the names at `duplicateAt` recorded twice (production has 3 such duplicates). */
export function syntheticLegacyHistory(size = 100, duplicateAt: readonly number[] = [7, 40, 71]): readonly string[] {
  const rows: string[] = [];
  let i = 0;
  while (rows.length < size) {
    const name = `HarnessLegacy${String(i).padStart(4, '0')}${1600000000000 + i}`;
    rows.push(name);
    if (duplicateAt.includes(i) && rows.length < size) rows.push(name);
    i += 1;
  }
  return rows;
}

/** Baseline derived from a fixture with the canonical hash helper (the classifier uses the same function). */
export function legacyBaselineOf(names: readonly string[], capturedAt = '2026-09-18'): LegacyHistoryBaseline {
  return {
    rowCount: names.length,
    distinctNameCount: new Set(names).size,
    orderedNameSequenceSha256: hashOrderedHistoryNames(names),
    capturedThroughId: names.length,
    capturedAt,
  };
}

/** Synthetic incremental manifest whose migrations change no schema object. */
export const SYNTHETIC_MANIFEST: readonly string[] = [
  'HarnessSyntheticFirst1800000000001',
  'HarnessSyntheticSecond1800000000002',
  'HarnessSyntheticThird1800000000003',
];

/**
 * Expected states for SYNTHETIC_MANIFEST: every prefix reuses the TEMPLATE fingerprint (no-op migrations).
 * The bootstrap template has every REAL incremental migration applied (buildTemplatesOnce), so its schema is
 * EXPECTED_SCHEMA_STATES[INCREMENTAL_MIGRATIONS.length] — not [0] once the first post-rollover incremental lands
 * (WO-O4O-STORE-OWNER-AGREEMENT-PUBLISH-PREREQUISITES-CLOSURE-HANDOFF-V1: S05/S07/S08 were false UNKNOWN_PARTIAL).
 */
export function syntheticExpectedStates(
  baseline: ExpectedSchemaState = EXPECTED_SCHEMA_STATES[INCREMENTAL_MIGRATIONS.length] ?? EXPECTED_SCHEMA_STATES[0],
): readonly ExpectedSchemaState[] {
  return [baseline, ...SYNTHETIC_MANIFEST.map((name) => ({ appliedThrough: name, fingerprint: baseline.fingerprint, fingerprintLineCount: baseline.fingerprintLineCount }))];
}

/** TypeORM's own history table shape (created lazily by runMigrations; a bootstrap-only template has none yet). */
export const HISTORY_TABLE_SQL = 'CREATE TABLE IF NOT EXISTS public.typeorm_migrations (id SERIAL PRIMARY KEY, "timestamp" bigint NOT NULL, name character varying NOT NULL)';

export function historyInsertSql(names: readonly string[]): string[] {
  const out: string[] = [HISTORY_TABLE_SQL, `DELETE FROM public.typeorm_migrations`];
  names.forEach((n, i) => {
    if (!/^[A-Za-z0-9_]+$/.test(n)) throw new Error(`unsafe history name in fixture: ${n}`);
    out.push(`INSERT INTO public.typeorm_migrations (timestamp, name) VALUES (${1700000000000 + i}, '${n}')`);
  });
  return out;
}

/** History mutations that must each break the ordered fingerprint (§37 negatives). */
export function mutatedLegacyHistories(legacy: readonly string[]): Record<'renamed' | 'missing' | 'reordered' | 'inserted' | 'truncated' | 'thirdDuplicate', readonly string[]> {
  const mid = Math.floor(legacy.length / 2);
  const dupIndex = legacy.findIndex((n, i) => legacy[i + 1] === n);
  return {
    renamed: legacy.map((n, i) => (i === mid ? `${n}Renamed` : n)),
    missing: legacy.filter((_, i) => i !== mid),
    reordered: legacy.map((n, i) => (i === mid ? legacy[mid + 1] : i === mid + 1 ? legacy[mid] : n)),
    inserted: [...legacy.slice(0, mid), 'HarnessInsertedRow1799999999990', ...legacy.slice(mid)],
    truncated: legacy.slice(0, mid),
    thirdDuplicate: [...legacy.slice(0, dupIndex + 2), legacy[dupIndex], ...legacy.slice(dupIndex + 2)],
  };
}

/** The scenario table (§8.2 + §37). `M` = synthetic manifest names, `L` = synthetic legacy history. */
export function standardScenarios(): Scenario[] {
  const marker = BASELINE_MARKER_TABLE;
  const M = SYNTHETIC_MANIFEST;
  const states = syntheticExpectedStates();
  const L = syntheticLegacyHistory();
  const legacyBaseline = legacyBaselineOf(L);
  const bad = mutatedLegacyHistories(L);
  const inc = { manifestNames: M, expectedStates: states };
  const leg = { legacyBaseline };
  const legInc = { ...inc, ...leg };
  const dropMarker = `DROP TABLE public.${marker}`;
  const legacy = (rows: readonly string[]) => [dropMarker, ...historyInsertSql(rows)];
  return [
    { id: 'S01', description: 'fresh empty database', base: 'fresh', expect: 'FRESH_EMPTY' },
    { id: 'S02', description: 'bootstrap only (marker, no incremental)', base: 'bootstrap', expect: 'BOOTSTRAPPED' },
    { id: 'S03', description: 'bootstrap, non-core column dropped', base: 'bootstrap', mutate: ['ALTER TABLE public.store_tablet_screen_sets DROP COLUMN updated_at'], expect: 'UNKNOWN_PARTIAL' },
    { id: 'S04', description: 'bootstrap, extra table added', base: 'bootstrap', mutate: ['CREATE TABLE public.harness_extra_table (id integer)'], expect: 'UNKNOWN_PARTIAL' },
    { id: 'S05', description: 'bootstrap + incremental [M1] recorded (no-op migration)', base: 'bootstrap', mutate: historyInsertSql([M[0]]), contract: inc, expect: 'BOOTSTRAPPED' },
    { id: 'S06', description: 'bootstrap + incremental [M1], then non-core column dropped', base: 'bootstrap', mutate: [...historyInsertSql([M[0]]), 'ALTER TABLE public.store_tablet_devices DROP COLUMN last_seen_at'], contract: inc, expect: 'UNKNOWN_PARTIAL' },
    // S07 compares the template schema at incremental prefix 0, so it must read the synthetic (template) expected
    // states — the real registry's [0] is the bare baseline, which the template no longer equals once a real
    // incremental exists (see syntheticExpectedStates).
    { id: 'S07', description: 'legacy established (synthetic ordered history == injected baseline, no marker)', base: 'bootstrap', mutate: legacy(L), contract: { ...leg, expectedStates: states }, expect: 'LEGACY_ESTABLISHED' },
    { id: 'S08', description: 'legacy + incremental [M1] after the legacy prefix', base: 'bootstrap', mutate: legacy([...L, M[0]]), contract: legInc, expect: 'LEGACY_ESTABLISHED' },
    { id: 'S09', description: 'legacy, non-core constraint dropped (schema drift)', base: 'bootstrap', mutate: [...legacy(L), 'ALTER TABLE public.store_tablet_devices DROP CONSTRAINT "FK_std_current_location"'], contract: leg, expect: 'UNKNOWN_PARTIAL' },
    { id: 'S10', description: 'legacy, incremental history gap [M2] (M1 missing)', base: 'bootstrap', mutate: legacy([...L, M[1]]), contract: legInc, expect: 'UNKNOWN_PARTIAL' },
    { id: 'S11', description: 'legacy, incremental history skip [M1, M3]', base: 'bootstrap', mutate: legacy([...L, M[0], M[2]]), contract: legInc, expect: 'UNKNOWN_PARTIAL' },
    { id: 'S12', description: 'legacy, incremental history reversal [M2, M1]', base: 'bootstrap', mutate: legacy([...L, M[1], M[0]]), contract: legInc, expect: 'UNKNOWN_PARTIAL' },
    { id: 'S13', description: 'legacy, foreign row after the legacy prefix (not a manifest name)', base: 'bootstrap', mutate: legacy([...L, 'HarnessUnknownName1799999999999']), contract: legInc, expect: 'UNKNOWN_PARTIAL' },
    { id: 'S14', description: 'marker AND legacy history fingerprint coexist', base: 'bootstrap', mutate: historyInsertSql(L), contract: leg, expect: 'UNKNOWN_PARTIAL' },
    { id: 'S15', description: 'bootstrap + incremental [M1] recorded twice', base: 'bootstrap', mutate: historyInsertSql([M[0], M[0]]), contract: inc, expect: 'UNKNOWN_PARTIAL' },
    { id: 'S16', description: 'legacy, one history row renamed', base: 'bootstrap', mutate: legacy(bad.renamed), contract: leg, expect: 'UNKNOWN_PARTIAL' },
    { id: 'S17', description: 'legacy, one history row missing', base: 'bootstrap', mutate: legacy(bad.missing), contract: leg, expect: 'UNKNOWN_PARTIAL' },
    { id: 'S18', description: 'legacy, two adjacent history rows reordered', base: 'bootstrap', mutate: legacy(bad.reordered), contract: leg, expect: 'UNKNOWN_PARTIAL' },
    { id: 'S19', description: 'legacy, extra row inserted inside the legacy prefix', base: 'bootstrap', mutate: legacy(bad.inserted), contract: leg, expect: 'UNKNOWN_PARTIAL' },
    { id: 'S20', description: 'legacy, history truncated (fewer rows than the baseline)', base: 'bootstrap', mutate: legacy(bad.truncated), contract: leg, expect: 'UNKNOWN_PARTIAL' },
    { id: 'S21', description: 'legacy, known duplicate recorded a third time inside the prefix', base: 'bootstrap', mutate: legacy(bad.thirdDuplicate), contract: leg, expect: 'UNKNOWN_PARTIAL' },
    { id: 'S22', description: 'legacy, incremental [M1] recorded inside the prefix (prefix shifted)', base: 'bootstrap', mutate: legacy([...L.slice(0, -1), M[0], L[L.length - 1]]), contract: legInc, expect: 'UNKNOWN_PARTIAL' },
    { id: 'S23', description: 'legacy, prefix intact but no expected state for incremental prefix 3+', base: 'bootstrap', mutate: legacy([...L, M[0], M[1], M[2]]), contract: { ...legInc, expectedStates: states.slice(0, 3) }, expect: 'UNKNOWN_PARTIAL' },
  ];
}

export class IsolatedPgHarness {
  private readonly cfg: ReturnType<typeof parseUrl>;
  private readonly created: string[] = [];
  private admin: Client | null = null;
  private readonly runId = `${Date.now().toString(36)}`;

  constructor(url: string) {
    this.cfg = parseUrl(url);
  }

  dbName(tag: string): string {
    return `${HARNESS_DB_PREFIX}${this.runId}_${tag}`.toLowerCase();
  }

  /** Connection parameters for a harness database (for subprocess env). Never log these. */
  connection(database: string) {
    return { host: this.cfg.host, port: this.cfg.port, user: this.cfg.user, password: this.cfg.password, database };
  }

  private async adminClient(): Promise<Client> {
    if (!this.admin) {
      this.admin = new Client({ ...this.cfg });
      await this.admin.connect();
    }
    return this.admin;
  }

  private async assertLocalIsolated(): Promise<void> {
    const c = await this.adminClient();
    const r = await c.query(`SELECT current_setting('server_version') AS v, (SELECT count(*) FROM pg_database WHERE datname = 'o4o_platform') AS prodlike`);
    if (Number(r.rows[0].prodlike) > 0) throw new Error('refusing to run the harness on a server that hosts o4o_platform');
    if (!['127.0.0.1', 'localhost', '::1'].includes(this.cfg.host)) throw new Error('harness target must be a local PostgreSQL');
  }

  async createDatabase(tag: string, template?: string): Promise<string> {
    const c = await this.adminClient();
    const name = this.dbName(tag);
    await c.query(`CREATE DATABASE "${name}"${template ? ` TEMPLATE "${template}"` : ''}`);
    this.created.push(name);
    return name;
  }

  dataSource(database: string, withMigrations = false): DataSource {
    const c = this.connection(database);
    return new DataSource({
      type: 'postgres',
      host: c.host,
      port: c.port,
      username: c.user,
      password: c.password,
      database: c.database,
      entities: [],
      migrations: withMigrations ? [...INCREMENTAL_MIGRATIONS] : [],
      migrationsTableName: 'typeorm_migrations',
      synchronize: false,
      logging: false,
    });
  }

  async withQueryRunner<T>(database: string, fn: (qr: QueryRunner) => Promise<T>, withMigrations = false): Promise<T> {
    const ds = this.dataSource(database, withMigrations);
    await ds.initialize();
    const qr = ds.createQueryRunner();
    await qr.connect();
    try {
      return await fn(qr);
    } finally {
      await qr.release();
      await ds.destroy();
    }
  }

  /** Read-only classification inside a rolled-back transaction. */
  async classifyIn(database: string, classify: ClassifyFn, contract?: ClassifierContractOverride): Promise<ClassifyOutcome> {
    return this.withQueryRunner(database, async (qr) => {
      await qr.startTransaction();
      try {
        return await classify(qr, contract);
      } finally {
        await qr.rollbackTransaction();
      }
    });
  }

  async fingerprintOf(database: string): Promise<{ hash: string; lineCount: number }> {
    return this.withQueryRunner(database, async (qr) => {
      await qr.startTransaction();
      try {
        const fp = await computeSchemaFingerprint(qr);
        return { hash: fp.hash, lineCount: fp.lineCount };
      } finally {
        await qr.rollbackTransaction();
      }
    });
  }

  async execute(database: string, statements: readonly string[]): Promise<void> {
    const c = new Client({ ...this.connection(database) });
    await c.connect();
    try {
      for (const s of statements) await c.query(s);
    } finally {
      await c.end();
    }
  }

  async query<T = Record<string, unknown>>(database: string, sql: string): Promise<T[]> {
    const c = new Client({ ...this.connection(database) });
    await c.connect();
    try {
      return (await c.query(sql)).rows as T[];
    } finally {
      await c.end();
    }
  }

  /** Templates: canonical bootstrap (+ every incremental migration of the manifest, currently none). */
  private templates: Promise<{ bootstrap: string }> | null = null;

  /** Memoized: templates are built once per harness instance. */
  buildTemplates(): Promise<{ bootstrap: string }> {
    if (!this.templates) this.templates = this.buildTemplatesOnce();
    return this.templates;
  }

  private async buildTemplatesOnce(): Promise<{ bootstrap: string }> {
    await this.assertLocalIsolated();
    const bootstrap = await this.createDatabase('tpl_bootstrap');
    await this.withQueryRunner(bootstrap, async (qr) => {
      await qr.startTransaction();
      await runCanonicalBootstrap(qr, silentLog);
      await qr.commitTransaction();
    });
    if (INCREMENTAL_MIGRATIONS.length > 0) {
      const ds = this.dataSource(bootstrap, true);
      await ds.initialize();
      try {
        const executed = await ds.runMigrations({ transaction: 'each' });
        if (executed.length !== INCREMENTAL_MIGRATIONS.length) throw new Error(`template applied ${executed.length}/${INCREMENTAL_MIGRATIONS.length} incremental migrations`);
      } finally {
        await ds.destroy();
      }
    }
    return { bootstrap };
  }

  async runScenarios(classify: ClassifyFn, scenarios: readonly Scenario[] = standardScenarios()): Promise<ScenarioResult[]> {
    const templates = await this.buildTemplates();
    const results: ScenarioResult[] = [];
    for (const sc of scenarios) {
      const db = await this.createDatabase(sc.id, sc.base === 'fresh' ? undefined : templates[sc.base]);
      if (sc.mutate && sc.mutate.length > 0) await this.execute(db, sc.mutate);
      const outcome = await this.classifyIn(db, classify, sc.contract);
      results.push({ id: sc.id, description: sc.description, expect: sc.expect, actual: outcome.state, pass: outcome.state === sc.expect, reasons: outcome.reasons, database: db });
    }
    return results;
  }

  async cleanup(): Promise<void> {
    if (!this.admin) return;
    const c = this.admin;
    for (const name of [...this.created].reverse()) {
      try {
        await c.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
      } catch {
        /* best effort — harness databases are prefixed and disposable */
      }
    }
    this.created.length = 0;
    this.templates = null;
    await c.end();
    this.admin = null;
  }
}

export function renderScenarioTable(results: readonly ScenarioResult[]): string {
  const lines = ['| # | 시나리오 | 기대 | 실제 | 판정 |', '|---|---|---|---|---|'];
  for (const r of results) lines.push(`| ${r.id} | ${r.description} | \`${r.expect}\` | \`${r.actual}\` | ${r.pass ? 'PASS' : 'FAIL'} |`);
  return lines.join('\n');
}
