/**
 * WO-O4O-HFF-KO-PROBIOTICS-WOMAN-OFFICIAL-FUNCTION-SECTION-APPLY-V1
 *
 * 대상: `#35 프로바이오틱스우먼` **1건**
 * 헤딩: `공식 인정 기능성` (왜-family 자체 어휘 · 선례 2,226건)
 * 위치: `왜 이 제품인가` 직후 / `섭취방법` 앞
 * 기능성: 공식 MAIN_FNCTN 3절 verbatim · 구조는 문서 내 기존 `<ul class="sd-why">` 재사용
 * 불변: sd-intro 삭제·수정 금지 · renderer family(왜-family) 유지 · 기타 섹션 byte 동일
 * write: shared_product_descriptions.content + updated_at (1행)
 *
 * 이중 게이트: --apply + HFF_PW_APPLY_CONFIRM=YES
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import pg from 'pg';

const APPLY = process.argv.includes('--apply');
const CONFIRM = process.env.HFF_PW_APPLY_CONFIRM === 'YES';
const D = 'apps/api-server/src/scripts/data';
const PROPOSAL = `${D}/hff-ko-missing-function-container-35-proposal-v1.json`;
const OUT_RB = `${D}/hff-ko-probiotics-woman-function-section-rollback-manifest-v1.json`;
const OUT_AP = `${D}/hff-ko-probiotics-woman-function-section-apply-results-v1.json`;

const sha = (s) => crypto.createHash('sha256').update(s ?? '').digest('hex');
const dense = (s) => (s ?? '').replace(/&nbsp;/g, '').replace(/[\s 　]/g, '');
const DEFINED = new Set(['sd-badge','sd-badges','sd-body','sd-card','sd-chips','sd-core','sd-cta','sd-cta-k','sd-foot','sd-hero','sd-intake','sd-intro','sd-item','sd-meta','sd-scan','sd-spec','sd-tag','sd-theme-green','sd-theme-red','sd-warn','sd-who','sd-why','is-solid']);

const p = JSON.parse(fs.readFileSync(PROPOSAL, 'utf8'));
const t = p.target;
const chosen = p.proposals.A_FAMILY_NATIVE_HEADING__RECOMMENDED;
const clauses = p.officialSource.parsedClauses;

const c = new pg.Client({ host: '127.0.0.1', port: parseInt(process.env.PROXY_PORT ?? '5493', 10), user: 'o4o_api', password: process.env.PGPW, database: 'o4o_platform', ssl: false });
await c.connect();

/* ── 1) drift 확인 ─────────────────────────────────────── */
const cur = (await c.query(`
  SELECT spd.id, spd.master_id, spd.content, spd.source_type, spd.status, spd.language,
         spd.description_type, spd.updated_at, spd.deleted_at
  FROM shared_product_descriptions spd WHERE spd.id = $1`, [t.canonicalId])).rows[0];
const cand = (await c.query(`
  SELECT id, matched_product_master_id, candidate_status,
         raw_payload::jsonb->'source'->>'MAIN_FNCTN' fn
  FROM product_candidates WHERE id = $1`, [t.candidateId])).rows[0];

const oldContent = cur?.content ?? '';
const drift = {
  canonicalPresent: !!cur && !cur.deleted_at,
  hashMatchesProposalBase: sha(oldContent) === t.currentHash,
  masterMatches: cur?.master_id === t.productMasterId,
  attrsOk: cur && cur.description_type === 'STORE' && cur.status === 'canonical' && (cur.language ?? 'ko') === 'ko',
  candidateLinkOk: cand?.matched_product_master_id === t.productMasterId,
  sourceUnchanged: dense(cand?.fn ?? '') === dense(p.officialSource.mainFnctnRaw),
};

