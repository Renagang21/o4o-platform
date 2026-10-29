/** Own disposable loopback database only; always remove it after bootstrap/test. */
import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { spawn, type ChildProcess } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { DataSource } from 'typeorm';
import { CANONICAL_SCHEMA_BASELINE_STATEMENTS } from '../../apps/api-server/src/database/bootstrap/canonical-schema-baseline.js';
import { CANONICAL_SCHEMA_BASELINE_META } from '../../apps/api-server/src/database/bootstrap/canonical-schema-baseline.meta.js';
import { INCREMENTAL_MIGRATIONS } from '../../apps/api-server/src/database/incremental/manifest.js';
import { expectedSchemaStateFor } from '../../apps/api-server/src/database/incremental/expected-schema-states.js';
import { computeSchemaFingerprint } from '../../apps/api-server/src/database/bootstrap/schema-fingerprint.js';

const database = 'o4o_main_automation_integration';
async function run() {
  const raw = process.env.MAIN_AUTOMATION_IT_DATABASE_URL;
  if (!raw) throw new Error('Dedicated fixture URL required');
  const url = new URL(raw);
  if (url.protocol !== 'postgresql:' || url.hostname !== '127.0.0.1' || url.port !== '55439' ||
      url.pathname !== `/${database}` || url.search || url.hash || !url.username || !url.password) {
    throw new Error('Refusing a non-dedicated loopback fixture');
  }
  const options = { type: 'postgres' as const, host: '127.0.0.1', port: 55439,
    username: decodeURIComponent(url.username), password: decodeURIComponent(url.password) };
  const control = new DataSource({ ...options, database: 'postgres' });
  const marker = `main-automation-fixture:${randomUUID()}`;
  let created = false;
  let interrupted = false;
  let child: ChildProcess | undefined;
  let killTimer: ReturnType<typeof setTimeout> | undefined;
  function stopChild(signal: NodeJS.Signals) {
    // Direct --runInBand Jest process: no pnpm shell or worker process tree.
    child?.kill(signal);
  }
  const onSignal = () => {
    interrupted = true;
    stopChild('SIGTERM');
    if (!killTimer) {
      killTimer = setTimeout(() => stopChild('SIGKILL'), 5000);
      killTimer.unref();
    }
  };
  function checkInterrupted() {
    if (interrupted) throw new Error('Fixture interrupted');
  }
  async function cleanupOwnedDatabase() {
        const rows = await control.query("SELECT shobj_description(oid,'pg_database') AS marker FROM pg_database WHERE datname=$1", [database]);
        if (rows.length !== 1 || rows[0].marker !== marker) throw new Error('Fixture ownership changed; cleanup refused');
        // No FORCE and no backend termination: other session connections must not be killed.
        await control.query(`DROP DATABASE ${database}`);
        if ((await control.query('SELECT 1 FROM pg_database WHERE datname=$1', [database])).length)
          throw new Error('Fixture database remains');
        console.log('Fixture cleanup PASS: database count 0.');
  }
  await control.initialize();
  process.on('SIGINT', onSignal);
  process.on('SIGTERM', onSignal);
  try {
    checkInterrupted();
    if ((await control.query('SELECT 1 FROM pg_database WHERE datname=$1', [database])).length)
      throw new Error('Fixture exists; refusing reuse or deletion');
    await control.query(`CREATE DATABASE ${database}`);
    created = true;
    // Marker contains only a fixed prefix and randomUUID, never caller SQL.
    await control.query(`COMMENT ON DATABASE ${database} IS '${marker}'`);
    checkInterrupted();
    const db = new DataSource({ ...options, database });
    try {
      await db.initialize();
      const q = db.createQueryRunner();
      try {
        await q.startTransaction();
        for (const ext of CANONICAL_SCHEMA_BASELINE_META.requiredExtensions)
          await q.query(`CREATE EXTENSION "${ext.name}" WITH SCHEMA "${ext.schema}"`);
        for (const sql of CANONICAL_SCHEMA_BASELINE_STATEMENTS) { checkInterrupted(); await q.query(sql); }
        for (let i = 0; i <= INCREMENTAL_MIGRATIONS.length; i++) {
          checkInterrupted();
          const actual = await computeSchemaFingerprint(q), expected = expectedSchemaStateFor(i);
          if (!expected || actual.hash !== expected.fingerprint || actual.lineCount !== expected.fingerprintLineCount)
            throw new Error(`Fixture schema mismatch at prefix ${i}`);
          if (i < INCREMENTAL_MIGRATIONS.length) {
            await q.query('SET LOCAL search_path TO public');
            await new INCREMENTAL_MIGRATIONS[i]().up(q);
          }
        }
        const newest=new INCREMENTAL_MIGRATIONS[INCREMENTAL_MIGRATIONS.length-1]();
        await q.query('SET LOCAL search_path TO public');await newest.down(q);
        const previous=await computeSchemaFingerprint(q),previousExpected=expectedSchemaStateFor(INCREMENTAL_MIGRATIONS.length-1);
        if(previous.hash!==previousExpected?.fingerprint || previous.lineCount!==previousExpected.fingerprintLineCount)throw new Error('Empty down mismatch');
        await q.query('SET LOCAL search_path TO public');await newest.up(q);
        const reapplied=await computeSchemaFingerprint(q),reappliedExpected=expectedSchemaStateFor(INCREMENTAL_MIGRATIONS.length);
        if(reapplied.hash!==reappliedExpected?.fingerprint || reapplied.lineCount!==reappliedExpected.fingerprintLineCount)throw new Error('Empty up mismatch');
        await q.commitTransaction();
      } catch (error) {
        if (q.isTransactionActive) await q.rollbackTransaction();
        throw error;
      } finally { await q.release(); }
    } finally { if (db.isInitialized) await db.destroy(); }
    console.log('Fixture schema fingerprints match; starting synthetic integration tests.');
    checkInterrupted();
    await new Promise<void>((resolve, reject) => {
      const apiRoot = fileURLToPath(new URL('../../apps/api-server/', import.meta.url));
      const jestEntry = createRequire(new URL('../../apps/api-server/package.json', import.meta.url)).resolve('jest/bin/jest');
      child = spawn(process.execPath, [jestEntry, '--runInBand',
        '--runTestsByPath', 'src/services/work-data/work-data.integration.spec.ts'],
      { cwd: apiRoot, stdio: 'inherit', env: { ...process.env, NODE_ENV: 'test' } });
      child.once('error', reject);
      child.once('close', (code) => {
        child = undefined;
        if (killTimer) clearTimeout(killTimer);
        if (code !== 0 || interrupted) reject(new Error('Fixture tests failed or were interrupted'));
        else resolve();
      });
    });
    const finalDb = new DataSource({ ...options, database });
    await finalDb.initialize();
    try {
      const runner = finalDb.createQueryRunner();
      await runner.startTransaction();
      try {
        const actual = await computeSchemaFingerprint(runner);
        const expected = expectedSchemaStateFor(INCREMENTAL_MIGRATIONS.length);
        if (!expected || actual.hash !== expected.fingerprint || actual.lineCount !== expected.fingerprintLineCount) {
          throw new Error('Fixture schema was not restored after tests');
        }
        await runner.rollbackTransaction();
      } finally { await runner.release(); }
    } finally { await finalDb.destroy(); }
    console.log('Fixture schema restored after tests PASS.');
    console.log('Fixture tests PASS.');
  } finally {
    try {
      if (created) {
        await cleanupOwnedDatabase();
      }
    } finally {
      if (killTimer) clearTimeout(killTimer);
      process.removeListener('SIGINT', onSignal);
      process.removeListener('SIGTERM', onSignal);
      await control.destroy();
    }
  }
}
run().catch(() => { console.error('Fixture failed; inspect test output and cleanup result. Connection details suppressed.'); process.exitCode = 1; });
