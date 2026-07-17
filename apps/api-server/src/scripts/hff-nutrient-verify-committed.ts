/**
 * HFF 단일 영양소 적재 — 독립 사후검증 (별도 연결, read-only)
 *   PROXY_PORT=5433 npx tsx src/scripts/hff-nutrient-verify-committed.ts --target <json> --slug zinc
 */
import '../env-loader.js';
import * as fs from 'node:fs';
import { DataSource } from 'typeorm';

const arg = (n: string, d = ''): string => { const i = process.argv.indexOf(`--${n}`); return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : d; };
const TARGET = arg('target'); const SLUG = arg('slug');
if (!TARGET || !SLUG) throw new Error('--target --slug 필요');
const PROXY_HOST = process.env.PROXY_HOST ?? '127.0.0.1'; const PROXY_PORT = parseInt(process.env.PROXY_PORT ?? '5433', 10);
const SP = 'C:/Users/sohae/AppData/Local/Temp/claude/c--Users-sohae-o4o-platform/2b5935f9-9c75-483f-8206-e3385235d4d4/scratchpad';
const items = JSON.parse(fs.readFileSync(TARGET, 'utf8')) as Array<{ statementNo: string }>;
const stmts = items.map((x) => String(x.statementNo).trim()); const EXPECT = items.length;

async function main(): Promise<void> {
  const ds = new DataSource({ type: 'postgres', host: PROXY_HOST, port: PROXY_PORT, username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME, entities: [], synchronize: false, logging: ['error'], ssl: false, extra: { max: 2, connectionTimeoutMillis: 15000, statement_timeout: 60000 } });
  await ds.initialize();
  const one = async (sql: string, p: unknown[] = []) => (await ds.query(sql, p))[0].c as number;
  const ok = (b: boolean) => (b ? '✅' : '❌');
  try {
    const masters = await one(`SELECT count(*)::int c FROM product_masters WHERE mfds_permit_number = ANY($1)`, [stmts]);
    const ids = (await ds.query(`SELECT id FROM product_masters WHERE mfds_permit_number = ANY($1)`, [stmts])).map((x: { id: string }) => x.id);
    const barcodeNull = await one(`SELECT count(*)::int c FROM product_masters WHERE mfds_permit_number = ANY($1) AND barcode IS NULL`, [stmts]);
    const regType = await one(`SELECT count(*)::int c FROM product_masters WHERE mfds_permit_number = ANY($1) AND regulatory_type='건강기능식품'`, [stmts]);
    const permitUniq = await one(`SELECT count(*)::int c FROM (SELECT DISTINCT mfds_permit_number FROM product_masters WHERE mfds_permit_number = ANY($1)) x`, [stmts]);
    const tagged = await one(`SELECT count(*)::int c FROM product_masters WHERE id = ANY($1) AND tags::jsonb ? $2`, [ids, `batch:single-nutrient-${SLUG}`]);
    const candLinked = await one(`SELECT count(*)::int c FROM product_candidates WHERE matched_product_master_id = ANY($1) AND candidate_status='approved_new_master'`, [ids]);
    const spdKo = await one(`SELECT count(*)::int c FROM shared_product_descriptions WHERE master_id = ANY($1) AND language='ko' AND description_type='STORE' AND status='canonical' AND deleted_at IS NULL`, [ids]);
    const spdEn = await one(`SELECT count(*)::int c FROM shared_product_descriptions WHERE master_id = ANY($1) AND language='en' AND description_type='STORE' AND status='canonical' AND deleted_at IS NULL`, [ids]);
    const spdSource = await one(`SELECT count(*)::int c FROM shared_product_descriptions WHERE master_id = ANY($1) AND description_type='STORE' AND status='canonical' AND source_type='o4o_hff_generated' AND deleted_at IS NULL`, [ids]);
    const canonicalDup = await one(`SELECT count(*)::int c FROM (SELECT master_id, description_type, coalesce(language,'ko') l FROM shared_product_descriptions WHERE master_id = ANY($1) AND status='canonical' AND deleted_at IS NULL GROUP BY 1,2,3 HAVING count(*)>1) x`, [ids]);
    const manifest = `${SP}/hff-${SLUG}-apply-rollback-manifest.json`; const mOk = fs.existsSync(manifest);
    const totalWrite = masters + candLinked + spdKo + spdEn;
    const allPass = masters === EXPECT && candLinked === EXPECT && spdKo === EXPECT && spdEn === EXPECT && spdSource === EXPECT * 2 && canonicalDup === 0 && permitUniq === EXPECT && barcodeNull === EXPECT && regType === EXPECT && tagged === EXPECT && totalWrite === EXPECT * 4 && mOk;
    console.log(`═══ ${SLUG} 적재 독립 사후검증 (별도 연결, 대상 ${EXPECT}) ═══`);
    console.log(`${ok(masters === EXPECT)} master ${masters}/${EXPECT} · ${ok(candLinked === EXPECT)} candidate ${candLinked}/${EXPECT} · ${ok(spdKo === EXPECT)} ko ${spdKo} · ${ok(spdEn === EXPECT)} en ${spdEn} · ${ok(spdSource === EXPECT * 2)} source_type ${spdSource}/${EXPECT * 2}`);
    console.log(`${ok(canonicalDup === 0)} canonicalDup ${canonicalDup} · ${ok(permitUniq === EXPECT)} 신고번호유일 ${permitUniq} · ${ok(barcodeNull === EXPECT)} barcodeNULL ${barcodeNull} · ${ok(regType === EXPECT)} 건기식 ${regType} · ${ok(tagged === EXPECT)} tag ${tagged}`);
    console.log(`${ok(totalWrite === EXPECT * 4)} 실제write ${totalWrite}/${EXPECT * 4} · ${ok(mOk)} 롤백매니페스트`);
    console.log(`\n${ok(allPass)} 종합 ${SLUG} 독립검증 ${allPass ? 'PASS' : 'FAIL'}`);
    if (!allPass) process.exit(2);
  } finally { await ds.destroy(); }
}
main().catch((e) => { console.error('[hff-nutrient-verify] FAILED:', e instanceof Error ? e.message : e); process.exit(1); });
