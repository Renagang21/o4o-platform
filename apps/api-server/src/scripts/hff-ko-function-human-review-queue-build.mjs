/**
 * WO-O4O-HFF-KO-FUNCTION-CLAUSE-HUMAN-REVIEW-QUEUE-BUILD-V1  Phase C·D·E (§13~§20)
 *
 * A(3,652) ∪ B(206) ∪ C(2) 를 candidateId 기준으로 중복 제거해 단일 사람 검토 큐를 만든다.
 *   - 검토 사유를 표준 어휘로 정규화하되 **원본 사유를 절대 덮어쓰지 않는다**(§13).
 *   - 우선순위 P1/P2/P3 (§14) · recommendedAction 단일값(§15).
 *   - 현재 DB 상태를 read-only 로 재확인(§16·§17)하고 stale·resolved 를 분리(§19).
 *   - 판정·수정·자동 보정은 수행하지 않는다. DB write 0.
 *
 * 산출물
 *   - data/hff-ko-function-human-review-reason-normalization-v1.json
 *   - data/hff-ko-function-human-review-current-db-audit-v1.json
 *   - data/hff-ko-function-human-review-queue-v1.jsonl
 *   - data/hff-ko-function-human-review-queue-summary-v1.json
 *   - data/hff-ko-function-human-review-stale-resolved-v1.jsonl
 *   - data/hff-ko-function-human-review-anomalies-v1.json
 *   - data/hff-ko-function-human-review-db-unchanged-v1.json
 */
import pg from 'pg';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { analyzeTarget, findFunctionalSections, htmlText } from './hff-ko-function-family-preserving-patch.mjs';

