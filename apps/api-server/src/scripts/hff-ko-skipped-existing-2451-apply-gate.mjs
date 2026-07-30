/**
 * WO-O4O-HFF-KO-SKIPPED-EXISTING-2451-FUNCTION-CANONICAL-BACKFILL-V1  §21~§23
 *
 * 최종 안전 대상 교집합 + rollback manifest + apply 게이트.
 *   - 모든 선행 게이트(fixture / diff / quality / regression / render) 가 PASS 인지 확인.
 *   - 대상은 5개 산출물의 **교집합**으로만 확정한다.
 *   - rollback manifest 는 현재 DB content 전문(원상복구 payload) 을 담는다.
 * read-only.
 *
 * 산출물
 *   - data/hff-ko-skipped-existing-2451-rollback-manifest-v1.json
 *   - data/hff-ko-skipped-existing-2451-apply-gate-v1.json
 */
import pg from 'pg';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { applyPatch, verifyPatch } from './hff-ko-function-family-preserving-patch.mjs';

const DATA = 'apps/api-server/src/scripts/data';
const WO = 'WO-O4O-HFF-KO-SKIPPED-EXISTING-2451-FUNCTION-CANONICAL-BACKFILL-V1';
const sha = (s) => crypto.createHash('sha256').update(String(s ?? ''), 'utf8').digest('hex');
const J = (f) => JSON.parse(fs.readFileSync(`${DATA}/${f}`, 'utf8'));

const fixture = J('hff-ko-skipped-existing-2451-fixture-results-v1.json');
const diff = J('hff-ko-skipped-existing-2451-function-diff-v1.json');
const safe = J('hff-ko-skipped-existing-2451-safe-targets-v1.json');
const quality = J('hff-ko-skipped-existing-2451-quality-samples-v1.json');
const regression = J('hff-ko-skipped-existing-2451-full-regression-v1.json');
const render = J('hff-ko-skipped-existing-2451-render-audit-v1.json');
const preapply = J('hff-ko-skipped-existing-2451-preapply-verification-v1.json');
const familyAudit = J('hff-ko-skipped-existing-2451-renderer-family-audit-v1.json');
const sourceAudit = J('hff-ko-skipped-existing-2451-source-metadata-audit-v1.json');

const checks = [];
const add = (name, ok, evidence) => checks.push({ name, ok, evidence });

/* 1) 선행 게이트 verdict */
for (const [name, art] of [
  ['GATE_PREAPPLY_VERIFICATION', preapply], ['GATE_FIXTURE_CHECK', fixture],
  ['GATE_FUNCTION_DIFF', diff], ['GATE_QUALITY_SAMPLES', quality],
  ['GATE_FULL_REGRESSION', regression], ['GATE_RENDER_AUDIT', render],
]) add(name, art.verdict === 'PASS', { verdict: art.verdict });

// family / source metadata 산출물은 실측 인벤토리이므로 verdict 대신 불변식을 직접 판정한다.
add('GATE_RENDERER_FAMILY_AUDIT',
  familyAudit.items.length === 2451 && (familyAudit.familyCount.OTHER_OR_UNKNOWN ?? 0) === 0
  && (familyAudit.familyCount.DRIVER ?? 0) + (familyAudit.familyCount.COMPOSITE ?? 0) === 2451,
  familyAudit.familyCount);
add('GATE_SOURCE_METADATA_AUDIT',
  sourceAudit.items.length === 2451
  && sourceAudit.sourceTypeCount.o4o_hff_generated === 2451
  && sourceAudit.sourceRefKindCount.EQ_CANDIDATE_ID === 2451
  && sourceAudit.descriptionTypeCount.STORE === 2451
  && sourceAudit.languageCount.ko === 2451
  && sourceAudit.statusCount.canonical === 2451,
  { sourceType: sourceAudit.sourceTypeCount, sourceRefKind: sourceAudit.sourceRefKindCount });

/* 2) 교집합 확정 */
const qualitySafe = new Map(quality.samples.filter((s) => s.kind === 'SAFE_APPLY').map((s) => [s.candidateId, s]));
const diffSafe = new Map(diff.items.filter((r) => r.applyStatus === 'SAFE_APPLY').map((r) => [r.candidateId, r]));
const renderOk = new Set(render.perWidth[0].samples.filter((s) => s.fails.length === 0).map((s) => s.candidateId));
const renderAllWidths = new Set([...renderOk].filter((c) => render.perWidth.every((w) => w.samples.some((s) => s.candidateId === c && s.fails.length === 0))));
const finalIds = safe.items.map((x) => x.candidateId)
  .filter((c) => diffSafe.has(c) && qualitySafe.has(c) && renderAllWidths.has(c));

add('INTERSECTION_COMPLETE', finalIds.length === safe.items.length,
  { safeTargets: safe.items.length, diffSafe: diffSafe.size, qualitySafe: qualitySafe.size, renderPassAllWidths: renderAllWidths.size, final: finalIds.length });
add('NO_SCOPE_EXPANSION', finalIds.length <= 2451 && finalIds.length <= safe.items.length, { final: finalIds.length });
add('QUALITY_ALL_PASS', quality.samples.filter((s) => s.kind === 'SAFE_APPLY').every((s) => s.manualVerdict === 'PASS'), { violations: quality.invariantViolations.length });
add('REGRESSION_INTERSECTIONS_EMPTY',
  ['SAFE_INTERSECT_CREATED_5269_EMPTY', 'SAFE_INTERSECT_HUMAN_REVIEW_3652_EMPTY', 'SAFE_INTERSECT_HOLD_348_EMPTY']
    .every((n) => regression.checks.find((c) => c.name === n)?.ok === true), {});

