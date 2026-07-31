/**
 * WO-O4O-HFF-KO-NONTRANSLATION-RESIDUAL-AND-AGENT9-HOLD-FULL-CLEANUP-V1  §15
 *
 * Track A SAFE 26건 `content` + `updated_at` 만 갱신한다. Track B 는 INSERT 0 (§11 전제 미충족).
 * 이중 게이트: `--apply` + `HFF_KO_NONTRANSLATION_APPLY_CONFIRM=YES`
 * 게이트: §14 렌더 감사 PASS · 행마다 baseline sha256 일치 · rowCount === 1
 *         트랜잭션 내 전량 sha256 재검증 → 불일치 시 ROLLBACK
 *
 * 산출: data/hff-ko-nontranslation-apply-results-v1.json
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import pg from 'pg';

const D = 'apps/api-server/src/scripts/data';
const OUT = `${D}/hff-ko-nontranslation-apply-results-v1.json`;
const sha = (s) => crypto.createHash('sha256').update(Buffer.from(s, 'utf8')).digest('hex');

const targets = JSON.parse(fs.readFileSync(`${D}/hff-ko-nontranslation-safe-targets-v1.json`, 'utf8')).targets;
const render = JSON.parse(fs.readFileSync(`${D}/hff-ko-nontranslation-render-audit-v1.json`, 'utf8'));
const agent9 = JSON.parse(fs.readFileSync(`${D}/hff-agent9-hold-reconciliation-v1.json`, 'utf8'));

const APPLY = process.argv.includes('--apply');
const CONFIRM = process.env.HFF_KO_NONTRANSLATION_APPLY_CONFIRM === 'YES';

/* ── 사전 게이트 ─────────────────────────────────────────────── */
const gates = {
  renderVerdictPass: render.verdict === 'PASS',
  renderCoversAllTargets: render.rendered === targets.length,
  renderClauseLossZero: render.totals.clauseLoss === 0 && render.totals.labelLoss === 0,
  renderOutOfSourceZero: render.totals.outOfSourceAdditions === 0 && render.totals.ingredientMixing === 0,
  canonicalIdUnique: new Set(targets.map((t) => t.canonicalId)).size === targets.length,
  statementNoUnique: new Set(targets.map((t) => t.statementNo)).size === targets.length,
  afterHashMatchesContent: targets.every((t) => sha(t.afterContent) === t.afterHash),
  contentActuallyChanged: targets.every((t) => t.afterContent !== t.beforeContent),
  additiveOnly: targets.every((t) => t.afterContent.length > t.beforeContent.length),
  agent9NoInsert: agent9.canonicalCreated === 0,
  doubleGate: APPLY && CONFIRM,
};
const gateOk = Object.entries(gates).every(([k, v]) => (k === 'doubleGate' ? true : v));
if (!gateOk) { console.log(JSON.stringify({ error: 'GATE_FAIL', gates }, null, 2)); process.exit(1); }
if (!gates.doubleGate) {
  console.log(JSON.stringify({ mode: 'DRY_RUN', gates, expectedUpdates: targets.length, expectedInserts: 0,
    hint: 'HFF_KO_NONTRANSLATION_APPLY_CONFIRM=YES + --apply' }, null, 2));
  process.exit(0);
}

/* ── APPLY ───────────────────────────────────────────────────── */
const c = new pg.Client({ host: '127.0.0.1', port: parseInt(process.env.PROXY_PORT ?? '5463', 10), user: 'o4o_api', password: process.env.PGPW, database: 'o4o_platform', statement_timeout: 900000 });
await c.connect();

const rows = [];
let updated = 0, failed = 0, rolledBack = false, systemicError = null;
await c.query('BEGIN');
try {
  for (const t of targets) {
    const r = await c.query(`
      UPDATE shared_product_descriptions
         SET content = $1, updated_at = now()
       WHERE id = $2 AND master_id = $3
         AND source_type = 'o4o_hff_generated' AND description_type = 'STORE'
         AND status = 'canonical' AND deleted_at IS NULL AND coalesce(language,'ko') = 'ko'
         AND encode(sha256(convert_to(content,'UTF8')),'hex') = $4
       RETURNING id`, [t.afterContent, t.canonicalId, t.productMasterId, t.beforeHash]);
    if (r.rowCount === 1) { updated++; rows.push({ canonicalId: t.canonicalId, statementNo: t.statementNo, productName: t.productName, result: 'UPDATED', beforeHash: t.beforeHash, afterHash: t.afterHash }); }
    else { failed++; rows.push({ canonicalId: t.canonicalId, statementNo: t.statementNo, productName: t.productName, result: 'FINAL_HOLD', holdReason: 'BASELINE_HASH_DRIFT', rowCount: r.rowCount }); }
  }

  /* 트랜잭션 내 전량 재검증 */
  const verify = [];
  for (let i = 0; i < targets.length; i += 500) {
    const slice = targets.slice(i, i + 500);
    for (const r of (await c.query(
      `SELECT id, encode(sha256(convert_to(content,'UTF8')),'hex') h FROM shared_product_descriptions WHERE id = ANY($1)`,
      [slice.map((t) => t.canonicalId)])).rows) verify.push(r);
  }
  const vmap = new Map(verify.map((v) => [v.id, v.h]));
  const mismatched = targets.filter((t) => {
    const row = rows.find((x) => x.canonicalId === t.canonicalId);
    return row.result === 'UPDATED' ? vmap.get(t.canonicalId) !== t.afterHash : vmap.get(t.canonicalId) === t.afterHash;
  });
  if (mismatched.length) { systemicError = { code: 'POST_UPDATE_HASH_MISMATCH', count: mismatched.length }; throw new Error('POST_UPDATE_HASH_MISMATCH'); }
  if (updated !== rows.filter((r) => r.result === 'UPDATED').length) { systemicError = { code: 'EXPECTED_ACTUAL_MISMATCH' }; throw new Error('EXPECTED_ACTUAL_MISMATCH'); }
  await c.query('COMMIT');
} catch (e) {
  await c.query('ROLLBACK');
  rolledBack = true;
  systemicError = systemicError ?? { code: 'EXCEPTION', message: String(e.message) };
}
await c.end();

const out = {
  ranAt: new Date().toISOString(), wo: 'WO-O4O-HFF-KO-NONTRANSLATION-RESIDUAL-AND-AGENT9-HOLD-FULL-CLEANUP-V1',
  gates, applied: !rolledBack, rolledBack, systemicError,
  trackA: { expectedUpdates: targets.length, actualUpdates: rolledBack ? 0 : updated, finalHold: failed },
  trackB: { expectedInserts: 0, actualInserts: 0, note: '§11 전제(ProductMaster 단일 확정) 미충족 348건 전량 HOLD' },
  rows,
};
fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
console.log(JSON.stringify({ out: OUT, applied: out.applied, rolledBack, systemicError, trackA: out.trackA, trackB: out.trackB,
  finalHold: rows.filter((r) => r.result !== 'UPDATED') }, null, 2));