const DATA = 'apps/api-server/src/scripts/data';
const WO = 'WO-O4O-HFF-KO-FUNCTION-CLAUSE-HUMAN-REVIEW-QUEUE-BUILD-V1';
const J = (f) => JSON.parse(fs.readFileSync(`${DATA}/${f}`, 'utf8'));
const L = (f) => fs.readFileSync(`${DATA}/${f}`, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
const sha = (s) => crypto.createHash('sha256').update(String(s ?? ''), 'utf8').digest('hex');
const fileSha = (f) => sha(fs.readFileSync(`${DATA}/${f}`, 'utf8'));
const tally = (arr, fn) => arr.reduce((a, x) => { for (const k of [].concat(fn(x))) a[String(k)] = (a[String(k)] ?? 0) + 1; return a; }, {});

/* ── 선행 게이트 ──────────────────────────────────────────────────────── */
const setAudit = J('hff-ko-function-human-review-source-set-audit-v1.json');
const overlap = J('hff-ko-function-human-review-overlap-audit-v1.json');
if (setAudit.verdict !== 'PASS' || overlap.verdict !== 'PASS') { console.error('STOP: source-set/overlap audit not PASS'); process.exit(2); }

const aDoc = J('hff-ko-function-backfill-human-review-targets-v2.json');
const A = aDoc.items;
const bDoc = J('hff-ko-skipped-existing-2451-review-targets-v1.json');
const B = bDoc.items;
const bDiff = new Map(J('hff-ko-skipped-existing-2451-function-diff-v1.json').items.map((x) => [x.candidateId, x]));
const agent9 = L('hff-ko-agent-09-hold-queue-v1.jsonl');
const agent9By = new Map(agent9.map((x) => [x.candidateId, x]));
const AGENT9_SHA_BEFORE = fileSha('hff-ko-agent-09-hold-queue-v1.jsonl');
const FRAG = 'SOURCE_LINE_BREAK_FRAGMENTED';
const C = A.filter((x) => (x.reviewReasons ?? []).includes(FRAG));

/* ── §13 표준 검토 사유 ───────────────────────────────────────────────── */
const STD = [
  'ENGLISH_ONLY_FUNCTION', 'ENGLISH_PARALLEL_AMBIGUOUS', 'MALFORMED_BRACKET', 'SOURCE_LINE_BREAK_FRAGMENTED',
  'FORM_FUNCTION_BOUNDARY_UNCLEAR', 'INGREDIENT_FUNCTION_BOUNDARY_UNCLEAR', 'COMPOSITE_GROUP_BOUNDARY_UNCLEAR',
  'OFFICIAL_GROUP_RESTART_AMBIGUOUS', 'MULTI_INGREDIENT_FLAT_STRUCTURE', 'UNSUPPORTED_RENDERER_STRUCTURE',
  'SOURCE_CLAUSE_SEGMENTATION_UNCERTAIN', 'FUNCTION_CONTAINER_NOT_IDENTIFIABLE', 'CANONICAL_STRUCTURE_UNSAFE_TO_PATCH',
  'OTHER_REVIEW_REQUIRED',
];

/** V2(A) 원본 사유 → 표준 사유. 생성 시점 의미를 바꾸지 않는 1:1 대응만 둔다. */
const MAP_A = {
  UNRESOLVED_SEGMENT_PRESENT: ['SOURCE_CLAUSE_SEGMENTATION_UNCERTAIN'],
  ENGLISH_ONLY_CLAUSE: ['ENGLISH_ONLY_FUNCTION'],
  'LABEL_ISSUE:UNCLOSED_BRACKET': ['MALFORMED_BRACKET'],
  'LABEL_ISSUE:ORPHAN_CLOSE_BRACKET': ['MALFORMED_BRACKET'],
  'LABEL_ISSUE:ENGLISH_CLAIM_IN_BRACKET': ['ENGLISH_PARALLEL_AMBIGUOUS', 'MALFORMED_BRACKET'],
  SOURCE_LINE_BREAK_FRAGMENTED: ['SOURCE_LINE_BREAK_FRAGMENTED'],
  // 총괄 마커 — 단독으로는 표준 사유를 만들지 않고 세그먼트 신호에서 파생시킨다.
  HUMAN_REVIEW_REQUIRED: [],
};

/** SKIPPED 트랙(B) 원본 사유 → 표준 사유. */
const MAP_B = {
  FLAT_LIST_WITH_MULTIPLE_OFFICIAL_CLAUSE_GROUPS: ['OFFICIAL_GROUP_RESTART_AMBIGUOUS'],
  FLAT_LIST_WITH_MULTIPLE_OFFICIAL_INGREDIENTS: ['MULTI_INGREDIENT_FLAT_STRUCTURE'],
  INGREDIENT_CARD_NOT_FOUND: ['FUNCTION_CONTAINER_NOT_IDENTIFIABLE'],
  MISSING_CLAUSE_WITHOUT_INGREDIENT_LABEL: ['COMPOSITE_GROUP_BOUNDARY_UNCLEAR'],
  INSERT_CLAUSE_CARRIES_INLINE_LABEL: ['INGREDIENT_FUNCTION_BOUNDARY_UNCLEAR'],
  MULTIPLE_FUNCTIONAL_SECTIONS: ['CANONICAL_STRUCTURE_UNSAFE_TO_PATCH'],
  NO_FUNCTIONAL_SECTION: ['UNSUPPORTED_RENDERER_STRUCTURE', 'FUNCTION_CONTAINER_NOT_IDENTIFIABLE'],
  INSERT_CLAUSE_NO_FUNCTION_PREDICATE: ['SOURCE_CLAUSE_SEGMENTATION_UNCERTAIN'],
  INSERT_CLAUSE_MULTI_CLAUSE_SEGMENT: ['SOURCE_CLAUSE_SEGMENTATION_UNCERTAIN'],
  INSERT_CLAUSE_LEADING_PUNCTUATION: ['SOURCE_CLAUSE_SEGMENTATION_UNCERTAIN'],
  INSERT_CLAUSE_LANGUAGE_MARKER_PREFIX: ['ENGLISH_PARALLEL_AMBIGUOUS'],
  INSERT_CLAUSE_TOO_SHORT: ['SOURCE_CLAUSE_SEGMENTATION_UNCERTAIN'],
  PARTIAL_DUPLICATION_RISK: ['CANONICAL_STRUCTURE_UNSAFE_TO_PATCH'],
};

/** A 행의 proposedSegments 신호 → 표준 사유(총괄 마커만 있는 행의 실질 사유). */
function segmentDerivedReasons(item) {
  const out = new Set();
  for (const s of item.proposedSegments ?? []) {
    if (s.kind === 'UNRESOLVED') out.add('SOURCE_CLAUSE_SEGMENTATION_UNCERTAIN');
    else if (s.kind === 'ENGLISH_ONLY_REVIEW') out.add('ENGLISH_ONLY_FUNCTION');
    else if (s.kind === 'ENGLISH_PARALLEL') out.add('ENGLISH_PARALLEL_AMBIGUOUS');
    else if (s.kind === 'FORM_OR_INGREDIENT') {
      if (/콜론/.test(String(s.note ?? ''))) out.add('INGREDIENT_FUNCTION_BOUNDARY_UNCLEAR');
      else if (/4자 미만/.test(String(s.note ?? ''))) out.add('SOURCE_CLAUSE_SEGMENTATION_UNCERTAIN');
      else out.add('FORM_FUNCTION_BOUNDARY_UNCLEAR');
    } else if (s.kind === 'LABEL' && /대괄호/.test(String(s.note ?? ''))) out.add('MALFORMED_BRACKET');
  }
  return [...out];
}

/* ── §14 우선순위 ─────────────────────────────────────────────────────── */
const P1 = ['SOURCE_LINE_BREAK_FRAGMENTED', 'MALFORMED_BRACKET', 'INGREDIENT_FUNCTION_BOUNDARY_UNCLEAR', 'FORM_FUNCTION_BOUNDARY_UNCLEAR'];
const P2 = ['UNSUPPORTED_RENDERER_STRUCTURE', 'FUNCTION_CONTAINER_NOT_IDENTIFIABLE', 'CANONICAL_STRUCTURE_UNSAFE_TO_PATCH',
  'COMPOSITE_GROUP_BOUNDARY_UNCLEAR', 'OFFICIAL_GROUP_RESTART_AMBIGUOUS', 'MULTI_INGREDIENT_FLAT_STRUCTURE'];
const P3 = ['ENGLISH_ONLY_FUNCTION', 'ENGLISH_PARALLEL_AMBIGUOUS', 'SOURCE_CLAUSE_SEGMENTATION_UNCERTAIN', 'OTHER_REVIEW_REQUIRED'];
const priorityOf = (reasons) => (reasons.some((r) => P1.includes(r)) ? 1 : reasons.some((r) => P2.includes(r)) ? 2 : 3);

/* ── §12 대표 분류 우선순위 ───────────────────────────────────────────── */
const REP_ORDER = ['SOURCE_LINE_BREAK_FRAGMENTED', 'UNSUPPORTED_STRUCTURE', 'HUMAN_REVIEW_REQUIRED', 'V2_HUMAN_REVIEW'];

/* ── §15 권장 조치 ────────────────────────────────────────────────────── */
const ACTION_BY_REASON = {
  SOURCE_LINE_BREAK_FRAGMENTED: 'REVIEW_ORIGINAL_LINE_BREAK',
  MALFORMED_BRACKET: 'REVIEW_SOURCE_BOUNDARY',
  INGREDIENT_FUNCTION_BOUNDARY_UNCLEAR: 'REVIEW_SOURCE_BOUNDARY',
  FORM_FUNCTION_BOUNDARY_UNCLEAR: 'REVIEW_SOURCE_BOUNDARY',
  UNSUPPORTED_RENDERER_STRUCTURE: 'REVIEW_RENDERER_STRUCTURE',
  FUNCTION_CONTAINER_NOT_IDENTIFIABLE: 'REVIEW_RENDERER_STRUCTURE',
  CANONICAL_STRUCTURE_UNSAFE_TO_PATCH: 'REVIEW_CANONICAL_PATCH_LOCATION',
  COMPOSITE_GROUP_BOUNDARY_UNCLEAR: 'REVIEW_COMPOSITE_GROUPING',
  OFFICIAL_GROUP_RESTART_AMBIGUOUS: 'REVIEW_COMPOSITE_GROUPING',
  MULTI_INGREDIENT_FLAT_STRUCTURE: 'REVIEW_COMPOSITE_GROUPING',
  ENGLISH_ONLY_FUNCTION: 'REVIEW_ENGLISH_POLICY',
  ENGLISH_PARALLEL_AMBIGUOUS: 'REVIEW_ENGLISH_POLICY',
  SOURCE_CLAUSE_SEGMENTATION_UNCERTAIN: 'REVIEW_OFFICIAL_FUNCTION_COMPLETENESS',
  OTHER_REVIEW_REQUIRED: 'REVIEW_OFFICIAL_FUNCTION_COMPLETENESS',
};
const ACTION_ORDER = ['REVIEW_ORIGINAL_LINE_BREAK', 'REVIEW_SOURCE_BOUNDARY', 'REVIEW_RENDERER_STRUCTURE',
  'REVIEW_CANONICAL_PATCH_LOCATION', 'REVIEW_COMPOSITE_GROUPING', 'REVIEW_ENGLISH_POLICY', 'REVIEW_OFFICIAL_FUNCTION_COMPLETENESS'];

/* ── 후보 행 병합 (§11·§12) ───────────────────────────────────────────── */
const rows = new Map(); // candidateId -> merged row
const push = (candidateId, patch) => {
  const cur = rows.get(candidateId) ?? {
    candidateId, sourceSets: [], sourceClassifications: [], originalReviewReasons: [], sourceFiles: [],
  };
  for (const k of ['sourceSets', 'sourceClassifications', 'originalReviewReasons', 'sourceFiles']) {
    if (patch[k]) cur[k] = [...new Set([...cur[k], ...patch[k]])];
  }
  for (const [k, v] of Object.entries(patch)) {
    if (['sourceSets', 'sourceClassifications', 'originalReviewReasons', 'sourceFiles'].includes(k)) continue;
    if (cur[k] === undefined || cur[k] === null || cur[k] === '') cur[k] = v;
  }
  rows.set(candidateId, cur);
};

for (const it of A) {
  push(it.candidateId, {
    statementNo: it.statementNo, productName: it.productName,
    productMasterId: it.productMasterId ?? null, manifestCanonicalId: it.canonicalId ?? null,
    productionBucket: it.productionBucket,
    sourceMainFunction: it.sourceMainFunction ?? '',
    currentRenderedFunctions: it.currentRenderedFunctions ?? [],
    proposedSegments: it.proposedSegments ?? [],
    sourceSets: ['V2_HUMAN_REVIEW'],
    sourceClassifications: ['V2_HUMAN_REVIEW'],
    originalReviewReasons: it.reviewReasons ?? [],
    originalRecommendedAction: it.recommendedAction ?? null,
    sourceFiles: ['hff-ko-function-backfill-human-review-targets-v2.json'],
    aReviewIndex: it.reviewIndex ?? null,
  });
}
for (const it of B) {
  const d = bDiff.get(it.candidateId);
  push(it.candidateId, {
    statementNo: it.statementNo, productName: it.productName,
    productMasterId: d?.productMasterId ?? null, manifestCanonicalId: it.canonicalId ?? null,
    productionBucket: d?.productionBucket ?? 'SKIPPED_EXISTING',
    manifestRendererFamily: it.family ?? null,
    sourceSets: [it.applyStatus === 'UNSUPPORTED_STRUCTURE' ? 'SKIPPED_UNSUPPORTED_STRUCTURE' : 'SKIPPED_HUMAN_REVIEW'],
    sourceClassifications: [it.applyStatus === 'UNSUPPORTED_STRUCTURE' ? 'UNSUPPORTED_STRUCTURE' : 'HUMAN_REVIEW_REQUIRED'],
    originalReviewReasons: [it.reason].filter(Boolean),
    skippedMissingClauses: it.missingClauses ?? [],
    skippedSections: it.sections ?? [],
    sourceFiles: ['hff-ko-skipped-existing-2451-review-targets-v1.json'],
  });
}
for (const it of C) {
  push(it.candidateId, {
    sourceSets: ['SOURCE_LINE_BREAK_FRAGMENTED'],
    sourceClassifications: ['SOURCE_LINE_BREAK_FRAGMENTED'],
    originalReviewReasons: [FRAG],
    sourceFiles: ['hff-ko-function-clause-full-regression-v2.json'],
  });
}
for (const [cid, r] of rows) {
  const h = agent9By.get(cid);
  if (h) {
    r.sourceSets = [...new Set([...r.sourceSets, 'AGENT9_HOLD'])];
    r.agent9HoldPresent = true;
    r.agent9QueueIndex = h.queueIndex ?? null;
    r.agent9HoldReason = h.standardizedReason ?? h.originalHoldReason ?? null;
    r.sourceFiles = [...new Set([...r.sourceFiles, 'hff-ko-agent-09-hold-queue-v1.jsonl'])];
  } else {
    r.agent9HoldPresent = false; r.agent9QueueIndex = null; r.agent9HoldReason = null;
  }
}

/* ── §16 현재 DB 상태 read-only 재확인 ────────────────────────────────── */
const CANON = `description_type = 'STORE' AND status = 'canonical' AND coalesce(language, 'ko') = 'ko'
  AND deleted_at IS NULL AND source_type = 'o4o_hff_generated'`;
const client = new pg.Client({ host: '127.0.0.1', port: parseInt(process.env.PROXY_PORT ?? '5463', 10), user: 'o4o_api', password: process.env.PGPW, database: 'o4o_platform', ssl: false, statement_timeout: 900000 });
await client.connect();
await client.query('SET default_transaction_read_only = on');
const ro = (await client.query('SHOW transaction_read_only')).rows[0].transaction_read_only;
if (ro !== 'on') { console.error('READ_ONLY_ASSERTION_FAILED'); process.exit(2); }

const snapshot = async () => {
  const a = (await client.query(`
    SELECT count(*)::int hff_canonical, count(DISTINCT master_id)::int masters, count(DISTINCT source_ref_id)::int candidates,
           md5(string_agg(id::text || ':' || md5(content), ',' ORDER BY id)) corpus_md5,
           max(updated_at) max_updated_at
    FROM shared_product_descriptions WHERE ${CANON}`)).rows[0];
  const b = (await client.query(`
    SELECT count(*)::int store_ko_canonical FROM shared_product_descriptions
    WHERE description_type = 'STORE' AND status = 'canonical' AND coalesce(language, 'ko') = 'ko' AND deleted_at IS NULL`)).rows[0];
  const c = (await client.query(`
    SELECT count(*)::int candidates_total, count(*) FILTER (WHERE deleted_at IS NOT NULL)::int candidates_deleted
    FROM product_candidates`)).rows[0];
  return { ...a, ...b, ...c, maxUpdatedAt: a.max_updated_at };
};
let before;
try { before = await snapshot(); } catch (e) { console.error('SNAPSHOT_FAILED', e.message); process.exit(2); }

const ids = [...rows.keys()];
const stmts = [...new Set([...rows.values()].map((r) => r.statementNo).filter(Boolean))];

const candById = new Map();
for (let i = 0; i < ids.length; i += 1000) {
  const r = await client.query(`
    SELECT id, candidate_status AS status, deleted_at,
           raw_payload::jsonb->'source'->>'STTEMNT_NO' stmt,
           raw_payload::jsonb->'source'->>'MAIN_FNCTN' mainfnctn
    FROM product_candidates WHERE id = ANY($1)`, [ids.slice(i, i + 1000)]);
  for (const x of r.rows) candById.set(x.id, x);
}
const masterByPermit = new Map();
for (let i = 0; i < stmts.length; i += 1000) {
  const r = await client.query(`
    SELECT id, mfds_permit_number FROM product_masters
    WHERE mfds_permit_number = ANY($1)`, [stmts.slice(i, i + 1000)]);
  for (const x of r.rows) {
    if (!masterByPermit.has(x.mfds_permit_number)) masterByPermit.set(x.mfds_permit_number, []);
    masterByPermit.get(x.mfds_permit_number).push(x.id);
  }
}
const canonByCand = new Map();
for (let i = 0; i < ids.length; i += 500) {
  const r = await client.query(`
    SELECT id, master_id, source_type, source_ref_id, description_type, language, status,
           content, md5(content) content_md5, length(content) len, updated_at, created_at
    FROM shared_product_descriptions WHERE source_ref_id = ANY($1) AND ${CANON}`, [ids.slice(i, i + 500)]);
  for (const x of r.rows) canonByCand.set(x.source_ref_id, x);
}

/* ── §17 상태 분류 + family 판정 ──────────────────────────────────────── */
// renderer family 판정은 단일 클래스 문자열이 아니라 h2 시그널 집합으로 한다
// (sd-item·sd-tag·sd-meta 등은 두 family 에 공통 존재 — 2451 family audit 와 동일 원칙).
const DRIVER_H2 = ['주요 기능성', '섭취량 및 섭취방법 (공식 표기 그대로)', '섭취 시 참고사항', '확인 가능한 기준·규격 정보', '매장 전문가 문의 안내'];
const COMPOSITE_H2 = ['왜 이 제품인가', '섭취방법 (공식 표기 그대로)', '표시 기준', '이런 분께'];
const h2sOf = (content) => [...String(content ?? '').matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/g)].map((m) => htmlText(m[1]).trim());
const familyOf = (content) => {
  const h2 = h2sOf(content);
  const d = DRIVER_H2.filter((x) => h2.includes(x)).length;
  const c = COMPOSITE_H2.filter((x) => h2.includes(x)).length + (h2.some((x) => /기능성/.test(x)) ? 1 : 0);
  if (d > c) return 'DRIVER';
  if (c > d) return 'COMPOSITE';
  return 'OTHER_OR_UNKNOWN';
};
const famSsot = new Map(J('hff-ko-skipped-existing-2451-renderer-family-audit-v1.json').items.map((x) => [x.candidateId, x.family]));
const manifestAt = new Date(aDoc.generatedAt).getTime();
const bManifestAt = new Date(bDoc.generatedAt).getTime();

