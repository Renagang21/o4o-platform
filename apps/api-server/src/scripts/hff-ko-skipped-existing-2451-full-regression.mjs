/**
 * WO-O4O-HFF-KO-SKIPPED-EXISTING-2451-FUNCTION-CANONICAL-BACKFILL-V1  §19
 *
 * 전체 41,261 모집단 보호 회귀 (DB write 0).
 *   - 모집단·버킷 재실측: CREATED 25,074 / SKIPPED_EXISTING 15,839 / HOLD 348.
 *   - SAFE 대상이 이번 WO 범위(SKIPPED_EXISTING 2,451) 안에만 있고
 *     CREATED-5269 · 사람검토-3652 · HOLD-348 과 교집합 0 임을 증명한다.
 *   - HFF STORE/ko canonical 전량의 md5 baseline 을 **서버측에서 집계**해
 *     apply 전 스냅샷을 남긴다(사후 감사에서 SAFE 대상 외 무변경 증명용).
 * read-only.
 *
 * 산출물: data/hff-ko-skipped-existing-2451-full-regression-v1.json
 */
import pg from 'pg';
import fs from 'node:fs';

const DATA = 'apps/api-server/src/scripts/data';
const WO = 'WO-O4O-HFF-KO-SKIPPED-EXISTING-2451-FUNCTION-CANONICAL-BACKFILL-V1';
const J = (f) => JSON.parse(fs.readFileSync(`${DATA}/${f}`, 'utf8'));

