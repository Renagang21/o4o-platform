/** WO-...-LAST-PHRASE-690 / 산출물 정리 + 독립검증 (read-only, DB write 0). */
import fs from 'node:fs';
import crypto from 'node:crypto';
import pg from 'pg';

const D = 'apps/api-server/src/scripts/data';
const A = JSON.parse(fs.readFileSync(`${D}/hff-en-lp690-audit-v1.json`, 'utf8'));
const DOCS = JSON.parse(fs.readFileSync(`${D}/hff-en-lp690-docs-v1.json`, 'utf8')).docs;
const PREV = JSON.parse(fs.readFileSync(`${D}/hff-en-bulk-production-completed-through-r2916-v1.json`, 'utf8'));
const sha = (s) => crypto.createHash('sha256').update(s ?? '').digest('hex');

const last = A.phrases.filter((p) => p.documentsWithOneMissingPhrase > 0);
fs.writeFileSync(`${D}/hff-en-batch01-lastphrase690-selection-v1.json`, JSON.stringify({
  builtAt: A.builtAt, readOnly: true, dbWrites: 0,
  basis: '2,630 HOLD 현재 상태에서 재산출', lastPhraseCount: last.length,
  expectedUnlock: A.expectedUnlockIfLastPhrasesDone,
  byCategory: last.reduce((a, p) => { a[p.category] = (a[p.category] ?? 0) + 1; return a; }, {}),
  deterministic: true, phrases: last,
}, null, 1));
fs.writeFileSync(`${D}/hff-en-translation-assets-remaining-after-lastphrase690-v1.json`, JSON.stringify({
  builtAt: A.builtAt, totalUniqueRemaining: A.uniquePhrases, byCategory: A.byCategory,
  lastPhraseSet: last.length, documentsByMissingCount: A.documentsByMissingCount,
  note: '이번 라운드는 690종 번역을 완료하지 못했다. 다음 라운드 완료 조건은 이 690종 전량 확정이다.',
}, null, 1));

const c = new pg.Client({ host: '127.0.0.1', port: parseInt(process.env.PROXY_PORT ?? '5527', 10), user: process.env.PGUSER, password: process.env.PGPW, database: 'o4o_platform', ssl: false });
await c.connect();
await c.query('SET default_transaction_read_only = on');
const ko = new Map();
const ids = DOCS.map((r) => r.koCanonicalId);
for (let i = 0; i < ids.length; i += 800) for (const r of (await c.query('SELECT id, content FROM shared_product_descriptions WHERE id = ANY($1)', [ids.slice(i, i + 800)])).rows) ko.set(r.id, r.content);
const g = (await c.query(`
  SELECT (SELECT count(*)::int FROM shared_product_descriptions WHERE deleted_at IS NULL) spd_all,
    (SELECT count(*)::int FROM shared_product_descriptions WHERE deleted_at IS NULL AND description_type='STORE'
       AND status='canonical' AND coalesce(language,'ko')='ko' AND source_type='o4o_hff_generated') ko_canon,
    (SELECT count(*)::int FROM shared_product_descriptions WHERE deleted_at IS NULL AND description_type='STORE'
       AND status='canonical' AND language='en' AND source_type='o4o_hff_generated') en_canon,
    (SELECT count(*)::int FROM product_masters WHERE regulatory_type='건강기능식품') pm_hff,
    (SELECT count(*)::int FROM (SELECT master_id FROM shared_product_descriptions WHERE deleted_at IS NULL
       AND description_type='STORE' AND status='canonical' AND language='en' GROUP BY master_id HAVING count(*)>1) x) en_dup,
    (SELECT count(*)::int FROM shared_product_descriptions ko WHERE ko.deleted_at IS NULL AND ko.description_type='STORE'
       AND ko.status='canonical' AND coalesce(ko.language,'ko')='ko' AND ko.source_type='o4o_hff_generated'
       AND NOT EXISTS (SELECT 1 FROM shared_product_descriptions en WHERE en.master_id=ko.master_id
         AND en.description_type='STORE' AND en.status='canonical' AND en.language='en' AND en.deleted_at IS NULL)) ko_without_en,
    (SELECT count(*)::int FROM shared_product_descriptions en WHERE en.deleted_at IS NULL AND en.description_type='STORE'
       AND en.status='canonical' AND en.language='en' AND en.source_type='o4o_hff_generated'
       AND en.content !~ '<h2>[^<]*unction[^<]*</h2>') en_without_fn`)).rows[0];
await c.end();

let koDrift = 0;
for (const d of DOCS) if (sha(ko.get(d.koCanonicalId) ?? '') !== d.koHash) koDrift++;

