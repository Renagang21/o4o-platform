/** READ-ONLY 독립 사후검증(새 연결) — 단일 기능성 배치. DB write 0. */
import '../env-loader.js';
import { DataSource } from 'typeorm';
const arg = (n: string, d = ''): string => { const i = process.argv.indexOf(`--${n}`); return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : d; };
const TAG = arg('tag'); const EXPECT = parseInt(arg('expect', '0'), 10);
if (!TAG || !EXPECT) throw new Error('--tag --expect 필요');
const PROXY_PORT = parseInt(process.env.PROXY_PORT ?? '5434', 10);
async function main(): Promise<void> {
  const ds = new DataSource({ type: 'postgres', host: '127.0.0.1', port: PROXY_PORT, username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME, entities: [], synchronize: false, logging: ['error'], ssl: false, extra: { max: 2, statement_timeout: 120000 } });
  await ds.initialize();
  try {
    const tagJson = JSON.stringify([TAG]);
    const ids: string[] = (await ds.query(`SELECT id FROM product_masters WHERE tags::jsonb @> $1::jsonb AND status='ACTIVE' AND regulatory_type='건강기능식품'`, [tagJson])).map((r: { id: string }) => r.id);
    const v: Record<string, number> = {};
    v.masters = ids.length;
    v.spdKo = (await ds.query(`SELECT count(*)::int c FROM shared_product_descriptions WHERE master_id=ANY($1) AND language='ko' AND description_type='STORE' AND status='canonical' AND deleted_at IS NULL AND source_type='o4o_hff_generated'`, [ids]))[0].c;
    v.spdEn = (await ds.query(`SELECT count(*)::int c FROM shared_product_descriptions WHERE master_id=ANY($1) AND language='en' AND description_type='STORE' AND status='canonical' AND deleted_at IS NULL AND source_type='o4o_hff_generated'`, [ids]))[0].c;
    v.canonicalDup = (await ds.query(`SELECT count(*)::int c FROM (SELECT master_id, description_type, coalesce(language,'ko') l FROM shared_product_descriptions WHERE master_id=ANY($1) AND status='canonical' AND deleted_at IS NULL GROUP BY 1,2,3 HAVING count(*)>1) x`, [ids]))[0].c;
    v.candidatesLinked = (await ds.query(`SELECT count(*)::int c FROM product_candidates WHERE matched_product_master_id=ANY($1) AND candidate_status='approved_new_master'`, [ids]))[0].c;
    v.spdRefLinked = (await ds.query(`SELECT count(*)::int c FROM shared_product_descriptions s JOIN product_candidates pc ON pc.id=s.source_ref_id WHERE s.master_id=ANY($1) AND s.description_type='STORE' AND s.status='canonical'`, [ids]))[0].c;
    v.stmtDupMasters = (await ds.query(`SELECT count(*)::int c FROM (SELECT mfds_permit_number FROM product_masters WHERE id=ANY($1) GROUP BY 1 HAVING count(*)>1) x`, [ids]))[0].c;
    // 단일 기능성 전체 LIVE census(태그 prefix)
    const sfLive = (await ds.query(`SELECT count(DISTINCT m.id)::int c FROM product_masters m WHERE EXISTS (SELECT 1 FROM jsonb_array_elements_text(m.tags::jsonb) t WHERE t LIKE 'batch:single-functional-%')`))[0].c;
    const pass = v.masters === EXPECT && v.spdKo === EXPECT && v.spdEn === EXPECT && v.canonicalDup === 0 && v.candidatesLinked === EXPECT && v.spdRefLinked === EXPECT * 2 && v.stmtDupMasters === 0;
    console.log('JSON_VERIFY_BEGIN'); console.log(JSON.stringify({ tag: TAG, expect: EXPECT, ...v, singleFunctionalLiveTotal: sfLive, independentVerifyPass: pass }, null, 2)); console.log('JSON_VERIFY_END');
    if (!pass) process.exit(2);
  } finally { await ds.destroy(); }
}
main().catch((e) => { console.error('FAILED:', e instanceof Error ? e.message : e); process.exit(1); });
