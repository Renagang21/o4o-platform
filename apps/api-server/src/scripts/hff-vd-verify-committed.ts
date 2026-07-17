/**
 * 비타민 D 417 적재 — **독립 사후 검증** (별도 연결, read-only SELECT)
 *   PROXY_PORT=5433 npx tsx src/scripts/hff-vd-verify-committed.ts
 * apply 커밋 결과를 매니페스트 신고번호 417 기준으로 프로덕션에서 재조회. DB write 0.
 */
import '../env-loader.js';
import * as fs from 'node:fs';
import { DataSource } from 'typeorm';

const PROXY_HOST = process.env.PROXY_HOST ?? '127.0.0.1';
const PROXY_PORT = parseInt(process.env.PROXY_PORT ?? '5433', 10);
const DATA = 'C:/Users/sohae/o4o-platform/docs/checks/data/product-description-guard';
const SP = 'C:/Users/sohae/AppData/Local/Temp/claude/c--Users-sohae-o4o-platform/2b5935f9-9c75-483f-8206-e3385235d4d4/scratchpad';

const preload: Array<{ statementNo: string }> = JSON.parse(fs.readFileSync(`${DATA}/hff-vitamin-d-preload-417.json`, 'utf8'));
const stmts = preload.map((x) => String(x.statementNo).trim());

async function main(): Promise<void> {
  const ds = new DataSource({
    type: 'postgres', host: PROXY_HOST, port: PROXY_PORT,
    username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME,
    entities: [], synchronize: false, logging: ['error'], ssl: false,
    extra: { max: 2, connectionTimeoutMillis: 15000, statement_timeout: 60000 },
  });
  await ds.initialize();
  const q = (sql: string, p: unknown[] = []) => ds.query(sql, p);
  const one = async (sql: string, p: unknown[] = []) => (await q(sql, p))[0].c as number;
  const ok = (b: boolean) => (b ? '✅' : '❌');
  try {
    // 신규 master (신고번호 기준)
    const masters = await one(`SELECT count(*)::int c FROM product_masters WHERE mfds_permit_number = ANY($1)`, [stmts]);
    const masterIds: Array<{ id: string }> = await q(`SELECT id FROM product_masters WHERE mfds_permit_number = ANY($1)`, [stmts]);
    const ids = masterIds.map((x) => x.id);
    const barcodeNull = await one(`SELECT count(*)::int c FROM product_masters WHERE mfds_permit_number = ANY($1) AND barcode IS NULL`, [stmts]);
    const regType = await one(`SELECT count(*)::int c FROM product_masters WHERE mfds_permit_number = ANY($1) AND regulatory_type='건강기능식품'`, [stmts]);
    const permitUniq = await one(`SELECT count(*)::int c FROM (SELECT DISTINCT mfds_permit_number FROM product_masters WHERE mfds_permit_number = ANY($1)) x`, [stmts]);
    const tagged = await one(`SELECT count(*)::int c FROM product_masters WHERE id = ANY($1) AND tags::jsonb ? 'batch:vitamin-d-production'`, [ids]);
    // candidate 연결
    const candLinked = await one(`SELECT count(*)::int c FROM product_candidates WHERE matched_product_master_id = ANY($1) AND candidate_status='approved_new_master'`, [ids]);
    // SPD
    const spdKo = await one(`SELECT count(*)::int c FROM shared_product_descriptions WHERE master_id = ANY($1) AND language='ko' AND description_type='STORE' AND status='canonical' AND deleted_at IS NULL`, [ids]);
    const spdEn = await one(`SELECT count(*)::int c FROM shared_product_descriptions WHERE master_id = ANY($1) AND language='en' AND description_type='STORE' AND status='canonical' AND deleted_at IS NULL`, [ids]);
    const spdSource = await one(`SELECT count(*)::int c FROM shared_product_descriptions WHERE master_id = ANY($1) AND description_type='STORE' AND status='canonical' AND source_type='o4o_hff_generated' AND deleted_at IS NULL`, [ids]);
    const spdRef = await one(`SELECT count(*)::int c FROM shared_product_descriptions s WHERE s.master_id = ANY($1) AND s.description_type='STORE' AND EXISTS (SELECT 1 FROM product_candidates c WHERE c.id=s.source_ref_id AND c.matched_product_master_id=s.master_id)`, [ids]);
    const canonicalDup = await one(`SELECT count(*)::int c FROM (SELECT master_id, description_type, coalesce(language,'ko') l FROM shared_product_descriptions WHERE master_id = ANY($1) AND status='canonical' AND deleted_at IS NULL GROUP BY 1,2,3 HAVING count(*)>1) x`, [ids]);

    const manifestPath = `${SP}/hff-vd-apply-rollback-manifest.json`;
    const manifestOk = fs.existsSync(manifestPath);
    let manifestCounts = '';
    if (manifestOk) { const m = JSON.parse(fs.readFileSync(manifestPath, 'utf8')); manifestCounts = `masters ${m.createdMasters?.length} · spd ${m.createdSpd?.length} · cand ${m.candIds?.length}`; }

    const totalWrite = masters + candLinked + spdKo + spdEn;
    console.log('═══ 비타민 D 417 적재 — 독립 사후검증 (별도 연결) ═══\n');
    console.log(`${ok(masters === 417)} 신규 ProductMaster            ${masters} / 417`);
    console.log(`${ok(candLinked === 417)} candidate approved_new_master 연결 ${candLinked} / 417`);
    console.log(`${ok(spdKo === 417)} STORE canonical ko            ${spdKo} / 417`);
    console.log(`${ok(spdEn === 417)} STORE canonical en            ${spdEn} / 417`);
    console.log(`${ok(spdSource === 834)} source_type=o4o_hff_generated ${spdSource} / 834`);
    console.log(`${ok(canonicalDup === 0)} canonical 중복                ${canonicalDup} / 0`);
    console.log(`${ok(permitUniq === 417)} 신고번호 유일                 ${permitUniq} / 417`);
    console.log(`${ok(barcodeNull === 417)} barcode NULL                  ${barcodeNull} / 417`);
    console.log(`${ok(regType === 417)} regulatory_type=건강기능식품   ${regType} / 417`);
    console.log(`${ok(tagged === 417)} batch:vitamin-d-production tag ${tagged} / 417`);
    console.log(`${ok(spdRef === 834)} source_ref→candidate→master 연결 ${spdRef} / 834`);
    console.log(`${ok(totalWrite === 1668)} 실제 write (master+cand+spd)   ${totalWrite} / 1,668`);
    console.log(`${ok(manifestOk)} 롤백 매니페스트 생성           ${manifestOk ? manifestCounts : '없음'}`);
    const allPass = masters === 417 && candLinked === 417 && spdKo === 417 && spdEn === 417 && spdSource === 834 && canonicalDup === 0 && permitUniq === 417 && barcodeNull === 417 && regType === 417 && totalWrite === 1668 && spdRef === 834 && manifestOk;
    console.log(`\n${ok(allPass)} 종합 — 비타민 D 417 적재 독립 검증 ${allPass ? 'PASS' : 'FAIL'}`);
  } finally {
    await ds.destroy();
  }
}
main().catch((e) => { console.error('[hff-vd-verify-committed] FAILED:', e instanceof Error ? e.message : e); process.exit(1); });
