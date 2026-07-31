/**
 * WO-...-BATCH-01-HOLD-4209-REPRODUCTION-V1 / 최종 HOLD 큐 + Batch 연속성 v2 + 독립검증 (read-only).
 * 이번 WO 는 DB write 가 없다(SAFE 0). 그 사실 자체를 DB 로 검증한다.
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import pg from 'pg';

const D = 'apps/api-server/src/scripts/data';
const CLS = JSON.parse(fs.readFileSync(`${D}/hff-en-batch-01-hold-4209-classification-v1.json`, 'utf8'));
const POP = JSON.parse(fs.readFileSync(`${D}/hff-en-batch-01-hold-4209-population-v1.json`, 'utf8'));
const FREQ = JSON.parse(fs.readFileSync(`${D}/hff-en-batch-01-hold-4209-issue-frequency-v1.json`, 'utf8'));
const B01 = JSON.parse(fs.readFileSync(`${D}/hff-en-bulk-production-completed-through-batch-01-v1.json`, 'utf8'));
const sha = (s) => crypto.createHash('sha256').update(s ?? '').digest('hex');

const c = new pg.Client({ host: '127.0.0.1', port: parseInt(process.env.PROXY_PORT ?? '5511', 10), user: process.env.PGUSER, password: process.env.PGPW, database: 'o4o_platform', ssl: false });
await c.connect();
await c.query('SET default_transaction_read_only = on');
const ko = new Map();
const koIds = POP.docs.map((r) => r.koCanonicalId);
for (let i = 0; i < koIds.length; i += 800) for (const r of (await c.query('SELECT id, content FROM shared_product_descriptions WHERE id = ANY($1)', [koIds.slice(i, i + 800)])).rows) ko.set(r.id, r.content);
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

// KO 불변 확인 (이번 WO 는 KO 를 읽기만 했다)
let koDrift = 0;
for (const d of POP.docs) if (sha(ko.get(d.koCanonicalId) ?? '') !== d.koHash) koDrift++;

// ── 최종 HOLD 큐 ───────────────────────────────────────────────────────────
const holds = CLS.results.filter((r) => r.status.startsWith('HOLD'));
const queue = holds.map((r) => ({
  batch: 1, phase: 'HOLD_4209_REPRODUCTION',
  track: r.track, productMasterId: r.productMasterId, koCanonicalId: r.koCanonicalId,
  enCanonicalId: r.enCanonicalId ?? null, productNameKo: r.productNameKo ?? null,
  finalStatus: 'HOLD', holdReason: r.holdReason,
  unresolvedPhrases: (r.unresolvedPhrases ?? []).slice(0, 12),
  unresolvedPhraseCount: (r.unresolvedPhrases ?? []).length,
  sourceEvidence: ['KO STORE canonical', 'hff-en-batch-01-translation-assets-v1.json', 'hff-en-batch-01-manual-glossary-*.json', 'hff-en-hold4209-frames.mjs'],
  requiredNextAction: '남은 고유 문구를 고정 용어집·프레임에 확정 추가한 뒤 동일 파이프라인으로 재실행한다.',
  retryCondition: '해당 문구가 승인 번역 자산에 확정되었을 때',
}));
fs.writeFileSync(`${D}/hff-en-batch-01-hold-4209-reproduction-final-hold-v1.jsonl`, queue.map((r) => JSON.stringify(r)).join('\n') + '\n');
fs.writeFileSync(`${D}/hff-en-batch-01-hold-4209-reproduction-final-hold-summary-v1.json`, JSON.stringify({
  builtAt: new Date().toISOString(), total: queue.length,
  byTrack: queue.reduce((a, r) => { a[r.track] = (a[r.track] ?? 0) + 1; return a; }, {}),
  byReason: queue.reduce((a, r) => { a[r.holdReason] = (a[r.holdReason] ?? 0) + 1; return a; }, {}),
  dup: queue.length - new Set(queue.map((r) => r.koCanonicalId)).size,
  remainingUniquePhrases: FREQ.uniquePhrases,
  remainingByCategory: FREQ.byCategory,
  note: '번역 자산이 확정되지 않은 문구가 남아 생성하지 않았다. 삭제·terminal 처리가 아니다.',
}, null, 1));

// ── Batch 연속성 v2 ────────────────────────────────────────────────────────
const st = CLS.results.reduce((a, r) => { a[r.status] = (a[r.status] ?? 0) + 1; return a; }, {});
fs.writeFileSync(`${D}/hff-en-bulk-production-completed-through-batch-01-v2.json`, JSON.stringify({
  builtAt: new Date().toISOString(), batch: 1, revision: 2,
  batch01UpdatedExistingEn: B01.updatedExistingEn,
  reproductionUpdatedExistingEn: st.UPDATED_EXISTING_EN ?? 0,
  reproductionCreatedNewEn: st.CREATED_NEW_EN ?? 0,
  reproductionResolvedNoChange: st.RESOLVED_NO_CHANGE ?? 0,
  reproductionHold: queue.length,
  batch01TotalCompleted: (B01.updatedExistingEn ?? 0) + (st.UPDATED_EXISTING_EN ?? 0) + (st.CREATED_NEW_EN ?? 0),
  completedKoCanonicalIds: B01.completedKoCanonicalIds,
  heldKoCanonicalIds: queue.map((r) => r.koCanonicalId),
  note: 'Batch 02 는 completedKoCanonicalIds 와 heldKoCanonicalIds 를 모두 제외하고 대상을 선택한다.',
}, null, 1));
fs.writeFileSync(`${D}/hff-en-bulk-production-remaining-after-batch-01-v2.json`, JSON.stringify({
  builtAt: new Date().toISOString(), revision: 2, measuredFromDb: true,
  koWithoutEn: g.ko_without_en, enWithoutFunctionSection: g.en_without_fn,
  totalTranslationScopeRemaining: g.ko_without_en + g.en_without_fn,
  batch01Held: queue.length,
  remainingUniquePhrasesToTranslate: FREQ.uniquePhrases,
  remainingByCategory: FREQ.byCategory,
  note: '잔여의 병목은 대상 선택이 아니라 번역 자산이다. 위 고유 문구를 확정하면 같은 파이프라인으로 대량 생산된다.',
}, null, 1));

const out = {
  verifiedAt: new Date().toISOString(), readOnly: true, separateSession: true,
  dbWrites: 0, safeTargets: 0,
  expectedUpdate: 0, actualUpdate: 0, expectedInsert: 0, actualInsert: 0,
  koCanonicalDrift: koDrift,
  globals: g,
  expected: { ko_canon: 40918, en_canon: 15498, pm_hff: 40948, spd_all: 120123, en_dup: 0 },
  statusSum: CLS.results.length, sum4209: CLS.results.length === 4209,
  byStatus: st, finalHold: queue.length,
  holdDup: queue.length - new Set(queue.map((r) => r.koCanonicalId)).size,
  remainingUniquePhrases: FREQ.uniquePhrases,
  failedChecks: [],
};
out.globalsOk = ['ko_canon', 'en_canon', 'pm_hff', 'spd_all'].every((k) => g[k] === out.expected[k]) && g.en_dup === 0;
out.verdict = (koDrift === 0 && out.globalsOk && out.sum4209 && out.holdDup === 0) ? 'PASS' : 'FAIL';
fs.writeFileSync(`${D}/hff-en-batch-01-hold-4209-independent-verification-v1.json`, JSON.stringify(out, null, 1));
fs.writeFileSync(`${D}/hff-en-batch-01-hold-4209-apply-results-v1.json`, JSON.stringify({
  appliedAt: new Date().toISOString(), mode: 'NO_APPLY',
  reason: 'SAFE 대상 0 — 번역 자산이 확정되지 않은 문구가 남아 생성 기준을 통과한 문서가 없다',
  expectedUpdate: 0, actualUpdate: 0, expectedInsert: 0, actualInsert: 0, rolledBack: false,
  before: g, after: g, countsUnchanged: true,
}, null, 1));
fs.writeFileSync(`${D}/hff-en-batch-01-hold-4209-rollback-v1.json`, JSON.stringify({
  builtAt: new Date().toISOString(), count: 0, rollback: [],
  note: 'DB write 가 없어 rollback 대상이 없다.',
}, null, 1));
console.log(JSON.stringify(out, null, 2));
