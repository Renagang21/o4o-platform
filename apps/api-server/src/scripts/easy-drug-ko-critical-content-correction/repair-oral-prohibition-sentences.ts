/**
 * WO-O4O-EASY-DRUG-KO-CRITICAL-CONTENT-CORRECTION-V1 — 단계 3 시정본 자체 결함 수리
 *
 * 독립검증(C6)에서 시정본 자체의 결함이 실측됐다.
 *   비경구 route 프로파일의 `NONORAL_REWRITE` 마지막 규칙 `[/내복/g, '사용']` 이
 *   "이 약은 외용으로만 사용하고 **내복**하지 마십시오" 를
 *   "이 약은 외용으로만 사용하고 **사용**하지 마십시오" 로 바꿔 안전 문장을 자기모순으로 만든다.
 *   같은 원리로 "국소적으로 적용하거나 **복용**하지 마십시오" 도 파손된다.
 *
 * 근본 수정은 저작기 쪽에 했다(`otc-v2-store-leaflet-runner.shared.ts` 의
 * `isOralProhibitionSentence` / `rewriteKoByRoute` + `otc-v3-content-leaflet-composer.na.ts`).
 * 이 러너는 **이 WO 가 이미 넣은 신규본만** 고친 저작기로 다시 조립해 교체한다.
 *   - 대상 = correction-plan.json 의 REPLACE 765건 중 재조립 결과 md5 가 달라지는 건
 *   - 대상 밖 update 0 (기존 코퍼스 224건은 이 WO 범위 밖 — CHECK 에 잔존 위험으로 보고)
 *   - EN·zh·ja write 0 / product_masters write 0 / 물리 삭제 0
 *
 * 실행:
 *   PGPASSWORD=... ../../node_modules/.bin/tsx .../repair-oral-prohibition-sentences.ts --port 15441
 *   EASY_DRUG_KO_CRITICAL_CORRECTION_APPLY_CONFIRM=YES ... --apply
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  WO, AUDIT_COMMIT, RESULTS_DIR, connect, md5,
  fetchTargetMasters, planMaster,
  type Db, type CorrectionPlanRow, type TargetUnit,
} from './correction-contract.js';

const PLAN = path.join(RESULTS_DIR, 'correction-plan.json');
const APPLY = process.argv.includes('--apply');
const ENV_GATE = process.env.EASY_DRUG_KO_CRITICAL_CORRECTION_APPLY_CONFIRM === 'YES';
const NEW_SOURCE_TYPE = 'mfds_drug_otc';
const REPAIR_PHASE = 'repair-oral-prohibition';

interface RepairResult {
  masterId: string; itemSeq: string; outcome: string;
  oldDescId: string; newDescId: string | null; error?: string;
}

/** apply-corrections 와 동일한 3중 일치 + per-master TX. 차이는 대상이 "이번 WO 의 신규본" 이라는 점뿐. */
async function repairOne(db: Db, p: CorrectionPlanRow): Promise<RepairResult> {
  const base: RepairResult = {
    masterId: p.masterId, itemSeq: p.itemSeq, outcome: 'FAILED',
    oldDescId: p.oldDescId, newDescId: null,
  };
  const c = await db.pool.connect();
  try {
    await c.query('BEGIN');
    const cur = (await c.query(
      `SELECT id::text, status, source_ref_id::text ref, md5(content) cmd5
         FROM shared_product_descriptions
        WHERE id=$1 AND deleted_at IS NULL AND description_type='STORE'
          AND COALESCE(language,'ko')='ko'
        FOR UPDATE`, [p.oldDescId])).rows[0];
    if (!cur) { await c.query('ROLLBACK'); return { ...base, outcome: 'SKIP_ROW_MISSING' }; }
    if (cur.status !== 'canonical') { await c.query('ROLLBACK'); return { ...base, outcome: 'SKIP_NOT_CANONICAL' }; }
    if (cur.cmd5 === p.newMd5) { await c.query('ROLLBACK'); return { ...base, outcome: 'SKIP_ALREADY_REPAIRED' }; }
    if (cur.cmd5 !== p.oldMd5) { await c.query('ROLLBACK'); return { ...base, outcome: 'SKIP_CONTENT_DRIFTED' }; }

    const dep = await c.query(
      `UPDATE shared_product_descriptions SET status='deprecated', updated_at=now()
        WHERE id=$1 AND status='canonical'`, [p.oldDescId]);
    if (dep.rowCount !== 1) throw new Error(`강등 rowCount=${dep.rowCount}`);

    if (!p.newHtml || md5(p.newHtml) !== p.newMd5) throw new Error('수리본 md5 불일치');
    const newId = (await c.query(
      `INSERT INTO shared_product_descriptions
         (master_id, content, summary, source_type, source_ref_id, status, language,
          description_type, curated_at, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,'canonical','ko','STORE',now(),now(),now())
       RETURNING id::text`,
      [p.masterId, p.newHtml, p.newSummary, NEW_SOURCE_TYPE, cur.ref])).rows[0].id;

    await c.query(
      `INSERT INTO shared_product_description_audit_logs
         (event_type, description_type, master_id, language,
          previous_description_id, new_description_id, previous_status, new_status,
          performed_at, created_at, metadata)
       VALUES ('canonical_replaced','STORE',$1,'ko',$2,$3,'canonical','canonical', now(), now(), $4::jsonb)`,
      [p.masterId, p.oldDescId, newId, JSON.stringify({
        wo: WO, phase: REPAIR_PHASE, auditCommit: AUDIT_COMMIT, auditVerdict: p.verdict,
        reason: '경구 금지 문장(외용 대조)이 경로 동사 재표현으로 파손된 것을 수리 — 원문 문장 복원',
        previousMd5: p.oldMd5, newMd5: p.newMd5, route: p.route, permitCode: p.itemSeq,
      })]);

    const v = (await c.query(
      `SELECT count(*) FILTER (WHERE status='canonical')::int ko_canon,
              count(*) FILTER (WHERE status='canonical' AND md5(content)=$2)::int ko_new
         FROM shared_product_descriptions
        WHERE master_id=$1 AND deleted_at IS NULL AND description_type='STORE'
          AND COALESCE(language,'ko')='ko'`, [p.masterId, p.newMd5])).rows[0];
    if (v.ko_canon !== 1 || v.ko_new !== 1) throw new Error(`post-verify ko canonical ${v.ko_canon}/${v.ko_new}`);

    if (APPLY && ENV_GATE) await c.query('COMMIT');
    else await c.query('ROLLBACK');
    return { ...base, outcome: 'REPAIRED', newDescId: newId };
  } catch (e: any) {
    try { await c.query('ROLLBACK'); } catch { /* noop */ }
    return { ...base, outcome: 'FAILED', error: String(e?.message ?? e) };
  } finally {
    c.release();
  }
}

