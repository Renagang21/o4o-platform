/**
 * Isolated-PostgreSQL classifier harness
 * (WO-O4O-DATABASE-STATE-CLASSIFIER-SCHEMA-DRIFT-AND-CONNECTION-LOG-HARDENING-V1 §8.2)
 *
 * Builds real database states in a throw-away PostgreSQL instance and runs the classifier
 * against each of them. Never points at production: the target comes ONLY from
 * `O4O_ISOLATED_PG_URL` (a local/docker superuser-ish connection, e.g. postgres:15) and every
 * database created here is prefixed `o4o_hz_`. The URL is never logged.
 *
 * Two templates are built once (canonical bootstrap · bootstrap + every incremental migration)
 * and each scenario is `CREATE DATABASE … TEMPLATE …` + a mutation, so the whole table runs in
 * well under a minute. The `classify` function is injectable so the same scenarios can be run
 * against a previous classifier (BEFORE) and the current one (AFTER).
 */

import { Client } from 'pg';
import { DataSource, type QueryRunner } from 'typeorm';
import { runCanonicalBootstrap } from '../../database/bootstrap/bootstrap-runner.js';
import { computeSchemaFingerprint } from '../../database/bootstrap/schema-fingerprint.js';
import { BASELINE_MARKER_TABLE } from '../../database/bootstrap/baseline-marker.js';
import { INCREMENTAL_MIGRATIONS, incrementalMigrationNames } from '../../database/incremental/manifest.js';
import { HISTORICAL_MIGRATION_NAMES } from '../../database/incremental/historical-migration-names.js';
import {
  LEGACY_HISTORY_KNOWN_DUPLICATES,
  LEGACY_HISTORY_RETIRED_NAMES,
} from '../../database/incremental/legacy-history.facts.js';
import type { ExpectedSchemaState } from '../../database/incremental/expected-schema-states.js';

export const ISOLATED_PG_ENV = 'O4O_ISOLATED_PG_URL';
export const HARNESS_DB_PREFIX = 'o4o_hz_';

export interface ClassifyOutcome {
  readonly state: string;
  readonly reasons: readonly string[];
  readonly facts?: Record<string, unknown>;
}

export interface ClassifierContractOverride {
  readonly manifestNames?: readonly string[];
  readonly expectedStates?: readonly ExpectedSchemaState[];
}

export type ClassifyFn = (queryRunner: QueryRunner, contract?: ClassifierContractOverride) => Promise<ClassifyOutcome>;