const anomalies = [];
const dbAudit = [];
for (const r of rows.values()) {
  const cand = candById.get(r.candidateId);
  const canon = canonByCand.get(r.candidateId);
  const masters = masterByPermit.get(r.statementNo) ?? [];
  const measuredFamily = canon ? familyOf(canon.content) : null;
  const ssotFamily = famSsot.get(r.candidateId) ?? null;
  const family = ssotFamily ?? measuredFamily;
  const originAt = r.sourceSets.includes('V2_HUMAN_REVIEW') ? manifestAt : bManifestAt;
  const changedAfterManifest = !!canon && new Date(canon.updated_at).getTime() > originAt;

  let state = 'READY_FOR_REVIEW';
  let stateReason = '원본 review manifest 이후 canonical 변경 없음';
  if (!cand || cand.deleted_at) { state = 'CANDIDATE_MISSING'; stateReason = cand ? 'candidate deleted_at 존재' : 'product_candidates 행 없음'; }
  else if (cand.stmt && r.statementNo && cand.stmt !== r.statementNo) { state = 'CANDIDATE_MISSING'; stateReason = `statementNo 불일치 (DB ${cand.stmt})`; }
  else if (!canon) { state = 'CANONICAL_MISSING'; stateReason = 'STORE/ko canonical(o4o_hff_generated) 행 없음'; }
  else if (r.productMasterId && canon.master_id !== r.productMasterId) { state = 'PRODUCT_MASTER_LINK_CHANGED'; stateReason = `canonical.master_id(${canon.master_id}) ≠ manifest productMasterId(${r.productMasterId})`; }
  else if (masters.length && !masters.includes(canon.master_id)) { state = 'PRODUCT_MASTER_LINK_CHANGED'; stateReason = `mfds_permit_number 기준 master(${masters.join(',')}) 와 canonical.master_id(${canon.master_id}) 불일치`; }
  else if (changedAfterManifest) {
    // §17 — 변경된 경우에만 기능성 문제 재현 여부를 확인한다(자동 큐 제거는 하지 않는다).
    let reproduces = true; let analysis = null;
    try {
      const a = analyzeTarget({ content: canon.content, mainFnctn: cand.mainfnctn, family: family === 'DRIVER' ? 'DRIVER' : 'COMPOSITE' });
      analysis = { classification: a.classification, reason: a.reason };
      reproduces = a.classification !== 'FUNCTION_COMPLETE';
    } catch (e) { analysis = { error: String(e?.message ?? e) }; }
    if (reproduces) { state = 'STALE_CANONICAL_CHANGED'; stateReason = `canonical 변경됨 · 기능성 문제 재현(${analysis?.classification ?? analysis?.error})`; }
    else { state = 'ALREADY_RESOLVED'; stateReason = 'canonical 변경 후 공식 기능성 절 전량 존재 — 문제 미재현'; }
    r.reproductionAnalysis = analysis;
  }

  if (ssotFamily && measuredFamily && ssotFamily !== measuredFamily) {
    anomalies.push({ kind: 'RENDERER_FAMILY_MISMATCH_VS_SSOT', candidateId: r.candidateId, familyAuditSsot: ssotFamily, measured: measuredFamily });
  }
  if (r.manifestRendererFamily && family && r.manifestRendererFamily !== family) {
    anomalies.push({ kind: 'RENDERER_FAMILY_MISMATCH_VS_MANIFEST', candidateId: r.candidateId, manifest: r.manifestRendererFamily, resolved: family });
  }
  if (canon && r.manifestCanonicalId && canon.id !== r.manifestCanonicalId) {
    anomalies.push({ kind: 'CANONICAL_ID_CHANGED', candidateId: r.candidateId, manifest: r.manifestCanonicalId, measured: canon.id });
  }
  if (cand && !cand.mainfnctn) anomalies.push({ kind: 'OFFICIAL_MAIN_FNCTN_EMPTY', candidateId: r.candidateId, statementNo: r.statementNo });
  if (masters.length > 1) anomalies.push({ kind: 'MULTIPLE_MASTERS_FOR_PERMIT', candidateId: r.candidateId, statementNo: r.statementNo, masters });

  r.db = {
    candidateExists: !!cand && !cand.deleted_at,
    candidateStatus: cand?.status ?? null,
    statementNoMatch: !!cand && cand.stmt === r.statementNo,
    dbStatementNo: cand?.stmt ?? null,
    officialMainFunction: cand?.mainfnctn ?? null,
    masterIdsForPermit: masters,
    canonicalId: canon?.id ?? null,
    canonicalMasterId: canon?.master_id ?? null,
    sourceType: canon?.source_type ?? null,
    sourceRefId: canon?.source_ref_id ?? null,
    descriptionType: canon?.description_type ?? null,
    language: canon?.language ?? null,
    status: canon?.status ?? null,
    contentSha256: canon ? sha(canon.content) : null,
    contentMd5: canon?.content_md5 ?? null,
    contentLength: canon?.len ?? null,
    updatedAt: canon?.updated_at ?? null,
    createdAt: canon?.created_at ?? null,
    rendererFamily: family,
    rendererFamilyMeasured: measuredFamily,
    rendererFamilySource: ssotFamily ? 'FAMILY_AUDIT_SSOT' : 'MEASURED_H2_SIGNALS',
    changedAfterSourceManifest: changedAfterManifest,
  };
  r.currentState = state;
  r.currentStateReason = stateReason;
  // B 트랙 행은 원본 파일에 렌더 기능성 목록이 없으므로 현재 canonical 에서 실측한다.
  if ((!r.currentRenderedFunctions || r.currentRenderedFunctions.length === 0) && canon) {
    try {
      r.currentRenderedFunctions = findFunctionalSections(canon.content)
        .flatMap((s) => (s.mode === 'PER_INGREDIENT' ? s.ingredients.flatMap((g) => g.items) : s.items))
        .map((x) => htmlText(x).trim()).filter(Boolean);
    } catch { r.currentRenderedFunctions = []; }
  }
  if ((!r.sourceMainFunction || !r.sourceMainFunction.length) && cand?.mainfnctn) r.sourceMainFunction = cand.mainfnctn;
  if ((!r.proposedSegments || r.proposedSegments.length === 0) && r.skippedMissingClauses?.length) {
    r.proposedSegments = r.skippedMissingClauses.map((m) => ({
      kind: 'FUNCTION_KO', confidence: 'HIGH',
      note: m.header ? `공식 원문 누락 절(원료 ${m.header})` : '공식 원문 누락 절',
      text: m.clause,
    }));
  }
  dbAudit.push({ candidateId: r.candidateId, statementNo: r.statementNo, productName: r.productName, currentState: state, currentStateReason: stateReason, ...r.db, officialMainFunction: undefined });
}
let after;
try { after = await snapshot(); } catch (e) { console.error('SNAPSHOT_FAILED', e.message); process.exit(2); }
await client.end();

