import '../env-loader.js';
import fs from 'node:fs';
import { DataSource } from 'typeorm';
const creds = JSON.parse(fs.readFileSync(process.argv[process.argv.indexOf('--creds') + 1], 'utf8'));
const stmts = JSON.parse(fs.readFileSync(process.argv[process.argv.indexOf('--stmts') + 1], 'utf8'));
async function main(): Promise<void> {
  const ds = new DataSource({ type: 'postgres', host: '127.0.0.1', port: parseInt(process.env.PROXY_PORT ?? '5442', 10), username: creds.DB_USERNAME, password: creds.DB_PASSWORD, database: creds.DB_NAME, entities: [], synchronize: false, logging: ['error'], ssl: false, extra: { max: 1, statement_timeout: 90000 } });
  await ds.initialize();
  try {
    const m = await ds.query(`SELECT count(*)::int c FROM product_masters WHERE mfds_permit_number = ANY($1)`, [stmts]);
    const tag = await ds.query(`SELECT count(*)::int c FROM product_masters WHERE tags @> '["batch:single-nutrient-combo-c-batch1"]'::jsonb`);
    console.log(JSON.stringify({ permitMatch: m[0].c, batchTag: tag[0].c, committed: m[0].c > 0 || tag[0].c > 0 }));
  } finally { await ds.destroy(); }
}
main().catch((e) => { console.error('FAIL:', e instanceof Error ? e.message : e); process.exit(1); });
