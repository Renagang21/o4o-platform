/** 독립검증(별도 read-only) + 전체 왜-family 한국어 계약 감사. */
import fs from 'node:fs';
import crypto from 'node:crypto';
import pg from 'pg';

const D = 'apps/api-server/src/scripts/data';
const OUT_V = `${D}/hff-ko-why-family-policy-cleanup-independent-verification-v1.json`;
const OUT_C = `${D}/hff-ko-why-family-policy-cleanup-post-corpus-audit-v1.json`;
const sha = (s) => crypto.createHash('sha256').update(s ?? '').digest('hex');
const KO = `source_type='o4o_hff_generated' AND description_type='STORE' AND status='canonical' AND coalesce(language,'ko')='ko' AND deleted_at IS NULL`;
const HAS_FN = `content ~ '<h2>[^<]*기능성[^<]*</h2>'`;
const CLAUSE = '· 건강기능식품은 질병의 예방·치료를 위한 의약품이 아니며, 궁금한 점은 매장 내 약사 등 전문가와 상담하십시오';
const rb = JSON.parse(fs.readFileSync(`${D}/hff-ko-why-family-policy-cleanup-rollback-v1.json`, 'utf8'));
const targets = rb.targets;

const c = new pg.Client({ host: '127.0.0.1', port: parseInt(process.env.PROXY_PORT ?? '5496', 10), user: 'o4o_api', password: process.env.PGPW, database: 'o4o_platform', ssl: false });
await c.connect();
await c.query('SET default_transaction_read_only = on');