/* ── §13 사유 표준화 / §14 우선순위 / §15 권장 조치 ───────────────────── */
const unmapped = new Set();
for (const r of rows.values()) {
  const std = new Set();
  for (const o of r.originalReviewReasons) {
    const m = MAP_A[o] ?? MAP_B[o];
    if (m === undefined) { unmapped.add(o); continue; }
    for (const s of m) std.add(s);
  }
  if (r.sourceSets.includes('V2_HUMAN_REVIEW')) for (const s of segmentDerivedReasons({ proposedSegments: r.proposedSegments })) std.add(s);
  if (r.currentState === 'CANONICAL_MISSING' || r.db.rendererFamily === 'OTHER_OR_UNKNOWN') std.add('UNSUPPORTED_RENDERER_STRUCTURE');
  if (std.size === 0) std.add('OTHER_REVIEW_REQUIRED');

  r.standardizedReviewReasons = [...std].sort((a, b) => STD.indexOf(a) - STD.indexOf(b));
  r.priority = priorityOf(r.standardizedReviewReasons);
  r.representativeClassification = REP_ORDER.find((c) => r.sourceClassifications.includes(c)) ?? r.sourceClassifications[0];
  r.recommendedAction = r.agent9HoldPresent
    ? 'CROSS_CHECK_AGENT9_HOLD'
    : ACTION_ORDER.find((a) => r.standardizedReviewReasons.some((s) => ACTION_BY_REASON[s] === a)) ?? 'REVIEW_OFFICIAL_FUNCTION_COMPLETENESS';
}
if (unmapped.size) anomalies.push({ kind: 'UNMAPPED_ORIGINAL_REASON', reasons: [...unmapped] });