// 제안본은 현재 content 로부터 재생성한다(파일에 저장된 content 를 그대로 믿지 않는다)
const intakeAt = oldContent.indexOf('<h2>섭취방법');
const esc = (s) => (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const block = `<h2>공식 인정 기능성</h2><ul class="sd-why">${clauses.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>\n  `;
const newContent = intakeAt >= 0 ? oldContent.slice(0, intakeAt) + block + oldContent.slice(intakeAt) : null;
const rebuiltMatchesProposal = newContent === chosen.content;

/* ── 2) 사후 안전 검증 ─────────────────────────────────── */
const introRe = /<p class="sd-intro">[\s\S]*?<\/p>/;
const footRe = /<div class="sd-foot">[\s\S]*?<\/div>/;
const checks = newContent ? {
  insertPointFound: intakeAt >= 0,
  rebuiltMatchesProposal,
  // sd-intro 무변경
  introUnchanged: (oldContent.match(introRe)?.[0] ?? '#A') === (newContent.match(introRe)?.[0] ?? '#B'),
  // footer 무변경
  footUnchanged: (oldContent.match(footRe)?.[0] ?? '#A') === (newContent.match(footRe)?.[0] ?? '#B'),
  // 기존 헤딩 전량 보존
  allOldHeadingsKept: [...oldContent.matchAll(/<h2>[\s\S]*?<\/h2>/g)].map((m) => m[0]).every((h) => newContent.includes(h)),
  // 삽입 블록 외 나머지 byte 동일
  outsideIdentical: newContent.slice(0, intakeAt) === oldContent.slice(0, intakeAt)
    && newContent.slice(intakeAt + block.length) === oldContent.slice(intakeAt),
  // 절 전량 원문 verbatim
  allClausesVerbatim: clauses.every((x) => dense(cand?.fn ?? '').includes(dense(x))),
  clausesInNew: clauses.filter((x) => dense(newContent).includes(dense(x))).length,
  clausesExpected: clauses.length,
  // 구조
  classesOk: [...newContent.matchAll(/class="([^"]+)"/g)].every((m) => m[1].split(/\s+/).every((x) => !x || DEFINED.has(x))),
  balanced: ['div','ul','li','span','p','h1','h2','b','small'].every((tag) =>
    (newContent.match(new RegExp(`<${tag}[\\s>]`, 'g')) ?? []).length === (newContent.match(new RegExp(`</${tag}>`, 'g')) ?? []).length),
  noEmpty: !/<li>\s*<\/li>|<ul[^>]*>\s*<\/ul>|<h2>\s*<\/h2>/.test(newContent),
  // renderer family 유지 (왜-family 시그니처 보존 + driver 어휘 미도입)
  familyPreserved: newContent.includes('<h2>왜 이 제품인가</h2>') && !newContent.includes('<h2>주요 기능성</h2>'),
  singleFunctionSection: (newContent.match(/<h2>[^<]*기능성[^<]*<\/h2>/g) ?? []).length === 1,
  lenDelta: newContent.length - oldContent.length,
} : null;

const gateOk = Object.values(drift).every(Boolean) && checks && Object.entries(checks)
  .filter(([k]) => !['clausesInNew', 'clausesExpected', 'lenDelta'].includes(k)).every(([, v]) => v)
  && checks.clausesInNew === checks.clausesExpected;

/* ── 3) rollback manifest ──────────────────────────────── */
const rb = {
  builtAt: new Date().toISOString(),
  wo: 'WO-O4O-HFF-KO-PROBIOTICS-WOMAN-OFFICIAL-FUNCTION-SECTION-APPLY-V1',
  decision: { heading: '공식 인정 기능성', variant: 'A_FAMILY_NATIVE_HEADING', scope: '#35 단건', sdIntroModified: false },
  drift, checks, gateOk,
  expectedUpdate: gateOk ? 1 : 0,
  targets: gateOk ? [{
    targetIndex: 1, pilotIndex: 35,
    candidateId: t.candidateId, statementNo: t.statementNo, productName: t.productName,
    productMasterId: t.productMasterId, canonicalId: t.canonicalId,
    rendererFamily: 'WAE_I_JEPUM', patchOperation: 'INSERT_OFFICIAL_FUNCTION_SECTION',
    insertedHeading: '공식 인정 기능성', insertedClauses: clauses, insertedBlock: block.trim(),
    oldContent, oldContentHash: sha(oldContent),
    newContent, newContentHash: sha(newContent),
    oldUpdatedAt: cur.updated_at?.toISOString?.() ?? String(cur.updated_at),
    applyStatus: 'PENDING',
  }] : [],
};
fs.writeFileSync(OUT_RB, JSON.stringify(rb, null, 1));

if (!gateOk) {
  fs.writeFileSync(OUT_AP, JSON.stringify({ ranAt: new Date().toISOString(), status: 'NOT_APPLIED_GATE_FAILED', drift, checks, expectedUpdate: 0, actualUpdate: 0 }, null, 1));
  console.log(JSON.stringify({ status: 'NOT_APPLIED_GATE_FAILED', drift, checks }, null, 2));
  await c.end(); process.exit(1);
}
if (!APPLY) {
  console.log(JSON.stringify({ mode: 'dry-run', gateOk, expectedUpdate: 1, drift, checks }, null, 2));
  await c.end(); process.exit(0);
}
if (!CONFIRM) { await c.end(); throw new Error('APPLY_BLOCKED: HFF_PW_APPLY_CONFIRM=YES 필요'); }

/* ── 4) 제한 UPDATE ────────────────────────────────────── */
const before = (await c.query(`
  SELECT
    (SELECT count(*)::int FROM shared_product_descriptions WHERE deleted_at IS NULL) AS spd_all,
    (SELECT count(*)::int FROM shared_product_descriptions WHERE description_type='STORE' AND status='canonical' AND coalesce(language,'ko')='ko' AND deleted_at IS NULL) AS spd_store_ko,
    (SELECT count(*)::int FROM shared_product_descriptions WHERE source_type='o4o_hff_generated' AND description_type='STORE' AND status='canonical' AND coalesce(language,'ko')='ko' AND deleted_at IS NULL AND content ~ '<h2>[^<]*기능성[^<]*</h2>') AS with_fn_section,
    (SELECT count(*)::int FROM shared_product_descriptions WHERE source_type='o4o_hff_generated' AND description_type='STORE' AND status='canonical' AND coalesce(language,'ko')='ko' AND deleted_at IS NULL AND NOT (content ~ '<h2>[^<]*기능성[^<]*</h2>')) AS without_fn_section`)).rows[0];

const tg = rb.targets[0];
let actual = 0, rolledBack = false, failReason = null;
try {
  await c.query('BEGIN');
  const q = await c.query(`
    UPDATE shared_product_descriptions
       SET content = $1, updated_at = now()
     WHERE id = $2 AND master_id = $3
       AND description_type = 'STORE' AND status = 'canonical'
       AND coalesce(language,'ko') = 'ko' AND deleted_at IS NULL
       AND content = $4
     RETURNING id`, [tg.newContent, tg.canonicalId, tg.productMasterId, tg.oldContent]);
  actual = q.rowCount;
  if (actual !== 1) { failReason = `EXPECTED_ACTUAL_MISMATCH 1 != ${actual}`; throw new Error(failReason); }

  const v = await c.query(`SELECT content FROM shared_product_descriptions WHERE id = $1`, [tg.canonicalId]);
  if (sha(v.rows[0].content) !== tg.newContentHash) { failReason = 'POST_HASH_MISMATCH'; throw new Error(failReason); }
  const dup = await c.query(`
    SELECT count(*)::int c FROM shared_product_descriptions
    WHERE master_id = $1 AND description_type='STORE' AND status='canonical'
      AND coalesce(language,'ko')='ko' AND deleted_at IS NULL`, [tg.productMasterId]);
  if (dup.rows[0].c !== 1) { failReason = `CANONICAL_DUP c=${dup.rows[0].c}`; throw new Error(failReason); }
  const mid = (await c.query(`SELECT count(*)::int c FROM shared_product_descriptions WHERE deleted_at IS NULL`)).rows[0].c;
  if (mid !== before.spd_all) { failReason = `ROW_COUNT_CHANGED ${before.spd_all} -> ${mid}`; throw new Error(failReason); }
  await c.query('COMMIT');
} catch (e) {
  try { await c.query('ROLLBACK'); rolledBack = true; } catch {}
  failReason = failReason ?? String(e.message || e);
}

const after = (await c.query(`
  SELECT
    (SELECT count(*)::int FROM shared_product_descriptions WHERE deleted_at IS NULL) AS spd_all,
    (SELECT count(*)::int FROM shared_product_descriptions WHERE description_type='STORE' AND status='canonical' AND coalesce(language,'ko')='ko' AND deleted_at IS NULL) AS spd_store_ko,
    (SELECT count(*)::int FROM shared_product_descriptions WHERE source_type='o4o_hff_generated' AND description_type='STORE' AND status='canonical' AND coalesce(language,'ko')='ko' AND deleted_at IS NULL AND content ~ '<h2>[^<]*기능성[^<]*</h2>') AS with_fn_section,
    (SELECT count(*)::int FROM shared_product_descriptions WHERE source_type='o4o_hff_generated' AND description_type='STORE' AND status='canonical' AND coalesce(language,'ko')='ko' AND deleted_at IS NULL AND NOT (content ~ '<h2>[^<]*기능성[^<]*</h2>')) AS without_fn_section`)).rows[0];

const out = {
  ranAt: new Date().toISOString(),
  wo: rb.wo,
  status: rolledBack ? 'ROLLED_BACK' : 'APPLIED',
  expectedUpdate: 1, actualUpdate: rolledBack ? 0 : actual, rolledBack, failReason,
  countsBefore: before, countsAfter: after,
  rowCountUnchanged: before.spd_all === after.spd_all && before.spd_store_ko === after.spd_store_ko,
  fnSectionDelta: { with: after.with_fn_section - before.with_fn_section, without: after.without_fn_section - before.without_fn_section },
  target: { canonicalId: tg.canonicalId, productName: tg.productName, newContentHash: tg.newContentHash, insertedClauses: clauses },
};
fs.writeFileSync(OUT_AP, JSON.stringify(out, null, 1));
if (!rolledBack) { rb.targets[0].applyStatus = 'APPLIED'; fs.writeFileSync(OUT_RB, JSON.stringify(rb, null, 1)); }

console.log(JSON.stringify(out, null, 2));
await c.end();
if (rolledBack) process.exit(1);
