/**
 * WO-O4O-HFF-KO-FUNCTION-CLAUSE-HUMAN-REVIEW-QUEUE-BUILD-V1  Phase A·B (§7~§12)
 *
 * 기능성 절 사람 검토 원본 4집합을 read-only 로 검증하고 집합 관계를 실측한다.
 *   A = V2 사람 검토 3,652
 *   B = SKIPPED_EXISTING 후속 검토 206 (HUMAN_REVIEW 138 + UNSUPPORTED_STRUCTURE 68)
 *   C = SOURCE_LINE_BREAK_FRAGMENTED 2
 *   D = Agent 9 HOLD 348 (큐 수에 합산하지 않고 교집합 메타데이터로만 연결)
 * 원본 파일은 절대 수정하지 않는다. DB 접근 0.
 *
 * 산출물
 *   - data/hff-ko-function-human-review-source-set-audit-v1.json
 *   - data/hff-ko-function-human-review-overlap-audit-v1.json
 */
import fs from 'node:fs';
import crypto from 'node:crypto';

const DATA = 'apps/api-server/src/scripts/data';
const WO = 'WO-O4O-HFF-KO-FUNCTION-CLAUSE-HUMAN-REVIEW-QUEUE-BUILD-V1';
const J = (f) => JSON.parse(fs.readFileSync(`${DATA}/${f}`, 'utf8'));
const L = (f) => fs.readFileSync(`${DATA}/${f}`, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
const sha = (s) => crypto.createHash('sha256').update(String(s ?? ''), 'utf8').digest('hex');
const fileSha = (f) => sha(fs.readFileSync(`${DATA}/${f}`, 'utf8'));
const tally = (arr, fn) => arr.reduce((a, x) => { const k = String(fn(x)); a[k] = (a[k] ?? 0) + 1; return a; }, {});

const FILES = {
  A: 'hff-ko-function-backfill-human-review-targets-v2.json',
  A_ANALYSIS: 'hff-ko-function-clause-human-review-analysis-v2.json',
  A_REGRESSION: 'hff-ko-function-clause-full-regression-v2.json',
  B: 'hff-ko-skipped-existing-2451-review-targets-v1.json',
  B_DIFF: 'hff-ko-skipped-existing-2451-function-diff-v1.json',
  B_FAMILY: 'hff-ko-skipped-existing-2451-renderer-family-audit-v1.json',
  B_VERIFY: 'hff-ko-skipped-existing-2451-independent-verification-v1.json',
  D: 'hff-ko-agent-09-hold-queue-v1.jsonl',
  D_SUMMARY: 'hff-ko-agent-09-hold-queue-summary-v1.json',
};

const checks = [];
const add = (name, ok, evidence) => checks.push({ name, ok, evidence });

/* ── §7 A 집합 ────────────────────────────────────────────────────────── */
const aDoc = J(FILES.A);
const A = aDoc.items;
const aBuckets = tally(A, (x) => x.productionBucket);
add('A_ROW_COUNT_3652', A.length === 3652 && aDoc.count === 3652, { rows: A.length, declared: aDoc.count });
add('A_CANDIDATE_ID_UNIQUE', new Set(A.map((x) => x.candidateId)).size === A.length, { dup: A.length - new Set(A.map((x) => x.candidateId)).size });
add('A_CANONICAL_ID_UNIQUE', new Set(A.map((x) => x.canonicalId)).size === A.length, { dup: A.length - new Set(A.map((x) => x.canonicalId)).size });
add('A_BUCKETS_2808_844', aBuckets.CREATED === 2808 && aBuckets.SKIPPED_EXISTING === 844 && A.length === 2808 + 844, aBuckets);
const aMissingField = A.filter((x) => !x.candidateId || !x.statementNo || !x.productName || !x.productionBucket
  || !Array.isArray(x.reviewReasons) || x.reviewReasons.length === 0 || x.status !== 'PENDING_REVIEW');
add('A_REQUIRED_FIELDS_PRESENT', aMissingField.length === 0, { violations: aMissingField.slice(0, 5).map((x) => x.candidateId), count: aMissingField.length });
add('A_ALL_PENDING_REVIEW', A.every((x) => x.status === 'PENDING_REVIEW'), tally(A, (x) => x.status));
const aAnalysis = J(FILES.A_ANALYSIS);
add('A_MATCHES_ANALYSIS_SSOT',
  aAnalysis.humanReviewTotal === A.length && aAnalysis.byBucket.CREATED === aBuckets.CREATED && aAnalysis.byBucket.SKIPPED_EXISTING === aBuckets.SKIPPED_EXISTING,
  { analysisTotal: aAnalysis.humanReviewTotal, analysisBuckets: aAnalysis.byBucket });

/* ── §8 B 집합 ────────────────────────────────────────────────────────── */
const bDoc = J(FILES.B);
const B = bDoc.items;
const bClass = tally(B, (x) => x.classification);
const bApply = tally(B, (x) => x.applyStatus);
add('B_ROW_COUNT_206', B.length === 206 && bDoc.count === 206, { rows: B.length, declared: bDoc.count });
add('B_138_PLUS_68', bApply.HUMAN_REVIEW === 138 && bApply.UNSUPPORTED_STRUCTURE === 68 && 138 + 68 === B.length, bApply);
add('B_CANDIDATE_ID_UNIQUE', new Set(B.map((x) => x.candidateId)).size === B.length, { dup: B.length - new Set(B.map((x) => x.candidateId)).size });
add('B_CANONICAL_ID_UNIQUE', new Set(B.map((x) => x.canonicalId)).size === B.length, { dup: B.length - new Set(B.map((x) => x.canonicalId)).size });
add('B_CANONICAL_ID_PRESENT', B.every((x) => !!x.canonicalId), { missing: B.filter((x) => !x.canonicalId).length });
add('B_FAMILY_KNOWN', B.every((x) => x.family === 'DRIVER' || x.family === 'COMPOSITE'), tally(B, (x) => x.family));
add('B_REASON_PRESENT', B.every((x) => !!x.reason), { missing: B.filter((x) => !x.reason).length });

// B 는 2,451 판정 산출물과 재현 일치해야 한다.
const bDiff = J(FILES.B_DIFF);
const diffReview = bDiff.items.filter((x) => x.applyStatus === 'HUMAN_REVIEW' || x.applyStatus === 'UNSUPPORTED_STRUCTURE');
add('B_REPRODUCIBLE_FROM_DIFF',
  diffReview.length === 206 && diffReview.every((x) => B.some((y) => y.candidateId === x.candidateId)),
  { diffReviewRows: diffReview.length, diffApplyStatusCount: bDiff.applyStatusCount });
const bFamily = new Map(J(FILES.B_FAMILY).items.map((x) => [x.candidateId, x.family]));
add('B_FAMILY_MATCHES_FAMILY_AUDIT', B.every((x) => bFamily.get(x.candidateId) === x.family), {
  mismatch: B.filter((x) => bFamily.get(x.candidateId) !== x.family).length,
});
const bVerify = J(FILES.B_VERIFY);
const applied13 = bVerify.perTarget ?? [];
add('B_DISJOINT_FROM_APPLIED_13',
  applied13.length === 13 && applied13.every((v) => !B.some((y) => y.candidateId === v.candidateId)),
  { appliedRows: applied13.length, appliedVerdict: bVerify.verdict });

/* ── §9 C 집합 ────────────────────────────────────────────────────────── */
const FRAG = 'SOURCE_LINE_BREAK_FRAGMENTED';
const C = A.filter((x) => (x.reviewReasons ?? []).includes(FRAG));
const aRegression = J(FILES.A_REGRESSION);
add('C_ROW_COUNT_2', C.length === 2, { rows: C.length });
add('C_MATCHES_REGRESSION_DIAGNOSTIC', aRegression.diagnostics?.[FRAG] === C.length, { declared: aRegression.diagnostics?.[FRAG], found: C.length });
add('C_SUBSET_OF_A', C.every((x) => A.some((y) => y.candidateId === x.candidateId)), { count: C.length });
const fragEvidence = C.map((x) => {
  const segs = x.proposedSegments ?? [];
  const unresolved = segs.filter((s) => s.kind === 'UNRESOLVED');
  const src = String(x.sourceMainFunction ?? '');
  return {
    candidateId: x.candidateId, statementNo: x.statementNo, productName: x.productName,
    productionBucket: x.productionBucket, canonicalId: x.canonicalId,
    reviewReasons: x.reviewReasons,
    // 원문 단어 중간 개행 증거 — head 조각(FUNCTION_KO)과 tail 조각(UNRESOLVED)
    unresolvedFragments: unresolved.map((s) => s.text),
    sourceLineBreakContext: src.split(/\r?\n/).filter((l) => l.trim()).slice(0, 8),
    inB: B.some((y) => y.candidateId === x.candidateId),
  };
});
add('C_FRAGMENT_EVIDENCE_PRESENT', fragEvidence.every((f) => f.unresolvedFragments.length > 0 && f.sourceLineBreakContext.length > 0), {
  evidence: fragEvidence.map((f) => ({ candidateId: f.candidateId, fragments: f.unresolvedFragments.length })),
});

/* ── §10 D 집합 ───────────────────────────────────────────────────────── */
const D = L(FILES.D);
const dSummary = J(FILES.D_SUMMARY);
const dQueueSha = fileSha(FILES.D);
add('D_ROW_COUNT_348', D.length === 348 && dSummary.queueTotal === 348, { rows: D.length, declared: dSummary.queueTotal });
add('D_ALL_PENDING_UNCHANGED', D.every((x) => x.agent9Status === 'PENDING'), tally(D, (x) => x.agent9Status));

/* ── §11 집합 대조 ────────────────────────────────────────────────────── */
const setOf = (arr) => new Set(arr.map((x) => x.candidateId));
const sA = setOf(A); const sB = setOf(B); const sC = setOf(C); const sD = setOf(D);
const inter = (x, y) => [...x].filter((v) => y.has(v));
const union = new Set([...sA, ...sB, ...sC]);

const overlaps = {
  'A∩B': inter(sA, sB), 'A∩C': inter(sA, sC), 'B∩C': inter(sB, sC),
  'A∩D': inter(sA, sD), 'B∩D': inter(sB, sD), 'C∩D': inter(sC, sD),
};
// |A ∪ B ∪ C| = |A| + (B\A) + (C\(A∪B)) — 포함·배제를 실측 차집합으로 검산한다.
const bOnly = [...sB].filter((x) => !sA.has(x)).length;
const cOnly = [...sC].filter((x) => !sA.has(x) && !sB.has(x)).length;
add('UNION_SIZE_CONSISTENT', union.size === sA.size + bOnly + cOnly,
  { union: union.size, A: sA.size, 'B\\A': bOnly, 'C\\(A∪B)': cOnly });
add('C_ALREADY_IN_UNION_NO_EXTRA_ROW', inter(sA, sC).length === sC.size, { cInA: inter(sA, sC).length, C: sC.size });

const verdict = checks.every((c) => c.ok) ? 'PASS' : 'STOP';

fs.writeFileSync(`${DATA}/hff-ko-function-human-review-source-set-audit-v1.json`, JSON.stringify({
  workOrder: WO,
  contract: '§7~§10 — 사람 검토 원본 4집합 read-only 검증. 원본 파일 수정 0 · DB 접근 0.',
  generatedAt: new Date().toISOString(),
  dbWrite: 0,
  baseCommit: '55c99593f',
  sources: Object.fromEntries(Object.entries(FILES).map(([k, f]) => [k, { file: `${DATA}/${f}`, sha256: fileSha(f) }])),
  setA: { count: A.length, buckets: aBuckets, reasonTally: A.reduce((a, x) => { for (const r of x.reviewReasons) a[r] = (a[r] ?? 0) + 1; return a; }, {}), recommendedActionTally: tally(A, (x) => x.recommendedAction), statusTally: tally(A, (x) => x.status) },
  setB: { count: B.length, classification: bClass, applyStatus: bApply, family: tally(B, (x) => x.family), reasonTally: bDoc.reasonCount },
  setC: { count: C.length, items: fragEvidence },
  setD: { count: D.length, queueSha256: dQueueSha, byPriority: dSummary.byPriority, byReason: dSummary.byReason, statusTally: tally(D, (x) => x.agent9Status) },
  checks, verdict,
}, null, 1));

fs.writeFileSync(`${DATA}/hff-ko-function-human-review-overlap-audit-v1.json`, JSON.stringify({
  workOrder: WO,
  contract: '§11·§12 — candidateId 기준 집합 대조. FINAL_FUNCTION_REVIEW_QUEUE = A ∪ B ∪ C. D 는 교집합 메타데이터로만 연결하며 큐 수에 합산하지 않는다.',
  generatedAt: new Date().toISOString(),
  sizes: { A: sA.size, B: sB.size, C: sC.size, D: sD.size },
  intersections: Object.fromEntries(Object.entries(overlaps).map(([k, v]) => [k, v.length])),
  intersectionMembers: Object.fromEntries(Object.entries(overlaps).map(([k, v]) => [k, v.slice(0, 50)])),
  differences: {
    'A\\B': [...sA].filter((x) => !sB.has(x)).length,
    'B\\A': [...sB].filter((x) => !sA.has(x)).length,
    'C\\A': [...sC].filter((x) => !sA.has(x)).length,
    'C\\(A∪B)': [...sC].filter((x) => !sA.has(x) && !sB.has(x)).length,
  },
  finalUniqueQueueSize: union.size,
  interpretation: [
    `|A ∪ B ∪ C| = ${union.size} — 이 값이 FINAL_FUNCTION_REVIEW_QUEUE 의 고유 대상 수다.`,
    `A ∩ B = ${overlaps['A∩B'].length} — 2,451 트랙 모집단은 V2 사람 검토 3,652 과 구성상 서로소이므로 교집합 0 이 정상이다.`,
    `C ⊂ A (${inter(sA, sC).length}/${sC.size}) — SOURCE_LINE_BREAK_FRAGMENTED 2건은 이미 A 에 포함되어 별도 행을 추가하지 않고 사유 태그만 병합한다.`,
    `A ∩ D = ${overlaps['A∩D'].length}, B ∩ D = ${overlaps['B∩D'].length} — Agent 9 HOLD 348 은 canonical 미보유(HOLD) 집합이라 기능성 절 검토 후보와 교집합이 0 이다. 교집합 0 도 감사 결과로 명시한다(§10).`,
  ],
  verdict,
}, null, 1));

console.log(JSON.stringify({
  A: sA.size, B: sB.size, C: sC.size, D: sD.size,
  intersections: Object.fromEntries(Object.entries(overlaps).map(([k, v]) => [k, v.length])),
  finalUnique: union.size,
  failed: checks.filter((c) => !c.ok).map((c) => c.name), verdict,
}, null, 1));
if (verdict !== 'PASS') process.exit(2);