/* 1) 대상 검증 — 전량 hash + 역연산 복원 검증 */
const ids = targets.map((t) => t.canonicalId);
const now = new Map();
for (let i = 0; i < ids.length; i += 1000) {
  for (const r of (await c.query(`
    SELECT id, master_id, content, source_type, status, language, description_type
    FROM shared_product_descriptions WHERE id = ANY($1)`, [ids.slice(i, i + 1000)])).rows) now.set(r.id, r);
}
let newHashOk = 0, oldRemains = 0, attrDrift = 0, audienceLeft = 0, expertMissing = 0, clauseDup = 0;
let reversalOk = 0, reversalFail = 0, fnClauseMissing = 0;
const fails = [];
for (const t of targets) {
  const r = now.get(t.canonicalId);
  const cur = r?.content ?? '';
  if (sha(cur) === t.newContentHash) newHashOk++; else { fails.push({ id: t.canonicalId, why: 'HASH' }); }
  if (sha(cur) === t.oldContentHash) oldRemains++;
  if (!r || r.master_id !== t.productMasterId || r.status !== 'canonical' || r.description_type !== 'STORE'
      || (r.language ?? 'ko') !== 'ko' || r.source_type !== 'o4o_hff_generated') attrDrift++;
  if (cur.includes('이런 분께')) audienceLeft++;
  if (!cur.includes('매장 내 약사 등 전문가')) expertMissing++;
  if ((cur.match(new RegExp(CLAUSE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) ?? []).length > 1) clauseDup++;
  if (t.fnInsertedBlock) {
    const out = []; const re = /<li[^>]*>([\s\S]*?)(?=<li[^>]*>|<\/li>)/g; let m;
    while ((m = re.exec(t.fnInsertedBlock)) !== null) { const x = m[1].replace(/<[^>]+>/g, '').trim(); if (x) out.push(x); }
    if (!out.every((x) => cur.includes(x))) fnClauseMissing++;
  }
  /* 역연산 복원 검증 = rollback 계약 실증 */
  let back = cur;
  if (t.footerClauseAdded) back = back.replace(' ' + t.footerClauseAdded, '');
  if (t.fnInsertedBlock) back = back.replace(t.fnInsertedBlock, '');
  /* AUD 재삽입은 manifest 에 해시로 확정된 offset 을 사용한다.
     `</div><div class="sd-foot">` 직전으로 가정하면 `이런 분께` 가 sd-body 마지막 요소가 아닌
     문서 271건에서 복원이 실패한다. */
  if (t.audienceRemovedHtml) {
    const at = Number.isInteger(t.audienceReinsertOffset) ? t.audienceReinsertOffset : back.lastIndexOf('</div><div class="sd-foot">');
    if (at >= 0) back = back.slice(0, at) + t.audienceRemovedHtml + back.slice(at);
  }
  if (sha(back) === t.oldContentHash) reversalOk++; else { reversalFail++; if (fails.length < 10) fails.push({ id: t.canonicalId, why: 'REVERSAL' }); }
}

/* 2) 대상 밖 drift */
const outsideDrift = (await c.query(`
  SELECT count(*)::int c FROM shared_product_descriptions
  WHERE ${KO} AND NOT (id = ANY($1)) AND updated_at >= $2`, [ids, rb.builtAt])).rows[0].c;

/* 3) 전체 왜-family 한국어 계약 감사 */
const audit = (await c.query(`
  SELECT
    count(*)::int AS ko_total,
    count(*) FILTER (WHERE content LIKE '%왜 이 제품인가%')::int AS wae_total,
    count(*) FILTER (WHERE ${HAS_FN})::int AS has_fn,
    count(*) FILTER (WHERE NOT (${HAS_FN}))::int AS no_fn,
    count(*) FILTER (WHERE content LIKE '%이런 분께%')::int AS audience_left,
    count(*) FILTER (WHERE content LIKE '%이런 분께%' AND content LIKE '%왜 이 제품인가%')::int AS audience_wae,
    count(*) FILTER (WHERE content LIKE '%매장 내 약사 등 전문가%')::int AS has_expert,
    count(*) FILTER (WHERE content NOT LIKE '%매장 내 약사 등 전문가%')::int AS no_expert,
    count(*) FILTER (WHERE content ~ '<div class="sd-foot">')::int AS has_footer,
    count(*) FILTER (WHERE content LIKE '%sd-func%')::int AS uses_sdfunc
  FROM shared_product_descriptions WHERE ${KO}`)).rows[0];
const dup = (await c.query(`
  SELECT count(*)::int c FROM (
    SELECT master_id FROM shared_product_descriptions WHERE ${KO} GROUP BY master_id HAVING count(*) > 1) x`)).rows[0].c;
const enUntouched = (await c.query(`
  SELECT count(*)::int c FROM shared_product_descriptions
  WHERE source_type='o4o_hff_generated' AND description_type='STORE' AND status='canonical'
    AND coalesce(language,'ko')<>'ko' AND deleted_at IS NULL AND updated_at >= $1`, [rb.builtAt])).rows[0].c;
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
const hffCanon = (await c.query(`
  SELECT count(DISTINCT pc.id)::int c FROM product_candidates pc
   JOIN shared_product_descriptions s ON s.master_id = pc.matched_product_master_id
  WHERE pc.source_label='MFDS_HEALTH_FUNCTIONAL_FOOD' AND pc.deleted_at IS NULL
    AND s.description_type='STORE' AND s.status='canonical' AND coalesce(s.language,'ko')='ko' AND s.deleted_at IS NULL`)).rows[0].c;
await c.end();

const fail = [];
if (newHashOk !== targets.length) fail.push('newHashMismatch');
if (oldRemains) fail.push('oldHashRemains');
if (attrDrift) fail.push('attrDrift');
if (audienceLeft) fail.push('audienceLeftInTargets');
if (expertMissing) fail.push('expertMissingInTargets');
if (clauseDup) fail.push('clauseDuplicated');
if (fnClauseMissing) fail.push('fnClauseMissing');
if (reversalFail) fail.push('rollbackReversalFailed');
if (outsideDrift) fail.push(`outsideTargetsUpdated=${outsideDrift}`);
if (dup) fail.push('canonicalDup');
if (hffCanon !== 40913) fail.push(`hffCanonical=${hffCanon}`);
if (enUntouched) fail.push(`enModified=${enUntouched}`);
if (agent9 !== 'QUEUE_ABSENT' && !agent9.unchanged) fail.push('agent9Changed');

const v = { verifiedAt: new Date().toISOString(), readOnlySession: true, targetCount: targets.length,
  newHashMatch: newHashOk, oldHashRemains: oldRemains, attrDrift,
  audienceLeftInTargets: audienceLeft, expertMissingInTargets: expertMissing, clauseDuplicated: clauseDup,
  fnClauseMissing, rollbackReversalOk: reversalOk, rollbackReversalFail: reversalFail,
  outsideTargetsUpdatedSinceBuild: outsideDrift, canonicalDup: dup, enDocsModified: enUntouched,
  agent9HoldQueue: agent9, hffCanonical: hffCanon,
  verdict: fail.length ? 'FAIL' : 'PASS', failedChecks: fail, sampleFailures: fails.slice(0, 5) };
fs.writeFileSync(OUT_V, JSON.stringify(v, null, 1));
fs.writeFileSync(OUT_C, JSON.stringify({ auditedAt: new Date().toISOString(), finalContractAudit: audit,
  before: { no_fn: 14, audience: 15435, no_expert: 13955 },
  after: { no_fn: audit.no_fn, audience: audit.audience_left, no_expert: audit.no_expert },
  outOfScopeRemaining: { audience_nonWae: audit.audience_left, noExpert_nonWae: audit.no_expert,
    note: '왜-family 밖(비-왜-family) 127건 — 본 WO 범위 밖으로 미변경' },
  hffCanonical: hffCanon, agent9HoldQueue: agent9, canonicalDup: dup, enDocsModified: enUntouched,
  verdict: (audit.audience_wae === 0 && dup === 0 && hffCanon === 40913 && enUntouched === 0) ? 'PASS' : 'FAIL' }, null, 1));
console.log(JSON.stringify({ verification: { ...v, sampleFailures: v.sampleFailures }, audit, hffCanon, agent9, dup, enUntouched }, null, 2));
