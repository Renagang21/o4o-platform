/**
 * WO-O4O-HFF-ZH-TRANSLATION-AMBIGUOUS-319-REPAIR-AND-APPLY-V1  §8 독립검증 (read-only)
 *
 * Apply 산출물이 아니라 **DB 현재 상태**만 읽어 재판정한다.
 *   - 대상 합계 319 / KO 해시 drift 0 / ProductMaster 변경 0 / ZH 증가량 일치
 *   - canonical 중복 0 / 수치·단위 drift 0 / 슬롯 한국어 0 / raw HTML·marker 0 / 빈 절 0
 *   - 배치 밖 write 0 (이번 패스 삽입 id 가 전부 대상 master 에 속하는지)
 *   - 큐 정산 (직전 큐 319 = 이번 해소 319 + 잔여 0)
 *   - KO 40,918 대비 ZH 총수 일치 — 이 WO 로 언어 3축이 같은 모집단에 도달했는지
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import pg from 'pg';
import { lostNums, KEEP_PROPER } from './hff-zh-b01-translate.mjs';

const D = 'apps/api-server/src/scripts/data';
const sha = (s) => crypto.createHash('sha256').update(s ?? '').digest('hex');
const rdl = (f) => fs.readFileSync(`${D}/${f}`, 'utf8').split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l));

const TARGETS = JSON.parse(fs.readFileSync(`${D}/hff-zh-ta-safe-targets-v1.json`, 'utf8')).targets;
const APPLY = JSON.parse(fs.readFileSync(`${D}/hff-zh-ta-apply-result-v1.json`, 'utf8'));
const IDS = new Set(TARGETS.map((t) => t.productMasterId));
const BASE_QUEUE = rdl('hff-zh-ta-prior-queue-v1.jsonl');
const NOW_QUEUE = fs.existsSync(`${D}/hff-zh-deferred-issue-queue-through-final-v1.jsonl`)
  ? rdl('hff-zh-deferred-issue-queue-through-final-v1.jsonl') : [];

const HANGUL = /[가-힣ㄱ-ㅎㅏ-ㅣ]/;
const flat = (h) => h.replace(/<[^>]+>/g, ' | ');
const c = new pg.Client({ host: '127.0.0.1', port: parseInt(process.env.PROXY_PORT ?? '5463', 10), user: 'o4o_api', password: process.env.PGPW, database: 'o4o_platform', statement_timeout: 900000 });
await c.connect();
await c.query('SET default_transaction_read_only = on');
if ((await c.query('SHOW transaction_read_only')).rows[0].transaction_read_only !== 'on') { console.error('NOT_READ_ONLY'); process.exit(1); }

const HFF = `deleted_at IS NULL AND description_type='STORE' AND status='canonical' AND source_type='o4o_hff_generated'`;
const g = (await c.query(`SELECT count(*) FILTER (WHERE coalesce(language,'ko')='ko') ko,
         count(*) FILTER (WHERE language='en') en, count(*) FILTER (WHERE language='zh') zh
    FROM shared_product_descriptions WHERE ${HFF}`)).rows[0];
const pmHff = Number((await c.query(`SELECT count(*) n FROM product_masters WHERE regulatory_type='건강기능식품'`)).rows[0].n);

const rows = (await c.query(`
  SELECT z.id, z.master_id, z.language, z.status, z.description_type, z.source_type, z.content,
         k.content ko, k.id ko_id
    FROM shared_product_descriptions z
    LEFT JOIN shared_product_descriptions k
      ON k.master_id = z.master_id AND k.deleted_at IS NULL AND k.description_type='STORE'
     AND k.status='canonical' AND coalesce(k.language,'ko')='ko' AND k.source_type='o4o_hff_generated'
   WHERE z.deleted_at IS NULL AND z.description_type='STORE' AND z.status='canonical'
     AND z.source_type='o4o_hff_generated' AND z.language='zh'
     AND z.master_id = ANY($1::uuid[])`, [[...IDS]])).rows;

const koHash = new Map(TARGETS.map((t) => [t.productMasterId, t.koHash]));
let contract = 0, hangulDoc = 0, numDrift = 0, koDrift = 0, rawHtml = 0, markerLeft = 0, emptySection = 0;
const samples = [];
for (const r of rows) {
  if (!(r.language === 'zh' && r.status === 'canonical' && r.description_type === 'STORE' && r.source_type === 'o4o_hff_generated')) contract++;
  if (sha(r.ko) !== koHash.get(r.master_id)) { koDrift++; if (samples.length < 8) samples.push({ m: r.master_id, why: 'KO_HASH_DRIFT' }); }
  const rest = r.content.replace(/<h1[^>]*>[\s\S]*?(?=<small|<\/h1>)/g, ' ').replace(/<[^>]+>/g, ' ').replace(KEEP_PROPER, ' ');
  if (HANGUL.test(rest)) { hangulDoc++; if (samples.length < 8) samples.push({ m: r.master_id, why: 'HANGUL' }); }
  const lost = lostNums(flat(r.ko), flat(r.content));
  if (lost.length) { numDrift++; if (samples.length < 8) samples.push({ m: r.master_id, why: 'NUM', lost }); }
  if (/&lt;(?:h2|li|ul|div|span|p)\b/i.test(r.content)) rawHtml++;
  if (/<(?:li|h2)[^>]*>\s*<\/(?:li|h2)>/i.test(r.content)) emptySection++;
  if (/(?:^|>)\s*(?:MARK|SLOT|KEEP)_[A-Z]+/.test(r.content)) markerLeft++;
}

const dup = Number((await c.query(`SELECT count(*) n FROM (
  SELECT master_id FROM shared_product_descriptions WHERE ${HFF} AND language='zh'
   GROUP BY master_id HAVING count(*) > 1) t`)).rows[0].n);
const outside = Number((await c.query(`SELECT count(*) n FROM shared_product_descriptions
   WHERE id = ANY($1::uuid[]) AND NOT (master_id = ANY($2::uuid[]))`, [APPLY.insertedIds, [...IDS]])).rows[0].n);
/* KO 는 있는데 ZH 가 없는 문서 — 트랙 잔여의 최종 정의. */
const zhMissing = Number((await c.query(`SELECT count(*) n FROM shared_product_descriptions k
   WHERE ${HFF.replace(/(^|AND )(\w+)/g, (_, p, col) => `${p}k.${col}`)} AND coalesce(k.language,'ko')='ko'
     AND NOT EXISTS (SELECT 1 FROM shared_product_descriptions z WHERE z.master_id=k.master_id
        AND z.deleted_at IS NULL AND z.description_type='STORE' AND z.status='canonical'
        AND z.language='zh' AND z.source_type='o4o_hff_generated')`)).rows[0].n);

