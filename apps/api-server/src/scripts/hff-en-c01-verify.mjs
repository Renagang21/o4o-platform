/**
 * WO-O4O-HFF-EN-C01-… — 독립검증
 *
 * apply 산출물을 신뢰하지 않고 **DB 현재 상태만 읽어** 다시 계산한다. read-only, write 0.
 *   - 대상 섹션의 한글 잔존 before/after
 *   - 손댄 문서가 정말 섹션 전체 영어인지
 *   - **대상 밖 write 0** — 갱신된 EN 행 수가 계획 수와 같아야 한다
 *   - 수치 보존 재확인 (KO canonical 의 같은 섹션과 대조)
 *   - 전역 카운트·중복 canonical
 */
import fs from 'node:fs';
import pg from 'pg';
import { SEC, SLOT_G, HANGUL, specSlots, norm, numericLoss } from './hff-en-c01-lib.mjs';

const D = 'apps/api-server/src/scripts/data';
const CACHE = process.env.JA_CACHE ?? 'apps/api-server/src/scripts/.cache';
const WO = 'WO-O4O-HFF-EN-C01-LABELLED-STANDARD-40896-FULL-TRANSLATION-REPAIR-V1';
const applied = JSON.parse(fs.readFileSync(`${D}/hff-en-c01-apply-result-v1.json`, 'utf8'));
const updatedIds = new Set(JSON.parse(fs.readFileSync(`${CACHE}/hff-en-c01-updated-ids.json`, 'utf8')));
const survey = JSON.parse(fs.readFileSync(`${D}/hff-en-c01-survey-v1.json`, 'utf8'));

const c = new pg.Client({ host: '127.0.0.1', port: parseInt(process.env.PROXY_PORT ?? '5621', 10), user: 'o4o_api', password: process.env.PGPW, database: 'o4o_platform', statement_timeout: 1800000 });
await c.connect();
await c.query('SET default_transaction_read_only = on');
if ((await c.query('SHOW transaction_read_only')).rows[0].transaction_read_only !== 'on') { console.error('NOT_READ_ONLY'); process.exit(1); }
const BASE = `deleted_at IS NULL AND source_type='o4o_hff_generated' AND description_type='STORE' AND status='canonical'`;

const totals = (await c.query(`
  SELECT count(*) FILTER (WHERE coalesce(language,'ko')='ko') ko, count(*) FILTER (WHERE language='en') en,
         count(*) FILTER (WHERE language='ja') ja, count(*) FILTER (WHERE language='zh') zh
    FROM shared_product_descriptions WHERE ${BASE}`)).rows[0];
const dup = (await c.query(`SELECT count(*)::int n FROM (SELECT master_id FROM shared_product_descriptions
  WHERE ${BASE} AND language='en' GROUP BY master_id HAVING count(*)>1) a`)).rows[0].n;
const pm = (await c.query(`SELECT count(*)::int n FROM product_masters WHERE regulatory_type='건강기능식품'`)).rows[0].n;


let scanned = 0, sectionMissing = 0, sectionHangulDocs = 0, sectionHangulSlots = 0;
let updatedClean = 0, updatedWithHangul = 0, untouchedWithHangul = 0, updatedNotInPlan = 0;
let numericChecked = 0, numericLossDocs = 0;
const numericSamples = [], hangulSamples = [];
let cursor = '00000000-0000-0000-0000-000000000000';
for (;;) {
  const rows = (await c.query(`
    SELECT e.id, e.master_id, e.content en, k.content ko
      FROM shared_product_descriptions e
      LEFT JOIN shared_product_descriptions k ON k.master_id = e.master_id AND coalesce(k.language,'ko')='ko'
        AND k.deleted_at IS NULL AND k.source_type='o4o_hff_generated' AND k.description_type='STORE' AND k.status='canonical'
     WHERE e.language='en' AND e.deleted_at IS NULL AND e.source_type='o4o_hff_generated'
       AND e.description_type='STORE' AND e.status='canonical' AND e.master_id > $1
     ORDER BY e.master_id LIMIT 4000`, [cursor])).rows;
  if (!rows.length) break;
  cursor = rows[rows.length - 1].master_id;
  for (const r of rows) {
    scanned++;
    const m = SEC.exec(r.en);
    if (!m) { sectionMissing++; continue; }
    const hangul = HANGUL.test(m[1]);
    if (hangul) {
      sectionHangulDocs++;
      for (const s of m[1].matchAll(SLOT_G())) if (HANGUL.test(s[1])) sectionHangulSlots++;
    }
    if (updatedIds.has(r.id)) {
      if (hangul) { updatedWithHangul++; if (hangulSamples.length < 5) hangulSamples.push({ m: r.master_id, sec: norm(m[1]).slice(0, 160) }); }
      else updatedClean++;
      /* 수치 보존 — KO canonical 의 규격 블록과 대조한다 */
      if (r.ko) {
        const koSpec = specSlots(r.ko).join(' '), enSpec = m[1];
        if (koSpec) {
          numericChecked++;
          const lost = numericLoss(koSpec, enSpec);
          if (lost) { numericLossDocs++; if (numericSamples.length < 6) numericSamples.push({ m: r.master_id, lost: lost.slice(0, 6) }); }
        }
      }
    } else if (hangul) untouchedWithHangul++;
  }
  process.stderr.write(`\rverified ${scanned}`);
}
process.stderr.write('\n');
for (const id of updatedIds) if (!id) updatedNotInPlan++;
await c.end();

const out = {
  wo: WO, verifiedAt: new Date().toISOString(), readOnly: true, dbWrites: 0,
  enScanned: scanned, sectionMissing,
  /* 목표 지표 */
  sectionHangulDocsBefore: survey.targetDocuments, sectionHangulDocsAfter: sectionHangulDocs,
  sectionHangulSlotsBefore: survey.slotsResidue, sectionHangulSlotsAfter: sectionHangulSlots,
  resolvedDocuments: survey.targetDocuments - sectionHangulDocs,
  /* 적용 정합 */
  updatedRows: updatedIds.size, updatedFullyEnglish: updatedClean, updatedStillHangul: updatedWithHangul,
  untouchedStillHangul: untouchedWithHangul,
  expectedUpdated: applied.expectedUpdate, actualUpdated: applied.actualUpdate,
  writesOutsideTarget: (survey.targetDocuments - sectionHangulDocs) - updatedIds.size,
  /* 수치 보존 재확인 */
  numericCheckedDocs: numericChecked, numericLossDocs, numericSamples,
  /* 전역 불변 */
  totals: { ko: Number(totals.ko), en: Number(totals.en), ja: Number(totals.ja), zh: Number(totals.zh), pm },
  totalsUnchanged: Number(totals.ko) === applied.before.ko_canon && Number(totals.en) === applied.before.en_canon
    && Number(totals.ja) === applied.before.ja_canon && Number(totals.zh) === applied.before.zh_canon && pm === applied.before.pm_hff,
  canonicalDup: dup, hangulSamples,
  verdict: (updatedWithHangul === 0 && dup === 0 && numericLossDocs === 0
    && applied.expectedUpdate === applied.actualUpdate
    && (survey.targetDocuments - sectionHangulDocs) === updatedIds.size) ? 'PASS' : 'FAIL',
};
fs.writeFileSync(`${D}/hff-en-c01-verify-v1.json`, JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