export interface Scenario {
  readonly id: string;
  readonly description: string;
  /** 'fresh' = empty database; otherwise a template name. */
  readonly base: 'fresh' | 'bootstrap' | 'bootstrap_inc';
  /** SQL statements applied after cloning (each in autocommit). */
  readonly mutate?: readonly string[];
  /** Synthetic contract for gap / reversal scenarios. */
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

/** Legacy history rows in the shape production carries: historical names, retired facts, duplicates, then the incremental prefix. */
export function legacyHistoryFixture(incrementalPrefix: readonly string[]): readonly string[] {
  const rows: string[] = [];
  for (const n of HISTORICAL_MIGRATION_NAMES) {
    rows.push(n);
    if (LEGACY_HISTORY_KNOWN_DUPLICATES.includes(n)) rows.push(n);
  }
  rows.push(...LEGACY_HISTORY_RETIRED_NAMES);
  rows.push(...incrementalPrefix);
  return rows;
}

export function historyInsertSql(names: readonly string[]): string[] {
  const out: string[] = [`DELETE FROM public.typeorm_migrations`];
  names.forEach((n, i) => {
    if (!/^[A-Za-z0-9_]+$/.test(n)) throw new Error(`unsafe history name in fixture: ${n}`);
    out.push(`INSERT INTO public.typeorm_migrations (timestamp, name) VALUES (${1700000000000 + i}, '${n}')`);
  });
  return out;
}

/** The §8.2 scenario table. `M` = incremental manifest names. */
export function standardScenarios(): Scenario[] {
  const M = incrementalMigrationNames();
  const M1 = M[0];
  const legacyRows = legacyHistoryFixture(M);
  const legacyBase = [`DROP TABLE public.${BASELINE_MARKER_TABLE}`, ...historyInsertSql(legacyRows)];
  const marker = BASELINE_MARKER_TABLE;
  // synthetic 3-entry manifest for prefix-rule scenarios (only M1 has a real expected state)
  const synthetic = [M1, 'HarnessSyntheticSecond1800000000002', 'HarnessSyntheticThird1800000000003'];
  return [
    { id: 'S01', description: 'fresh empty database', base: 'fresh', expect: 'FRESH_EMPTY' },
    { id: 'S02', description: 'bootstrap only (marker, no incremental)', base: 'bootstrap', expect: 'BOOTSTRAPPED' },
    { id: 'S03', description: 'bootstrap, non-core column dropped', base: 'bootstrap', mutate: ['ALTER TABLE public.store_tablet_screen_sets DROP COLUMN updated_at'], expect: 'UNKNOWN_PARTIAL' },
    { id: 'S04', description: 'bootstrap, extra table added', base: 'bootstrap', mutate: ['CREATE TABLE public.harness_extra_table (id integer)'], expect: 'UNKNOWN_PARTIAL' },
    { id: 'S05', description: 'bootstrap + incremental 1 applied normally', base: 'bootstrap_inc', expect: 'BOOTSTRAPPED' },
    { id: 'S06', description: 'bootstrap + incremental 1, then non-core column dropped', base: 'bootstrap_inc', mutate: ['ALTER TABLE public.store_tablet_devices DROP COLUMN last_seen_at'], expect: 'UNKNOWN_PARTIAL' },
    { id: 'S07', description: 'legacy established (history 678-shaped, no marker) + incremental 1', base: 'bootstrap_inc', mutate: legacyBase, expect: 'LEGACY_ESTABLISHED' },
    { id: 'S08', description: 'legacy, non-core constraint dropped', base: 'bootstrap_inc', mutate: [...legacyBase, 'ALTER TABLE public.store_tablet_devices DROP CONSTRAINT "FK_std_current_location"'], expect: 'UNKNOWN_PARTIAL' },
    { id: 'S09', description: 'legacy, incremental history gap [M2] (M1 missing)', base: 'bootstrap_inc', mutate: [`DROP TABLE public.${marker}`, ...historyInsertSql([...legacyHistoryFixture([]), synthetic[1]])], contract: { manifestNames: synthetic }, expect: 'UNKNOWN_PARTIAL' },
    { id: 'S10', description: 'legacy, incremental history skip [M1, M3]', base: 'bootstrap_inc', mutate: [`DROP TABLE public.${marker}`, ...historyInsertSql([...legacyHistoryFixture([]), synthetic[0], synthetic[2]])], contract: { manifestNames: synthetic }, expect: 'UNKNOWN_PARTIAL' },
    { id: 'S11', description: 'legacy, incremental history reversal [M2, M1]', base: 'bootstrap_inc', mutate: [`DROP TABLE public.${marker}`, ...historyInsertSql([...legacyHistoryFixture([]), synthetic[1], synthetic[0]])], contract: { manifestNames: synthetic }, expect: 'UNKNOWN_PARTIAL' },
    { id: 'S12', description: 'legacy, history name outside manifest / historical / retired facts', base: 'bootstrap_inc', mutate: [...legacyBase, `INSERT INTO public.typeorm_migrations (timestamp, name) VALUES (1799999999999, 'HarnessUnknownName1799999999999')`], expect: 'UNKNOWN_PARTIAL' },
    { id: 'S13', description: 'marker AND legacy anchors coexist', base: 'bootstrap_inc', mutate: historyInsertSql(legacyRows), expect: 'UNKNOWN_PARTIAL' },
    { id: 'S14', description: 'bootstrap + incremental 1, M1 recorded twice', base: 'bootstrap_inc', mutate: [`INSERT INTO public.typeorm_migrations (timestamp, name) VALUES (1799999999998, '${M1}')`], expect: 'UNKNOWN_PARTIAL' },
    { id: 'S15', description: 'legacy, known duplicate recorded a third time', base: 'bootstrap_inc', mutate: [...legacyBase, `INSERT INTO public.typeorm_migrations (timestamp, name) VALUES (1799999999997, '${LEGACY_HISTORY_KNOWN_DUPLICATES[0]}')`], expect: 'UNKNOWN_PARTIAL' },
    { id: 'S16', description: 'legacy, anchors present but last historical migration row missing', base: 'bootstrap_inc', mutate: [...legacyBase, `DELETE FROM public.typeorm_migrations WHERE name = 'BaselineRbacAndAccountTables20270413000000'`], expect: 'UNKNOWN_PARTIAL' },
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

  /** Templates: canonical bootstrap; bootstrap + every incremental migration. */
  private templates: Promise<{ bootstrap: string; bootstrap_inc: string }> | null = null;

  /** Memoized: templates are built once per harness instance. */
  buildTemplates(): Promise<{ bootstrap: string; bootstrap_inc: string }> {
    if (!this.templates) this.templates = this.buildTemplatesOnce();
    return this.templates;
  }

  private async buildTemplatesOnce(): Promise<{ bootstrap: string; bootstrap_inc: string }> {
    await this.assertLocalIsolated();
    const bootstrap = await this.createDatabase('tpl_bootstrap');
    await this.withQueryRunner(bootstrap, async (qr) => {
      await qr.startTransaction();
      await runCanonicalBootstrap(qr, silentLog);
      await qr.commitTransaction();
    });
    const bootstrapInc = await this.createDatabase('tpl_bootstrap_inc', bootstrap);
    const ds = this.dataSource(bootstrapInc, true);
    await ds.initialize();
    try {
      const executed = await ds.runMigrations({ transaction: 'each' });
      if (executed.length !== INCREMENTAL_MIGRATIONS.length) throw new Error(`template applied ${executed.length}/${INCREMENTAL_MIGRATIONS.length} incremental migrations`);
    } finally {
      await ds.destroy();
    }
    return { bootstrap, bootstrap_inc: bootstrapInc };
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
