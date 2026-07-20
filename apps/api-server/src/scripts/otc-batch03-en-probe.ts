/**
 * read-only EN reuse probe (WO-O4O-OTC-NIZATIDINE-LEVOCARNITINE-SOBREROL-KO-EN-COMPLETE-GA-V1, Agent 가). DB write 0.
 * 3그룹: otc-en-translations-v1.json struct → buildDrugOtcEnConsumerHtml → md5 == live out EN 검증 + ko md5(out vs target) 동일성.
 * 조사·독립검증 도구(재현용 커밋).
 */
import { readFileSync } from 'node:fs';
import crypto from 'node:crypto';
import { buildDrugOtcEnConsumerHtml, type DrugOtcEnTranslation } from '../modules/neture/drug-import/drug-otc-en-consumer-html.js';
const md5 = (s: string): string => crypto.createHash('md5').update(s).digest('hex');
const ENV_PATH = 'C:\\Users\\sohae\\o4o-platform\\apps\\api-server\\.env';
const readPw = (): string => readFileSync(ENV_PATH, 'utf8').match(/^DB_PASSWORD=(.*)$/m)![1].trim();
const DATA = 'C:\\Users\\sohae\\o4o-platform\\apps\\api-server\\src\\scripts\\data\\';
const MASTER = 'C:\\Users\\sohae\\o4o-platform\\docs\\guides\\products\\drug\\pilot-en-design\\translations\\otc-en-translations-v1.json';
const master = JSON.parse(readFileSync(MASTER, 'utf8'));

const GROUPS = [
  { key: 'nizatidine-75mg-jeong', gk: '니자티딘|75밀리그램|정', cand: '048ba86f-f85e-42f8-97fd-7bc4e46cc092' },
  { key: 'levocarnitine-330mg-jeong', gk: '엘카르니틴|330밀리그램|정', cand: '035efa8f-cc53-4e64-a111-c4528689f457' },
  { key: 'sobrerol-200mg-capsule', gk: '소브레롤|200밀리그램|캡슐', cand: '0ff909f4-20dc-49d1-b8c5-91794ab62df6' },
];

async function main(): Promise<void> {
  const { DataSource } = await import('typeorm');
  const ds = new DataSource({ type: 'postgres', host: '127.0.0.1', port: 5433, username: 'o4o_api', password: readPw(), database: 'o4o_platform', entities: [], synchronize: false, logging: ['error'] });
  await ds.initialize();
  const results: any[] = [];
  try {
    for (const g of GROUPS) {
      let target: string[] = [];
      try { target = JSON.parse(readFileSync(DATA + `otc-grounded-upgrade-${g.key}.run.json`, 'utf8')).rollback_master_ids || []; } catch { /* ko not run yet */ }
      const trList: DrugOtcEnTranslation[] = (master.translations || []).filter((t: any) => t.groupKey === g.gk);
      const built = trList.length === 1 ? buildDrugOtcEnConsumerHtml(trList[0]) : { html: '', missing: ['n/a'] };
      const builtMd5 = built.html ? md5(built.html) : null;
      // out EN (source_ref 공유, target 밖)
      const outEn = await ds.query(`
        SELECT md5(content) h, count(*)::int n, array_agg(DISTINCT COALESCE(summary,'<null>')) summaries
        FROM shared_product_descriptions
        WHERE source_ref_id=$1::uuid ${target.length ? 'AND NOT master_id=ANY($2::uuid[])' : ''} AND description_type='STORE' AND language='en' AND status='canonical' AND deleted_at IS NULL
        GROUP BY 1`, target.length ? [g.cand, target] : [g.cand]);
      // ko md5 out vs target
      const koOut = await ds.query(`
        SELECT md5(content) h, count(*)::int n FROM shared_product_descriptions
        WHERE source_ref_id=$1::uuid ${target.length ? 'AND NOT master_id=ANY($2::uuid[])' : ''} AND description_type='STORE' AND COALESCE(language,'ko')='ko' AND status='canonical' AND source_type='mfds_drug_otc' AND deleted_at IS NULL
        GROUP BY 1`, target.length ? [g.cand, target] : [g.cand]);
      const koTgt = target.length ? await ds.query(`
        SELECT md5(content) h, count(*)::int n FROM shared_product_descriptions
        WHERE master_id=ANY($1::uuid[]) AND description_type='STORE' AND COALESCE(language,'ko')='ko' AND status='canonical' AND source_type='mfds_drug_otc' AND deleted_at IS NULL GROUP BY 1`, [target]) : [];
      const enTgt = target.length ? await ds.query(`
        SELECT count(DISTINCT master_id)::int m, count(*) FILTER (WHERE status='canonical')::int c, count(*) FILTER (WHERE status='needs_review')::int nr
        FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[]) AND description_type='STORE' AND language='en' AND deleted_at IS NULL`, [target]) : [{ m: 0, c: 0, nr: 0 }];
      results.push({
        key: g.key, gk: g.gk, target_n: target.length, structFound: trList.length,
        title: trList[0]?.title ?? null, hasHangul: /[가-힣]/.test(built.html), builtMissing: built.missing, builtMd5,
        liveOutEn: outEn.map((r: any) => ({ md5: r.h, n: r.n, summaries: r.summaries })),
        builtMatchesLiveOut: outEn.length === 1 && builtMd5 === outEn[0].h,
        koOutMd5: koOut.map((r: any) => ({ md5: r.h, n: r.n })),
        koTgtMd5: koTgt.map((r: any) => ({ md5: r.h, n: r.n })),
        koIdentical: koOut.length === 1 && koTgt.length === 1 && koOut[0].h === koTgt[0].h,
        targetExistingEn: enTgt[0],
      });
    }
    console.log('JSON_BEGIN'); console.log(JSON.stringify(results, null, 2)); console.log('JSON_END');
  } finally { if (ds.isInitialized) await ds.destroy(); }
}
main().catch((e) => { console.error('FAIL', e instanceof Error ? e.message : e); process.exit(1); });
