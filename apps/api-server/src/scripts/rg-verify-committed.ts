/**
 * 홍삼 271 적재 후 독립 연결 사후검증 (read-only) — commit 결과를 새 커넥션에서 재확인.
 *   PROXY_PORT=5442 npx tsx src/scripts/rg-verify-committed.ts
 */
import '../env-loader.js';
import * as fs from 'node:fs';
import { DataSource } from 'typeorm';

const PROXY_PORT = parseInt(process.env.PROXY_PORT ?? '5442', 10);
const SPD_SOURCE_TYPE = 'o4o_hff_generated';
const REGULATORY_TYPE = '건강기능식품';
const EXPECT = 271;
const SP = 'C:/Users/sohae/AppData/Local/Temp/claude/c--Users-sohae-o4o-platform/30d2fee8-8e25-4e6d-8656-fa0ee7713bfa/scratchpad';
const DATA = 'C:/Users/sohae/o4o-platform/docs/checks/data/product-description-guard';

(async () => {
  const manifest = JSON.parse(fs.readFileSync(`${SP}/rg-apply-rollback-manifest.json`, 'utf8'));
  const ids: string[] = manifest.createdMasters;
  const holdStmts: string[] = JSON.parse(fs.readFileSync(`${DATA}/hff-red-ginseng-hold.json`, 'utf8')).map((h: any) => String(h.statementNo));
  const ds = new DataSource({
    type: 'postgres', host: '127.0.0.1', port: PROXY_PORT,
    username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME,
    entities: [], synchronize: false, logging: ['error'], ssl: false,
    extra: { max: 2, connectionTimeoutMillis: 15000, keepAlive: true, query_timeout: 60000 },
  });
  await ds.initialize();
  const q = async (sql: string, p: any[]) => (await ds.query(sql, p))[0].c as number;
  const v: any = {};
  v.masters = await q(`SELECT count(*)::int c FROM product_masters WHERE id = ANY($1)`, [ids]);
  v.mastersBarcodeNull = await q(`SELECT count(*)::int c FROM product_masters WHERE id = ANY($1) AND barcode IS NULL AND regulatory_type=$2`, [ids, REGULATORY_TYPE]);
  v.candidatesLinked = await q(`SELECT count(*)::int c FROM product_candidates WHERE matched_product_master_id = ANY($1) AND candidate_status='approved_new_master'`, [ids]);
  v.spdKo = await q(`SELECT count(*)::int c FROM shared_product_descriptions WHERE master_id = ANY($1) AND language='ko' AND description_type='STORE' AND status='canonical'`, [ids]);
  v.spdEn = await q(`SELECT count(*)::int c FROM shared_product_descriptions WHERE master_id = ANY($1) AND language='en' AND description_type='STORE' AND status='canonical'`, [ids]);
  v.spdSourceType = await q(`SELECT count(*)::int c FROM shared_product_descriptions WHERE master_id = ANY($1) AND source_type=$2`, [ids, SPD_SOURCE_TYPE]);
  v.canonicalDup = await q(`SELECT count(*)::int c FROM (SELECT master_id, description_type, coalesce(language,'ko') l FROM shared_product_descriptions WHERE master_id = ANY($1) AND status='canonical' AND deleted_at IS NULL GROUP BY 1,2,3 HAVING count(*)>1) x`, [ids]);
  v.permitUnique = await q(`SELECT count(DISTINCT mfds_permit_number)::int c FROM product_masters WHERE id = ANY($1)`, [ids]);
  v.totalWrites = v.masters + v.candidatesLinked + v.spdKo + v.spdEn;
  // HOLD 16 대상 무변경: 이 배치로 생성된 master 0 (신고번호 기준)
  v.holdMastersCreated = await q(`SELECT count(*)::int c FROM product_masters WHERE mfds_permit_number = ANY($1) AND tags::text ILIKE '%red-ginseng-001%'`, [holdStmts]);
  await ds.destroy();

  const ok = v.masters === EXPECT && v.mastersBarcodeNull === EXPECT && v.candidatesLinked === EXPECT
    && v.spdKo === EXPECT && v.spdEn === EXPECT && v.spdSourceType === EXPECT * 2
    && v.canonicalDup === 0 && v.permitUnique === EXPECT && v.totalWrites === EXPECT * 4 && v.holdMastersCreated === 0;
  console.log('INDEP_VERIFY_BEGIN'); console.log(JSON.stringify({ ...v, verifyPass: ok }, null, 2)); console.log('INDEP_VERIFY_END');
  if (!ok) process.exit(2);
})().catch((e) => { console.error('[rg-verify-committed] FAILED:', e instanceof Error ? e.message : e); process.exit(1); });
