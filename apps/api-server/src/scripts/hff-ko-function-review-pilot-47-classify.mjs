/**
 * Phase B — 47건 원문 손상 유형 전수 분류 (read-only).
 * 공식 MAIN_FNCTN 원문 · 현재 canonical 기능성 렌더 · V2 segmenter 분석을 대조한다.
 */
import fs from 'node:fs';
import { connectReadOnly, MANIFEST, D, nrm, dense, extractRenderedFunctions, bracketDiagnosis, lineBreakDiagnosis } from './hff-ko-function-review-pilot-47-lib.mjs';

const OUT = `${D}/hff-ko-function-review-pilot-47-pattern-classification-v1.json`;
const { manifest } = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));

// V2 분석 자료(있으면 참조)
let v2 = new Map();
try {
  const a = JSON.parse(fs.readFileSync(`${D}/hff-ko-function-clause-human-review-analysis-v2.json`, 'utf8'));
  const arr = Array.isArray(a) ? a : (a.rows ?? a.targets ?? a.items ?? []);
  for (const r of arr) if (r?.candidateId) v2.set(r.candidateId, r);
} catch { /* optional */ }

// 사람 검토 큐의 proposedSegments 재사용
const queueByCand = new Map();
for (const l of fs.readFileSync(`${D}/hff-ko-function-human-review-queue-v1.jsonl`, 'utf8').trim().split('\n')) {
  const r = JSON.parse(l);
  queueByCand.set(r.candidateId, r);
}

const c = await connectReadOnly();
const cand = new Map((await c.query(`
  SELECT id,
    raw_payload::jsonb->'source'->>'MAIN_FNCTN' mainFnctn,
    raw_payload::jsonb->'source'->>'PRDUCT' name
  FROM product_candidates WHERE id = ANY($1)`, [manifest.map((m) => m.candidateId)])).rows.map((r) => [r.id, r]));
const canon = new Map((await c.query(`
  SELECT id, content FROM shared_product_descriptions WHERE id = ANY($1)`, [manifest.map((m) => m.canonicalId)])).rows.map((r) => [r.id, r]));
await c.end();

