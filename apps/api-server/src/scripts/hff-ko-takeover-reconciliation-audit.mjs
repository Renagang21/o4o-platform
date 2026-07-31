/**
 * HFF ko 인수인계 정합 감사 (read-only, DB write 0)
 *
 * 다른 작업공간에서 진행된 후속 WO(01a3cf5db / 45794fa8b / 16c50886e / a0a5175e3 / 9d02795b7)의
 * 처리 결과를 원본 사람 검토 큐(3,858) 및 현재 DB 와 대조해 실제 잔여 모집단을 확정한다.
 * 어떤 파일도 수정하지 않고, DB 는 read-only 세션으로만 조회한다.
 */
import pg from 'pg';
import fs from 'node:fs';

const DATA = 'apps/api-server/src/scripts/data';
const J = (f) => JSON.parse(fs.readFileSync(`${DATA}/${f}`, 'utf8'));
const L = (f) => fs.readFileSync(`${DATA}/${f}`, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
const t = (arr, fn) => arr.reduce((a, x) => { for (const k of [].concat(fn(x))) a[String(k)] = (a[String(k)] ?? 0) + 1; return a; }, {});
const out = {};

/* ── 1. 원본 큐 및 후속 처리 결과 ─────────────────────────────────────── */
const queue = L('hff-ko-function-human-review-queue-v1.jsonl');
const pilot47 = L('hff-ko-function-review-pilot-47-queue-delta-v1.jsonl');
const wf825 = L('hff-ko-why-family-825-review-queue-delta-v1.jsonl');
const wf525 = L('hff-ko-why-family-525-review-queue-delta-v1.jsonl');
const remain13 = L('hff-ko-why-family-policy-cleanup-human-review-v1.jsonl');
const dec14 = J('hff-ko-why-family-remaining-14-decisions-v1.json');
const agent9 = L('hff-ko-agent-09-hold-queue-v1.jsonl');

const idOf = (r) => r.candidateId ?? r.candidate_id ?? null;
const canonOf = (r) => r.canonicalId ?? r.canonical_id ?? null;

out.inventory = {
  originalQueue: queue.length,
  pilot47Delta: pilot47.length,
  whyFamily825Delta: wf825.length,
  whyFamily525Delta: wf525.length,
  policyCleanupHumanReview: remain13.length,
  remaining14Decisions: (dec14.decisions ?? []).length,
  agent9Hold: agent9.length,
};
// 후속 WO delta 의 상태 필드는 proposedReviewStatus (reviewStatus/status 가 아니다)
const stOf = (r) => r.proposedReviewStatus ?? r.reviewStatus ?? r.status ?? 'UNKNOWN';
out.deltaStatusTally = {
  pilot47: t(pilot47, stOf),
  whyFamily825: t(wf825, stOf),
  whyFamily525: t(wf525, stOf),
};
out.deltaCanonicalUpdated = {
  pilot47: pilot47.filter((r) => r.canonicalUpdated === true).length,
  whyFamily825: wf825.filter((r) => r.canonicalUpdated === true).length,
  whyFamily525: wf525.filter((r) => r.canonicalUpdated === true).length,
};

/* ── 2. 원본 큐 ↔ 후속 처리 교집합 ────────────────────────────────────── */
const qById = new Map(queue.map((r) => [r.candidateId, r]));
const qByCanon = new Map(queue.filter((r) => r.canonicalId).map((r) => [r.canonicalId, r]));
const resolvedIds = new Set();
const resolvedCanon = new Set();
const noteResolved = (rows) => {
  for (const r of rows) {
    if (String(stOf(r)).startsWith('RESOLVED')) { const i = idOf(r); const c = canonOf(r); if (i) resolvedIds.add(i); if (c) resolvedCanon.add(c); }
  }
};
noteResolved(pilot47); noteResolved(wf825); noteResolved(wf525);

// 후속 WO 에서 여전히 미해결(PENDING/BLOCKED)로 남은 대상
const stillPending = new Set();
for (const r of [...pilot47, ...wf825, ...wf525]) {
  if (!String(stOf(r)).startsWith('RESOLVED')) { const i = idOf(r); if (i) stillPending.add(i); }
}
out.deltaStillPending = {
  uniqueCandidateIds: stillPending.size,
  alsoInOriginalQueue: [...stillPending].filter((x) => qById.has(x)).length,
};

const hit = (rows, label) => {
  const ids = rows.map(idOf).filter(Boolean);
  const canons = rows.map(canonOf).filter(Boolean);
  return {
    label, rows: rows.length,
    byCandidateId: ids.filter((x) => qById.has(x)).length,
    byCanonicalId: canons.filter((x) => qByCanon.has(x)).length,
    candidateIdPresent: ids.length, canonicalIdPresent: canons.length,
  };
};
out.overlapWithOriginalQueue = [
  hit(pilot47, 'pilot-47 delta'),
  hit(wf825, 'why-family 825 delta'),
  hit(wf525, 'why-family 525 delta'),
  hit(remain13, 'policy-cleanup 잔여 13'),
  hit((dec14.decisions ?? []), 'remaining-14 decisions'),
  hit(agent9, 'Agent 9 HOLD 348'),
];
out.resolvedFromOriginalQueue = {
  resolvedCandidateIds: resolvedIds.size,
  resolvedCanonicalIds: resolvedCanon.size,
  originalQueueRowsNowResolved: queue.filter((r) => resolvedIds.has(r.candidateId) || (r.canonicalId && resolvedCanon.has(r.canonicalId))).length,
};
out.originalQueueRemainingByReason = t(
  queue.filter((r) => !resolvedIds.has(r.candidateId) && !(r.canonicalId && resolvedCanon.has(r.canonicalId))),
  (r) => r.standardizedReviewReasons,
);
const focus = ['UNSUPPORTED_RENDERER_STRUCTURE', 'FUNCTION_CONTAINER_NOT_IDENTIFIABLE', 'CANONICAL_STRUCTURE_UNSAFE_TO_PATCH'];
out.focusReasonRows = Object.fromEntries(focus.map((f) => [f, queue.filter((r) => r.standardizedReviewReasons.includes(f)).length]));

/* ── 3. 현재 DB 실측 (read-only) ──────────────────────────────────────── */
const HFF = `description_type = 'STORE' AND status = 'canonical' AND deleted_at IS NULL AND source_type = 'o4o_hff_generated'`;
const KO = `${HFF} AND coalesce(language, 'ko') = 'ko'`;
const c = new pg.Client({ host: '127.0.0.1', port: parseInt(process.env.PROXY_PORT ?? '5463', 10), user: 'o4o_api', password: process.env.PGPW, database: 'o4o_platform', statement_timeout: 900000 });
await c.connect();
await c.query('SET default_transaction_read_only = on');
out.transactionReadOnly = (await c.query('SHOW transaction_read_only')).rows[0].transaction_read_only;

const one = async (sql, params) => (await c.query(sql, params)).rows[0];
out.dbNow = {
  hffKoCanonical: (await one(`SELECT count(*)::int n FROM shared_product_descriptions WHERE ${KO}`)).n,
  hffAllLanguages: (await c.query(`SELECT coalesce(language,'ko') lang, count(*)::int n FROM shared_product_descriptions WHERE ${HFF} GROUP BY 1 ORDER BY 2 DESC`)).rows,
  koWithFunctionHeading: (await one(`SELECT count(*)::int n FROM shared_product_descriptions WHERE ${KO} AND content ~ '<h2>[^<]*기능성[^<]*</h2>'`)).n,
  koWithoutFunctionHeading: (await one(`SELECT count(*)::int n FROM shared_product_descriptions WHERE ${KO} AND content !~ '<h2>[^<]*기능성[^<]*</h2>'`)).n,
  koWhyFamily: (await one(`SELECT count(*)::int n FROM shared_product_descriptions WHERE ${KO} AND content LIKE '%왜 이 제품인가%'`)).n,
  koNonWhyFamily: (await one(`SELECT count(*)::int n FROM shared_product_descriptions WHERE ${KO} AND content NOT LIKE '%왜 이 제품인가%'`)).n,
  koIreonBunkke: (await one(`SELECT count(*)::int n FROM shared_product_descriptions WHERE ${KO} AND content LIKE '%이런 분께%'`)).n,
  koExpertFooterMissing: (await one(`SELECT count(*)::int n FROM shared_product_descriptions WHERE ${KO} AND content NOT LIKE '%매장 내 약사 등 전문가%'`)).n,
  koSdFunc: (await one(`SELECT count(*)::int n FROM shared_product_descriptions WHERE ${KO} AND content LIKE '%sd-func%'`)).n,
  enTotal: (await one(`SELECT count(*)::int n FROM shared_product_descriptions WHERE ${HFF} AND language = 'en'`)).n,
  enSdFunc: (await one(`SELECT count(*)::int n FROM shared_product_descriptions WHERE ${HFF} AND language = 'en' AND content LIKE '%sd-func%'`)).n,
  enWithFunctionHeading: (await one(`SELECT count(*)::int n FROM shared_product_descriptions WHERE ${HFF} AND language = 'en' AND content ~* '<h2>[^<]*(기능성|function)[^<]*</h2>'`)).n,
  enIreonBunkkeEquivalent: (await c.query(`
    SELECT count(*) FILTER (WHERE content ILIKE '%sd-who%')::int sd_who,
           count(*) FILTER (WHERE content ILIKE '%Who%is%for%')::int who_heading
    FROM shared_product_descriptions WHERE ${HFF} AND language = 'en'`)).rows[0],
};

// 비-왜-family 127 실체 확인
out.nonWhyFamily = (await c.query(`
  SELECT count(*)::int n,
         count(*) FILTER (WHERE content LIKE '%이런 분께%')::int with_aud,
         count(*) FILTER (WHERE content NOT LIKE '%매장 내 약사 등 전문가%')::int no_expert,
         count(*) FILTER (WHERE content ~ '<h2>[^<]*기능성[^<]*</h2>')::int with_function,
         count(*) FILTER (WHERE content LIKE '%sd-item%')::int sd_item,
         count(*) FILTER (WHERE content LIKE '%sd-func%')::int sd_func
  FROM shared_product_descriptions WHERE ${KO} AND content NOT LIKE '%왜 이 제품인가%'`)).rows[0];
out.nonWhyFamilyH2 = (await c.query(`
  SELECT h2, count(*)::int n FROM (
    SELECT (regexp_matches(content, '<h2[^>]*>([^<]*)</h2>', 'g'))[1] h2
    FROM shared_product_descriptions WHERE ${KO} AND content NOT LIKE '%왜 이 제품인가%'
  ) s GROUP BY 1 ORDER BY 2 DESC LIMIT 20`)).rows;

// ko/en 쌍 대조
out.koEnPairing = (await c.query(`
  SELECT count(*)::int ko_total,
         count(*) FILTER (WHERE e.id IS NOT NULL)::int with_en_pair
  FROM shared_product_descriptions k
  LEFT JOIN shared_product_descriptions e
    ON e.master_id = k.master_id AND e.language = 'en' AND e.description_type = 'STORE'
   AND e.status = 'canonical' AND e.deleted_at IS NULL AND e.source_type = 'o4o_hff_generated'
  WHERE ${KO.replace(/\bcontent\b/g, 'k.content').replace(/description_type/g, 'k.description_type').replace(/\bstatus\b/g, 'k.status').replace(/deleted_at/g, 'k.deleted_at').replace(/source_type/g, 'k.source_type').replace(/\blanguage\b/g, 'k.language')}`)).rows[0];

// 잔여 13 / 127 이 실제로 DB 에서 재현되는지
const rem13Canon = remain13.map(canonOf).filter(Boolean);
if (rem13Canon.length) {
  out.remaining13Verify = (await c.query(`
    SELECT count(*)::int found,
           count(*) FILTER (WHERE content !~ '<h2>[^<]*기능성[^<]*</h2>')::int still_missing_function
    FROM shared_product_descriptions WHERE id = ANY($1) AND ${KO}`, [rem13Canon])).rows[0];
}
await c.end();

fs.writeFileSync(`${DATA}/hff-ko-takeover-reconciliation-audit-v1.json`, JSON.stringify({
  purpose: 'HFF ko 인수인계 정합 감사 — 원본 사람 검토 큐 3,858 ↔ 후속 WO 처리 결과 ↔ 현재 DB. read-only, DB write 0.',
  generatedAt: new Date().toISOString(),
  headCommit: '1bb21bd35',
  ...out,
}, null, 1));
console.log(JSON.stringify(out, null, 1));
