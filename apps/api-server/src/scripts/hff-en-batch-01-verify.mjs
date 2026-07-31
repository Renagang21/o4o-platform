/**
 * WO-O4O-HFF-EN-BULK-PRODUCTION-BATCH-01-5000-V1 / 독립검증 + 최종 HOLD 큐 + Batch 연속성 manifest.
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import pg from 'pg';

const D = 'apps/api-server/src/scripts/data';
const SAFE = JSON.parse(fs.readFileSync(`${D}/hff-en-batch-01-safe-targets-v1.json`, 'utf8')).targets;
const CLS = JSON.parse(fs.readFileSync(`${D}/hff-en-batch-01-classification-v1.json`, 'utf8'));
const POP = JSON.parse(fs.readFileSync(`${D}/hff-en-batch-01-population-v1.json`, 'utf8'));
const sha = (s) => crypto.createHash('sha256').update(s ?? '').digest('hex');
const HANGUL = /[가-힣ㄱ-ㅎㅏ-ㅣ]/;
const fnOf = (c) => (c.match(/<h2>[^<]*unction[^<]*<\/h2>([\s\S]*?)(?=<h2>|<div class="sd-foot")/i) ?? [])[0] ?? '';

const c = new pg.Client({ host: '127.0.0.1', port: parseInt(process.env.PROXY_PORT ?? '5507', 10), user: process.env.PGUSER, password: process.env.PGPW, database: 'o4o_platform', ssl: false });
await c.connect();
await c.query('SET default_transaction_read_only = on');

const enNow = new Map();
const enIds = SAFE.map((t) => t.enCanonicalId).filter(Boolean);
for (let i = 0; i < enIds.length; i += 800) {
  for (const r of (await c.query('SELECT id, content, master_id, status, language, description_type, source_type FROM shared_product_descriptions WHERE id = ANY($1)', [enIds.slice(i, i + 800)])).rows) enNow.set(r.id, r);
}
const koNow = new Map();
const koIds = POP.rows.map((r) => r.koCanonicalId);
for (let i = 0; i < koIds.length; i += 800) {
  for (const r of (await c.query('SELECT id, content FROM shared_product_descriptions WHERE id = ANY($1)', [koIds.slice(i, i + 800)])).rows) koNow.set(r.id, r.content);
}
const g = (await c.query(`
  SELECT (SELECT count(*)::int FROM shared_product_descriptions WHERE deleted_at IS NULL) spd_all,
    (SELECT count(*)::int FROM shared_product_descriptions WHERE deleted_at IS NULL AND description_type='STORE'
       AND status='canonical' AND coalesce(language,'ko')='ko' AND source_type='o4o_hff_generated') ko_canon,
    (SELECT count(*)::int FROM shared_product_descriptions WHERE deleted_at IS NULL AND description_type='STORE'
       AND status='canonical' AND language='en' AND source_type='o4o_hff_generated') en_canon,
    (SELECT count(*)::int FROM product_masters WHERE regulatory_type='건강기능식품') pm_hff,
    (SELECT count(*)::int FROM (SELECT master_id FROM shared_product_descriptions
       WHERE deleted_at IS NULL AND description_type='STORE' AND status='canonical' AND language='en'
       GROUP BY master_id HAVING count(*)>1) x) en_dup,
    (SELECT count(*)::int FROM shared_product_descriptions ko
      WHERE ko.deleted_at IS NULL AND ko.description_type='STORE' AND ko.status='canonical'
        AND coalesce(ko.language,'ko')='ko' AND ko.source_type='o4o_hff_generated'
        AND NOT EXISTS (SELECT 1 FROM shared_product_descriptions en WHERE en.master_id=ko.master_id
          AND en.description_type='STORE' AND en.status='canonical' AND en.language='en' AND en.deleted_at IS NULL)) ko_without_en,
    (SELECT count(*)::int FROM shared_product_descriptions en
      WHERE en.deleted_at IS NULL AND en.description_type='STORE' AND en.status='canonical' AND en.language='en'
        AND en.source_type='o4o_hff_generated' AND en.content !~ '<h2>[^<]*unction[^<]*</h2>') en_without_fn`)).rows[0];
await c.end();

const fail = [];
let newHash = 0, oldRemains = 0, fnPresent = 0, hangulInFn = 0, fieldDrift = 0;
for (const t of SAFE) {
  const row = enNow.get(t.enCanonicalId);
  if (!row) { fail.push(`ROW_MISSING:${t.enCanonicalId}`); continue; }
  if (sha(row.content) === t.newContentHash) newHash++; else fail.push(`NEW_HASH:${t.enCanonicalId}`);
  if (sha(row.content) === t.oldContentHash) oldRemains++;
  if (row.status !== 'canonical' || row.language !== 'en' || row.description_type !== 'STORE'
    || row.source_type !== 'o4o_hff_generated' || row.master_id !== t.masterId) fieldDrift++;
  const fn = fnOf(row.content);
  if (fn) fnPresent++; else fail.push(`FN_MISSING:${t.enCanonicalId}`);
  if (HANGUL.test(fn.replace(/<[^>]+>/g, ''))) { hangulInFn++; fail.push(`HANGUL:${t.enCanonicalId}`); }
}
// KO 는 한 글자도 변하지 않아야 한다
let koDrift = 0;
for (const p of POP.rows) if (sha(koNow.get(p.koCanonicalId) ?? '') !== p.koHash) { koDrift++; fail.push(`KO_DRIFT:${p.koCanonicalId}`); }

// ── 최종 HOLD 큐 ───────────────────────────────────────────────────────────
const holds = CLS.results.filter((r) => r.status.startsWith('HOLD'));
const queue = holds.map((r) => ({
  batch: 1,
  track: r.track === 'A' ? 'EXISTING_EN_HOLD' : 'NEW_EN',
  productMasterId: r.masterId, koCanonicalId: r.koCanonicalId, enCanonicalId: r.enCanonicalId ?? null,
  productNameKo: r.productNameKo ?? null,
  finalStatus: 'HOLD', holdReason: r.holdReason ?? 'TRANSLATION_AMBIGUOUS',
  sourceEvidence: ['shared_product_descriptions (KO STORE canonical)', 'hff-en-batch-01-translation-assets-v1.json (승인 EN 사전)', 'hff-en-batch-01-manual-glossary-*.json'],
  translationIssue: Array.isArray(r.why) ? r.why.join(' | ') : String(r.why ?? ''),
  requiredNextAction: '미커버 문구를 고정 용어집에 확정 추가한 뒤 동일 파이프라인으로 재생산한다. 근거 없는 임의 번역은 하지 않는다.',
  retryCondition: '해당 문구가 고정 영어 용어집에 확정되었을 때',
}));
fs.writeFileSync(`${D}/hff-en-batch-01-final-hold-v1.jsonl`, queue.map((r) => JSON.stringify(r)).join('\n') + '\n');
fs.writeFileSync(`${D}/hff-en-batch-01-final-hold-summary-v1.json`, JSON.stringify({
  builtAt: new Date().toISOString(), total: queue.length,
  byTrack: queue.reduce((a, r) => { a[r.track] = (a[r.track] ?? 0) + 1; return a; }, {}),
  byReason: queue.reduce((a, r) => { a[r.holdReason] = (a[r.holdReason] ?? 0) + 1; return a; }, {}),
  dup: queue.length - new Set(queue.map((r) => r.koCanonicalId)).size,
  missingKinds: CLS.checks.holdMissingKinds,
  note: '번역 근거(고정 용어집)가 없는 문구가 남아 있어 생성하지 않았다. 삭제·terminal 처리가 아니다.',
}, null, 1));

// ── Batch 연속성 ───────────────────────────────────────────────────────────
const st = CLS.results.reduce((a, r) => { a[r.status] = (a[r.status] ?? 0) + 1; return a; }, {});
fs.writeFileSync(`${D}/hff-en-bulk-production-completed-through-batch-01-v1.json`, JSON.stringify({
  builtAt: new Date().toISOString(), batch: 1,
  updatedExistingEn: st.UPDATED_EXISTING_EN ?? 0,
  createdNewEn: st.CREATED_NEW_EN ?? 0,
  resolvedNoChange: st.RESOLVED_NO_CHANGE ?? 0,
  hold: queue.length,
  completedKoCanonicalIds: CLS.results.filter((r) => !r.status.startsWith('HOLD')).map((r) => r.koCanonicalId),
  heldKoCanonicalIds: queue.map((r) => r.koCanonicalId),
  note: 'Batch 02 는 completedKoCanonicalIds 와 heldKoCanonicalIds 를 모두 제외하고 대상을 선택한다.',
}, null, 1));
fs.writeFileSync(`${D}/hff-en-bulk-production-remaining-after-batch-01-v1.json`, JSON.stringify({
  builtAt: new Date().toISOString(),
  measuredFromDb: true,
  koWithoutEn: g.ko_without_en,
  enWithoutFunctionSection: g.en_without_fn,
  totalTranslationScopeRemaining: g.ko_without_en + g.en_without_fn,
  batch01Held: queue.length,
  breakdown: {
    'Batch 01 에서 EN 생성됨': st.CREATED_NEW_EN ?? 0,
    'Batch 01 에서 EN 기능성 복구됨': st.UPDATED_EXISTING_EN ?? 0,
    'Batch 01 HOLD (용어집 확장 후 재시도)': queue.length,
  },
  note: '단순 차감이 아니라 현재 DB 기준 실측값이다.',
}, null, 1));

const out = {
  verifiedAt: new Date().toISOString(), readOnly: true, separateSession: true,
  targets: SAFE.length, newHashMatch: newHash, oldHashRemains: oldRemains,
  fnSectionPresent: fnPresent, hangulInFnSection: hangulInFn, targetFieldDrift: fieldDrift,
  koCanonicalDrift: koDrift,
  globals: g,
  expected: { ko_canon: 40918, en_canon: 15498, pm_hff: 40948, en_dup: 0, spd_all: 120123 },
  batchStatusSum: CLS.results.length, sum5000: CLS.results.length === 5000,
  byStatus: st,
  finalHold: queue.length, holdDup: queue.length - new Set(queue.map((r) => r.koCanonicalId)).size,
  enCanonicalDelta: g.en_canon - 15498,
  failedChecks: fail.slice(0, 20),
};
out.globalsOk = ['ko_canon', 'en_canon', 'pm_hff', 'spd_all'].every((k) => g[k] === out.expected[k]) && g.en_dup === 0;
out.verdict = (fail.length === 0 && newHash === SAFE.length && oldRemains === 0 && fnPresent === SAFE.length
  && hangulInFn === 0 && fieldDrift === 0 && koDrift === 0 && out.globalsOk && out.sum5000 && out.holdDup === 0) ? 'PASS' : 'FAIL';
fs.writeFileSync(`${D}/hff-en-batch-01-independent-verification-v1.json`, JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 2));
