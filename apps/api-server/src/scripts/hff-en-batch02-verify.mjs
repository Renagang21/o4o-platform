/**
 * WO-...-BATCH-02-5000-DIRECT-BULK-PRODUCTION-V1 §24
 * Batch 02 독립검증 (별도 read-only 세션).
 *
 * 이 검증기는 **현재 스냅샷 기준**이다. 과거 라운드의 고정 상수를 내장하지 않는다
 * (구 hff-en-last519-verify.mjs 의 stale 상수 문제 재발 방지, §7).
 * 기대값은 모두 현재 classification / safe-targets / apply-results 매니페스트에서 읽는다.
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import pg from 'pg';

const D = 'apps/api-server/src/scripts/data';
const POP = JSON.parse(fs.readFileSync(`${D}/hff-en-batch02-population-5000-v1.json`, 'utf8'));
const CLS = JSON.parse(fs.readFileSync(`${D}/hff-en-batch02-classification-v1.json`, 'utf8'));
const SAFE = JSON.parse(fs.readFileSync(`${D}/hff-en-batch02-safe-targets-v1.json`, 'utf8')).targets;
const APPLY = JSON.parse(fs.readFileSync(`${D}/hff-en-batch02-apply-results-v1.json`, 'utf8'));
const B01CLOSURE = JSON.parse(fs.readFileSync(`${D}/hff-en-batch01-closure-v1.json`, 'utf8'));
const B01CLS = JSON.parse(fs.readFileSync(`${D}/hff-en-batch-01-hold-4209-classification-v1.json`, 'utf8'));

const sha = (s) => crypto.createHash('sha256').update(s ?? '', 'utf8').digest('hex');
const HANGUL = /[가-힣]/;
const SLOT = [
  /<li>((?:(?!<li>|<\/li>)[\s\S])*?)<\/li>/g,
  /<span class="sd-tag">([\s\S]*?)<\/span>/g,
  /<li>\s*<b>([\s\S]*?)<\/b>/g,
  /<p class="sd-meta">([\s\S]*?)<\/p>/g,
  /<p class="sd-intro">([\s\S]*?)<\/p>/g,
  /<div class="sd-foot">([\s\S]*?)<\/div>/g,
];

const c = new pg.Client({ host: '127.0.0.1', port: parseInt(process.env.PROXY_PORT ?? '5561', 10), user: process.env.PGUSER, password: process.env.PGPW, database: 'o4o_platform', ssl: false });
await c.connect();
await c.query('SET default_transaction_read_only = on');

const globals = (await c.query(`
  SELECT (SELECT count(*)::int FROM shared_product_descriptions WHERE deleted_at IS NULL) spd_all,
    (SELECT count(*)::int FROM shared_product_descriptions WHERE deleted_at IS NULL AND description_type='STORE'
       AND status='canonical' AND coalesce(language,'ko')='ko' AND source_type='o4o_hff_generated') ko_canon,
    (SELECT count(*)::int FROM shared_product_descriptions WHERE deleted_at IS NULL AND description_type='STORE'
       AND status='canonical' AND language='en' AND source_type='o4o_hff_generated') en_canon,
    (SELECT count(*)::int FROM product_masters WHERE regulatory_type='건강기능식품') pm_hff`)).rows[0];

// 1) Batch 02 KO canonical 불변
const koIds = POP.rows.map((r) => r.koCanonicalId);
const koCur = new Map();
for (let i = 0; i < koIds.length; i += 800) {
  for (const r of (await c.query('SELECT id, content, status, language FROM shared_product_descriptions WHERE id = ANY($1)', [koIds.slice(i, i + 800)])).rows) koCur.set(r.id, r);
}
// 2) Batch 01 KO canonical 불변
const b01Ids = B01CLS.results.map((r) => r.koCanonicalId);
const b01Cur = new Map();
for (let i = 0; i < b01Ids.length; i += 800) {
  for (const r of (await c.query('SELECT id, content FROM shared_product_descriptions WHERE id = ANY($1)', [b01Ids.slice(i, i + 800)])).rows) b01Cur.set(r.id, r);
}
// 3) 적용 대상 EN 현재 상태
const mIds = SAFE.map((t) => t.productMasterId);
const enCur = new Map();
for (let i = 0; i < mIds.length; i += 700) {
  const q = await c.query(`SELECT master_id, id, content, language, status, description_type, source_type FROM shared_product_descriptions
     WHERE master_id = ANY($1) AND deleted_at IS NULL AND description_type='STORE' AND status='canonical' AND language='en'`,
  [mIds.slice(i, i + 700)]);
  for (const r of q.rows) enCur.set(r.master_id, r);
}
// 3-b) 완료 판정된 Batch 02 전건(누적)의 현재 EN 상태 — 마지막 라운드 대상만이 아니라 전량을 본다
const DONE = CLS.results.filter((r) => ['CREATED_NEW_EN', 'UPDATED_EXISTING_EN', 'RESOLVED_NO_CHANGE'].includes(r.status));
const doneEn = new Map();
const dIds = DONE.map((r) => r.productMasterId);
for (let i = 0; i < dIds.length; i += 700) {
  const q = await c.query(`SELECT master_id, content, language, status, description_type, source_type FROM shared_product_descriptions
     WHERE master_id = ANY($1) AND deleted_at IS NULL AND description_type='STORE' AND status='canonical' AND language='en'`,
  [dIds.slice(i, i + 700)]);
  for (const r of q.rows) doneEn.set(r.master_id, r);
}
// 4) Batch 밖 write 여부: 이번 배치 이외 master 의 EN canonical 총수는 apply 전후 차이로만 설명돼야 한다
const enAll = (await c.query(`SELECT count(*)::int n FROM shared_product_descriptions
  WHERE deleted_at IS NULL AND description_type='STORE' AND status='canonical' AND language='en' AND source_type='o4o_hff_generated'`)).rows[0].n;
await c.end();

const fail = [];
let koDrift = 0, koMissing = 0, koStateBad = 0;
for (const r of POP.rows) {
  const x = koCur.get(r.koCanonicalId);
  if (!x) { koMissing++; continue; }
  if (x.status !== 'canonical' || (x.language ?? 'ko') !== 'ko') koStateBad++;
  if (sha(x.content) !== r.koHash) koDrift++;
}
let b01Drift = 0, b01Missing = 0;
for (const r of B01CLS.results) {
  const x = b01Cur.get(r.koCanonicalId);
  if (!x) { b01Missing++; continue; }
  if (sha(x.content) !== r.koHash) b01Drift++;
}

let missing = 0, hangulInSlots = 0, fnSectionMissing = 0, empty = 0, fieldBad = 0, contentMismatch = 0;
for (const t of SAFE) {
  const cur = enCur.get(t.productMasterId);
  if (!cur) { missing++; fail.push(`EN_MISSING:${t.productMasterId}`); continue; }
  if (cur.description_type !== 'STORE' || cur.status !== 'canonical' || cur.language !== 'en' || cur.source_type !== 'o4o_hff_generated') { fieldBad++; fail.push(`FIELD:${t.productMasterId}`); }
  const h = cur.content ?? '';
  if (!h.trim()) { empty++; fail.push(`EMPTY:${t.productMasterId}`); }
  if (!/sd-func|sd-core|sd-fn|sd-item|sd-tag|<li>/.test(h)) { fnSectionMissing++; fail.push(`NO_FN:${t.productMasterId}`); }
  let bad = false;
  for (const re of SLOT) {
    for (const m of h.matchAll(re)) {
      const txt = m[1].replace(/<[^>]+>/g, '').trim();
      if (txt && HANGUL.test(txt)) { bad = true; break; }
    }
    if (bad) break;
  }
  if (bad) { hangulInSlots++; fail.push(`HANGUL:${t.productMasterId}`); }
  if (sha(h) !== t.newContentHash) contentMismatch++;
}

// 완료 전건 감사
let dMissing = 0, dHangul = 0, dNoFn = 0, dEmpty = 0, dFieldBad = 0;
for (const r of DONE) {
  const cur = doneEn.get(r.productMasterId);
  if (!cur) { dMissing++; fail.push(`DONE_EN_MISSING:${r.productMasterId}`); continue; }
  if (cur.description_type !== 'STORE' || cur.status !== 'canonical' || cur.language !== 'en' || cur.source_type !== 'o4o_hff_generated') dFieldBad++;
  const h = cur.content ?? '';
  if (!h.trim()) dEmpty++;
  if (!/sd-func|sd-core|sd-fn|sd-item|sd-tag|<li>/.test(h)) dNoFn++;
  let bad = false;
  for (const re of SLOT) {
    for (const m of h.matchAll(re)) {
      const txt = m[1].replace(/<[^>]+>/g, '').trim();
      if (txt && HANGUL.test(txt)) { bad = true; break; }
    }
    if (bad) break;
  }
  if (bad) { dHangul++; fail.push(`DONE_HANGUL:${r.productMasterId}`); }
}

const byStatus = CLS.results.reduce((a, r) => { a[r.status] = (a[r.status] ?? 0) + 1; return a; }, {});
const completed = (byStatus.CREATED_NEW_EN ?? 0) + (byStatus.UPDATED_EXISTING_EN ?? 0) + (byStatus.RESOLVED_NO_CHANGE ?? 0);
const hold = CLS.results.filter((r) => r.status.startsWith('HOLD')).length;

const out = {
  verifiedAt: new Date().toISOString(), readOnly: true, dbWrites: 0,
  batch01Closure: {
    total: B01CLOSURE.total, completed: B01CLOSURE.completed, hold: B01CLOSURE.holdTotal,
    statusSumOk: B01CLOSURE.statusSumOk, koDrift: b01Drift, koMissing: b01Missing,
  },
  batch02: {
    population: POP.rows.length, populationOk: POP.rows.length === 5000,
    byStatus, completed, hold, statusSum: completed + hold, statusSumOk: completed + hold === 5000,
    failedSystem: byStatus.FAILED_SYSTEM ?? 0,
  },
  koIntegrity: { batch02Drift: koDrift, batch02Missing: koMissing, batch02StateBad: koStateBad },
  applyReconciliation: {
    expectedUpdate: APPLY.expectedUpdate, actualUpdate: APPLY.actualUpdate,
    expectedInsert: APPLY.expectedInsert, actualInsert: APPLY.actualInsert,
    skipped: Array.isArray(APPLY.skipped) ? APPLY.skipped.length : APPLY.skipped,
    koUnchanged: APPLY.koUnchanged, pmUnchanged: APPLY.pmUnchanged, enDelta: APPLY.enDelta,
    updateOk: APPLY.expectedUpdate === APPLY.actualUpdate,
    insertOk: APPLY.expectedInsert === APPLY.actualInsert,
  },
  appliedRows: {
    targets: SAFE.length, missing, fieldBad, empty, fnSectionMissing, hangulInSlots,
    contentHashMismatch: contentMismatch,
  },
  completedRowsAudit: {
    completed: DONE.length, missing: dMissing, fieldBad: dFieldBad, empty: dEmpty,
    fnSectionMissing: dNoFn, hangulInSlots: dHangul,
  },
  canonicalDup: SAFE.length - new Set(SAFE.map((t) => t.productMasterId)).size,
  globals, enCanonicalTotal: enAll,
  failures: fail.slice(0, 20),
};
const critical = dMissing + dFieldBad + dEmpty + dNoFn + dHangul
  + missing + fieldBad + empty + fnSectionMissing + hangulInSlots + koDrift + koMissing + koStateBad + b01Drift + b01Missing
  + out.canonicalDup + (out.batch02.statusSumOk ? 0 : 1) + (out.batch01Closure.statusSumOk ? 0 : 1)
  + (out.applyReconciliation.updateOk ? 0 : 1) + (out.applyReconciliation.insertOk ? 0 : 1) + (APPLY.koUnchanged ? 0 : 1) + (APPLY.pmUnchanged ? 0 : 1);
out.criticalIssues = critical;
out.verdict = critical === 0 ? 'PASS' : 'FAIL';
fs.writeFileSync(`${D}/hff-en-batch02-independent-verification-v1.json`, JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 2));