/* ── §19 stale·resolved 분리 / §20 정렬 ───────────────────────────────── */
const SPLIT_OUT = ['CANDIDATE_MISSING', 'PRODUCT_MASTER_LINK_CHANGED', 'CANONICAL_MISSING', 'ALREADY_RESOLVED'];
const BUCKET_ORDER = { CREATED: 0, SKIPPED_EXISTING: 1, HOLD_FOR_AGENT_9: 2, OTHER: 3 };
const all = [...rows.values()];
const queueRows = all.filter((r) => !SPLIT_OUT.includes(r.currentState));
const splitRows = all.filter((r) => SPLIT_OUT.includes(r.currentState));

const stmtTally = tally(queueRows, (r) => r.statementNo);
for (const [s, n] of Object.entries(stmtTally)) if (n > 1) anomalies.push({ kind: 'DUPLICATE_STATEMENT_NO_IN_QUEUE', statementNo: s, count: n, candidateIds: queueRows.filter((r) => r.statementNo === s).map((r) => r.candidateId) });

const cmp = (a, b) => a.priority - b.priority
  || (BUCKET_ORDER[a.productionBucket] ?? 3) - (BUCKET_ORDER[b.productionBucket] ?? 3)
  || String(a.statementNo).localeCompare(String(b.statementNo))
  || String(a.candidateId).localeCompare(String(b.candidateId));