const resolved = BASE_QUEUE.filter((q) => IDS.has(q.productMasterId)).length;
const nowIds = NOW_QUEUE.map((q) => q.productMasterId);
const out = {
  wo: 'WO-O4O-HFF-ZH-TRANSLATION-AMBIGUOUS-319-REPAIR-AND-APPLY-V1',
  verifiedAt: new Date().toISOString(), readOnly: true, dbWrites: 0,
  population: IDS.size, zhRowsFound: rows.length,
  contractViolations: contract, koHashDrift: koDrift, hangulDocuments: hangulDoc,
  numberDrift: numDrift, rawHtml, markerLeft, emptySection,
  canonicalDup: dup, writesOutsideBatch: outside,
  globals: { ko: Number(g.ko), en: Number(g.en), zh: Number(g.zh), pmHff },
  zhBefore: APPLY.before.zh_canon, zhAfter: APPLY.after.zh_canon, zhDelta: APPLY.after.zh_canon - APPLY.before.zh_canon,
  koUnchanged: Number(g.ko) === APPLY.before.ko_canon, enUnchanged: Number(g.en) === APPLY.before.en_canon,
  productMasterUnchanged: pmHff === APPLY.before.pm_hff,
  koWithoutZh: zhMissing, zhMatchesKo: Number(g.zh) === Number(g.ko),
  queueBefore: BASE_QUEUE.length, queueResolvedByThisPass: resolved, queueNow: NOW_QUEUE.length,
  queueAccounting: BASE_QUEUE.length - resolved === NOW_QUEUE.length,
  queueDup: nowIds.length - new Set(nowIds).size,
  queueStillHasTarget: nowIds.filter((m) => IDS.has(m)).length,
  samples,
};
out.verdict = (out.zhRowsFound === 319 && !contract && !koDrift && !hangulDoc && !numDrift && !rawHtml
  && !markerLeft && !emptySection && !dup && !outside && out.zhDelta === 319 && out.koUnchanged
  && out.enUnchanged && out.productMasterUnchanged && out.queueAccounting && !out.queueDup
  && !out.queueStillHasTarget && out.zhMatchesKo && out.koWithoutZh === 0) ? 'PASS' : 'FAIL';
fs.writeFileSync(`${D}/hff-zh-ta-verify-v1.json`, JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
await c.end();