const queue = DOCS.map((r) => ({
  batch: 1, phase: 'LAST_PHRASE_690', track: r.track,
  productMasterId: r.productMasterId, koCanonicalId: r.koCanonicalId, enCanonicalId: r.enCanonicalId ?? null,
  productNameKo: r.productNameKo ?? null, finalStatus: 'HOLD',
  holdReason: r.blocker === 'NUMBER_ONLY' ? 'HOLD_NUMBER_STRUCTURE' : 'TRANSLATION_ASSET_MISSING',
  blocker: r.blocker, remainingMissingCount: r.missingCount,
  requiredNextAction: '마지막 문구 690종 전량 확정 후 동일 파이프라인 재실행',
  retryCondition: '해당 문서의 잔여 문구가 승인 자산에 확정되었을 때',
}));
fs.writeFileSync(`${D}/hff-en-batch01-lastphrase690-final-hold-v1.jsonl`, queue.map((r) => JSON.stringify(r)).join('\n') + '\n');
fs.writeFileSync(`${D}/hff-en-batch01-lastphrase690-final-hold-summary-v1.json`, JSON.stringify({
  builtAt: new Date().toISOString(), total: queue.length,
  byTrack: queue.reduce((a, r) => { a[r.track] = (a[r.track] ?? 0) + 1; return a; }, {}),
  byBlocker: queue.reduce((a, r) => { a[r.blocker] = (a[r.blocker] ?? 0) + 1; return a; }, {}),
  dup: queue.length - new Set(queue.map((r) => r.koCanonicalId)).size,
}, null, 1));
fs.writeFileSync(`${D}/hff-en-bulk-production-completed-through-batch01-lastphrase690-v1.json`, JSON.stringify({
  builtAt: new Date().toISOString(), cumulativeCompleted: PREV.batch01TotalCompleted ?? 2370,
  thisRoundUpdated: 0, thisRoundCreated: 0, thisRoundResolvedNoChange: 0, thisRoundHold: queue.length,
  completedKoCanonicalIds: PREV.completedKoCanonicalIds ?? [], heldKoCanonicalIds: queue.map((r) => r.koCanonicalId),
}, null, 1));
fs.writeFileSync(`${D}/hff-en-bulk-production-remaining-after-batch01-lastphrase690-v1.json`, JSON.stringify({
  builtAt: new Date().toISOString(), measuredFromDb: true,
  koWithoutEn: g.ko_without_en, enWithoutFunctionSection: g.en_without_fn,
  totalRemaining: g.ko_without_en + g.en_without_fn,
  batch01Hold: queue.length, remainingUniquePhrases: A.uniquePhrases, lastPhraseSet: last.length,
}, null, 1));
fs.writeFileSync(`${D}/hff-en-batch01-lastphrase690-apply-results-v1.json`, JSON.stringify({
  appliedAt: new Date().toISOString(), mode: 'NO_APPLY',
  reason: '마지막 문구 690종 번역을 완료하지 못해 coverage 100% 문서가 없다',
  expectedUpdate: 0, actualUpdate: 0, expectedInsert: 0, actualInsert: 0, skipped: 0, before: g, after: g,
}, null, 1));
fs.writeFileSync(`${D}/hff-en-batch01-lastphrase690-rollback-v1.json`, JSON.stringify({ builtAt: new Date().toISOString(), count: 0, rollback: [], note: 'DB write 없음' }, null, 1));

const out = {
  verifiedAt: new Date().toISOString(), readOnly: true, separateSession: true, dbWrites: 0,
  population: DOCS.length, expected: 2630, matches: DOCS.length === 2630,
  blockers: A.blockers, falseGate: A.blockers.FALSE_GATE ?? 0, cleanBlocked: 0,
  lastPhraseSet: last.length, expectedUnlock: A.expectedUnlockIfLastPhrasesDone,
  translatedThisRound: 0,
  expectedUpdate: 0, actualUpdate: 0, expectedInsert: 0, actualInsert: 0,
  koCanonicalDrift: koDrift, globals: g,
  globalsOk: g.ko_canon === 40918 && g.en_canon === 17066 && g.pm_hff === 40948 && g.en_dup === 0,
  holdDup: queue.length - new Set(queue.map((r) => r.koCanonicalId)).size,
  statusSum: queue.length, sum2630: queue.length === 2630,
};
out.verdict = (koDrift === 0 && out.globalsOk && out.matches && out.holdDup === 0 && out.falseGate === 0) ? 'PASS' : 'FAIL';
fs.writeFileSync(`${D}/hff-en-batch01-lastphrase690-independent-verification-v1.json`, JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
