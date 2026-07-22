import '../env-loader.js';
import fs from 'node:fs';
import { DataSource } from 'typeorm';
const creds = JSON.parse(fs.readFileSync(process.argv[process.argv.indexOf('--creds') + 1], 'utf8'));
async function main(): Promise<void> {
  const ds = new DataSource({ type: 'postgres', host: '127.0.0.1', port: parseInt(process.env.PROXY_PORT ?? '5442', 10), username: creds.DB_USERNAME, password: creds.DB_PASSWORD, database: creds.DB_NAME, entities: [], synchronize: false, logging: ['error'], ssl: false, extra: { max: 2, statement_timeout: 20000 } });
  await ds.initialize();
  try {
    const act = await ds.query(`SELECT pid, state, wait_event_type, wait_event, now()-xact_start AS xact_age, now()-query_start AS query_age, left(query,70) q FROM pg_stat_activity WHERE datname=$1 AND state IS NOT NULL AND pid<>pg_backend_pid() AND (state='idle in transaction' OR state='active' OR now()-xact_start > interval '30 seconds') ORDER BY xact_start NULLS LAST`, [creds.DB_NAME]);
    console.log(JSON.stringify(act, null, 1));
  } finally { await ds.destroy(); }
}
main().catch((e) => { console.error('PROBE_FAIL:', e instanceof Error ? e.message : e); process.exit(1); });
