/** Disposable local fixture only: no .env, inherited DB credentials, network identity, or production data. */
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { CANONICAL_SCHEMA_BASELINE_STATEMENTS } from '../../apps/api-server/src/database/bootstrap/canonical-schema-baseline.js';
import { CANONICAL_SCHEMA_BASELINE_META } from '../../apps/api-server/src/database/bootstrap/canonical-schema-baseline.meta.js';
import { INCREMENTAL_MIGRATIONS } from '../../apps/api-server/src/database/incremental/manifest.js';
import { expectedSchemaStateFor } from '../../apps/api-server/src/database/incremental/expected-schema-states.js';
import { computeSchemaFingerprint } from '../../apps/api-server/src/database/bootstrap/schema-fingerprint.js';

const database = 'o4o_operator_invitation_fixture';
const connection = {
  type: 'postgres' as const,
  host: '127.0.0.1',
  port: 55432,
  username: 'agent',
  password: () => '',
};
async function prepare() {
  if (process.env.OPERATOR_INVITE_TEST_PORT !== '55432')
    throw new Error(
      'Explicit OPERATOR_INVITE_TEST_PORT=55432 required; use a disposable local cluster with role agent',
    );
  const control = new DataSource({ ...connection, database: 'postgres' });
  await control.initialize();
  try {
    if (
      (
        await control.query('SELECT 1 FROM pg_database WHERE datname=$1', [
          database,
        ])
      ).length
    ) {
      throw new Error(
        'Fixture already exists; refusing to overwrite. Reuse it or explicitly recreate your disposable fixture database.',
      );
    }
    await control.query('CREATE DATABASE o4o_operator_invitation_fixture');
  } finally {
    await control.destroy();
  }
  const db = new DataSource({ ...connection, database });
  await db.initialize();
  const q = db.createQueryRunner();
  await q.startTransaction();
  try {
    for (const ext of CANONICAL_SCHEMA_BASELINE_META.requiredExtensions) {
      // Repository-owned constants, not caller input.
      await q.query(
        `CREATE EXTENSION "${ext.name}" WITH SCHEMA "${ext.schema}"`,
      );
    }
    for (const sql of CANONICAL_SCHEMA_BASELINE_STATEMENTS) await q.query(sql);
    for (let i = 0; i <= INCREMENTAL_MIGRATIONS.length; i++) {
      const actual = await computeSchemaFingerprint(q),
        expected = expectedSchemaStateFor(i);
      if (
        !expected ||
        actual.hash !== expected.fingerprint ||
        actual.lineCount !== expected.fingerprintLineCount
      )
        throw new Error(`Fixture schema mismatch at prefix ${i}`);
      if (i < INCREMENTAL_MIGRATIONS.length) {
        await q.query('SET LOCAL search_path TO public');
        await new INCREMENTAL_MIGRATIONS[i]().up(q);
      }
    }
    await q.commitTransaction();
    console.log(
      'Operator invitation fixture prepared; all registered schema fingerprints match.',
    );
  } catch (e) {
    await q.rollbackTransaction();
    throw e;
  } finally {
    await q.release();
    await db.destroy();
  }
}
prepare().catch((e) => {
  console.error(
    e instanceof Error ? e.message : 'Local fixture preparation failed',
  );
  process.exitCode = 1;
});
