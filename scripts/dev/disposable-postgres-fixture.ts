/** Shared lifecycle for explicitly owned, loopback-only integration fixtures. */
import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { spawn, type ChildProcess } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { DataSource, type QueryRunner } from 'typeorm';
import { CANONICAL_SCHEMA_BASELINE_STATEMENTS } from '../../apps/api-server/src/database/bootstrap/canonical-schema-baseline.js';
import { CANONICAL_SCHEMA_BASELINE_META } from '../../apps/api-server/src/database/bootstrap/canonical-schema-baseline.meta.js';
import { INCREMENTAL_MIGRATIONS } from '../../apps/api-server/src/database/incremental/manifest.js';
import { expectedSchemaStateFor } from '../../apps/api-server/src/database/incremental/expected-schema-states.js';
import { computeSchemaFingerprint } from '../../apps/api-server/src/database/bootstrap/schema-fingerprint.js';

const profiles = {
  'improvement-forum': {
    variable: 'O4O_IMPROVEMENT_TEST_URL', port: '55440', database: 'o4o_improvements_integration',
    tests: ['src/services/community/__tests__/community-improvements.postgres.spec.ts'],
  },
  'main-automation': {
    variable: 'MAIN_AUTOMATION_IT_DATABASE_URL', port: '55439', database: 'o4o_main_automation_integration',
    tests: ['src/services/work-data/work-data.integration.spec.ts'],
  },
  'supplier-store': {
    variable: 'NETURE_SUPPLIER_STORE_IT_DATABASE_URL', port: '55432', database: 'o4o_supplier_store_integration',
    tests: ['src/modules/neture-pharmacy/__tests__/supplier-store-round-trip.integration.spec.ts',
      'src/modules/neture/__tests__/settlement-notification.integration.spec.ts'],
  },
} as const;
type FixtureProfile = keyof typeof profiles;
interface FixtureChecks {
  prefixVerified?: (runner: QueryRunner, prefix: number) => Promise<void>;
  schemaReady?: (runner: QueryRunner) => Promise<void>;
}

export function validateDisposableFixtureUrl(profile: FixtureProfile, raw: string | undefined): URL {
  if (!raw) throw new Error('Dedicated fixture URL required');
  const fixture = profiles[profile], url = new URL(raw);
  if (url.protocol !== 'postgresql:' || url.hostname !== '127.0.0.1' || url.port !== fixture.port ||
      url.pathname !== `/${fixture.database}` || url.search || url.hash || !url.username || !url.password) {
    throw new Error('Refusing a non-dedicated loopback fixture');
  }
  return url;
}

export async function verifyFixtureSchema(runner: QueryRunner, prefix: number, message: string): Promise<void> {
  const actual = await computeSchemaFingerprint(runner), expected = expectedSchemaStateFor(prefix);
  if (!expected || actual.hash !== expected.fingerprint || actual.lineCount !== expected.fingerprintLineCount)
    throw new Error(message);
}

