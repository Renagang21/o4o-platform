/**
 * read-only EN reuse probe (WO-O4O-OTC-CLONIXIN-125MG-TABLET-KO-EN-COMPLETE-GA-V1, Agent 가). DB write 0.
 *   batch-01 번역 struct(클로닉신 125mg 정) → buildDrugOtcEnConsumerHtml → md5 == live out-29 EN(67144df2) 검증.
 *   + out-29 EN 균일성/summary · ko md5(out-29 vs target-26) 동일성.
 * 조사·독립검증 도구(재현용 커밋).
 */
import { readFileSync } from 'node:fs';
import crypto from 'node:crypto';
import { buildDrugOtcEnConsumerHtml, type DrugOtcEnTranslation } from '../modules/neture/drug-import/drug-otc-en-consumer-html.js';
const md5 = (s: string): string => crypto.createHash('md5').update(s).digest('hex');
const ENV_PATH = 'C:\\Users\\sohae\\o4o-platform\\apps\\api-server\\.env';
const readPw = (): string => readFileSync(ENV_PATH, 'utf8').match(/^DB_PASSWORD=(.*)$/m)![1].trim();
const CAND = '01994863-920a-45ea-97d1-f493416cafa7';
const GK = '클로닉신리시네이트|125밀리그램|정';
const run = JSON.parse(readFileSync('C:\\Users\\sohae\\o4o-platform\\apps\\api-server\\src\\scripts\\data\\otc-grounded-upgrade-clonixin-125mg-jeong.run.json', 'utf8'));
const TARGET: string[] = run.target_master_ids;
const batch01 = JSON.parse(readFileSync('C:\\Users\\sohae\\o4o-platform\\apps\\api-server\\src\\scripts\\data\\otc-en-translations-batch-01-v1.json', 'utf8'));

async function main(): Promise<void> {
  // batch-01 tablet 번역 struct
  const trList: DrugOtcEnTranslation[] = (batch01.translations || []).filter((t: any) => t.groupKey === GK);
  const built = trList.length === 1 ? buildDrugOtcEnConsumerHtml(trList[0]) : { html: '', missing: ['n/a'] };
  const builtMd5 = built.html ? md5(built.html) : null;

  const { DataSource } = await import('typeorm');
  const ds = new DataSource({ type: 'postgres', host: '127.0.0.1', port: 5433, username: 'o4o_api', password: readPw(), database: 'o4o_platform', entities: [], synchronize: false, logging: ['error'] });
  await ds.initialize();
  try {
    // out-29 EN (source_ref 공유, target 밖) content md5 + summary 분포
    const outEn = await ds.query(`
      SELECT md5(content) h, count(*)::int n, array_agg(DISTINCT COALESCE(summary,'<null>')) summaries
      FROM shared_product_descriptions
      WHERE source_ref_id=$1::uuid AND NOT master_id=ANY($2::uuid[]) AND description_type='STORE' AND language='en' AND status='canonical' AND deleted_at IS NULL
      GROUP BY 1`, [CAND, TARGET]);
    // ko md5: out-29 vs target-26 (동일 약물 증명)
    const koOut = await ds.query(`
      SELECT md5(content) h, count(*)::int n FROM shared_product_descriptions
      WHERE source_ref_id=$1::uuid AND NOT master_id=ANY($2::uuid[]) AND description_type='STORE' AND COALESCE(language,'ko')='ko' AND status='canonical' AND source_type='mfds_drug_otc' AND deleted_at IS NULL
      GROUP BY 1`, [CAND, TARGET]);
    const koTgt = await ds.query(`
      SELECT md5(content) h, count(*)::int n FROM shared_product_descriptions
      WHERE master_id=ANY($1::uuid[]) AND description_type='STORE' AND COALESCE(language,'ko')='ko' AND status='canonical' AND source_type='mfds_drug_otc' AND deleted_at IS NULL
      GROUP BY 1`, [TARGET]);

    console.log('JSON_BEGIN');
    console.log(JSON.stringify({
      batch01_entry_found: trList.length,
      batch01_summary: batch01.summary ?? null,
      builtMd5, builtMissing: built.missing, hasHangul: /[가-힣]/.test(built.html),
      liveOutEn: outEn.map((r: any) => ({ md5: r.h, n: r.n, summaries: r.summaries })),
      builtMatchesLiveOut: outEn.length === 1 && builtMd5 === outEn[0].h,
      koOut: koOut.map((r: any) => ({ md5: r.h, n: r.n })),
      koTgt: koTgt.map((r: any) => ({ md5: r.h, n: r.n })),
      koIdentical: koOut.length === 1 && koTgt.length === 1 && koOut[0].h === koTgt[0].h,
      translationEntry: trList[0] ?? null,
    }, null, 2));
    console.log('JSON_END');
  } finally { if (ds.isInitialized) await ds.destroy(); }
}
main().catch((e) => { console.error('FAIL', e instanceof Error ? e.message : e); process.exit(1); });