/* 3) 현재 DB 상태 재확인 + rollback payload 확보 */
const client = new pg.Client({ host: '127.0.0.1', port: parseInt(process.env.PROXY_PORT ?? '5463', 10), user: 'o4o_api', password: process.env.PGPW, database: 'o4o_platform', ssl: false, statement_timeout: 600000 });
await client.connect();
await client.query('SET default_transaction_read_only = on');
const ro = (await client.query('SHOW transaction_read_only')).rows[0].transaction_read_only;
if (ro !== 'on') { console.error('READ_ONLY_ASSERTION_FAILED'); process.exit(2); }
const byCand = new Map(safe.items.map((x) => [x.candidateId, x]));
const rows = (await client.query(`
  SELECT id, master_id, source_type, source_ref_id, description_type, language, status,
         content, updated_at, created_at
  FROM shared_product_descriptions
  WHERE id = ANY($1) AND description_type = 'STORE' AND status = 'canonical'
    AND coalesce(language, 'ko') = 'ko' AND deleted_at IS NULL`,
[finalIds.map((c) => byCand.get(c).canonicalId)])).rows;
await client.end();

const manifest = [];
const driftIds = [];
const patchFailIds = [];
for (const c of finalIds) {
  const t = byCand.get(c);
  const row = rows.find((r) => r.id === t.canonicalId);
  if (!row) { driftIds.push({ candidateId: c, reason: 'CANONICAL_ROW_NOT_FOUND' }); continue; }
  if (sha(row.content) !== t.baselineContentHash) { driftIds.push({ candidateId: c, reason: 'BASELINE_HASH_DRIFT', dbHash: sha(row.content), expected: t.baselineContentHash }); continue; }
  const after = applyPatch({ content: row.content, plan: { inserts: t.inserts } });
  const fails = verifyPatch({ before: row.content, after, plan: { inserts: t.inserts } });
  if (fails.length) { patchFailIds.push({ candidateId: c, fails }); continue; }
  manifest.push({
    candidateId: c, canonicalId: t.canonicalId, productMasterId: t.productMasterId,
    statementNo: t.statementNo, productName: t.productName,
    rendererFamily: t.family, sourceType: row.source_type, sourceRefId: row.source_ref_id,
    descriptionType: row.description_type, language: row.language ?? 'ko', status: row.status,
    changeReason: t.changeReason ?? 'SAFE_MISSING_CLAUSE',
    insertCount: t.inserts.length,
    inserts: t.inserts,
    // WHERE 절 기준 = DB 실측 baseline (manifest 해시가 아니다)
    beforeContentHash: sha(row.content), afterContentHash: sha(after),
    beforeLength: row.content.length, afterLength: after.length,
    beforeUpdatedAt: row.updated_at, createdAt: row.created_at,
    // rollback payload — 원상복구용 전문
    rollbackContent: row.content,
    rollbackSql: 'UPDATE shared_product_descriptions SET content = :rollbackContent, updated_at = now() WHERE id = :canonicalId AND md5(content) = md5(:afterContent)',
  });
}
add('NO_BASELINE_DRIFT', driftIds.length === 0, { drift: driftIds });
add('NO_PATCH_VERIFY_FAILURE', patchFailIds.length === 0, { failures: patchFailIds });
add('MANIFEST_COVERS_FINAL_SET', manifest.length === finalIds.length, { manifest: manifest.length, final: finalIds.length });
add('MANIFEST_ROLLBACK_PAYLOAD_PRESENT', manifest.every((m) => typeof m.rollbackContent === 'string' && m.rollbackContent.length > 0), {});
add('MANIFEST_CANONICAL_IDS_UNIQUE', new Set(manifest.map((m) => m.canonicalId)).size === manifest.length, {});
add('MANIFEST_SOURCE_METADATA_UNCHANGED', manifest.every((m) => m.sourceType === 'o4o_hff_generated' && m.sourceRefId === m.candidateId), {});

const verdict = checks.every((c) => c.ok) ? 'APPLY_APPROVED' : 'STOP';

fs.writeFileSync(`${DATA}/hff-ko-skipped-existing-2451-rollback-manifest-v1.json`, JSON.stringify({
  workOrder: WO,
  contract: '§22 — 최종 안전 대상 rollback manifest. rollbackContent = apply 직전 DB content 전문. manifest 밖 write 금지.',
  generatedAt: new Date().toISOString(),
  count: manifest.length, items: manifest,
}, null, 1));

fs.writeFileSync(`${DATA}/hff-ko-skipped-existing-2451-apply-gate-v1.json`, JSON.stringify({
  workOrder: WO,
  contract: '§21·§23 — 선행 게이트 전량 PASS + 5개 산출물 교집합 확정 후에만 APPLY_APPROVED.',
  generatedAt: new Date().toISOString(),
  scope: {
    woTargetSet: 2451, safeCandidates: safe.items.length, finalApplyTargets: manifest.length,
    humanReview: diff.applyStatusCount.HUMAN_REVIEW ?? 0,
    unsupportedStructure: diff.applyStatusCount.UNSUPPORTED_STRUCTURE ?? 0,
    noChange: diff.applyStatusCount.NO_CHANGE ?? 0,
    scopeExpansion: false,
  },
  allowedUpdateColumns: ['content', 'updated_at'],
  checks, verdict,
}, null, 1));

console.log(JSON.stringify({
  finalApplyTargets: manifest.length, drift: driftIds.length, patchFail: patchFailIds.length,
  failed: checks.filter((c) => !c.ok).map((c) => c.name), verdict,
}, null, 1));
if (verdict !== 'APPLY_APPROVED') process.exit(2);
