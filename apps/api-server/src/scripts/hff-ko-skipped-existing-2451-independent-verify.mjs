/**
 * WO-O4O-HFF-KO-SKIPPED-EXISTING-2451-FUNCTION-CANONICAL-BACKFILL-V1  §26·§27
 *
 * 반영 후 독립 검증 + 전체 corpus 사후 감사. read-only.
 *   - 독립 검증은 apply 스크립트의 계산을 재사용하지 않고 **DB 실측값만으로** 판정한다.
 *   - 사후 감사는 2,451 스냅샷 대비 무변경(13건 외) 과 corpus 규모 불변을 확인한다.
 *   - §27 실패로 계산하지 않음: 공식 기능성 반복 / 기능성 전용 h2 부재 / 마커 잔존 /
 *     `(국문)` 선두 표기. 단, 공식 기능성 문구 자체의 존재는 필수 검증 항목이다.
 *
 * 산출물
 *   - data/hff-ko-skipped-existing-2451-independent-verification-v1.json
 *   - data/hff-ko-skipped-existing-2451-post-corpus-audit-v1.json
 */
import pg from 'pg';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { htmlText, cmpText, findFunctionalSections } from './hff-ko-function-family-preserving-patch.mjs';

const DATA = 'apps/api-server/src/scripts/data';
const WO = 'WO-O4O-HFF-KO-SKIPPED-EXISTING-2451-FUNCTION-CANONICAL-BACKFILL-V1';
const sha = (s) => crypto.createHash('sha256').update(String(s ?? ''), 'utf8').digest('hex');
const J = (f) => JSON.parse(fs.readFileSync(`${DATA}/${f}`, 'utf8'));

const manifest = J('hff-ko-skipped-existing-2451-rollback-manifest-v1.json').items;
const applyRes = J('hff-ko-skipped-existing-2451-apply-results-v1.json');
const regression = J('hff-ko-skipped-existing-2451-full-regression-v1.json');
const diff = J('hff-ko-skipped-existing-2451-function-diff-v1.json');
if (applyRes.verdict !== 'APPLIED') { console.error('APPLY_NOT_COMPLETED'); process.exit(2); }

const client = new pg.Client({ host: '127.0.0.1', port: parseInt(process.env.PROXY_PORT ?? '5463', 10), user: 'o4o_api', password: process.env.PGPW, database: 'o4o_platform', ssl: false, statement_timeout: 900000 });
await client.connect();
await client.query('SET default_transaction_read_only = on');
const ro = (await client.query('SHOW transaction_read_only')).rows[0].transaction_read_only;
if (ro !== 'on') { console.error('READ_ONLY_ASSERTION_FAILED'); process.exit(2); }

const CANON = `description_type = 'STORE' AND status = 'canonical' AND coalesce(language, 'ko') = 'ko'
  AND deleted_at IS NULL AND source_type = 'o4o_hff_generated'`;

/* 1) 변경 13건 DB 실측 */
const rows = (await client.query(`
  SELECT d.id, d.master_id, d.source_type, d.source_ref_id, d.description_type, d.language, d.status,
         d.content, d.updated_at, d.created_at, d.deleted_at,
         c.raw_payload::jsonb->'source'->>'MAIN_FNCTN' AS main_fnctn
  FROM shared_product_descriptions d
  JOIN product_candidates c ON c.id = d.source_ref_id
  WHERE d.id = ANY($1)`, [manifest.map((m) => m.canonicalId)])).rows;

/* 2) canonical 유일성 재확인 */
const dup = (await client.query(`
  SELECT master_id, count(*)::int AS n FROM shared_product_descriptions
  WHERE master_id = ANY($1) AND ${CANON}
  GROUP BY master_id HAVING count(*) > 1`, [manifest.map((m) => m.productMasterId)])).rows;

/* 3) 사후 corpus 규모 · 해시 */
const corpus = (await client.query(`
  SELECT count(*)::int AS rows, sum(length(content))::bigint AS total_bytes,
         md5(string_agg(id::text || ':' || md5(content), ',' ORDER BY id)) AS corpus_md5
  FROM shared_product_descriptions WHERE ${CANON}`)).rows[0];

/* 4) 2,451 전체 사후 스냅샷 — 13건 외 무변경 증명 */
const allIds = diff.items.map((x) => x.canonicalId);
const post = [];
for (let i = 0; i < allIds.length; i += 1000) {
  const r = await client.query('SELECT id, md5(content) AS content_md5, length(content) AS len, updated_at FROM shared_product_descriptions WHERE id = ANY($1)', [allIds.slice(i, i + 1000)]);
  post.push(...r.rows);
}
await client.end();

