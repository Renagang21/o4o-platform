/**
 * WO-O4O-HFF-ZH-ALL-REMAINING-10414-DIRECT-BULK-PRODUCTION-AND-TRACK-CLOSURE-V1  §7 독립검증(전량)
 *
 * 두 패스(10,414 + 84 = 10,498)를 하나로 묶어 DB 현재 상태만 읽고 재검증한다. read-only.
 * 개별 패스 검증은 각각 통과했으나, 수치 비교기 수정 전에 돌아간 1차 패스를 수정된 기준으로 다시 본다.
 */
import fs from 'node:fs';
import pg from 'pg';
import { lostNums, KEEP_PROPER } from './hff-zh-b01-translate.mjs';

const D = 'apps/api-server/src/scripts/data';
const P1 = JSON.parse(fs.readFileSync(`${D}/hff-zh-final-apply-result-pass1-v1.json`, 'utf8'));
const P2 = JSON.parse(fs.readFileSync(`${D}/hff-zh-final-apply-result-v1.json`, 'utf8'));
const ids = [...(P1.insertedIds ?? []), ...(P2.insertedIds ?? [])];

const HANGUL = /[가-힣ㄱ-ㅎㅏ-ㅣ]/;
const flat = (h) => h.replace(/<[^>]+>/g, ' | ');
const c = new pg.Client({ host: '127.0.0.1', port: parseInt(process.env.PROXY_PORT ?? '5463', 10), user: 'o4o_api', password: process.env.PGPW, database: 'o4o_platform', statement_timeout: 900000 });
await c.connect();
await c.query('SET default_transaction_read_only = on');
if ((await c.query('SHOW transaction_read_only')).rows[0].transaction_read_only !== 'on') { console.error('NOT_READ_ONLY'); process.exit(1); }

let checked = 0, contract = 0, hangulDoc = 0, numDrift = 0, koMissing = 0;
const samples = [];
for (let i = 0; i < ids.length; i += 500) {
  const rows = (await c.query(`
    SELECT z.id, z.master_id, z.language, z.status, z.description_type, z.source_type, z.content,
           k.content ko
      FROM shared_product_descriptions z
      LEFT JOIN shared_product_descriptions k
        ON k.master_id = z.master_id AND k.deleted_at IS NULL AND k.description_type = 'STORE'
       AND k.status = 'canonical' AND coalesce(k.language,'ko') = 'ko' AND k.source_type = 'o4o_hff_generated'
     WHERE z.id = ANY($1::uuid[]) AND z.deleted_at IS NULL`, [ids.slice(i, i + 500)])).rows;
  for (const r of rows) {
    checked++;
    if (!(r.language === 'zh' && r.status === 'canonical' && r.description_type === 'STORE' && r.source_type === 'o4o_hff_generated')) contract++;
    if (!r.ko) { koMissing++; continue; }
    const rest = r.content.replace(/<h1[^>]*>[\s\S]*?(?=<small|<\/h1>)/g, ' ').replace(/<[^>]+>/g, ' ').replace(KEEP_PROPER, ' ');
    if (HANGUL.test(rest)) { hangulDoc++; if (samples.length < 8) samples.push({ m: r.master_id, why: 'HANGUL' }); }
    const lost = lostNums(flat(r.ko), flat(r.content));
    if (lost.length) { numDrift++; if (samples.length < 8) samples.push({ m: r.master_id, why: 'NUM_DRIFT', lost: lost.slice(0, 5) }); }
  }
}

const g = (await c.query(`
  SELECT (SELECT count(*)::int FROM shared_product_descriptions WHERE deleted_at IS NULL AND description_type='STORE'
            AND status='canonical' AND coalesce(language,'ko')='ko' AND source_type='o4o_hff_generated') ko_canon,
    (SELECT count(*)::int FROM shared_product_descriptions WHERE deleted_at IS NULL AND description_type='STORE'
       AND status='canonical' AND language='en' AND source_type='o4o_hff_generated') en_canon,
    (SELECT count(*)::int FROM shared_product_descriptions WHERE deleted_at IS NULL AND description_type='STORE'
       AND status='canonical' AND language='zh' AND source_type='o4o_hff_generated') zh_canon,
    (SELECT count(*)::int FROM product_masters WHERE regulatory_type='건강기능식품') pm_hff,
    (SELECT count(*)::int FROM (SELECT master_id FROM shared_product_descriptions
        WHERE deleted_at IS NULL AND description_type='STORE' AND status='canonical'
          AND language='zh' AND source_type='o4o_hff_generated'
        GROUP BY master_id HAVING count(*) > 1) x) zh_dup`)).rows[0];

const out = {
  wo: P2.wo, verifiedAt: new Date().toISOString(), readOnly: true, dbWrites: 0,
  pass1Inserted: P1.inserted, pass2Inserted: P2.inserted, expectedTotal: P1.inserted + P2.inserted,
  rowsFound: checked, totalMatches: checked === P1.inserted + P2.inserted,
  contractViolations: contract, koMissing, hangulInSlots: hangulDoc, numberDrift: numDrift,
  koCanonNow: g.ko_canon, koUnchanged: g.ko_canon === P1.before.ko_canon,
  enCanonNow: g.en_canon, enUnchanged: g.en_canon === P1.before.en_canon,
  pmUnchanged: g.pm_hff === P1.before.pm_hff,
  zhCanonNow: g.zh_canon, zhDeltaSinceStart: g.zh_canon - P1.before.zh_canon,
  zhDeltaMatches: (g.zh_canon - P1.before.zh_canon) === P1.inserted + P2.inserted,
  canonicalDup: g.zh_dup, samples,
};
out.verdict = (out.totalMatches && !contract && !koMissing && !hangulDoc && !numDrift
  && out.koUnchanged && out.enUnchanged && out.pmUnchanged && out.zhDeltaMatches && !g.zh_dup) ? 'PASS' : 'FAIL';
fs.writeFileSync(`${D}/hff-zh-final-verify-all-v1.json`, JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 2));
await c.end();