queueRows.sort(cmp);

const emit = (r, i) => ({
  queueIndex: i + 1,
  priority: r.priority,
  candidateId: r.candidateId,
  statementNo: r.statementNo,
  productName: r.productName,
  productMasterId: r.productMasterId ?? r.db.canonicalMasterId ?? null,
  canonicalId: r.db.canonicalId ?? r.manifestCanonicalId ?? null,
  productionBucket: r.productionBucket,
  rendererFamily: r.db.rendererFamily,
  sourceType: r.db.sourceType,
  sourceRefId: r.db.sourceRefId,
  canonicalContentHash: r.db.contentSha256,
  canonicalContentLength: r.db.contentLength,
  canonicalUpdatedAt: r.db.updatedAt,
  sourceSets: r.sourceSets,
  sourceClassifications: r.sourceClassifications,
  representativeClassification: r.representativeClassification,
  originalReviewReasons: r.originalReviewReasons,
  standardizedReviewReasons: r.standardizedReviewReasons,
  originalRecommendedAction: r.originalRecommendedAction ?? null,
  recommendedAction: r.recommendedAction,
  sourceMainFunction: r.sourceMainFunction ?? '',
  currentRenderedFunctions: r.currentRenderedFunctions ?? [],
  proposedSegments: r.proposedSegments ?? [],
  skippedMissingClauses: r.skippedMissingClauses ?? [],
  functionReviewRequired: true,
  agent9HoldPresent: r.agent9HoldPresent,
  agent9QueueIndex: r.agent9QueueIndex,
  agent9HoldReason: r.agent9HoldReason,
  currentState: r.currentState,
  currentStateReason: r.currentStateReason,
  manifestCanonicalId: r.manifestCanonicalId ?? null,
  canonicalHashChangedSinceManifest: r.db.changedAfterSourceManifest,
  reviewStatus: 'PENDING',
  reviewDecision: null,
  reviewNotes: '',
  sourceFiles: r.sourceFiles,
});

