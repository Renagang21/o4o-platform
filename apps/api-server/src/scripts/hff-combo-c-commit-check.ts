/**
 * Agent C 완결 배치 — apply COMMIT 여부 독립 확인 (read-only, 빠른 쿼리).
 *   PROXY_PORT=5442 npx tsx src/scripts/hff-combo-c-commit-check.ts --stmts <json> --creds <json>
 */
import '../env-loader.js';
import fs from 'node:fs';
import { DataSource } from 'typeorm';

const arg = (n: string, d = ''): string => { const i = process.argv.indexOf(`--${n}`); return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : d; };
const stmts: string[] = JSON.parse(fs.readFileSync(arg('stmts'), 'utf8'));
const creds = arg('creds') ? JSON.parse(fs.readFileSync(arg('creds'), 'utf8')) : {};

async function main(): Promise<void> {
  const ds = new DataSource({ type: 'postgres', host: '127.0.0.1', port: parseInt(process.env.PROXY_PORT ?? '5442', 10), username: creds.DB_USERNAME ?? process.env.DB_USERNAME, password: creds.DB_PASSWORD ?? process.env.DB_PASSWORD, database: creds.DB_NAME ?? process.env.DB_NAME, entities: [], synchronize: false, logging: ['error'], ssl: false, extra: { max: 2, statement_timeout: 60000 } });
  await ds.initialize();
  try {
    const masters = (await ds.query(`SELECT count(*)::int c FROM product_masters WHERE mfds_permit_number = ANY($1)`, [stmts]))[0].c;
    const promoted = (await ds.query(`SELECT count(*)::int c FROM product_candidates WHERE source_label='MFDS_HEALTH_FUNCTIONAL_FOOD' AND deleted_at IS NULL AND matched_product_master_id IS NOT NULL AND raw_payload::jsonb->'source'->>'STTEMNT_NO' = ANY($1)`, [stmts]))[0].c;
    const spd = (await ds.query(`SELECT count(*)::int c FROM shared_product_descriptions s JOIN product_masters m ON m.id=s.master_id WHERE m.mfds_permit_number = ANY($1) AND s.description_type='STORE' AND s.status='canonical' AND s.deleted_at IS NULL`, [stmts]))[0].c;
    console.log(JSON.stringify({ target: stmts.length, mastersCommitted: masters, candidatesPromoted: promoted, storeCanonicalSpd: spd, committed: masters > 0 }, null, 1));
  } finally { await ds.destroy(); }
}
main().catch((e) => { console.error('CHECK_FAIL:', e instanceof Error ? e.message : e); process.exit(1); });
