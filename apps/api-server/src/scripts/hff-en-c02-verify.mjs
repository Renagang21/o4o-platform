/**
 * WO-O4O-HFF-EN-C02-IN-STORE-EXPERT-GUIDANCE-25404-FULL-REPAIR-V1 §9 독립검증
 * apply 산출물을 신뢰하지 않고 DB 현재 상태만 읽어 재계산한다. read-only.
 */
import fs from 'node:fs';
import pg from 'pg';
const D = 'apps/api-server/src/scripts/data';
const WO = 'WO-O4O-HFF-EN-C02-IN-STORE-EXPERT-GUIDANCE-25404-FULL-REPAIR-V1';
const APPLIED = JSON.parse(fs.readFileSync(`${D}/hff-en-c02-apply-result-v1.json`, 'utf8'));
const EN_FIXED = APPLIED.enFixed, KO_FIXED = APPLIED.koFixed;
const c = new pg.Client({ host: '127.0.0.1', port: parseInt(process.env.PROXY_PORT ?? '5561', 10), user: 'o4o_api', password: process.env.PGPW, database: 'o4o_platform', statement_timeout: 1800000 });
await c.connect(); await c.query('SET default_transaction_read_only = on');
if ((await c.query('SHOW transaction_read_only')).rows[0].transaction_read_only !== 'on') { console.error('NOT_READ_ONLY'); process.exit(1); }
const B = `deleted_at IS NULL AND source_type='o4o_hff_generated' AND description_type='STORE' AND status='canonical'`;
const q = async (s) => (await c.query(s)).rows[0].n;
const ctaKoLeft = await q(`SELECT count(*)::int n FROM shared_product_descriptions WHERE ${B} AND language='en' AND content LIKE '%${KO_FIXED}%'`);
const ctaEn = await q(`SELECT count(*)::int n FROM shared_product_descriptions WHERE ${B} AND language='en' AND content LIKE '%${EN_FIXED}%'`);
const ctaEmpty = await q(`SELECT count(*)::int n FROM shared_product_descriptions WHERE ${B} AND language='en' AND content ~ '<div class="sd-cta"[^>]*>\s*<p>\s*</p>'`);
const ctaDup = await q(`SELECT count(*)::int n FROM shared_product_descriptions WHERE ${B} AND language='en' AND (length(content) - length(replace(content, '${EN_FIXED}', ''))) / ${EN_FIXED.length} > 1`);
const anyCtaHangul = await q(`SELECT count(*)::int n FROM shared_product_descriptions WHERE ${B} AND language='en' AND substring(content from '<div class="sd-cta"[^>]*>\s*<p>(.*?)</p>') ~ '[가-힣]'`);
const dup = await q(`SELECT count(*)::int n FROM (SELECT master_id FROM shared_product_descriptions WHERE ${B} AND language='en' GROUP BY master_id HAVING count(*)>1) a`);
const g = (await c.query(`SELECT
  (SELECT count(*)::int FROM shared_product_descriptions WHERE ${B} AND coalesce(language,'ko')='ko') ko,
  (SELECT count(*)::int FROM shared_product_descriptions WHERE ${B} AND language='en') en,
  (SELECT count(*)::int FROM shared_product_descriptions WHERE ${B} AND language='ja') ja,
  (SELECT count(*)::int FROM shared_product_descriptions WHERE ${B} AND language='zh') zh,
  (SELECT count(*)::int FROM product_masters WHERE regulatory_type='건강기능식품') pm`)).rows[0];
/* 대상 밖 write — 작업 구간에 갱신된 EN 행이 대상 수와 같아야 한다 */
const outside = await q(`SELECT count(*)::int n FROM shared_product_descriptions WHERE ${B} AND language='en' AND updated_at >= '${APPLIED.startedAt}'`);
await c.end();
const out = {
  wo: WO, verifiedAt: new Date().toISOString(), readOnly: true, dbWrites: 0,
  ctaKoResidueBefore: APPLIED.targets, ctaKoResidueAfter: ctaKoLeft,
  ctaEnglishNow: ctaEn, ctaEmpty, ctaDuplicateSentence: ctaDup, anyCtaHangulRemaining: anyCtaHangul,
  enRowsUpdatedInWindow: outside, expectedUpdatedInWindow: APPLIED.actualUpdate,
  writesOutsideTarget: outside - APPLIED.actualUpdate,
  canonicalDup: dup,
  totals: { ko: g.ko, en: g.en, ja: g.ja, zh: g.zh, pm: g.pm },
  koUnchanged: g.ko === APPLIED.before.ko_canon, enCountUnchanged: g.en === APPLIED.before.en_canon,
  jaUnchanged: g.ja === APPLIED.before.ja_canon, zhUnchanged: g.zh === APPLIED.before.zh_canon,
  pmUnchanged: g.pm === APPLIED.before.pm_hff,
};
out.verdict = (!ctaKoLeft && ctaEn === APPLIED.actualUpdate && !ctaEmpty && !ctaDup && !anyCtaHangul
  && out.writesOutsideTarget === 0 && !dup && out.koUnchanged && out.enCountUnchanged
  && out.jaUnchanged && out.zhUnchanged && out.pmUnchanged) ? 'PASS' : 'FAIL';
fs.writeFileSync(`${D}/hff-en-c02-verify-v1.json`, JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 2));
