/**
 * Canonical DB bootstrap ↔ incremental migration 분리 계약 회귀 테스트
 * (WO-O4O-CANONICAL-DATABASE-BOOTSTRAP-AND-INCREMENTAL-MIGRATION-SEPARATION-V1,
 *  2026-09-18-id685 baseline rollover: WO-O4O-RETIRED-SERVICE-MIGRATION-HISTORY-SQUASH-AND-BASELINE-FINAL-CLOSURE-V1)
 *
 * 배경
 * ────
 * 운영 DB 는 수백 개 historical migration 의 결과물이지만 그 파일들은 빈 DB 에서 재생(replay)되지
 * 않는다(TypeORM 끝 13자리 정렬 + 삭제된 migration). 그래서 빈 DB 는 canonical schema-only
 * snapshot 으로 bootstrap 하고, 운영 DB 는 baseline 이후의 incremental manifest 만 적용한다.
 * 두 경로는 `src/migrate.ts` 한 곳에서 DATABASE_STATE 분류로 갈라지며, 어떤 경로에서도
 * historical migration 은 로드되지 않는다. historical source 파일은 runtime provenance 가 아니다 —
 * 운영 DB 의 legacy history 정당성은 ordered history fingerprint 로 검증한다.
 *
 * 방식
 * ────
 * DB·네트워크 없는 정적 계약 검사다. 순수 모듈(fingerprint 정규화 · meta · manifest · snapshot
 * statements)을 직접 import 해 불변식을 고정하고, 진입점 파일은 소스 텍스트로 검사한다.
 * CI 의 `scripts/db/check-migration-contract.mjs` 와 겹치는 항목은 의도적이다 — 둘 중 하나가
 * 우회돼도 다른 하나가 막는다.
 */

import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import {
  normalizeFingerprintLine,
  hashFingerprintLines,
  FINGERPRINT_EXCLUDED_RELATIONS,
  SCHEMA_FINGERPRINT_SQL,
} from '../database/bootstrap/schema-fingerprint.js';
import { CANONICAL_SCHEMA_BASELINE_META, CORE_TABLES } from '../database/bootstrap/canonical-schema-baseline.meta.js';
import { LEGACY_HISTORY_BASELINE } from '../database/incremental/legacy-history-baseline.js';
import {
  CANONICAL_SCHEMA_BASELINE_CENSUS,
  CANONICAL_SCHEMA_BASELINE_STATEMENTS,
} from '../database/bootstrap/canonical-schema-baseline.js';
import {
  INCREMENTAL_MIGRATIONS,
  INCREMENTAL_MIGRATION_CUTOFF,
  incrementalMigrationNames,
} from '../database/incremental/manifest.js';

const API_ROOT = path.resolve(__dirname, '..', '..');
const REPO_ROOT = path.resolve(API_ROOT, '..', '..');
const SRC = path.join(API_ROOT, 'src');
const read = (rel: string) => fs.readFileSync(path.join(SRC, rel), 'utf8');

interface HistoricalEntry { file: string; className: string; declaredName: string | null; name: string }
const historical = JSON.parse(read('database/incremental/historical-migrations.manifest.json')) as { count: number; entries: HistoricalEntry[] };
const historicalNames = new Set(historical.entries.map((e) => e.name));

describe('schema fingerprint normalization', () => {
  const prodForm =
    "CONSTRAINT|public.t|chk|c|CHECK (((status)::text = ANY ((ARRAY['a'::character varying, 'b'::character varying])::text[])))";
  const rebuiltForm =
    "CONSTRAINT|public.t|chk|c|CHECK (((status)::text = ANY (ARRAY[('a'::character varying)::text, ('b'::character varying)::text])))";

  it('rewrites the production deparse form into the re-parsed form', () => {
    expect(normalizeFingerprintLine(prodForm)).toBe(rebuiltForm);
  });

  it('is idempotent on already-normalized lines and neutral elsewhere', () => {
    expect(normalizeFingerprintLine(rebuiltForm)).toBe(rebuiltForm);
    expect(normalizeFingerprintLine('COLUMN|public.users|id|uuid|NOTNULL|uuid_generate_v4()|||')).toBe(
      'COLUMN|public.users|id|uuid|NOTNULL|uuid_generate_v4()|||',
    );
  });

  it('hashes the LF-joined line set with sha256', () => {
    expect(hashFingerprintLines(['a', 'b'])).toMatch(/^[0-9a-f]{64}$/);
    expect(hashFingerprintLines(['a', 'b'])).not.toBe(hashFingerprintLines(['b', 'a']));
  });

  it('excludes bootstrap bookkeeping relations and reads pg_catalog only', () => {
    expect([...FINGERPRINT_EXCLUDED_RELATIONS]).toEqual(
      expect.arrayContaining(['o4o_schema_baselines', 'typeorm_migrations']),
    );
    expect(SCHEMA_FINGERPRINT_SQL).not.toMatch(/information_schema/);
    expect(SCHEMA_FINGERPRINT_SQL).toMatch(/pg_get_constraintdef|pg_get_indexdef/);
  });
});