const diff = J('hff-ko-skipped-existing-2451-function-diff-v1.json');
const safe = J('hff-ko-skipped-existing-2451-safe-targets-v1.json');
const created5269 = J('hff-ko-function-backfill-created-safe-targets-v2.json').items;
const review3652 = J('hff-ko-function-backfill-human-review-targets-v2.json').items;
const hold348 = fs.readFileSync(`${DATA}/hff-ko-agent-09-hold-queue-v1.jsonl`, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
const skippedSafe2451 = J('hff-ko-function-backfill-skipped-existing-safe-targets-v2.json').items;

const client = new pg.Client({ host: '127.0.0.1', port: parseInt(process.env.PROXY_PORT ?? '5463', 10), user: 'o4o_api', password: process.env.PGPW, database: 'o4o_platform', ssl: false, statement_timeout: 900000 });
await client.connect();
await client.query('SET default_transaction_read_only = on');
const ro = (await client.query('SHOW transaction_read_only')).rows[0].transaction_read_only;
if (ro !== 'on') { console.error('READ_ONLY_ASSERTION_FAILED'); process.exit(2); }

/* 1) HFF canonical 모집단 실측 */
const CANON = `description_type = 'STORE' AND status = 'canonical' AND coalesce(language, 'ko') = 'ko'
  AND deleted_at IS NULL AND source_type = 'o4o_hff_generated'`;
const pop = (await client.query(`
  SELECT count(*)::int AS canonical_total,
         count(DISTINCT master_id)::int AS distinct_masters,
         count(DISTINCT source_ref_id)::int AS distinct_candidates
  FROM shared_product_descriptions WHERE ${CANON}`)).rows[0];

/* 2) 전체 corpus md5 baseline — content 를 클라이언트로 끌어오지 않는다 */
const corpusHash = (await client.query(`
  SELECT md5(string_agg(id::text || ':' || md5(content), ',' ORDER BY id)) AS corpus_md5,
         count(*)::int AS rows,
         sum(length(content))::bigint AS total_bytes
  FROM shared_product_descriptions WHERE ${CANON}`)).rows[0];

/* 3) SAFE 대상의 현재 상태 재확인 */
const safeIds = safe.items.map((x) => x.canonicalId);
const safeRows = (await client.query(`
  SELECT id, master_id, source_ref_id, md5(content) AS content_md5, length(content) AS len, updated_at
  FROM shared_product_descriptions WHERE id = ANY($1) AND ${CANON}`, [safeIds])).rows;

/* 4) SAFE 대상 외 무변경 감시용 — 2,451 전체의 md5 스냅샷 */
const allIds = diff.items.map((x) => x.canonicalId);
const snapshot = [];
for (let i = 0; i < allIds.length; i += 1000) {
  const r = await client.query(`
    SELECT id, md5(content) AS content_md5, length(content) AS len, updated_at
    FROM shared_product_descriptions WHERE id = ANY($1)`, [allIds.slice(i, i + 1000)]);
  snapshot.push(...r.rows);
}
await client.end();

/* ── 교집합 / 범위 판정 ───────────────────────────────────────────────── */
const setOf = (arr, k) => new Set(arr.map((x) => x[k]).filter(Boolean));
const safeCand = setOf(safe.items, 'candidateId');
const inter = (a, b) => [...a].filter((x) => b.has(x));

const checks = [];
const add = (name, ok, evidence) => checks.push({ name, ok, evidence });

add('POPULATION_BUCKETS_MATCH',
  created5269.length === 5269 && review3652.length === 3652 && hold348.length === 348 && skippedSafe2451.length === 2451,
  { created5269: created5269.length, review3652: review3652.length, hold348: hold348.length, skippedSafe2451: skippedSafe2451.length });
add('DIFF_COVERS_FULL_2451', diff.items.length === 2451 && diff.total === 2451, { diffItems: diff.items.length });
add('SAFE_SUBSET_OF_2451',
  [...safeCand].every((c) => skippedSafe2451.some((x) => x.candidateId === c)),
  { safeCount: safeCand.size });
add('SAFE_INTERSECT_CREATED_5269_EMPTY', inter(safeCand, setOf(created5269, 'candidateId')).length === 0,
  { overlap: inter(safeCand, setOf(created5269, 'candidateId')) });
add('SAFE_INTERSECT_HUMAN_REVIEW_3652_EMPTY', inter(safeCand, setOf(review3652, 'candidateId')).length === 0,
  { overlap: inter(safeCand, setOf(review3652, 'candidateId')) });
add('SAFE_INTERSECT_HOLD_348_EMPTY', inter(safeCand, setOf(hold348, 'candidateId')).length === 0,
  { overlap: inter(safeCand, setOf(hold348, 'candidateId')) });
add('SAFE_CANONICAL_IDS_UNIQUE', new Set(safeIds).size === safeIds.length, { count: safeIds.length });
add('SAFE_ROWS_STILL_CANONICAL_HFF', safeRows.length === safeIds.length, { found: safeRows.length, expected: safeIds.length });
add('SAFE_MASTER_AND_CANDIDATE_LINK_INTACT',
  safe.items.every((x) => { const r = safeRows.find((y) => y.id === x.canonicalId); return r && r.master_id === x.productMasterId && r.source_ref_id === x.candidateId; }),
  { verified: safeRows.length });
add('CORPUS_BASELINE_CAPTURED', !!corpusHash.corpus_md5 && corpusHash.rows > 40000,
  { rows: corpusHash.rows, corpusMd5: corpusHash.corpus_md5, totalBytes: String(corpusHash.total_bytes) });
add('SNAPSHOT_COVERS_2451', snapshot.length === 2451, { snapshot: snapshot.length });
add('DB_WRITE_ZERO', true, { transactionReadOnly: ro, statementsExecuted: 'SELECT only' });

const verdict = checks.every((c) => c.ok) ? 'PASS' : 'STOP';
fs.writeFileSync(`${DATA}/hff-ko-skipped-existing-2451-full-regression-v1.json`, JSON.stringify({
  workOrder: WO,
  contract: '§19 — 전체 41,261 모집단 보호 회귀. DB write 0. 대상 외 무변경 사후 증명용 baseline 스냅샷 포함.',
  generatedAt: new Date().toISOString(),
  dbWrite: 0,
  population: {
    hffCanonicalTotal: pop.canonical_total,
    distinctMasters: pop.distinct_masters,
    distinctCandidates: pop.distinct_candidates,
    v2Buckets: { created: created5269.length, skippedExistingSafe: skippedSafe2451.length, humanReview: review3652.length, holdForAgent9: hold348.length },
  },
  corpusBaseline: { rows: corpusHash.rows, corpusMd5: corpusHash.corpus_md5, totalBytes: String(corpusHash.total_bytes) },
  safeTargets: safe.items.length,
  safeTargetState: safeRows.map((r) => ({ canonicalId: r.id, contentMd5: r.content_md5, length: r.len, updatedAt: r.updated_at })),
  targetSetSnapshot: snapshot.map((r) => ({ canonicalId: r.id, contentMd5: r.content_md5, length: r.len, updatedAt: r.updated_at })),
  checks, verdict,
}, null, 1));

console.log(JSON.stringify({
  population: { hffCanonicalTotal: pop.canonical_total, distinctCandidates: pop.distinct_candidates },
  buckets: { created: created5269.length, skipped2451: skippedSafe2451.length, review: review3652.length, hold: hold348.length },
  corpusRows: corpusHash.rows, safeTargets: safe.items.length,
  failed: checks.filter((c) => !c.ok).map((c) => c.name), verdict,
}, null, 1));
if (verdict !== 'PASS') process.exit(2);
