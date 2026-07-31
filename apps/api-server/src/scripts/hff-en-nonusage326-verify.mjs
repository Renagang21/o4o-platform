/** WO-...-LAST-MISSING-PHRASE-519 / 독립검증 + 최종 HOLD + 연속성 manifest (별도 read-only 세션). */
import fs from 'node:fs';
import crypto from 'node:crypto';
import pg from 'pg';

const D = 'apps/api-server/src/scripts/data';
const SAFE = JSON.parse(fs.readFileSync(`${D}/hff-en-batch-01-hold-4209-safe-targets-v1.json`, 'utf8')).targets;
const CLS = JSON.parse(fs.readFileSync(`${D}/hff-en-batch-01-hold-4209-classification-v1.json`, 'utf8'));
const POP = JSON.parse(fs.readFileSync(`${D}/hff-en-batch-01-hold-4209-population-v1.json`, 'utf8'));
const SEL = JSON.parse(fs.readFileSync(`${D}/hff-en-r2916-audit-v1.json`, 'utf8'));
const B01 = JSON.parse(fs.readFileSync(`${D}/hff-en-bulk-production-completed-through-batch-01-v1.json`, 'utf8'));
const sha = (s) => crypto.createHash('sha256').update(s ?? '').digest('hex');
const HANGUL = /[가-힣]/;
const norm = (s) => (s ?? '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

const c = new pg.Client({ host: '127.0.0.1', port: parseInt(process.env.PROXY_PORT ?? '5531', 10), user: process.env.PGUSER, password: process.env.PGPW, database: 'o4o_platform', ssl: false });
await c.connect();
await c.query('SET default_transaction_read_only = on');

const koNow = new Map();
const koIds = POP.docs.map((r) => r.koCanonicalId);
for (let i = 0; i < koIds.length; i += 800) for (const r of (await c.query('SELECT id, content FROM shared_product_descriptions WHERE id = ANY($1)', [koIds.slice(i, i + 800)])).rows) koNow.set(r.id, r.content);
const enByMaster = new Map();
const ms = SAFE.map((t) => t.productMasterId);
for (let i = 0; i < ms.length; i += 800) {
  for (const r of (await c.query(`SELECT id, master_id, content, status, language, description_type, source_type
    FROM shared_product_descriptions WHERE master_id = ANY($1) AND description_type='STORE' AND status='canonical'
      AND language='en' AND deleted_at IS NULL`, [ms.slice(i, i + 800)])).rows) enByMaster.set(r.master_id, r);
}
const g = (await c.query(`
  SELECT (SELECT count(*)::int FROM shared_product_descriptions WHERE deleted_at IS NULL) spd_all,
    (SELECT count(*)::int FROM shared_product_descriptions WHERE deleted_at IS NULL AND description_type='STORE'
       AND status='canonical' AND coalesce(language,'ko')='ko' AND source_type='o4o_hff_generated') ko_canon,
    (SELECT count(*)::int FROM shared_product_descriptions WHERE deleted_at IS NULL AND description_type='STORE'
       AND status='canonical' AND language='en' AND source_type='o4o_hff_generated') en_canon,
    (SELECT count(*)::int FROM product_masters WHERE regulatory_type='건강기능식품') pm_hff,
    (SELECT count(*)::int FROM (SELECT master_id FROM shared_product_descriptions WHERE deleted_at IS NULL
       AND description_type='STORE' AND status='canonical' AND language='en'
       GROUP BY master_id HAVING count(*)>1) x) en_dup,
    (SELECT count(*)::int FROM shared_product_descriptions ko WHERE ko.deleted_at IS NULL AND ko.description_type='STORE'
       AND ko.status='canonical' AND coalesce(ko.language,'ko')='ko' AND ko.source_type='o4o_hff_generated'
       AND NOT EXISTS (SELECT 1 FROM shared_product_descriptions en WHERE en.master_id=ko.master_id
         AND en.description_type='STORE' AND en.status='canonical' AND en.language='en' AND en.deleted_at IS NULL)) ko_without_en,
    (SELECT count(*)::int FROM shared_product_descriptions en WHERE en.deleted_at IS NULL AND en.description_type='STORE'
       AND en.status='canonical' AND en.language='en' AND en.source_type='o4o_hff_generated'
       AND en.content !~ '<h2>[^<]*unction[^<]*</h2>') en_without_fn`)).rows[0];
await c.end();

const fail = [];
let hashOk = 0, hangul = 0, fieldDrift = 0, koDrift = 0;
for (const t of SAFE) {
  const row = enByMaster.get(t.productMasterId);
  if (!row) { fail.push(`EN_MISSING:${t.productMasterId}`); continue; }
  if (sha(row.content) === t.newContentHash) hashOk++; else fail.push(`HASH:${t.productMasterId}`);
  if (row.status !== 'canonical' || row.language !== 'en' || row.description_type !== 'STORE' || row.source_type !== 'o4o_hff_generated') fieldDrift++;
  const fn = (row.content.match(/<h2>[^<]*unction[^<]*<\/h2>([\s\S]*?)(?=<h2>|<div class="sd-foot")/i) ?? [])[0] ?? '';
  if (HANGUL.test(norm(fn))) { hangul++; fail.push(`HANGUL:${t.productMasterId}`); }
}
for (const d of POP.docs) if (sha(koNow.get(d.koCanonicalId) ?? '') !== d.koHash) { koDrift++; fail.push(`KO_DRIFT:${d.koCanonicalId}`); }

const st = CLS.results.reduce((a, r) => { a[r.status] = (a[r.status] ?? 0) + 1; return a; }, {});
const queue = CLS.results.filter((r) => r.status.startsWith('HOLD')).map((r) => ({
  batch: 1, phase: 'LAST_MISSING_519', track: r.track,
  productMasterId: r.productMasterId, koCanonicalId: r.koCanonicalId, enCanonicalId: r.enCanonicalId ?? null,
  productNameKo: r.productNameKo ?? null, finalStatus: 'HOLD', holdReason: r.holdReason,
  unresolvedPhrases: (r.unresolvedPhrases ?? []).slice(0, 12),
  unresolvedPhraseCount: (r.unresolvedPhrases ?? []).length,
  requiredNextAction: '남은 문구를 승인 자산에 확정 추가 후 동일 파이프라인 재실행',
  retryCondition: '해당 문구가 승인 번역 자산에 확정되었을 때',
}));
fs.writeFileSync(`${D}/hff-en-batch01-nonusage326-final-hold-v1.jsonl`, queue.map((r) => JSON.stringify(r)).join('\n') + '\n');
fs.writeFileSync(`${D}/hff-en-batch01-nonusage326-final-hold-summary-v1.json`, JSON.stringify({
  builtAt: new Date().toISOString(), total: queue.length,
  byTrack: queue.reduce((a, r) => { a[r.track] = (a[r.track] ?? 0) + 1; return a; }, {}),
  byReason: queue.reduce((a, r) => { a[r.holdReason] = (a[r.holdReason] ?? 0) + 1; return a; }, {}),
  dup: queue.length - new Set(queue.map((r) => r.koCanonicalId)).size,
}, null, 1));
fs.writeFileSync(`${D}/hff-en-bulk-production-completed-through-nonusage326-v1.json`, JSON.stringify({
  builtAt: new Date().toISOString(),
  batch01Completed: B01.updatedExistingEn, thisRoundUpdated: st.UPDATED_EXISTING_EN ?? 0,
  thisRoundCreated: st.CREATED_NEW_EN ?? 0, thisRoundHold: queue.length,
  batch01TotalCompleted: (B01.updatedExistingEn ?? 0) + (st.UPDATED_EXISTING_EN ?? 0) + (st.CREATED_NEW_EN ?? 0),
  completedKoCanonicalIds: [...(B01.completedKoCanonicalIds ?? []), ...CLS.results.filter((r) => !r.status.startsWith('HOLD')).map((r) => r.koCanonicalId)],
  heldKoCanonicalIds: queue.map((r) => r.koCanonicalId),
}, null, 1));
fs.writeFileSync(`${D}/hff-en-batch01-remaining-after-nonusage326-v1.json`, JSON.stringify({
  builtAt: new Date().toISOString(), measuredFromDb: true,
  koWithoutEn: g.ko_without_en, enWithoutFunctionSection: g.en_without_fn,
  totalRemaining: g.ko_without_en + g.en_without_fn,
  nextTarget: '미커버 2개 문서 집합 (documentsWithTwoMissingPhrases)',
}, null, 1));

const out = {
  verifiedAt: new Date().toISOString(), readOnly: true, separateSession: true,
  targets: SAFE.length, newHashMatch: hashOk, hangulInFnSection: hangul,
  targetFieldDrift: fieldDrift, koCanonicalDrift: koDrift,
  globals: g, expectedEnDelta: 392, actualEnDelta: g.en_canon - 17066,
  statusSum: CLS.results.length, sum4209: CLS.results.length === 4209, byStatus: st,
  expectedUnlockFromSelection: SEL.expectedUnlockIfLastPhrasesDone,
  actualUnlocked: (st.CREATED_NEW_EN ?? 0) + (st.UPDATED_EXISTING_EN ?? 0),
  finalHold: queue.length, holdDup: queue.length - new Set(queue.map((r) => r.koCanonicalId)).size,
  failedChecks: fail.slice(0, 15),
};
out.globalsOk = g.ko_canon === 40918 && g.pm_hff === 40948 && g.en_dup === 0 && g.en_canon === 17458;
out.verdict = (fail.length === 0 && hashOk === SAFE.length && hangul === 0 && fieldDrift === 0
  && koDrift === 0 && out.globalsOk && out.sum4209 && out.holdDup === 0) ? 'PASS' : 'FAIL';
fs.writeFileSync(`${D}/hff-en-batch01-nonusage326-independent-verification-v1.json`, JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