const queue = queueRows.map(emit);
fs.writeFileSync(`${DATA}/hff-ko-function-human-review-queue-v1.jsonl`, queue.map((q) => JSON.stringify(q)).join('\n') + (queue.length ? '\n' : ''));

splitRows.sort(cmp);
const split = splitRows.map((r, i) => ({ ...emit(r, i), reviewStatus: r.currentState === 'ALREADY_RESOLVED' ? 'RESOLVED_NO_CHANGE' : 'BLOCKED_SOURCE_DATA', splitReason: r.currentState, reproductionAnalysis: r.reproductionAnalysis ?? null }));
fs.writeFileSync(`${DATA}/hff-ko-function-human-review-stale-resolved-v1.jsonl`, split.map((q) => JSON.stringify(q)).join('\n') + (split.length ? '\n' : ''));

/* ── 산출물 ───────────────────────────────────────────────────────────── */
fs.writeFileSync(`${DATA}/hff-ko-function-human-review-reason-normalization-v1.json`, JSON.stringify({
  workOrder: WO,
  contract: '§13~§15 — 원본 사유 보존 + 표준 어휘 병기. 원본 사유를 덮어쓰지 않는다.',
  generatedAt: new Date().toISOString(),
  standardVocabulary: STD,
  mappingA: MAP_A, mappingB: MAP_B,
  segmentSignalRule: 'A 트랙의 총괄 마커(HUMAN_REVIEW_REQUIRED)만 있는 행은 proposedSegments 신호에서 실질 사유를 파생시킨다.',
  priorityGroups: { P1, P2, P3 },
  actionByReason: ACTION_BY_REASON,
  representativeOrder: REP_ORDER,
  originalReasonTally: tally(all, (r) => r.originalReviewReasons),
  standardizedReasonTally: tally(all, (r) => r.standardizedReviewReasons),
  recommendedActionTally: tally(all, (r) => r.recommendedAction),
  originalRecommendedActionTally: tally(all, (r) => r.originalRecommendedAction ?? 'NONE'),
  unmappedOriginalReasons: [...unmapped],
}, null, 1));

fs.writeFileSync(`${DATA}/hff-ko-function-human-review-current-db-audit-v1.json`, JSON.stringify({
  workOrder: WO,
  contract: '§16·§17 — 최종 고유 후보 전량의 candidate·ProductMaster·canonical 현재 상태 read-only 재확인.',
  generatedAt: new Date().toISOString(),
  dbWrite: 0, transactionReadOnly: ro,
  rowsAudited: dbAudit.length,
  stateTally: tally(dbAudit, (r) => r.currentState),
  familyTally: tally(dbAudit, (r) => String(r.rendererFamily)),
  items: dbAudit,
}, null, 1));