/* ── 독립 검증 ────────────────────────────────────────────────────────── */
const perTarget = [];
const failures = [];
for (const m of manifest) {
  const row = rows.find((r) => r.id === m.canonicalId);
  const f = [];
  if (!row) { failures.push({ candidateId: m.candidateId, fails: ['ROW_NOT_FOUND'] }); continue; }
  const content = row.content;
  const text = cmpText(content);
  const before = m.rollbackContent;

  if (sha(content) !== m.afterContentHash) f.push('EXPECTED_HASH_MISMATCH');
  // additive-only 재증명: 삽입분을 원본 offset 에서 제거하면 rollback payload 와 byte 동일
  let peel = content;
  const ordered = [...m.inserts].map((x, i) => ({ ...x, seq: i })).sort((a, b) => (a.atIndex - b.atIndex) || (a.seq - b.seq));
  for (const ins of ordered) {
    if (peel.slice(ins.atIndex, ins.atIndex + ins.html.length) !== ins.html) { f.push('INSERT_OFFSET_MISMATCH'); break; }
    peel = peel.slice(0, ins.atIndex) + peel.slice(ins.atIndex + ins.html.length);
  }
  if (!f.includes('INSERT_OFFSET_MISMATCH') && peel !== before) f.push('NOT_ADDITIVE_ONLY');

  // 삽입 문구가 공식 원문 안에 있고 한글을 포함하는지 (원문 밖 생성·영문 단독 금지)
  const official = cmpText(row.main_fnctn ?? '');
  for (const ins of m.inserts) {
    if (!official.includes(cmpText(ins.text))) f.push('INSERT_TEXT_OUTSIDE_OFFICIAL_SOURCE');
    if (!/[가-힣]/.test(ins.text)) f.push('ENGLISH_ONLY_INSERT');
    if (!text.includes(cmpText(ins.text))) f.push('INSERT_TEXT_ABSENT_IN_DB');
  }
  // §27 필수: 공식 기능성 문구 자체가 존재해야 한다
  const sections = findFunctionalSections(content);
  if (!sections.length || sections.every((s) => s.items.length === 0)) f.push('NO_OFFICIAL_FUNCTION_TEXT');

  // 구조 불변 (DB 실측 vs rollback payload)
  const h2 = (h) => [...h.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/g)].map((x) => htmlText(x[1])).join('|');
  const cls = (h) => [...new Set([...h.matchAll(/class="([^"]+)"/g)].flatMap((x) => x[1].split(/\s+/)))].sort().join(',');
  const foot = (h) => (h.match(/<div class="sd-foot">[\s\S]*?<\/div>/) ?? [''])[0];
  const cards = (h) => [...h.matchAll(/<div class="(sd-[^"]*)"/g)].map((x) => x[1]).join('|');
  if (h2(before) !== h2(content)) f.push('H2_SEQUENCE_CHANGED');
  if (cls(before) !== cls(content)) f.push('CLASS_SET_CHANGED');
  if (foot(before) !== foot(content)) f.push('FOOTER_CHANGED');
  if (cards(before) !== cards(content)) f.push('CARD_ORDER_CHANGED');
  for (const t of ['ul', 'li', 'div', 'h2']) {
    if ((content.match(new RegExp(`<${t}\\b`, 'g')) ?? []).length !== (content.match(new RegExp(`</${t}>`, 'g')) ?? []).length) f.push(`TAG_UNBALANCED_${t.toUpperCase()}`);
  }
  // source metadata / 키 불변
  if (row.source_type !== 'o4o_hff_generated') f.push('SOURCE_TYPE_CHANGED');
  if (row.source_ref_id !== m.sourceRefId) f.push('SOURCE_REF_ID_CHANGED');
  if (row.master_id !== m.productMasterId) f.push('MASTER_ID_CHANGED');
  if (row.description_type !== 'STORE') f.push('DESCRIPTION_TYPE_CHANGED');
  if ((row.language ?? 'ko') !== 'ko') f.push('LANGUAGE_CHANGED');
  if (row.status !== 'canonical') f.push('STATUS_CHANGED');
  if (row.deleted_at) f.push('SOFT_DELETED');
  if (row.created_at?.getTime?.() !== new Date(m.createdAt).getTime()) f.push('CREATED_AT_CHANGED');
  if (!(row.updated_at > new Date(m.beforeUpdatedAt))) f.push('UPDATED_AT_NOT_ADVANCED');
  // DRIVER 형식 교체 금지
  for (const mk of ['이 제품은 식약처에 신고된 건강기능식품입니다', '주요 기능성', '매장 전문가 문의 안내', '확인 가능한 기준·규격 정보']) {
    if (!before.includes(mk) && content.includes(mk)) f.push('DRIVER_FORMAT_INJECTED');
  }

  const uniq = [...new Set(f)];
  if (uniq.length) failures.push({ candidateId: m.candidateId, productName: m.productName, fails: uniq });
  perTarget.push({
    candidateId: m.candidateId, canonicalId: m.canonicalId, productName: m.productName,
    rendererFamily: m.rendererFamily, insertCount: m.inserts.length,
    dbContentHash: sha(content), expectedHash: m.afterContentHash,
    dbLength: content.length, rollbackLength: before.length,
    updatedAt: row.updated_at, verdict: uniq.length ? 'FAIL' : 'PASS', fails: uniq,
  });
}

const ivChecks = [
  { name: 'ALL_TARGETS_VERIFIED', ok: perTarget.length === manifest.length, evidence: { verified: perTarget.length, expected: manifest.length } },
  { name: 'NO_TARGET_FAILURE', ok: failures.length === 0, evidence: { failures } },
  { name: 'NO_CANONICAL_DUPLICATE', ok: dup.length === 0, evidence: { duplicates: dup } },
  { name: 'UPDATED_ROW_COUNT_MATCHES', ok: applyRes.updated === manifest.length, evidence: { updated: applyRes.updated } },
];
const ivVerdict = ivChecks.every((c) => c.ok) ? 'PASS' : 'STOP';
fs.writeFileSync(`${DATA}/hff-ko-skipped-existing-2451-independent-verification-v1.json`, JSON.stringify({
  workOrder: WO,
  contract: '§26 — apply 계산을 재사용하지 않고 DB 실측값만으로 재검증. rollback payload 대비 additive-only·구조·metadata 불변 판정.',
  generatedAt: new Date().toISOString(),
  targetCount: manifest.length, checks: ivChecks, verdict: ivVerdict, perTarget,
}, null, 1));

/* ── 사후 corpus 감사 ─────────────────────────────────────────────────── */
const preSnap = new Map(regression.targetSetSnapshot.map((x) => [x.canonicalId, x]));
const changedIds = new Set(manifest.map((m) => m.canonicalId));
const unexpectedChanges = [];
const expectedChanges = [];
for (const p of post) {
  const pre = preSnap.get(p.id);
  if (!pre) { unexpectedChanges.push({ canonicalId: p.id, reason: 'NOT_IN_PRE_SNAPSHOT' }); continue; }
  const changed = pre.contentMd5 !== p.content_md5;
  if (changed && !changedIds.has(p.id)) unexpectedChanges.push({ canonicalId: p.id, reason: 'CONTENT_CHANGED_OUTSIDE_MANIFEST', preMd5: pre.contentMd5, postMd5: p.content_md5 });
  if (changed && changedIds.has(p.id)) expectedChanges.push({ canonicalId: p.id, lengthDelta: p.len - pre.length });
  if (!changed && changedIds.has(p.id)) unexpectedChanges.push({ canonicalId: p.id, reason: 'MANIFEST_TARGET_NOT_CHANGED' });
}
const pcChecks = [
  { name: 'SNAPSHOT_COVERS_2451', ok: post.length === 2451, evidence: { post: post.length } },
  { name: 'CHANGED_SET_EQUALS_MANIFEST', ok: expectedChanges.length === manifest.length, evidence: { changed: expectedChanges.length, manifest: manifest.length } },
  { name: 'NO_UNEXPECTED_CHANGE', ok: unexpectedChanges.length === 0, evidence: { unexpected: unexpectedChanges } },
  { name: 'CORPUS_ROW_COUNT_UNCHANGED', ok: corpus.rows === regression.corpusBaseline.rows, evidence: { pre: regression.corpusBaseline.rows, post: corpus.rows } },
  { name: 'CORPUS_HASH_CHANGED_ONLY_BY_APPLY', ok: corpus.corpus_md5 !== regression.corpusBaseline.corpusMd5, evidence: { preMd5: regression.corpusBaseline.corpusMd5, postMd5: corpus.corpus_md5 } },
  { name: 'CORPUS_BYTES_GREW_BY_INSERTS_ONLY',
    ok: Number(corpus.total_bytes) - Number(regression.corpusBaseline.totalBytes) === expectedChanges.reduce((a, x) => a + x.lengthDelta, 0),
    evidence: { preBytes: regression.corpusBaseline.totalBytes, postBytes: String(corpus.total_bytes), sumDelta: expectedChanges.reduce((a, x) => a + x.lengthDelta, 0) } },
];
const pcVerdict = pcChecks.every((c) => c.ok) ? 'PASS' : 'STOP';
fs.writeFileSync(`${DATA}/hff-ko-skipped-existing-2451-post-corpus-audit-v1.json`, JSON.stringify({
  workOrder: WO,
  contract: '§27 — 전체 corpus 사후 감사. 공식 기능성 반복·h2 부재·마커 잔존·(국문) 선두 표기는 실패로 계산하지 않는다. 공식 기능성 문구 존재는 필수(§26 에서 판정).',
  generatedAt: new Date().toISOString(),
  corpusPost: { rows: corpus.rows, corpusMd5: corpus.corpus_md5, totalBytes: String(corpus.total_bytes) },
  corpusPre: regression.corpusBaseline,
  expectedChanges, unexpectedChanges, checks: pcChecks, verdict: pcVerdict,
}, null, 1));

console.log(JSON.stringify({
  independent: { verified: perTarget.length, failures: failures.length, verdict: ivVerdict },
  postCorpus: { changed: expectedChanges.length, unexpected: unexpectedChanges.length, corpusRows: corpus.rows, byteDelta: Number(corpus.total_bytes) - Number(regression.corpusBaseline.totalBytes), verdict: pcVerdict },
  failures,
}, null, 1));
if (ivVerdict !== 'PASS' || pcVerdict !== 'PASS') process.exit(2);
