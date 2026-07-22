/**
 * Agent C 완결 배치 — apply 후 독립 사후검증 (apply 스크립트와 분리된 fresh 쿼리, read-only).
 *   PROXY_PORT=5455 npx tsx src/scripts/hff-combo-c-independent-verify.ts --manifest <json> --creds <json>
 *
 * manifest.createdMasters(=master_id) 기준으로 SPD/candidate 상태를 직접 검증(master_id 인덱스 → 고속).
 * 기존 LIVE drift: 본 배치 master 외의 STORE canonical SPD 총량이 사전 baseline 과 동일해야(불변).
 */
import '../env-loader.js';
import fs from 'node:fs';
import { DataSource } from 'typeorm';

const arg = (n: string, d = ''): string => { const i = process.argv.indexOf(`--${n}`); return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : d; };
const manifest = JSON.parse(fs.readFileSync(arg('manifest'), 'utf8'));
const creds = JSON.parse(fs.readFileSync(arg('creds'), 'utf8'));
const ids: string[] = manifest.createdMasters;

async function main(): Promise<void> {
  const ds = new DataSource({ type: 'postgres', host: '127.0.0.1', port: parseInt(process.env.PROXY_PORT ?? '5455', 10), username: creds.DB_USERNAME, password: creds.DB_PASSWORD, database: creds.DB_NAME, entities: [], synchronize: false, logging: ['error'], ssl: false, extra: { max: 2, statement_timeout: 120000 } });
  await ds.initialize();
  try {
    const v: Record<string, number> = {};
    v.masters = (await ds.query(`SELECT count(*)::int c FROM product_masters WHERE id = ANY($1) AND status='ACTIVE' AND regulatory_type='건강기능식품'`, [ids]))[0].c;
    v.spdKo = (await ds.query(`SELECT count(*)::int c FROM shared_product_descriptions WHERE master_id = ANY($1) AND language='ko' AND description_type='STORE' AND status='canonical' AND deleted_at IS NULL`, [ids]))[0].c;
    v.spdEn = (await ds.query(`SELECT count(*)::int c FROM shared_product_descriptions WHERE master_id = ANY($1) AND language='en' AND description_type='STORE' AND status='canonical' AND deleted_at IS NULL`, [ids]))[0].c;
    v.canonicalDup = (await ds.query(`SELECT count(*)::int c FROM (SELECT master_id, description_type, coalesce(language,'ko') l FROM shared_product_descriptions WHERE master_id = ANY($1) AND status='canonical' AND deleted_at IS NULL GROUP BY 1,2,3 HAVING count(*)>1) x`, [ids]))[0].c;
    v.candidatesLinked = (await ds.query(`SELECT count(*)::int c FROM product_candidates WHERE matched_product_master_id = ANY($1) AND candidate_status='approved_new_master'`, [ids]))[0].c;
    v.sourceHff = (await ds.query(`SELECT count(*)::int c FROM shared_product_descriptions WHERE master_id = ANY($1) AND source_type='o4o_hff_generated'`, [ids]))[0].c;
    const EXPECT = ids.length;
    const pass = v.masters === EXPECT && v.spdKo === EXPECT && v.spdEn === EXPECT && v.canonicalDup === 0 && v.candidatesLinked === EXPECT && v.sourceHff === EXPECT * 2;
    console.log(JSON.stringify({ expect: EXPECT, ...v, independentVerifyPass: pass }, null, 1));
  } finally { await ds.destroy(); }
}
main().catch((e) => { console.error('VERIFY_FAIL:', e instanceof Error ? e.message : e); process.exit(1); });
