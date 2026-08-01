/**
 * WO-...-BATCH-02-5000-DIRECT-BULK-PRODUCTION-V1 §25
 * Batch 02 산출물 manifest (read-only, DB 미접근).
 *   - 최종 HOLD / 요약
 *   - Batch 01 HOLD 73 sweep 결과
 *   - 번역 산출물 JSONL
 *   - 연속성 manifest (완료 / 잔여)
 */
import fs from 'node:fs';

const D = 'apps/api-server/src/scripts/data';
const CLS = JSON.parse(fs.readFileSync(`${D}/hff-en-batch02-classification-v1.json`, 'utf8'));
const SAFE = JSON.parse(fs.readFileSync(`${D}/hff-en-batch02-safe-targets-v1.json`, 'utf8')).targets;
const CLOSURE = JSON.parse(fs.readFileSync(`${D}/hff-en-batch01-closure-v1.json`, 'utf8'));
const VER = JSON.parse(fs.readFileSync(`${D}/hff-en-batch02-independent-verification-v1.json`, 'utf8'));
// Batch 01 sweep 전/후 비교: closure manifest 착수값(73) vs 현재값
const SWEEP_BEFORE = 73;

const done = CLS.results.filter((r) => ['CREATED_NEW_EN', 'UPDATED_EXISTING_EN', 'RESOLVED_NO_CHANGE'].includes(r.status));
const hold = CLS.results.filter((r) => r.status.startsWith('HOLD'));

// 1) 최종 HOLD
fs.writeFileSync(`${D}/hff-en-batch02-final-hold-v1.jsonl`,
  hold.map((r) => JSON.stringify({
    batch: 2, productMasterId: r.productMasterId, koCanonicalId: r.koCanonicalId,
    productNameKo: r.productNameKo, rendererFamily: r.rendererFamily,
    holdReason: r.holdReason, why: (r.why ?? []).slice(0, 3),
    unresolvedPhrases: (r.unresolvedPhrases ?? []).slice(0, 12), koHash: r.koHash,
  })).join('\n') + '\n');

const byReason = hold.reduce((a, r) => { a[r.holdReason] = (a[r.holdReason] ?? 0) + 1; return a; }, {});
fs.writeFileSync(`${D}/hff-en-batch02-final-hold-summary-v1.json`, JSON.stringify({
  total: hold.length, byReason,
  blockingPhrases: CLS.checks.blockingPhrases,
  note: 'HOLD_PENDING_DIRECT_TRANSLATION 은 자산 부족이 아니라 아직 직접 번역이 진행되지 않은 잔여분이다. 다음 라운드 대상.',
}, null, 1));

// 2) 번역 산출물 JSONL (제품별)
fs.writeFileSync(`${D}/hff-en-batch02-translations-v1.jsonl`,
  SAFE.map((t) => JSON.stringify({
    batch: 2, productMasterId: t.productMasterId, koCanonicalId: t.koCanonicalId,
    operation: t.op, rendererFamily: t.rendererFamily,
    enCanonicalId: t.enCanonicalId ?? null,
    oldContentHash: t.oldContentHash ?? null, newContentHash: t.newContentHash,
    content: t.newContent,
  })).join('\n') + '\n');

// 3) Batch 01 HOLD 73 sweep
fs.writeFileSync(`${D}/hff-en-batch01-hold73-sweep-results-v1.json`, JSON.stringify({
  wo: 'WO-O4O-HFF-EN-BATCH-01-CLOSURE-AND-BATCH-02-5000-DIRECT-BULK-PRODUCTION-V1',
  sweepEligibleBefore: SWEEP_BEFORE,
  sweepEligibleAfter: CLOSURE.byReason.HOLD_LOW_EFFICIENCY_UNIQUE_PHRASES ?? 0,
  resolvedBySweep: SWEEP_BEFORE - (CLOSURE.byReason.HOLD_LOW_EFFICIENCY_UNIQUE_PHRASES ?? 0),
  batch01CompletedBefore: 4898, batch01CompletedAfter: CLOSURE.completed,
  batch01HoldAfter: CLOSURE.holdTotal, batch01ByReason: CLOSURE.byReason,
  note: 'Batch 02 직접 번역으로 확보된 문구가 Batch 01 저효율 HOLD 에도 안전하게 적용되는 경우만 재생산했다. 별도 저효율 연구는 수행하지 않았다(WO §9).',
}, null, 1));

// 4) 연속성 manifest
fs.writeFileSync(`${D}/hff-en-production-completed-through-batch02-v1.json`, JSON.stringify({
  builtAt: new Date().toISOString(),
  batch01: { total: 5000, completed: CLOSURE.completed, hold: CLOSURE.holdTotal, byReason: CLOSURE.byReason },
  batch02: { total: 5000, completed: done.length, hold: hold.length, byReason },
  cumulative: { totalTargeted: 10000, completed: CLOSURE.completed + done.length, hold: CLOSURE.holdTotal + hold.length },
  enCanonicalTotal: VER.enCanonicalTotal,
  completedKoCanonicalIds: done.map((r) => r.koCanonicalId),
}, null, 1));

fs.writeFileSync(`${D}/hff-en-production-remaining-after-batch02-v1.json`, JSON.stringify({
  builtAt: new Date().toISOString(),
  measuredFromDb: { koCanonical: VER.globals.ko_canon, enCanonical: VER.globals.en_canon },
  koWithoutEn: VER.globals.ko_canon - VER.globals.en_canon,
  batch02Hold: hold.length, batch02HoldByReason: byReason,
  batch01Hold: CLOSURE.holdTotal, batch01HoldByReason: CLOSURE.byReason,
  nextTarget: 'Batch 02 잔여 HOLD 직접 번역 계속 → Batch 03 신규 5,000 선정',
}, null, 1));

console.log(JSON.stringify({
  batch02Done: done.length, batch02Hold: hold.length, byReason,
  batch01Completed: CLOSURE.completed, batch01Hold: CLOSURE.holdTotal,
  sweepResolved: SWEEP_BEFORE - (CLOSURE.byReason.HOLD_LOW_EFFICIENCY_UNIQUE_PHRASES ?? 0),
  cumulativeCompleted: CLOSURE.completed + done.length,
  enCanonicalTotal: VER.enCanonicalTotal,
}, null, 2));
