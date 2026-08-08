/**
 * WO-O4O-HFF-EN-C01-… §9 — 기존 EN 회귀 점검 (read-only, write 0)
 *
 * 이번 사이클이 **이전 사이클의 결과를 훼손하지 않았는지** 본다.
 * 대상 목록은 이전 사이클의 rollback manifest 에서 읽는다(커밋본에서 꺼내 쓴다):
 *
 *   git show 69c48475f:apps/api-server/src/scripts/data/hff-en-c01-rollback-v1.json \
 *     > .cache/hff-en-c01-rollback-cycle1.json
 *
 * 점검 항목: 섹션 존재 · 섹션 내 한글 0 · KO 대비 항목 수 · KO 대비 수치 보존 · 중복 canonical.
 */
import fs from 'node:fs';
import pg from 'pg';
import { SEC, SLOT_G, HANGUL, specSlots, norm, numericLoss } from './hff-en-c01-lib.mjs';

const D = 'apps/api-server/src/scripts/data';
const CACHE = process.env.JA_CACHE ?? 'apps/api-server/src/scripts/.cache';
const WO = 'WO-O4O-HFF-EN-C01-LABELLED-STANDARD-40896-FULL-TRANSLATION-REPAIR-V1';
const prior = JSON.parse(fs.readFileSync(process.env.C01_PRIOR ?? `${CACHE}/hff-en-c01-rollback-cycle1.json`, 'utf8'));
const priorIds = prior.rows.map((r) => r.enId);

const c = new pg.Client({ host: '127.0.0.1', port: parseInt(process.env.PROXY_PORT ?? '5641', 10), user: 'o4o_api', password: process.env.PGPW, database: 'o4o_platform', statement_timeout: 1800000 });
await c.connect();
await c.query('SET default_transaction_read_only = on');
if ((await c.query('SHOW transaction_read_only')).rows[0].transaction_read_only !== 'on') { console.error('NOT_READ_ONLY'); process.exit(1); }

let checked = 0, missingRow = 0, sectionMissing = 0, hangulBack = 0, slotCountDrift = 0, numericRegression = 0, notCanonical = 0;
const samples = [];
for (let i = 0; i < priorIds.length; i += 2000) {
  const rows = (await c.query(`
    SELECT e.id, e.master_id, e.status, e.deleted_at, e.content en, k.content ko
      FROM shared_product_descriptions e
      LEFT JOIN shared_product_descriptions k ON k.master_id = e.master_id AND coalesce(k.language,'ko')='ko'
        AND k.deleted_at IS NULL AND k.source_type='o4o_hff_generated' AND k.description_type='STORE' AND k.status='canonical'
     WHERE e.id = ANY($1::uuid[])`, [priorIds.slice(i, i + 2000)])).rows;
  const seen = new Set(rows.map((r) => r.id));
  for (const id of priorIds.slice(i, i + 2000)) if (!seen.has(id)) missingRow++;
  for (const r of rows) {
    checked++;
    if (r.status !== 'canonical' || r.deleted_at) { notCanonical++; continue; }
    const m = SEC.exec(r.en);
    if (!m) { sectionMissing++; continue; }
    if (HANGUL.test(m[1])) { hangulBack++; if (samples.length < 5) samples.push({ m: r.master_id, why: 'HANGUL_BACK', sec: norm(m[1]).slice(0, 120) }); continue; }
    if (r.ko) {
      const koSlots = specSlots(r.ko);
      const enSlots = [...m[1].matchAll(SLOT_G())].map((x) => x[1]);
      if (koSlots.length && enSlots.length !== koSlots.length) { slotCountDrift++; if (samples.length < 5) samples.push({ m: r.master_id, why: 'SLOT_COUNT', ko: koSlots.length, en: enSlots.length }); continue; }
      if (koSlots.length) {
        const lost = numericLoss(koSlots.join(' '), m[1]);
        if (lost) { numericRegression++; if (samples.length < 5) samples.push({ m: r.master_id, why: 'NUMERIC', lost: lost.slice(0, 5) }); }
      }
    }
  }
  process.stderr.write(`\rregression ${checked}`);
}
process.stderr.write('\n');
await c.end();

const out = {
  wo: WO, checkedAt: new Date().toISOString(), readOnly: true, dbWrites: 0,
  priorCycleDocuments: priorIds.length, checked, missingRow, notCanonical,
  sectionMissing, hangulBack, slotCountDrift, numericRegression, samples,
  verdict: (!missingRow && !notCanonical && !sectionMissing && !hangulBack && !slotCountDrift && !numericRegression) ? 'PASS' : 'FAIL',
};
fs.writeFileSync(`${D}/hff-en-c01-regression-v1.json`, JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
