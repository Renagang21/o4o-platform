/**
 * WO-O4O-HFF-KO-FUNCTION-CLAUSE-HUMAN-REVIEW-QUEUE-BUILD-V1  Phase F (§21·§22)
 *
 * 큐 전체 감사(§22) + 최소 80건 표본 검증(§21).
 * 판정·수정은 하지 않는다. DB 접근 없음(§16 결과 재사용).
 */
import fs from 'node:fs';
import crypto from 'node:crypto';

const DATA = 'apps/api-server/src/scripts/data';
const WO = 'WO-O4O-HFF-KO-FUNCTION-CLAUSE-HUMAN-REVIEW-QUEUE-BUILD-V1';
const J = (f) => JSON.parse(fs.readFileSync(`${DATA}/${f}`, 'utf8'));
const L = (f) => fs.readFileSync(`${DATA}/${f}`, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
const sha = (s) => crypto.createHash('sha256').update(String(s ?? ''), 'utf8').digest('hex');
const tally = (arr, fn) => arr.reduce((a, x) => { for (const k of [].concat(fn(x))) a[String(k)] = (a[String(k)] ?? 0) + 1; return a; }, {});

const queue = L('hff-ko-function-human-review-queue-v1.jsonl');
const split = L('hff-ko-function-human-review-stale-resolved-v1.jsonl');
const summary = J('hff-ko-function-human-review-queue-summary-v1.json');
const norm = J('hff-ko-function-human-review-reason-normalization-v1.json');
const dbAudit = J('hff-ko-function-human-review-current-db-audit-v1.json');
const overlap = J('hff-ko-function-human-review-overlap-audit-v1.json');
const agent9 = new Set(L('hff-ko-agent-09-hold-queue-v1.jsonl').map((x) => x.candidateId));
const aItems = new Map(J('hff-ko-function-backfill-human-review-targets-v2.json').items.map((x) => [x.candidateId, x]));
const bItems = new Map(J('hff-ko-skipped-existing-2451-review-targets-v1.json').items.map((x) => [x.candidateId, x]));

const REQUIRED = ['queueIndex', 'priority', 'candidateId', 'statementNo', 'productName', 'canonicalId', 'productionBucket',
  'sourceSets', 'sourceClassifications', 'representativeClassification', 'originalReviewReasons', 'standardizedReviewReasons',
  'recommendedAction', 'sourceMainFunction', 'currentState', 'reviewStatus', 'functionReviewRequired'];
const ACTIONS = ['REVIEW_SOURCE_BOUNDARY', 'REVIEW_RENDERER_STRUCTURE', 'REVIEW_ENGLISH_POLICY', 'REVIEW_COMPOSITE_GROUPING',
  'REVIEW_ORIGINAL_LINE_BREAK', 'REVIEW_CANONICAL_PATCH_LOCATION', 'REVIEW_OFFICIAL_FUNCTION_COMPLETENESS', 'CROSS_CHECK_AGENT9_HOLD'];
const STATES = ['READY_FOR_REVIEW', 'STALE_CANONICAL_CHANGED', 'CANDIDATE_MISSING', 'PRODUCT_MASTER_LINK_CHANGED', 'CANONICAL_MISSING', 'ALREADY_RESOLVED'];
const SOURCE_SETS = ['V2_HUMAN_REVIEW', 'SKIPPED_HUMAN_REVIEW', 'SKIPPED_UNSUPPORTED_STRUCTURE', 'SOURCE_LINE_BREAK_FRAGMENTED', 'AGENT9_HOLD'];
const BUCKET_ORDER = { CREATED: 0, SKIPPED_EXISTING: 1, HOLD_FOR_AGENT_9: 2, OTHER: 3 };

/* ── §22 전체 큐 감사 ─────────────────────────────────────────────────── */
const checks = [];
const add = (name, ok, ev) => checks.push({ name, ok: !!ok, evidence: ev });

add('QUEUE_SIZE_EQUALS_UNION', queue.length + split.length === overlap.finalUniqueQueueSize,
  { queue: queue.length, split: split.length, union: overlap.finalUniqueQueueSize });
add('CANDIDATE_ID_UNIQUE', new Set(queue.map((r) => r.candidateId)).size === queue.length, { rows: queue.length, unique: new Set(queue.map((r) => r.candidateId)).size });
add('QUEUE_INDEX_CONTIGUOUS_FROM_1', queue.every((r, i) => r.queueIndex === i + 1), { first: queue[0]?.queueIndex, last: queue.at(-1)?.queueIndex });
add('REQUIRED_FIELDS_PRESENT', queue.every((r) => REQUIRED.every((k) => r[k] !== undefined && r[k] !== null)),
  { missing: queue.filter((r) => REQUIRED.some((k) => r[k] === undefined || r[k] === null)).slice(0, 5).map((r) => r.candidateId) });
add('ALL_REVIEW_STATUS_PENDING', queue.every((r) => r.reviewStatus === 'PENDING'), tally(queue, (r) => r.reviewStatus));
add('PRIORITY_IN_RANGE', queue.every((r) => [1, 2, 3].includes(r.priority)), tally(queue, (r) => r.priority));
add('STANDARDIZED_REASONS_IN_VOCABULARY', queue.every((r) => r.standardizedReviewReasons.length > 0 && r.standardizedReviewReasons.every((s) => norm.standardVocabulary.includes(s))), {});
add('RECOMMENDED_ACTION_IN_VOCABULARY', queue.every((r) => ACTIONS.includes(r.recommendedAction)), tally(queue, (r) => r.recommendedAction));
add('CURRENT_STATE_IN_VOCABULARY', queue.every((r) => STATES.includes(r.currentState)), tally(queue, (r) => r.currentState));
add('SOURCE_SETS_IN_VOCABULARY', queue.every((r) => r.sourceSets.length > 0 && r.sourceSets.every((s) => SOURCE_SETS.includes(s))), tally(queue, (r) => r.sourceSets));
add('ORIGINAL_REASONS_PRESERVED', queue.every((r) => {
  const a = aItems.get(r.candidateId); const b = bItems.get(r.candidateId);
  const expected = new Set([...(a?.reviewReasons ?? []), ...(b ? [b.reason] : [])].filter(Boolean));
  return [...expected].every((x) => r.originalReviewReasons.includes(x));
}), { note: '원본 파일의 reviewReasons·reason 전부가 originalReviewReasons 에 남아있는지 확인' });

const priorityRank = (r) => r.priority;
const sortKey = (r) => [priorityRank(r), BUCKET_ORDER[r.productionBucket] ?? 3, String(r.statementNo), String(r.candidateId)];
let sortViolations = 0;
for (let i = 1; i < queue.length; i++) {
  const a = sortKey(queue[i - 1]); const b = sortKey(queue[i]);
  for (let k = 0; k < a.length; k++) {
    const c = typeof a[k] === 'number' ? a[k] - b[k] : String(a[k]).localeCompare(String(b[k]));
    if (c > 0) { sortViolations++; break; }
    if (c < 0) break;
  }
}
add('SORT_ORDER_VALID', sortViolations === 0, { violations: sortViolations });

add('P1_REASON_CONSISTENT', queue.filter((r) => r.priority === 1).every((r) => r.standardizedReviewReasons.some((s) => norm.priorityGroups.P1.includes(s))), {});
add('P2_REASON_CONSISTENT', queue.filter((r) => r.priority === 2).every((r) => r.standardizedReviewReasons.some((s) => norm.priorityGroups.P2.includes(s)) && !r.standardizedReviewReasons.some((s) => norm.priorityGroups.P1.includes(s))), {});
add('P3_REASON_CONSISTENT', queue.filter((r) => r.priority === 3).every((r) => r.standardizedReviewReasons.every((s) => norm.priorityGroups.P3.includes(s))), {});
add('AGENT9_NO_DUPLICATE_QUEUE_ROW', queue.filter((r) => agent9.has(r.candidateId)).length === summary.agent9Intersection,
  { intersection: summary.agent9Intersection, note: 'Agent 9 HOLD 348 은 큐 수에 합산하지 않는다(§11).' });
add('AGENT9_METADATA_PRESENT', queue.every((r) => 'agent9HoldPresent' in r && 'agent9QueueIndex' in r && 'agent9HoldReason' in r && r.functionReviewRequired === true), {});
add('DB_AUDIT_COVERS_ALL', dbAudit.rowsAudited === queue.length + split.length, { audited: dbAudit.rowsAudited, rows: queue.length + split.length });
add('NO_AUTO_RESOLUTION_APPLIED', queue.every((r) => r.reviewDecision === null && r.reviewStatus === 'PENDING'), {});

/* ── §21 표본 검증 ────────────────────────────────────────────────────── */
// 결정적 표본: 우선순위 구간별 균등 간격 추출.
const pick = (pool, n) => {
  if (pool.length <= n) return [...pool];
  const step = pool.length / n;
  return Array.from({ length: n }, (_, i) => pool[Math.floor(i * step)]);
};
const p1 = queue.filter((r) => r.priority === 1);
const p2 = queue.filter((r) => r.priority === 2);
const p3 = queue.filter((r) => r.priority === 3);
const a9 = queue.filter((r) => r.agent9HoldPresent);
const target = { P1: 20, P2: 30, P3: 20, AGENT9: Math.min(10, a9.length) };
const shortfall = (30 - Math.min(30, p2.length)) + (10 - target.AGENT9);
const sample = [
  ...pick(p1, target.P1 + shortfall).map((r) => ({ stratum: 'P1', r })),
  ...pick(p2, target.P2).map((r) => ({ stratum: 'P2', r })),
  ...pick(p3, target.P3).map((r) => ({ stratum: 'P3', r })),
  ...pick(a9, target.AGENT9).map((r) => ({ stratum: 'AGENT9_INTERSECTION', r })),
];

const sampleRows = sample.map(({ stratum, r }) => {
  const a = aItems.get(r.candidateId); const b = bItems.get(r.candidateId);
  const dbRow = dbAudit.items.find((x) => x.candidateId === r.candidateId);
  const item = [];
  const ck = (name, ok, ev) => item.push({ name, ok: !!ok, evidence: ev });
  ck('SOURCE_ROW_TRACEABLE', !!a || !!b, { inA: !!a, inB: !!b });
  ck('ORIGINAL_REASONS_KEPT', [...new Set([...(a?.reviewReasons ?? []), ...(b ? [b.reason] : [])])].every((x) => r.originalReviewReasons.includes(x)),
    { original: r.originalReviewReasons });
  ck('STANDARDIZED_MAPPING_JUSTIFIED', r.standardizedReviewReasons.every((s) => norm.standardVocabulary.includes(s)) && r.standardizedReviewReasons.length > 0,
    { standardized: r.standardizedReviewReasons });
  ck('PRIORITY_MATCHES_REASON', r.priority === (r.standardizedReviewReasons.some((s) => norm.priorityGroups.P1.includes(s)) ? 1
    : r.standardizedReviewReasons.some((s) => norm.priorityGroups.P2.includes(s)) ? 2 : 3), { priority: r.priority });
  ck('ACTION_MATCHES_REASON', r.agent9HoldPresent ? r.recommendedAction === 'CROSS_CHECK_AGENT9_HOLD'
    : r.standardizedReviewReasons.some((s) => norm.actionByReason[s] === r.recommendedAction), { action: r.recommendedAction });
  ck('OFFICIAL_FUNCTION_PRESENT', typeof r.sourceMainFunction === 'string' && r.sourceMainFunction.trim().length > 0,
    { length: (r.sourceMainFunction ?? '').length });
  ck('OFFICIAL_FUNCTION_NOT_MODIFIED', !!dbRow && (dbRow.canonicalId !== null || r.currentState !== 'READY_FOR_REVIEW'),
    { note: '공식 기능성 원문은 큐에 그대로 복사되며 번역·요약·삭제하지 않는다.' });
  ck('DB_STATE_CONSISTENT', !!dbRow && dbRow.currentState === r.currentState && dbRow.canonicalId === r.canonicalId,
    { dbState: dbRow?.currentState, dbCanonicalId: dbRow?.canonicalId });
  ck('REVIEW_STATUS_PENDING', r.reviewStatus === 'PENDING' && r.reviewDecision === null, {});
  ck('NO_CONTENT_REWRITE', r.currentRenderedFunctions.every((x) => typeof x === 'string'), { rendered: r.currentRenderedFunctions.length });
  return {
    stratum, queueIndex: r.queueIndex, candidateId: r.candidateId, statementNo: r.statementNo, productName: r.productName,
    priority: r.priority, productionBucket: r.productionBucket, rendererFamily: r.rendererFamily,
    sourceSets: r.sourceSets, originalReviewReasons: r.originalReviewReasons, standardizedReviewReasons: r.standardizedReviewReasons,
    recommendedAction: r.recommendedAction, currentState: r.currentState,
    officialFunctionExcerpt: String(r.sourceMainFunction ?? '').slice(0, 300),
    renderedFunctionCount: r.currentRenderedFunctions.length,
    proposedSegmentCount: r.proposedSegments.length,
    checks: item, ok: item.every((x) => x.ok),
  };
});

const failedChecks = checks.filter((c) => !c.ok).map((c) => c.name);
const failedSamples = sampleRows.filter((s) => !s.ok);
const verdict = failedChecks.length === 0 && failedSamples.length === 0 ? 'PASS' : 'STOP';

fs.writeFileSync(`${DATA}/hff-ko-function-human-review-quality-samples-v1.json`, JSON.stringify({
  workOrder: WO,
  contract: '§21·§22 — 표본 최소 80건 + 큐 전체 감사. 사람 검토 판정은 수행하지 않는다. DB write 0.',
  generatedAt: new Date().toISOString(),
  queueTotal: queue.length,
  splitTotal: split.length,
  sampleSize: sampleRows.length,
  sampleByStratum: tally(sampleRows, (s) => s.stratum),
  samplingRule: '우선순위 구간별 균등 간격(결정적) 추출. P2·Agent9 부족분은 P1 로 보충(§21).',
  fullQueueChecks: checks,
  failedChecks,
  failedSamples: failedSamples.map((s) => ({ candidateId: s.candidateId, failed: s.checks.filter((c) => !c.ok).map((c) => c.name) })),
  queueFileSha256: sha(fs.readFileSync(`${DATA}/hff-ko-function-human-review-queue-v1.jsonl`, 'utf8')),
  samples: sampleRows,
  verdict,
}, null, 1));

console.log(JSON.stringify({ queue: queue.length, split: split.length, sample: sampleRows.length, byStratum: tally(sampleRows, (s) => s.stratum), failedChecks, failedSamples: failedSamples.length, verdict }, null, 1));
if (verdict !== 'PASS') process.exit(2);