async function main() {
  if (APPLY && !ENV_GATE) {
    process.stderr.write('STOP: --apply 는 EASY_DRUG_KO_CRITICAL_CORRECTION_APPLY_CONFIRM=YES 와 함께여야 한다.\n');
    process.exitCode = 2; return;
  }
  const plan: CorrectionPlanRow[] = JSON.parse(fs.readFileSync(PLAN, 'utf8')).rows;
  const replaced = plan.filter((p) => p.action === 'REPLACE');

  // 현재 LIVE canonical = 이 WO 의 신규본. (itemSeq, newMd5) 로 다시 잡는다.
  const seen = new Set<string>();
  const targets: TargetUnit[] = [];
  for (const p of replaced) {
    const k = `${p.itemSeq}|${p.newMd5}`;
    if (seen.has(k)) continue;
    seen.add(k);
    targets.push({ itemSeq: p.itemSeq, contentMd5: p.newMd5!, verdict: p.verdict, sourceType: NEW_SOURCE_TYPE, nMaster: 0 });
  }

  const db = await connect();
  try {
    const masters = await fetchTargetMasters(db, targets);
    const recomputed = masters.map(planMaster);

    const needRepair = recomputed.filter((r) => r.action === 'REPLACE');
    const unchanged = recomputed.filter((r) => r.holdCode === 'NO_CHANGE');
    const unexpected = recomputed.filter((r) => r.action === 'HOLD' && r.holdCode !== 'NO_CHANGE');
    if (unexpected.length) {
      process.stderr.write(`*** SYSTEM STOP: 이미 REPLACE 된 제품 ${unexpected.length}건이 HOLD 로 떨어졌다 ***\n`);
      process.stderr.write(JSON.stringify(unexpected.slice(0, 5).map((u) => ({ m: u.masterId, h: u.holdCode, a: u.anomalies })), null, 2) + '\n');
      process.exitCode = 2; return;
    }

    const results: RepairResult[] = [];
    for (const p of needRepair) results.push(await repairOne(db, p));
    const byOutcome: Record<string, number> = {};
    for (const r of results) byOutcome[r.outcome] = (byOutcome[r.outcome] || 0) + 1;

    const summary = {
      wo: WO, phase: REPAIR_PHASE,
      mode: APPLY && ENV_GATE ? 'LIVE APPLY' : 'DRY-RUN',
      scope: { replaceRows: replaced.length, liveMastersMatched: masters.length },
      needRepair: needRepair.length, unchanged: unchanged.length,
      byOutcome,
      failed: results.filter((r) => r.outcome === 'FAILED').slice(0, 10),
    };
    const stamp = (APPLY && ENV_GATE) ? 'live' : 'dry-run';
    fs.writeFileSync(path.join(RESULTS_DIR, `repair-${stamp}.json`),
      JSON.stringify({ ...summary, results }, null, 2) + '\n', 'utf8');
    process.stdout.write(JSON.stringify(summary, null, 2) + '\n');
    if (summary.failed.length) process.exitCode = 2;
  } finally {
    await db.destroy();
  }
}

main();
