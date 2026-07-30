/**
 * WO-O4O-HFF-KO-FUNCTION-HUMAN-REVIEW-PILOT-FRAGMENTED-AND-MALFORMED-47-V1 / Phase A
 *
 * 사람 검토 큐(3,858)에서 파일럿 47건을 고정한다.
 *   SOURCE_LINE_BREAK_FRAGMENTED  2
 *   MALFORMED_BRACKET            45
 * 두 사유를 동시에 가진 제품은 1회만 포함한다.
 *
 * read-only. 원본 큐 파일은 수정하지 않는다.
 */
import fs from 'node:fs';

const D = 'apps/api-server/src/scripts/data';
const QUEUE = `${D}/hff-ko-function-human-review-queue-v1.jsonl`;
const OUT = `${D}/hff-ko-function-review-pilot-fragmented-malformed-47-manifest-v1.json`;

const R_FRAG = 'SOURCE_LINE_BREAK_FRAGMENTED';
const R_BRACKET = 'MALFORMED_BRACKET';

const rows = fs.readFileSync(QUEUE, 'utf8').trim().split('\n').filter(Boolean).map((l, i) => {
  try { return JSON.parse(l); } catch (e) { throw new Error(`QUEUE_PARSE_FAIL line ${i + 1}: ${e.message}`); }
});

const hit = rows.filter((r) => {
  const s = r.standardizedReviewReasons ?? [];
  return s.includes(R_FRAG) || s.includes(R_BRACKET);
});

const fragOnly = hit.filter((r) => r.standardizedReviewReasons.includes(R_FRAG) && !r.standardizedReviewReasons.includes(R_BRACKET));
const bracketOnly = hit.filter((r) => !r.standardizedReviewReasons.includes(R_FRAG) && r.standardizedReviewReasons.includes(R_BRACKET));
const both = hit.filter((r) => r.standardizedReviewReasons.includes(R_FRAG) && r.standardizedReviewReasons.includes(R_BRACKET));

const manifest = hit.map((r, i) => ({
  pilotIndex: i + 1,
  queueIndex: r.queueIndex,
  priority: r.priority,
  candidateId: r.candidateId,
  statementNo: r.statementNo,
  productName: r.productName,
  productMasterId: r.productMasterId,
  canonicalId: r.canonicalId,
  productionBucket: r.productionBucket,
  rendererFamily: r.rendererFamily,
  canonicalContentHash: r.canonicalContentHash,
  canonicalContentLength: r.canonicalContentLength,
  canonicalUpdatedAt: r.canonicalUpdatedAt,
  pilotReasons: r.standardizedReviewReasons.filter((x) => x === R_FRAG || x === R_BRACKET),
  standardizedReviewReasons: r.standardizedReviewReasons,
  originalReviewReasons: r.originalReviewReasons,
  recommendedAction: r.recommendedAction,
  agent9HoldPresent: r.agent9HoldPresent,
  currentState: r.currentState,
  canonicalHashChangedSinceManifest: r.canonicalHashChangedSinceManifest,
  reviewStatus: r.reviewStatus,
}));

const uniq = (arr) => new Set(arr).size;
const checks = {
  queueRows: rows.length,
  total: manifest.length,
  fragmentedCount: hit.filter((r) => r.standardizedReviewReasons.includes(R_FRAG)).length,
  malformedBracketCount: hit.filter((r) => r.standardizedReviewReasons.includes(R_BRACKET)).length,
  fragOnly: fragOnly.length,
  bracketOnly: bracketOnly.length,
  bothReasons: both.length,
  candidateIdDup: manifest.length - uniq(manifest.map((m) => m.candidateId)),
  canonicalIdDup: manifest.length - uniq(manifest.map((m) => m.canonicalId)),
  statementNoDup: manifest.length - uniq(manifest.map((m) => m.statementNo)),
  agent9HoldIntersection: manifest.filter((m) => m.agent9HoldPresent).length,
  allInQueue: manifest.length,
  reviewStatusNonPending: manifest.filter((m) => m.reviewStatus !== 'PENDING').length,
  bucketBreakdown: manifest.reduce((a, m) => { a[m.productionBucket] = (a[m.productionBucket] ?? 0) + 1; return a; }, {}),
  rendererBreakdown: manifest.reduce((a, m) => { a[m.rendererFamily] = (a[m.rendererFamily] ?? 0) + 1; return a; }, {}),
};

const expected = { total: 47, fragmentedCount: 2, malformedBracketCount: 45 };
checks.matchesExpected =
  checks.total === expected.total &&
  checks.fragmentedCount === expected.fragmentedCount &&
  checks.malformedBracketCount === expected.malformedBracketCount;

fs.writeFileSync(OUT, JSON.stringify({ generatedFrom: QUEUE, expected, checks, manifest }, null, 1));
console.log(JSON.stringify({ out: OUT, expected, checks }, null, 2));
