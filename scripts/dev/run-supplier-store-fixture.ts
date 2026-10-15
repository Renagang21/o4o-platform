/** Own disposable loopback database only; always remove it after bootstrap/test. */
import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { DataSource } from 'typeorm';
import { CANONICAL_SCHEMA_BASELINE_STATEMENTS } from '../../apps/api-server/src/database/bootstrap/canonical-schema-baseline.js';
import { CANONICAL_SCHEMA_BASELINE_META } from '../../apps/api-server/src/database/bootstrap/canonical-schema-baseline.meta.js';
import { INCREMENTAL_MIGRATIONS } from '../../apps/api-server/src/database/incremental/manifest.js';
import { expectedSchemaStateFor } from '../../apps/api-server/src/database/incremental/expected-schema-states.js';
import { computeSchemaFingerprint } from '../../apps/api-server/src/database/bootstrap/schema-fingerprint.js';

const database = 'o4o_supplier_store_integration';
async function run() {
  const raw = process.env.NETURE_SUPPLIER_STORE_IT_DATABASE_URL;
  if (!raw) throw new Error('Dedicated fixture URL required');
  const url = new URL(raw);
  if (url.protocol !== 'postgresql:' || url.hostname !== '127.0.0.1' || url.port !== '55432' ||
      url.pathname !== `/${database}` || url.search || url.hash || !url.username || !url.password) {
    throw new Error('Refusing a non-dedicated loopback fixture');
  }
  const options = { type: 'postgres' as const, host: '127.0.0.1', port: 55432,
    username: decodeURIComponent(url.username), password: decodeURIComponent(url.password) };
  const control = new DataSource({ ...options, database: 'postgres' });
  const marker = `supplier-store-fixture:${randomUUID()}`;
  let created = false;
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
  try {
    if ((await control.query('SELECT 1 FROM pg_database WHERE datname=$1', [database])).length)
      throw new Error('Fixture exists; refusing reuse or deletion');
    await control.query(`CREATE DATABASE ${database}`);
    created = true;
    // Marker contains only a fixed prefix and randomUUID, never caller SQL.
    await control.query(`COMMENT ON DATABASE ${database} IS '${marker}'`);
    const db = new DataSource({ ...options, database });
    try {
      await db.initialize();
      const q = db.createQueryRunner();
      try {
        await q.startTransaction();
        for (const ext of CANONICAL_SCHEMA_BASELINE_META.requiredExtensions)
          await q.query(`CREATE EXTENSION "${ext.name}" WITH SCHEMA "${ext.schema}"`);
        for (const sql of CANONICAL_SCHEMA_BASELINE_STATEMENTS) await q.query(sql);
        for (let i = 0; i <= INCREMENTAL_MIGRATIONS.length; i++) {
          const actual = await computeSchemaFingerprint(q), expected = expectedSchemaStateFor(i);
          if (!expected || actual.hash !== expected.fingerprint || actual.lineCount !== expected.fingerprintLineCount)
            throw new Error(`Fixture schema mismatch at prefix ${i}`);
          if (i < INCREMENTAL_MIGRATIONS.length) {
            await q.query('SET LOCAL search_path TO public');
            await new INCREMENTAL_MIGRATIONS[i]().up(q);
          }
        }
        await q.commitTransaction();
      } catch (error) {
        if (q.isTransactionActive) await q.rollbackTransaction();
        throw error;
      } finally { await q.release(); }
    } finally { if (db.isInitialized) await db.destroy(); }
    console.log('Fixture schema fingerprints match; starting synthetic integration tests.');
    const result = spawnSync('pnpm', ['--filter', '@o4o/api-server', 'exec', 'jest', '--runInBand',
      '--runTestsByPath', 'src/modules/neture-pharmacy/__tests__/supplier-store-round-trip.integration.spec.ts'],
    { stdio: 'inherit', env: { ...process.env, NODE_ENV: 'test' } });
    if (result.error || result.status !== 0) throw new Error('Fixture tests failed or could not start');
    console.log('Fixture tests PASS.');
  } finally {
    try {
      if (created) {
        await cleanupOwnedDatabase();
      }
    } finally { await control.destroy(); }
  }
}
run().catch(() => { console.error('Fixture failed; inspect test output and cleanup result. Connection details suppressed.'); process.exitCode = 1; });
