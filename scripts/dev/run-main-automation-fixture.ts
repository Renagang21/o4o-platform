import { ERASURE_WRITER_GAPS_SQL } from '../../apps/api-server/src/services/privacy/erasure-writer-manifest.js';
import { INCREMENTAL_MIGRATIONS } from '../../apps/api-server/src/database/incremental/manifest.js';
import { runFixtureCommand, verifyFixtureSchema } from './disposable-postgres-fixture.js';

let baselineWriterGaps: number[] = [];
void runFixtureCommand('main-automation', {
  async prefixVerified(runner, prefix) {
    if (prefix === INCREMENTAL_MIGRATIONS.length - 1)
      baselineWriterGaps = (await runner.query(ERASURE_WRITER_GAPS_SQL)).map(row => Number(row.oid)).sort((a, b) => a - b);
  },
  async schemaReady(runner) {
    const finalWriterGaps = (await runner.query(ERASURE_WRITER_GAPS_SQL)).map(row => Number(row.oid)).sort((a, b) => a - b);
    if (JSON.stringify(baselineWriterGaps) !== JSON.stringify(finalWriterGaps))
      throw new Error('Main work-data migration introduced an erasure writer gap');
    console.log(`Fixture writer fences: baseline gaps ${baselineWriterGaps.length}; added gaps 0. Baseline gaps are not repaired here.`);
    const newest = new INCREMENTAL_MIGRATIONS[INCREMENTAL_MIGRATIONS.length - 1]();
    await runner.query('SET LOCAL search_path TO public');
    await newest.down(runner);
    await verifyFixtureSchema(runner, INCREMENTAL_MIGRATIONS.length - 1, 'Empty down mismatch');
    await runner.query('SET LOCAL search_path TO public');
    await newest.up(runner);
    await verifyFixtureSchema(runner, INCREMENTAL_MIGRATIONS.length, 'Empty up mismatch');
  },
});
