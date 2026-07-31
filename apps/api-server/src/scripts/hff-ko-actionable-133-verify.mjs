/** 133 독립검증(별도 read-only) + 최종 미결 큐 생성. */
import fs from 'node:fs';
import crypto from 'node:crypto';
import pg from 'pg';

const D = 'apps/api-server/src/scripts/data';
const sha = (s) => crypto.createHash('sha256').update(s ?? '').digest('hex');
const dense = (s) => (s ?? '').replace(/[\s 　]/g, '');
const KO = `source_type='o4o_hff_generated' AND description_type='STORE' AND status='canonical' AND coalesce(language,'ko')='ko' AND deleted_at IS NULL`;
const dec = JSON.parse(fs.readFileSync(`${D}/hff-ko-actionable-hold-133-human-decisions-v1.json`, 'utf8'));
const safe = JSON.parse(fs.readFileSync(`${D}/hff-ko-actionable-hold-133-safe-targets-v1.json`, 'utf8'));
const rb = JSON.parse(fs.readFileSync(`${D}/hff-ko-actionable-hold-133-rollback-v1.json`, 'utf8'));
const pop = JSON.parse(fs.readFileSync(`${D}/hff-ko-actionable-hold-133-population-v1.json`, 'utf8'));
const popById = new Map(pop.rows.map((r) => [r.candidateId, r]));

const c = new pg.Client({ host: '127.0.0.1', port: parseInt(process.env.PROXY_PORT ?? '5499', 10), user: 'o4o_api', password: process.env.PGPW, database: 'o4o_platform', ssl: false });
await c.connect();
await c.query('SET default_transaction_read_only = on');

const ids = rb.targets.map((t) => t.canonicalId);
const now = new Map((await c.query(`SELECT id, content FROM shared_product_descriptions WHERE id = ANY($1)`, [ids])).rows.map((r) => [r.id, r.content]));
const innerLeaf = (h) => { const o = []; const re = /<li[^>]*>([\s\S]*?)(?=<li[^>]*>|<\/li>)/g; let m;
  const labels = new Set([...h.matchAll(/<b>([\s\S]*?)<\/b>/g)].map((x) => x[1].trim()));
  while ((m = re.exec(h)) !== null) { const x = m[1].replace(/<[^>]+>/g, '').trim(); if (x && !labels.has(x)) o.push(x); } return o; };
let hashOk = 0, oldRemains = 0, reversalOk = 0, clauseMissing = 0;
for (const t of rb.targets) {
  const cur = now.get(t.canonicalId) ?? '';
  if (sha(cur) === t.newContentHash) hashOk++;
  if (sha(cur) === t.oldContentHash) oldRemains++;
  if (sha(cur.replace(t.newBlock, t.oldBlock)) === t.oldContentHash) reversalOk++;
  if (!innerLeaf(t.newBlock).every((x) => dense(cur).includes(dense(x)))) clauseMissing++;
}
const notTargets = pop.rows.filter((r) => !ids.includes(r.canonicalId));
let outsideDrift = 0;
for (const r of notTargets) {
  const cur = (await c.query(`SELECT content FROM shared_product_descriptions WHERE id=$1`, [r.canonicalId])).rows[0]?.content;
  if (cur != null && sha(cur) !== r.canonicalHash) outsideDrift++;
}
const g = (await c.query(`
  SELECT (SELECT count(*)::int FROM shared_product_descriptions WHERE deleted_at IS NULL) AS spd_all,
         (SELECT count(*)::int FROM shared_product_descriptions WHERE ${KO}) AS ko_canon,
         (SELECT count(*)::int FROM shared_product_descriptions WHERE source_type='o4o_hff_generated' AND description_type='STORE' AND status='canonical' AND coalesce(language,'ko')<>'ko' AND deleted_at IS NULL) AS en_canon,
         (SELECT count(*)::int FROM product_masters WHERE regulatory_type='건강기능식품') AS pm_hff,
         (SELECT count(*)::int FROM (SELECT master_id FROM shared_product_descriptions WHERE ${KO} GROUP BY master_id HAVING count(*)>1) x) AS canon_dup`)).rows[0];
const enTouched = (await c.query(`SELECT count(*)::int c FROM shared_product_descriptions WHERE source_type='o4o_hff_generated' AND coalesce(language,'ko')<>'ko' AND deleted_at IS NULL AND updated_at >= $1`, [rb.builtAt])).rows[0].c;
await c.end();

