/**
 * WO-O4O-EASY-DRUG-KO-CRITICAL-CONTENT-CORRECTION-V1 — 단계 1 시정 계획 수립 (**READ-ONLY**)
 *
 * WO 실행항목 "최신 LIVE 모집단 재확인" + 제품별 재조립 계획.
 *   - 감사 시점(2deeb8e73) 본문 md5 가 지금도 canonical 인지 대조 → 이동분은 STALE 로 제외
 *   - 제품별 자기 e약은요 원문으로 KO 재조립 (composeKoV4)
 *   - 재조립 불가 = HOLD(비노출). 부분 수정·타 제품 재사용 0
 *
 * ⚠️ DB write 0.
 *
 * 실행:
 *   PGPASSWORD=... ../../node_modules/.bin/tsx src/scripts/easy-drug-ko-critical-content-correction/plan-corrections.ts --port 15441
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  WO, AUDIT_WO, AUDIT_COMMIT, RESULTS_DIR,
  loadTargets, connect, fetchTargetMasters, planMaster, type CorrectionPlanRow,
} from './correction-contract.js';

const OUT_PLAN = path.join(RESULTS_DIR, 'correction-plan.json');
const OUT_SUMMARY = path.join(RESULTS_DIR, 'plan-summary.json');

async function main() {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
  const targets = loadTargets();
  const db = await connect();
  const stop: string[] = [];
  try {
    // ── LIVE 재확인 ────────────────────────────────────────────────────────────
    const masters = await fetchTargetMasters(db, targets);
    const liveUnits = new Set(masters.map((m) => `${m.itemSeq}|${m.contentMd5}`));
    const staleUnits = targets.filter((t) => !liveUnits.has(`${t.itemSeq}|${t.contentMd5}`));

    // 감사 원장의 nMaster 합과 LIVE master 수 대조 (감사 이후 이동 감지)
    const ledgerMasters = targets.reduce((a, t) => a + t.nMaster, 0);

    // ── 제품별 재조립 계획 ──────────────────────────────────────────────────────
    const plan: CorrectionPlanRow[] = masters.map(planMaster);

    // 신규 본문이 대상 밖 본문과 충돌하지 않는지 (같은 master 에 동일 md5 canonical 존재 여부)
    const dupNew = plan.filter((p) => p.newMd5 && p.newMd5 === p.oldMd5);
    if (dupNew.length) stop.push(`SYS: 신규본 md5 == 기존본 md5 ${dupNew.length}건`);
    const descIds = plan.map((p) => p.oldDescId);
    if (new Set(descIds).size !== descIds.length) stop.push('SYS: oldDescId 중복 — master 당 canonical 2건 이상');

    const byVerdict: Record<string, { replace: number; hold: number }> = {};
    const byHold: Record<string, number> = {};
    const byRoute: Record<string, number> = {};
    for (const p of plan) {
      byVerdict[p.verdict] = byVerdict[p.verdict] || { replace: 0, hold: 0 };
      if (p.action === 'REPLACE') byVerdict[p.verdict].replace++; else byVerdict[p.verdict].hold++;
      if (p.holdCode) byHold[p.holdCode] = (byHold[p.holdCode] || 0) + 1;
      if (p.action === 'REPLACE') byRoute[p.route || 'null'] = (byRoute[p.route || 'null'] || 0) + 1;
    }

    const summary = {
      wo: WO, auditWo: AUDIT_WO, auditCommit: AUDIT_COMMIT,
      mode: 'READ-ONLY plan', liveDbWrite: 0,
      ledger: { units: targets.length, mastersExpected: ledgerMasters },
      live: {
        unitsStillCanonical: liveUnits.size,
        staleUnits: staleUnits.length,
        staleDetail: staleUnits.slice(0, 20),
        masters: masters.length,
      },
      plan: {
        total: plan.length,
        replace: plan.filter((p) => p.action === 'REPLACE').length,
        hold: plan.filter((p) => p.action === 'HOLD').length,
      },
      byVerdict, byHoldCode: byHold, byRouteReplace: byRoute,
      distinctNewBodies: new Set(plan.filter((p) => p.newMd5).map((p) => p.newMd5)).size,
      systemStop: stop,
    };

    fs.writeFileSync(OUT_PLAN, JSON.stringify({ wo: WO, generatedFrom: AUDIT_COMMIT, rows: plan }, null, 2) + '\n', 'utf8');
    fs.writeFileSync(OUT_SUMMARY, JSON.stringify(summary, null, 2) + '\n', 'utf8');
    process.stdout.write(JSON.stringify(summary, null, 2) + '\n');
    if (stop.length) { process.stderr.write('\n*** SYSTEM STOP ***\n'); process.exitCode = 2; }
  } finally {
    await db.destroy();
  }
}

main();
