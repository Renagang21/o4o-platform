/** READ-ONLY — single-lutein 교정 MISS 제품 원문 포맷 진단. DB write 0. */
import '../env-loader.js';
import { DataSource } from 'typeorm';
import { normalizeSource } from '../modules/content-guard/source-grounding-parser.js';

const STMTS = ['20040020028661', '20120019007515'];

async function main(): Promise<void> {
  const ds = new DataSource({ type: 'postgres', host: '127.0.0.1', port: parseInt(process.env.PROXY_PORT ?? '5433', 10), username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME, entities: [], synchronize: false, ssl: false, extra: { max: 1 } });
  await ds.initialize();
  try {
    const rows: Array<{ stmt: string; base: string; fn: string }> = await ds.query(
      `SELECT raw_payload->'source'->>'STTEMNT_NO' stmt, raw_payload->'source'->>'BASE_STANDARD' base, raw_payload->'source'->>'MAIN_FNCTN' fn
       FROM product_candidates WHERE source_label='MFDS_HEALTH_FUNCTIONAL_FOOD' AND deleted_at IS NULL
         AND raw_payload->'source'->>'STTEMNT_NO' = ANY($1)`, [STMTS]);
    for (const r of rows) {
      console.log('===== stmt ' + r.stmt + ' =====');
      console.log('BASE: ' + JSON.stringify(normalizeSource(r.base || '')));
      console.log('MAIN: ' + JSON.stringify(normalizeSource(r.fn || '').slice(0, 260)));
    }
  } finally { await ds.destroy(); }
}
main().catch((e) => { console.error('FAILED:', e instanceof Error ? e.message : e); process.exit(1); });