/** MALFORMED_BRACKET 세부 유형 자동 후보 판정 (사람 확정 전 1차 분류) */
function bracketPattern(raw, diag) {
  const t = (raw ?? '').replace(/\r/g, '');
  const pats = [];
  if (diag.balanced) pats.push('AUDIT_FALSE_POSITIVE_BALANCED');
  if (diag.unmatchedOpenPositions.length && !diag.unmatchedClosePositions.length) pats.push('MISSING_CLOSING_BRACKET');
  if (diag.unmatchedClosePositions.length && !diag.unmatchedOpenPositions.length) pats.push('MISSING_OPENING_BRACKET');
  if (diag.unmatchedOpenPositions.length && diag.unmatchedClosePositions.length) pats.push('OTHER_MALFORMED_PATTERN');
  if (diag.nested) pats.push('NESTED_OR_EXTRA_BRACKET');
  if (diag.bracketSpansNewline) pats.push('BRACKET_SPLIT_BY_LINE_BREAK');
  // 고시번호/기타 괄호가 리터럴로 존재
  if (/\[제?\s*\d{2,}\s*[-호]/.test(t) || /\[고시/.test(t)) pats.push('BRACKET_IS_LITERAL_SOURCE_TEXT');
  return pats.length ? pats : ['OTHER_MALFORMED_PATTERN'];
}

const rows = [];
for (const m of manifest) {
  const cd = cand.get(m.candidateId);
  const cn = canon.get(m.canonicalId);
  const raw = cd?.mainfnctn ?? '';
  const ko = cn?.content ?? '';
  const diag = bracketDiagnosis(raw);
  const lb = lineBreakDiagnosis(raw);
  const rendered = extractRenderedFunctions(ko);
  const q = queueByCand.get(m.candidateId);

  // grounding 은 dense(공백 제거) 키로 판정 — 줄바꿈 결합을 허위 위반으로 잡지 않는다.
  const rawDense = dense(raw);
  const notGrounded = rendered.items.filter((x) => x && !rawDense.includes(dense(x)));
  // 원문 라벨이 렌더에 존재하는지 (sd-tag / <b> / 항목 텍스트 어디든, dense 비교)
  const renderedDenseAll = dense(rendered.tags.join('') + rendered.labels.join('') + rendered.items.join(''));
  const labelsNotRendered = diag.labels.filter((L) => !renderedDenseAll.includes(dense(L)));
  // 원문 기능성 문장이 렌더에서 누락됐는지 (①②③ 분할 기준, dense 비교)
  const srcClauses = raw.replace(/\r/g, '').split('\n').flatMap((line) => {
    const body = line.replace(/^\[[^\]]*\]/, '');
    return body.split(/(?=[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮])/).map((x) => x.replace(/^[①-⑮\s]*/, '').trim()).filter((x) => x.length >= 4);
  });
  const renderedDenseItems = rendered.items.map(dense);
  const srcClausesMissing = srcClauses.filter((s) => {
    const d = dense(s);
    return d.length >= 6 && !renderedDenseItems.some((r) => r.includes(d) || d.includes(r));
  });
  // 렌더 항목 중 raw bracket 파편 노출
  const bracketFragmentsRendered = rendered.items.filter((x) => /[\[\]]/.test(x));

  rows.push({
    pilotIndex: m.pilotIndex, queueIndex: m.queueIndex, candidateId: m.candidateId,
    statementNo: m.statementNo, productName: m.productName, canonicalId: m.canonicalId,
    pilotReasons: m.pilotReasons, rendererFamily: m.rendererFamily, productionBucket: m.productionBucket,
    sourceMainFnctnRaw: raw,
    sourceLength: raw.length,
    bracket: diag,
    bracketPatternCandidates: m.pilotReasons.includes('MALFORMED_BRACKET') ? bracketPattern(raw, diag) : [],
    lineBreak: lb,
    functionBlockFound: rendered.block.found,
    renderedFunctionItems: rendered.items,
    renderedTags: rendered.tags,
    renderedLabels: rendered.labels,
    renderedItemCount: rendered.items.length,
    notGroundedItems: notGrounded,
    labelsNotRendered,
    sourceClauseCount: srcClauses.length,
    sourceClausesMissingFromRender: srcClausesMissing,
    bracketFragmentsRendered,
    queueProposedSegments: q?.proposedSegments ?? null,
    queueSkippedMissingClauses: q?.skippedMissingClauses ?? null,
    queueStandardizedReasons: q?.standardizedReviewReasons ?? null,
  });
}

// 집계
const patternTally = {};
for (const r of rows) for (const p of r.bracketPatternCandidates) patternTally[p] = (patternTally[p] ?? 0) + 1;
const summary = {
  total: rows.length,
  fragmented: rows.filter((r) => r.pilotReasons.includes('SOURCE_LINE_BREAK_FRAGMENTED')).length,
  malformedBracket: rows.filter((r) => r.pilotReasons.includes('MALFORMED_BRACKET')).length,
  bracketBalancedCount: rows.filter((r) => r.bracket.balanced).length,
  bracketUnbalancedCount: rows.filter((r) => !r.bracket.balanced).length,
  nestedCount: rows.filter((r) => r.bracket.nested).length,
  spansNewlineCount: rows.filter((r) => r.bracket.bracketSpansNewline).length,
  patternTally,
  functionBlockMissing: rows.filter((r) => !r.functionBlockFound).length,
  productsWithNotGroundedItems: rows.filter((r) => r.notGroundedItems.length).length,
  productsWithBracketFragmentsRendered: rows.filter((r) => r.bracketFragmentsRendered.length).length,
  productsWithLabelsNotRendered: rows.filter((r) => r.labelsNotRendered.length).length,
  productsWithSourceClauseMissing: rows.filter((r) => r.sourceClausesMissingFromRender.length).length,
  totalSourceClausesMissing: rows.reduce((a, r) => a + r.sourceClausesMissingFromRender.length, 0),
};

fs.writeFileSync(OUT, JSON.stringify({ classifiedAt: new Date().toISOString(), summary, rows }, null, 1));
console.log(JSON.stringify({ out: OUT, summary }, null, 2));
