/** 독립검증(별도 read-only 세션) + 전체 corpus 감사 + queue delta. */
import fs from 'node:fs';
import crypto from 'node:crypto';
import pg from 'pg';

const D = 'apps/api-server/src/scripts/data';
const rb = JSON.parse(fs.readFileSync(`${D}/hff-ko-why-family-825-rollback-manifest-v1.json`, 'utf8'));
const cls = JSON.parse(fs.readFileSync(`${D}/hff-ko-why-family-825-classification-v1.json`, 'utf8'));
const OUT_V = `${D}/hff-ko-why-family-825-independent-verification-v1.json`;
const OUT_C = `${D}/hff-ko-why-family-825-post-corpus-audit-v1.json`;
const OUT_DELTA = `${D}/hff-ko-why-family-825-review-queue-delta-v1.jsonl`;
const sha = (s) => crypto.createHash('sha256').update(s ?? '').digest('hex');
const dense = (s) => (s ?? '').replace(/&nbsp;/g, '').replace(/[\s 　]/g, '');
const unesc = (s) => (s ?? '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const HAS_FN = `content ~ '<h2>[^<]*기능성[^<]*</h2>'`;
const targets = rb.targets;

const c = new pg.Client({ host: '127.0.0.1', port: parseInt(process.env.PROXY_PORT ?? '5494', 10), user: 'o4o_api', password: process.env.PGPW, database: 'o4o_platform', ssl: false });
await c.connect();
await c.query('SET default_transaction_read_only = on');

/* 1) 대상 검증 */
const ids = targets.map((t) => t.canonicalId);
const now = new Map();
for (let i = 0; i < ids.length; i += 500) {
  for (const r of (await c.query(`
    SELECT id, master_id, content, source_type, status, language, description_type, deleted_at
    FROM shared_product_descriptions WHERE id = ANY($1)`, [ids.slice(i, i + 500)])).rows) now.set(r.id, r);
}
const cands = new Map();
const cids = targets.map((t) => t.candidateId);
for (let i = 0; i < cids.length; i += 500) {
  for (const r of (await c.query(`
    SELECT id, matched_product_master_id, raw_payload::jsonb->'source'->>'MAIN_FNCTN' fn
    FROM product_candidates WHERE id = ANY($1)`, [cids.slice(i, i + 500)])).rows) cands.set(r.id, r);
}

let newHashOk = 0, oldRemains = 0, attrDrift = 0, candDrift = 0, outsideDrift = 0;
let clausesExpected = 0, clausesVisible = 0, notVerbatim = 0, dupInsert = 0, introDrift = 0, footDrift = 0, familyDrift = 0;
const fails = [];
for (const t of targets) {
  const r = now.get(t.canonicalId), cd = cands.get(t.candidateId);
  const cur = r?.content ?? '';
  if (sha(cur) === t.newContentHash) newHashOk++; else fails.push({ id: t.canonicalId, why: 'HASH' });
  if (sha(cur) === t.oldContentHash) oldRemains++;
  if (!r || r.deleted_at || r.master_id !== t.productMasterId || r.status !== 'canonical'
      || r.description_type !== 'STORE' || (r.language ?? 'ko') !== 'ko' || r.source_type !== 'o4o_hff_generated') attrDrift++;
  if (!cd || cd.matched_product_master_id !== t.productMasterId) candDrift++;

  const at = t.oldContent.indexOf('<h2>섭취방법');
  const i = cur.indexOf(t.insertedBlock);
  if (i < 0 || cur.slice(0, i) !== t.oldContent.slice(0, at) || cur.slice(i + t.insertedBlock.length).replace(/^\s*/, '') !== t.oldContent.slice(at)) outsideDrift++;

  const clauses = [...t.insertedBlock.matchAll(/<li>([\s\S]*?)<\/li>/g)].map((m) => unesc(m[1]).trim());
  clausesExpected += clauses.length;
  const items = [...cur.matchAll(/<li>([\s\S]*?)<\/li>/g)].map((m) => dense(unesc(m[1].replace(/<[^>]+>/g, ''))));
  for (const cl of clauses) {
    if (items.some((x) => x.includes(dense(cl)))) clausesVisible++;
    if (!dense(cd?.fn ?? '').includes(dense(cl))) notVerbatim++;
  }
  if ((cur.match(/<h2>[^<]*기능성[^<]*<\/h2>/g) ?? []).length !== 1) dupInsert++;
  const introRe = /<p class="sd-intro">[\s\S]*?<\/p>/, footRe = /<div class="sd-foot">[\s\S]*?<\/div>/;
  if ((t.oldContent.match(introRe)?.[0] ?? null) !== (cur.match(introRe)?.[0] ?? null)) introDrift++;
  if ((t.oldContent.match(footRe)?.[0] ?? null) !== (cur.match(footRe)?.[0] ?? null)) footDrift++;
  if (!cur.includes('<h2>왜 이 제품인가</h2>') || cur.includes('<h2>주요 기능성</h2>')) familyDrift++;
}

/* 2) 대상 밖 drift */
const nonIds = cls.rows.filter((r) => r.status !== 'SAFE_APPLY').map((r) => r.canonicalId);
const byId = new Map(cls.rows.map((r) => [r.canonicalId, r]));
let nonDrift = 0;
for (let i = 0; i < nonIds.length; i += 500) {
  for (const r of (await c.query(`SELECT id, content FROM shared_product_descriptions WHERE id = ANY($1)`, [nonIds.slice(i, i + 500)])).rows) {
    if (sha(r.content) !== byId.get(r.id).currentHash) nonDrift++;
  }
}

/* 3) corpus */
const g = (await c.query(`
  SELECT
    (SELECT count(*)::int FROM shared_product_descriptions WHERE deleted_at IS NULL) AS spd_all,
    (SELECT count(*)::int FROM shared_product_descriptions WHERE description_type='STORE' AND status='canonical' AND coalesce(language,'ko')='ko' AND deleted_at IS NULL) AS spd_store_ko,
    (SELECT count(*)::int FROM shared_product_descriptions WHERE source_type='o4o_hff_generated' AND description_type='STORE' AND status='canonical' AND coalesce(language,'ko')='ko' AND deleted_at IS NULL AND NOT (${HAS_FN})) AS without_fn,
    (SELECT count(DISTINCT pc.id)::int FROM product_candidates pc
       JOIN shared_product_descriptions s ON s.master_id = pc.matched_product_master_id
      WHERE pc.source_label='MFDS_HEALTH_FUNCTIONAL_FOOD' AND pc.deleted_at IS NULL
        AND s.description_type='STORE' AND s.status='canonical' AND coalesce(s.language,'ko')='ko' AND s.deleted_at IS NULL) AS hff_canonical`)).rows[0];

let agent9 = null;
try {
  const q = fs.readFileSync(`${D}/hff-ko-agent-09-hold-queue-v1.jsonl`, 'utf8').trim();
  const hid = q.split('\n').map((l) => JSON.parse(l).candidateId);
  const still = (await c.query(`
    SELECT count(*)::int c FROM product_candidates pc
    LEFT JOIN shared_product_descriptions s ON s.master_id = pc.matched_product_master_id
      AND s.description_type='STORE' AND s.status='canonical' AND coalesce(s.language,'ko')='ko' AND s.deleted_at IS NULL
    WHERE pc.id = ANY($1) AND s.id IS NULL`, [hid])).rows[0].c;
  agent9 = { queued: hid.length, stillWithoutCanonical: still, unchanged: still === hid.length };
} catch { agent9 = 'QUEUE_ABSENT'; }
await c.end();

/* 4) queue delta */
const NEXT = { SAFE_APPLY: 'NONE — 공식 인정 기능성 섹션 적용 완료', HUMAN_REVIEW: 'HUMAN_BOUNDARY_OR_IDIOM_DECISION' };
const delta = cls.rows.map((r) => JSON.stringify({
  canonicalId: r.canonicalId, candidateId: r.candidateId, statementNo: r.statementNo, productName: r.productName,
  previousStatus: 'FUNCTION_SECTION_ABSENT',
  pilotDecision: r.status, reason: r.reason,
  canonicalUpdated: r.status === 'SAFE_APPLY',
  oldContentHash: r.currentHash, newContentHash: r.status === 'SAFE_APPLY' ? (r.newHash ?? null) : r.currentHash,
  proposedReviewStatus: r.status === 'SAFE_APPLY' ? 'RESOLVED_UPDATED' : 'PENDING',
  nextAction: NEXT[r.status] ?? 'PENDING',
}));
fs.writeFileSync(OUT_DELTA, delta.join('\n') + '\n');

const fail = [];
if (newHashOk !== targets.length) fail.push('newHashMismatch');
if (oldRemains) fail.push('oldHashRemains');
if (attrDrift) fail.push('attrDrift');
if (candDrift) fail.push('candidateDrift');
if (outsideDrift) fail.push('outsideBlockDrift');
if (clausesVisible !== clausesExpected) fail.push('clauseNotVisible');
if (notVerbatim) fail.push('notVerbatim');
if (dupInsert) fail.push('duplicateFunctionSection');
if (introDrift) fail.push('sdIntroDrift');
if (footDrift) fail.push('footDrift');
if (familyDrift) fail.push('rendererFamilyDrift');
if (nonDrift) fail.push('nonTargetDrift');
if (g.without_fn !== 525) fail.push(`withoutFnExpected525got${g.without_fn}`);
if (g.hff_canonical !== 40913) fail.push(`hffCanonicalExpected40913got${g.hff_canonical}`);
if (agent9 !== 'QUEUE_ABSENT' && !agent9.unchanged) fail.push('agent9HoldChanged');

const v = { verifiedAt: new Date().toISOString(), readOnlySession: true, targetCount: targets.length,
  newHashMatch: newHashOk, oldHashRemains: oldRemains, attrDrift, candidateDrift: candDrift, outsideBlockDrift: outsideDrift,
  clauses: { expected: clausesExpected, visible: clausesVisible, notVerbatim },
  duplicateFunctionSection: dupInsert, sdIntroDrift: introDrift, footDrift, rendererFamilyDrift: familyDrift,
  nonTargetCount: nonIds.length, nonTargetDrift: nonDrift,
  verdict: fail.length ? 'FAIL' : 'PASS', failedChecks: fail, sampleFailures: fails.slice(0, 5) };
fs.writeFileSync(OUT_V, JSON.stringify(v, null, 1));
fs.writeFileSync(OUT_C, JSON.stringify({ auditedAt: new Date().toISOString(), globals: g,
  expected: { without_fn: 525, hff_canonical: 40913 }, agent9HoldQueue: agent9,
  functionSectionAbsent: { before: 825, after: g.without_fn, restored: 825 - g.without_fn },
  verdict: (g.without_fn === 525 && g.hff_canonical === 40913 && nonDrift === 0) ? 'PASS' : 'FAIL' }, null, 1));

console.log(JSON.stringify({ verification: v, corpus: { globals: g, agent9, absentBefore: 825, absentAfter: g.without_fn }, deltaRows: delta.length }, null, 2));