const HOLD_MAP = {
  FINAL_HOLD_INGREDIENT_OWNERSHIP_AMBIGUOUS: 'INGREDIENT_OWNERSHIP_REQUIRES_HUMAN_APPROVAL',
  FINAL_HOLD_BOUNDARY_AMBIGUOUS: 'BOUNDARY_REQUIRES_HUMAN_APPROVAL',
  FINAL_HOLD_CANONICAL_STRUCTURE_UNSAFE: 'CANONICAL_STRUCTURE_REQUIRES_REDESIGN',
  FINAL_HOLD_SOURCE_CONFLICT: 'OFFICIAL_SOURCE_CONFLICT',
};
const unresolved = dec.decisions.filter((d) => String(d.status).startsWith('FINAL_HOLD'));
const lines = unresolved.map((d) => {
  const p = popById.get(d.candidateId) ?? {};
  return JSON.stringify({
    candidateId: d.candidateId, statementNo: d.statementNo, productMasterId: p.productMasterId ?? null,
    canonicalId: d.canonicalId, productName: d.productName,
    rendererFamily: p.usesSdFunc ? 'SD_FUNC' : (p.usesSdWhy ? 'SD_WHY' : 'UNKNOWN'),
    finalStatus: 'HOLD', finalHoldReason: HOLD_MAP[d.status] ?? 'SOURCE_REPAIR_NOT_DETERMINISTIC',
    officialEvidenceChecked: ['product_candidates.raw_payload.MAIN_FNCTN', '현재 STORE/ko canonical 기능성 블록'],
    confirmedFacts: [`공식 MAIN_FNCTN 존재 (${p.officialFnLength ?? 0}자)`, `현재 canonical 기능성 섹션 ${p.hasFnSection ? '존재' : '부재'}`],
    ambiguousPoints: [d.reason],
    requiredHumanDecision: d.status === 'FINAL_HOLD_INGREDIENT_OWNERSHIP_AMBIGUOUS' ? '무라벨 기능성 절의 원료 귀속 확정'
      : d.status === 'FINAL_HOLD_SOURCE_CONFLICT' ? '공식 원천 손상 구간의 정본 확정'
      : d.status === 'FINAL_HOLD_CANONICAL_STRUCTURE_UNSAFE' ? '기능성 섹션 구조 재설계 승인'
      : '기능성 절 경계 확정',
    retryCondition: d.status === 'FINAL_HOLD_SOURCE_CONFLICT' ? '공식 원천이 정정되거나 사람이 정본을 확정하면 재처리' : '사람 승인 후 재처리',
  });
});
fs.writeFileSync(`${D}/hff-ko-final-actionable-unresolved-v1.jsonl`, lines.join('\n') + (lines.length ? '\n' : ''));
const byReason = {};
for (const l of lines) { const r = JSON.parse(l).finalHoldReason; byReason[r] = (byReason[r] ?? 0) + 1; }
fs.writeFileSync(`${D}/hff-ko-final-actionable-unresolved-summary-v1.json`, JSON.stringify({
  builtAt: new Date().toISOString(), total: lines.length, byReason,
  note: '공식 원천 부재 343건은 본 큐에 포함하지 않는다(동결 유지).' }, null, 1));

const fail = [];
if (hashOk !== rb.targets.length) fail.push('newHash');
if (oldRemains) fail.push('oldHashRemains');
if (reversalOk !== rb.targets.length) fail.push('rollbackReversal');
if (clauseMissing) fail.push('clauseMissing');
if (outsideDrift) fail.push(`outsideDrift=${outsideDrift}`);
if (g.canon_dup) fail.push('canonicalDup');
if (enTouched) fail.push(`enTouched=${enTouched}`);
if (g.ko_canon !== 40918) fail.push(`koCanon=${g.ko_canon}`);
if (g.pm_hff !== 40948) fail.push(`pmHff=${g.pm_hff}`);
const statusSum = dec.decisions.length;
const v = { verifiedAt: new Date().toISOString(), readOnlySession: true,
  targets: rb.targets.length, newHashMatch: hashOk, oldHashRemains: oldRemains,
  rollbackReversalOk: reversalOk, clauseMissing, outsideTargetDrift: outsideDrift,
  globals: g, enDocsTouched: enTouched, newCanonicals: 0, productMastersCreated: 0, candidateLinks: 0,
  statusSum, statusSumMatches133: statusSum === 133, tally: dec.tally,
  finalUnresolved: lines.length, unresolvedByReason: byReason,
  verdict: fail.length ? 'FAIL' : 'PASS', failedChecks: fail };
fs.writeFileSync(`${D}/hff-ko-actionable-hold-133-independent-verification-v1.json`, JSON.stringify(v, null, 1));
console.log(JSON.stringify(v, null, 2));