describe('canonical schema baseline (snapshot + meta)', () => {
  it('meta carries a 64-hex expected fingerprint and the cutoff agrees with the manifest', () => {
    expect(CANONICAL_SCHEMA_BASELINE_META.expectedFingerprint).toMatch(/^[0-9a-f]{64}$/);
    expect(CANONICAL_SCHEMA_BASELINE_META.expectedFingerprintLineCount).toBeGreaterThan(0);
    expect(CANONICAL_SCHEMA_BASELINE_META.baselineVersion).toBe(INCREMENTAL_MIGRATION_CUTOFF.baselineVersion);
    expect(CANONICAL_SCHEMA_BASELINE_META.baselineVersion).toMatch(/^\d{4}-\d{2}-\d{2}-id\d+$/);
    expect(CANONICAL_SCHEMA_BASELINE_META.supersedesBaselineVersion).not.toBe(CANONICAL_SCHEMA_BASELINE_META.baselineVersion);
    expect(CANONICAL_SCHEMA_BASELINE_META.absorbedIncrementalMigrationCount).toBeGreaterThanOrEqual(0);
    // no historical-name cutoff fields survive the rollover
    expect(CANONICAL_SCHEMA_BASELINE_META).not.toHaveProperty('lastHistoricalMigration');
    expect(CANONICAL_SCHEMA_BASELINE_META).not.toHaveProperty('historicalMigrationFileCount');
    expect(INCREMENTAL_MIGRATION_CUTOFF).not.toHaveProperty('lastHistoricalMigration');
    expect(INCREMENTAL_MIGRATION_CUTOFF).not.toHaveProperty('lastHistoricalSortKey');
  });

  it('legacy production history is an ordered fingerprint (no plaintext names), captured for this baseline', () => {
    expect(LEGACY_HISTORY_BASELINE.orderedNameSequenceSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(LEGACY_HISTORY_BASELINE.rowCount).toBeGreaterThan(0);
    expect(LEGACY_HISTORY_BASELINE.distinctNameCount).toBeLessThanOrEqual(LEGACY_HISTORY_BASELINE.rowCount);
    expect(LEGACY_HISTORY_BASELINE.capturedThroughId).toBeGreaterThanOrEqual(LEGACY_HISTORY_BASELINE.rowCount);
    expect(LEGACY_HISTORY_BASELINE.capturedAt).toBe(CANONICAL_SCHEMA_BASELINE_META.sourceCapturedAt);
    expect(read('database/incremental/legacy-history-baseline.ts')).not.toMatch(/'[A-Z][A-Za-z0-9_]*\d{13,14}'/);
    for (const f of ['historical-migration-names.ts', 'legacy-history.facts.ts']) {
      expect(fs.existsSync(path.join(SRC, 'database', 'incremental', f))).toBe(false);
    }
  });

  it('census matches the statement list', () => {
    expect(CANONICAL_SCHEMA_BASELINE_STATEMENTS.length).toBe(CANONICAL_SCHEMA_BASELINE_CENSUS.total);
    expect(CANONICAL_SCHEMA_BASELINE_META.census).toEqual(CANONICAL_SCHEMA_BASELINE_CENSUS);
    const tables = CANONICAL_SCHEMA_BASELINE_STATEMENTS.filter((s) => /^CREATE TABLE /.test(s)).length;
    const enums = CANONICAL_SCHEMA_BASELINE_STATEMENTS.filter((s) => /^CREATE TYPE .* AS ENUM/.test(s)).length;
    expect(tables).toBe(CANONICAL_SCHEMA_BASELINE_CENSUS.tables);
    expect(enums).toBe(CANONICAL_SCHEMA_BASELINE_CENSUS.enums);
  });

  it('snapshot is schema-only: no data, no roles, no ownership, no drops, no IF NOT EXISTS', () => {
    const forbidden: Array<[string, RegExp]> = [
      ['INSERT', /^\s*INSERT\s/i],
      ['COPY', /^\s*COPY\s/i],
      ['UPDATE', /^\s*UPDATE\s/i],
      ['DELETE', /^\s*DELETE\s/i],
      ['GRANT', /^\s*GRANT\s/i],
      ['REVOKE', /^\s*REVOKE\s/i],
      ['OWNER TO', /\bOWNER TO\b/i],
      ['ROLE/USER', /\b(CREATE|ALTER)\s+(ROLE|USER)\b/i],
      ['CREATE DATABASE', /\bCREATE DATABASE\b/i],
      ['DROP', /^\s*DROP\s/i],
      ['IF NOT EXISTS', /\bIF NOT EXISTS\b/i],
      ['typeorm_migrations', /\btypeorm_migrations\b/],
      ['o4o_schema_baselines', /\bo4o_schema_baselines\b/],
    ];
    for (const [label, re] of forbidden) {
      const hits = CANONICAL_SCHEMA_BASELINE_STATEMENTS.filter((s) => re.test(s));
      expect({ label, hits: hits.slice(0, 3) }).toEqual({ label, hits: [] });
    }
  });

  it('core tables are present in the snapshot and no retired object pattern is resurrected', () => {
    for (const t of CORE_TABLES) {
      const re = new RegExp(`^CREATE TABLE ${t.schema}\\.${t.table} \\(`);
      expect(CANONICAL_SCHEMA_BASELINE_STATEMENTS.some((s) => re.test(s))).toBe(true);
    }
    const created = CANONICAL_SCHEMA_BASELINE_STATEMENTS
      .map((s) => /^CREATE (?:TABLE|TYPE) public\.(\w+)/.exec(s)?.[1])
      .filter((n): n is string => Boolean(n));
    const resurrected = created.filter((n) => CANONICAL_SCHEMA_BASELINE_META.retiredObjectPatterns.some((re) => re.test(n)));
    expect(resurrected).toEqual([]);
  });
});

describe('historical migrations are frozen and never loaded', () => {
  const migrationsDir = path.join(SRC, 'database', 'migrations');
  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.ts')).sort();

  it('every migration file is either historical (frozen) or registered in the incremental manifest', () => {
    const incremental = new Set(incrementalMigrationNames());
    const historicalFiles = new Set(historical.entries.map((e) => e.file));
    const unaccounted = files.filter((f) => {
      if (historicalFiles.has(f)) return false;
      const src = fs.readFileSync(path.join(migrationsDir, f), 'utf8');
      const cls = /export class (\w+)/.exec(src)?.[1];
      return !(cls && incremental.has(cls));
    });
    expect(unaccounted).toEqual([]);
    expect(historical.entries.filter((e) => !files.includes(e.file)).map((e) => e.file)).toEqual([]);
  });

  it('historical file/class/declaredName/name entries are unchanged (single AST identity parser, no regex copy)', () => {
    // WO-O4O-MIGRATION-HISTORICAL-MANIFEST-IDENTITY-AND-LOCAL-DB-CREDENTIAL-LOG-FINAL-CLOSURE-V1 §6.3:
    // identity is parsed by exactly one parser (scripts/db/migration-identity.mjs). This spec used to carry its
    // own regex, which matched SQL text (`SET name = 'pharmacy'`) — so it delegates to the guard's verify-only mode.
    const drift: string[] = [];
    for (const e of historical.entries) {
      const src = fs.readFileSync(path.join(migrationsDir, e.file), 'utf8');
      if (!new RegExp('export class ' + e.className + '\\b').test(src)) drift.push(`${e.file}: class ${e.className}`);
      if (e.name !== (e.declaredName ?? e.className)) drift.push(`${e.file}: name ${e.name} != declaredName ?? className`);
    }
    expect(drift).toEqual([]);
    const guard = path.join(SRC, '..', '..', '..', 'scripts', 'db', 'check-migration-contract.mjs');
    const r = spawnSync(process.execPath, [guard, '--write-historical'], { encoding: 'utf8', env: { ...process.env, CI: '1' } });
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(new RegExp(`historical entries ${historical.count} · identity corrections 0 · removed 0`));
    // the manifest is an identity freeze of the RETAINED source files only (not runtime provenance)
    const incrementalFiles = new Set(incrementalFilesOf());
    expect(historical.entries.map((e) => e.file)).toEqual(files.filter((f) => !incrementalFiles.has(f)));
  });

  it('no runtime module imports a historical migration source (they are never runtime provenance)', () => {
    // WO-O4O-STORE-OWNER-AGREEMENT-PUBLISH-PREREQUISITES-CLOSURE-HANDOFF-V1: only HISTORICAL sources are
    // forbidden. incremental/manifest.ts MUST import the incremental migrations it registers (manifest step 5),
    // so a bare `/migrations/<epoch>-` match is a false positive the moment the first post-rollover incremental
    // lands — the match is resolved against the frozen historical manifest instead.
    const historicalFiles = new Set(historical.entries.map((e) => e.file));
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, ent.name);
        if (ent.isDirectory()) { if (!/__tests__|migrations$/.test(ent.name)) walk(p); continue; }
        if (!ent.name.endsWith('.ts')) continue;
        const stripped = fs.readFileSync(p, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
        for (const m of stripped.matchAll(/\/migrations\/(\d{13,14}-[\w-]+?)(?:\.js|\.ts)?['"]/g)) {
          if (historicalFiles.has(`${m[1]}.ts`)) offenders.push(`${path.relative(SRC, p)} → ${m[1]}`);
        }
      }
    };
    walk(SRC);
    expect(offenders).toEqual([]);
  });

  it('the historical-import guard still catches a historical source import (guard is not vacuous)', () => {
    const sample = historical.entries[0];
    const historicalFiles = new Set(historical.entries.map((e) => e.file));
    const fake = `import { X } from '../migrations/${sample.file.replace(/\.ts$/, '')}.js';`;
    const hits = [...fake.matchAll(/\/migrations\/(\d{13,14}-[\w-]+?)(?:\.js|\.ts)?['"]/g)].filter((m) => historicalFiles.has(`${m[1]}.ts`));
    expect(hits).toHaveLength(1);
    // and the registered incremental import is NOT a hit
    const inc = incrementalFilesOf();
    for (const f of inc) {
      const line = `import { Y } from '../migrations/${f.replace(/\.ts$/, '')}.js';`;
      const h = [...line.matchAll(/\/migrations\/(\d{13,14}-[\w-]+?)(?:\.js|\.ts)?['"]/g)].filter((m) => historicalFiles.has(`${m[1]}.ts`));
      expect(h).toHaveLength(0);
    }
  });
});

function incrementalFilesOf(): string[] {
  return [...read('database/incremental/manifest.ts').matchAll(/from\s+['"]\.\.\/migrations\/([^'"]+?)(?:\.js)?['"]/g)].map((m) => `${m[1]}.ts`);
}

describe('incremental manifest', () => {
  it('names equal classes, are unique, strictly increasing 13-digit epochs after the cutoff, and not historical', () => {
    const names = incrementalMigrationNames();
    expect(new Set(names).size).toBe(names.length);
    let prev = 0;
    for (const n of names) {
      const epoch = /(\d{13})$/.exec(n)?.[1];
      expect({ n, epoch }).toEqual({ n, epoch: expect.any(String) });
      const e = Number(epoch);
      expect(e).toBeGreaterThanOrEqual(INCREMENTAL_MIGRATION_CUTOFF.minimumEpoch13);
      expect(e).toBeGreaterThan(prev);
      prev = e;
      expect(historicalNames.has(n)).toBe(false);
    }
    expect(INCREMENTAL_MIGRATIONS.length).toBe(names.length);
    expect(String(INCREMENTAL_MIGRATION_CUTOFF.minimumEpoch13)).toMatch(/^\d{13}$/);
  });
});

describe('entry points', () => {
  it('migrate.ts classifies, bootstraps only FRESH_EMPTY, replays zero history, fails fast', () => {
    const src = read('migrate.ts');
    for (const must of [
      'classifyDatabaseState', 'runCanonicalBootstrap', 'INCREMENTAL_MIGRATIONS',
      "migrationsTableName: 'typeorm_migrations'", "transaction: 'each'", 'process.exit(1)',
      "'DATABASE_STATE'", "'BOOTSTRAP_EXECUTION'", "'HISTORICAL_REPLAY'", "'INCREMENTAL_PENDING'", "'MIGRATION_JOB'",
      "case 'UNKNOWN_PARTIAL'", 'synchronize: false',
    ]) expect(src).toContain(must);
    expect(src).not.toMatch(/migrations\/\*|['"][^'"]*\*[^'"]*\.[jt]s['"]/);
    expect(src).not.toMatch(/synchronize:\s*true/);
    expect(src).not.toMatch(/express|listen\(/);
  });

  it('API DataSource loads no migrations and never runs or synchronizes them', () => {
    const src = read('database/connection.ts');
    expect(src).toMatch(/migrations:\s*\[\]/);
    expect(src).toMatch(/migrationsRun:\s*false/);
    expect(src).toMatch(/migrationsTableName:\s*'typeorm_migrations'/);
    expect(src).not.toMatch(/synchronize:\s*true/);
    expect(src).not.toMatch(/bootstrap-runner|runCanonicalBootstrap/);
  });

  it('TypeORM CLI DataSource uses the incremental manifest only', () => {
    const src = read('database/migration-config.ts');
    expect(src).toContain('INCREMENTAL_MIGRATIONS');
    expect(src).not.toMatch(/migrations\/\*|['"][^'"]*\*[^'"]*\.[jt]s['"]/);
  });

  it('no API runtime module imports the bootstrap runner or calls runMigrations', () => {
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, ent.name);
        if (ent.isDirectory()) { if (!/__tests__|migrations$|bootstrap$/.test(ent.name)) walk(p); continue; }
        if (!ent.name.endsWith('.ts') || p.endsWith(path.join('src', 'migrate.ts'))) continue;
        const s = fs.readFileSync(p, 'utf8');
        if (/bootstrap-runner|runCanonicalBootstrap|\.runMigrations\(/.test(s)) offenders.push(path.relative(SRC, p));
      }
    };
    walk(SRC);
    expect(offenders).toEqual([]);
  });

  it('package.json scripts route migration commands through migrate.ts / the CLI DataSource', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(API_ROOT, 'package.json'), 'utf8')) as { scripts: Record<string, string> };
    expect(pkg.scripts['migration:run']).toContain('src/migrate.ts');
    expect(pkg.scripts['migration:show']).toContain('--status');
    expect(pkg.scripts['migration:revert']).toContain('migration-config.ts');
    expect(pkg.scripts['migration:check-contract']).toContain('check-migration-contract.mjs');
    expect(pkg.scripts['migration:run:prod']).toBeUndefined();
    expect(pkg.scripts['migration:sync']).toBeUndefined();
  });

  it('deploy workflow runs dist/migrate.js as the migration job and CI runs the contract guard', () => {
    const deploy = fs.readFileSync(path.join(REPO_ROOT, '.github', 'workflows', 'deploy-api.yml'), 'utf8');
    expect(deploy).toContain('dist/migrate.js');
    const ci = fs.readFileSync(path.join(REPO_ROOT, '.github', 'workflows', 'ci-pipeline.yml'), 'utf8');
    expect(ci).toContain('node scripts/db/check-migration-contract.mjs');
  });

  it('scripts/db/check-migration-contract.mjs passes', () => {
    const r = spawnSync(process.execPath, [path.join(REPO_ROOT, 'scripts', 'db', 'check-migration-contract.mjs')], { cwd: REPO_ROOT, encoding: 'utf8' });
    expect({ status: r.status, tail: (r.stdout + r.stderr).split('\n').filter((l) => /FAIL|pass \//.test(l)) }).toEqual({ status: 0, tail: [expect.stringMatching(/ 0 fail$/)] });
  });
});