const summary = {
  workOrder: WO,
  contract: '§18~§20 — FINAL_FUNCTION_REVIEW_QUEUE = A ∪ B ∪ C. 판정 실행 0 · DB write 0.',
  generatedAt: new Date().toISOString(),
  baseCommit: '55c99593f',
  sets: { A: A.length, B: B.length, C: C.length, D_agent9: agent9.length },
  intersections: overlap.intersections,
  finalUnique: rows.size,
  queueTotal: queue.length,
  splitTotal: split.length,
  byPriority: tally(queue, (r) => r.priority),
  byBucket: tally(queue, (r) => r.productionBucket),
  bySourceSet: tally(queue, (r) => r.sourceSets),
  byRepresentativeClassification: tally(queue, (r) => r.representativeClassification),
  byStandardizedReason: tally(queue, (r) => r.standardizedReviewReasons),
  byRecommendedAction: tally(queue, (r) => r.recommendedAction),
  byRendererFamily: tally(queue, (r) => String(r.rendererFamily)),
  byCurrentState: tally(queue, (r) => r.currentState),
  splitByState: tally(split, (r) => r.currentState),
  reviewStatusTally: tally(queue, (r) => r.reviewStatus),
  agent9Intersection: queue.filter((r) => r.agent9HoldPresent).length,
  duplicateCandidateId: queue.length - new Set(queue.map((r) => r.candidateId)).size,
  duplicateStatementNo: queue.length - new Set(queue.map((r) => r.statementNo)).size,
  sortContract: 'priority ASC → productionBucket(CREATED→SKIPPED_EXISTING→HOLD_FOR_AGENT_9→OTHER) → statementNo ASC → candidateId ASC',
  reviewStatusVocabulary: ['PENDING', 'IN_REVIEW', 'RESOLVED_NO_CHANGE', 'RESOLVED_UPDATED', 'BLOCKED_SOURCE_DATA', 'BLOCKED_STRUCTURE', 'FAILED_SYSTEM'],
  anomalyCount: anomalies.length,
  files: {
    queue: `${DATA}/hff-ko-function-human-review-queue-v1.jsonl`,
    staleResolved: `${DATA}/hff-ko-function-human-review-stale-resolved-v1.jsonl`,
    anomalies: `${DATA}/hff-ko-function-human-review-anomalies-v1.json`,
  },
};
fs.writeFileSync(`${DATA}/hff-ko-function-human-review-queue-summary-v1.json`, JSON.stringify(summary, null, 1));

fs.writeFileSync(`${DATA}/hff-ko-function-human-review-anomalies-v1.json`, JSON.stringify({
  workOrder: WO,
  contract: '§20 — 임의 제거하지 않고 기록만 한다. 0건이어도 빈 배열을 명시적으로 생성한다.',
  generatedAt: new Date().toISOString(),
  count: anomalies.length,
  byKind: tally(anomalies, (a) => a.kind),
  items: anomalies,
}, null, 1));

const agent9ShaAfter = fileSha('hff-ko-agent-09-hold-queue-v1.jsonl');
const dbChecks = [];
const addDb = (name, ok, evidence) => dbChecks.push({ name, ok, evidence });
addDb('TRANSACTION_READ_ONLY', ro === 'on', { transactionReadOnly: ro });
addDb('HFF_CANONICAL_TOTAL_UNCHANGED', before.hff_canonical === after.hff_canonical, { before: before.hff_canonical, after: after.hff_canonical });
addDb('STORE_KO_CANONICAL_TOTAL_UNCHANGED', before.store_ko_canonical === after.store_ko_canonical, { before: before.store_ko_canonical, after: after.store_ko_canonical });
addDb('CORPUS_HASH_UNCHANGED', before.corpus_md5 === after.corpus_md5, { before: before.corpus_md5, after: after.corpus_md5 });
addDb('MASTER_LINK_COUNT_UNCHANGED', before.masters === after.masters && before.candidates === after.candidates, { before: { masters: before.masters, candidates: before.candidates }, after: { masters: after.masters, candidates: after.candidates } });
addDb('CANDIDATE_TABLE_UNCHANGED', before.candidates_total === after.candidates_total && before.candidates_deleted === after.candidates_deleted, { before: { total: before.candidates_total, deleted: before.candidates_deleted }, after: { total: after.candidates_total, deleted: after.candidates_deleted } });
addDb('MAX_UPDATED_AT_UNCHANGED', String(before.maxUpdatedAt) === String(after.maxUpdatedAt), { before: before.maxUpdatedAt, after: after.maxUpdatedAt });
addDb('AGENT9_QUEUE_FILE_UNCHANGED', AGENT9_SHA_BEFORE === agent9ShaAfter, { before: AGENT9_SHA_BEFORE, after: agent9ShaAfter });

fs.writeFileSync(`${DATA}/hff-ko-function-human-review-db-unchanged-v1.json`, JSON.stringify({
  workOrder: WO,
  contract: '§23 — DB write 0 증명. BEFORE == AFTER, INSERT/UPDATE/DELETE = 0.',
  generatedAt: new Date().toISOString(),
  before, after,
  diff: Object.keys(before).filter((k) => String(before[k]) !== String(after[k])),
  writes: { insert: 0, update: 0, delete: 0 },
  checks: dbChecks,
  verdict: dbChecks.every((c) => c.ok) ? 'PASS' : 'STOP',
}, null, 1));

const verdict = dbChecks.every((c) => c.ok) && summary.duplicateCandidateId === 0 && unmapped.size === 0 ? 'PASS' : 'STOP';
console.log(JSON.stringify({
  finalUnique: rows.size, queueTotal: queue.length, splitTotal: split.length,
  byPriority: summary.byPriority, byBucket: summary.byBucket, byCurrentState: summary.byCurrentState,
  splitByState: summary.splitByState, agent9Intersection: summary.agent9Intersection,
  anomalies: anomalies.length, unmapped: [...unmapped],
  dbFailed: dbChecks.filter((c) => !c.ok).map((c) => c.name), verdict,
}, null, 1));
if (verdict !== 'PASS') process.exit(2);