export async function runDisposablePostgresFixture(profile: FixtureProfile, checks: FixtureChecks = {}): Promise<void> {
  const fixture = profiles[profile], database = fixture.database;
  const url = validateDisposableFixtureUrl(profile, process.env[fixture.variable]);
  const options = { type: 'postgres' as const, host: '127.0.0.1', port: Number(fixture.port),
    username: decodeURIComponent(url.username), password: decodeURIComponent(url.password) };
  const control = new DataSource({ ...options, database: 'postgres' });
  const marker = `${profile}-fixture:${randomUUID()}`;
  let created = false, interrupted = false, child: ChildProcess | undefined;
  let killTimer: ReturnType<typeof setTimeout> | undefined;
  const onSignal = () => {
    interrupted = true;
    child?.kill('SIGTERM');
    if (!killTimer) {
      killTimer = setTimeout(() => child?.kill('SIGKILL'), 5000);
      killTimer.unref();
    }
  };
  const checkInterrupted = () => { if (interrupted) throw new Error('Fixture interrupted'); };
  async function cleanupOwnedDatabase() {
    const rows = await control.query("SELECT shobj_description(oid,'pg_database') AS marker FROM pg_database WHERE datname=$1", [database]);
    if (rows.length !== 1 || rows[0].marker !== marker) throw new Error('Fixture ownership changed; cleanup refused');
    // Never force deletion or terminate another session's database connections.
    await control.query(`DROP DATABASE ${database}`);
    if ((await control.query('SELECT 1 FROM pg_database WHERE datname=$1', [database])).length)
      throw new Error('Fixture database remains');
    console.log('Fixture cleanup PASS: database count 0.');
  }
  await control.initialize();
  process.on('SIGINT', onSignal); process.on('SIGTERM', onSignal);
  try {
    checkInterrupted();
    if ((await control.query('SELECT 1 FROM pg_database WHERE datname=$1', [database])).length)
      throw new Error('Fixture exists; refusing reuse or deletion');
    await control.query(`CREATE DATABASE ${database}`);
    created = true;
    await control.query(`COMMENT ON DATABASE ${database} IS '${marker}'`);
    checkInterrupted();
    const db = new DataSource({ ...options, database });
    try {
      await db.initialize();
      const runner = db.createQueryRunner();
      try {
        await runner.startTransaction();
        for (const ext of CANONICAL_SCHEMA_BASELINE_META.requiredExtensions)
          await runner.query(`CREATE EXTENSION "${ext.name}" WITH SCHEMA "${ext.schema}"`);
        for (const sql of CANONICAL_SCHEMA_BASELINE_STATEMENTS) { checkInterrupted(); await runner.query(sql); }
        for (let prefix = 0; prefix <= INCREMENTAL_MIGRATIONS.length; prefix++) {
          checkInterrupted();
          await verifyFixtureSchema(runner, prefix, `Fixture schema mismatch at prefix ${prefix}`);
          await checks.prefixVerified?.(runner, prefix);
          if (prefix < INCREMENTAL_MIGRATIONS.length) {
            await runner.query('SET LOCAL search_path TO public');
            await new INCREMENTAL_MIGRATIONS[prefix]().up(runner);
          }
        }
        await checks.schemaReady?.(runner);
        await runner.commitTransaction();
      } catch (error) {
        if (runner.isTransactionActive) await runner.rollbackTransaction();
        throw error;
      } finally { await runner.release(); }
    } finally { if (db.isInitialized) await db.destroy(); }
    console.log('Fixture schema fingerprints match; starting synthetic integration tests.');
    checkInterrupted();
    await new Promise<void>((resolve, reject) => {
      const apiRoot = fileURLToPath(new URL('../../apps/api-server/', import.meta.url));
      const jestEntry = createRequire(new URL('../../apps/api-server/package.json', import.meta.url)).resolve('jest/bin/jest');
      child = spawn(process.execPath, [jestEntry, '--runInBand', '--runTestsByPath', ...fixture.tests],
        { cwd: apiRoot, stdio: 'inherit', env: { ...process.env, NODE_ENV: 'test' } });
      child.once('error', reject);
      child.once('close', code => {
        child = undefined;
        if (killTimer) clearTimeout(killTimer);
        if (code !== 0 || interrupted) reject(new Error('Fixture tests failed or were interrupted'));
        else resolve();
      });
    });
    const finalDb = new DataSource({ ...options, database });
    try {
      await finalDb.initialize();
      const runner = finalDb.createQueryRunner();
      try {
        await runner.startTransaction();
        await verifyFixtureSchema(runner, INCREMENTAL_MIGRATIONS.length, 'Fixture schema was not restored after tests');
      } finally {
        if (runner.isTransactionActive) await runner.rollbackTransaction();
        await runner.release();
      }
    } finally { if (finalDb.isInitialized) await finalDb.destroy(); }
    console.log('Fixture schema restored after tests PASS.');
    console.log('Fixture tests PASS.');
  } finally {
    try {
      if (created) {
        await cleanupOwnedDatabase();
      }
    } finally {
      if (killTimer) clearTimeout(killTimer);
      process.removeListener('SIGINT', onSignal); process.removeListener('SIGTERM', onSignal);
      await control.destroy();
    }
  }
}

export async function runFixtureCommand(profile: FixtureProfile, checks: FixtureChecks = {}): Promise<void> {
  try { await runDisposablePostgresFixture(profile, checks); }
  catch { console.error('Fixture failed; inspect test output and cleanup result. Connection details suppressed.'); process.exitCode = 1; }
}
