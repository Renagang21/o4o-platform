/**
 * WO-O4O-OTC-EASY-DRUG-READY-ORAL-540-CONTENT-FP-V3-FINAL-READINESS-V1 — PRE_APPLY READY 원장 emit(da)
 *
 * apply 러너의 dry-run(x2 byte-identical) + rollback-test(residue 0) 를 재실행해 unit별 PRE_APPLY READY
 * 증거 원장을 만든다. write 0(dry-run) / net write 0(rollback). 결과 = otc-easy-drug-ready-oral-v3-preapply-ready-{unit}.json
 *
 * Usage(apps/api-server): ../../node_modules/.bin/tsx src/scripts/otc-easy-drug-ready-oral-v3-preapply-emit.da.ts [--port 5442]
 */
import { writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const DATA = path.resolve(process.cwd(), 'src/scripts/data');
const RUNNER = 'src/scripts/otc-easy-drug-ready-oral-v3-apply.da.ts';
const TSX_CLI = path.resolve(process.cwd(), '../../node_modules/tsx/dist/cli.mjs');
const UNITS = ['oral-unit-1', 'oral-unit-2'];
const argPort = (): string => { const i = process.argv.indexOf('--port'); return i >= 0 ? process.argv[i + 1] : '5442'; };

function run(unit: string, extra: string[]): any {
  const out = execFileSync(process.execPath, [TSX_CLI, RUNNER, '--unit', unit, '--port', argPort(), ...extra], {
    cwd: process.cwd(), encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
  });
  const s = out.indexOf('{'); const e = out.lastIndexOf('\n=== ');
  return JSON.parse(out.slice(s, e < 0 ? undefined : e));
}

function main(): void {
  const summary: any[] = [];
  for (const unit of UNITS) {
    const dry1 = run(unit, []);
    const dry2 = run(unit, []);
    const rb = run(unit, ['--rollback-test']);
    const ready = {
      wo: dry1.wo, agent: 'da', unit, route: dry1.route,
      status: 'PRE_APPLY_READY',
      fpCount: dry1.fpCount, masterCount: dry1.masterCount,
      writeContract: { koPerMaster: 4, enPerMaster: 2, koTotal: dry1.masterCount * 4, enTotal: dry1.masterCount * 2, grandTotal: dry1.masterCount * 6 },
      dryRun: {
        pass: dry1.pass, koWritePlan: dry1.dryRun.koWritePlan, enWritePlan: dry1.dryRun.enWritePlan,
        anomalies: dry1.dryRun.anomalies, enHeldPendingKo: dry1.dryRun.enHeldPendingKo,
        planDigestMd5Run1: dry1.planDigestMd5, planDigestMd5Run2: dry2.planDigestMd5,
        byteIdentical: dry1.planDigestMd5 === dry2.planDigestMd5,
      },
      rollbackTest: {
        pass: rb.pass, passed: rb.rollbackTest.passed, failed: rb.rollbackTest.failed,
        txWrittenThenRolledBack: rb.rollbackTest.txWrittenThenRolledBack,
        residue: rb.rollbackTest.residue, residueClean: rb.rollbackTest.residueClean,
        planDigestMd5: rb.planDigestMd5,
      },
      liveApply: { locked: true, gate: `OTC_V3_APPLY_KO_${unit.replace(/-/g, '_').toUpperCase()}=CONFIRM + EN 동일 + WO 범위 밖 강제중지(exit 3)` },
      ready: dry1.pass && dry2.pass && rb.pass && dry1.planDigestMd5 === dry2.planDigestMd5,
    };
    writeFileSync(path.join(DATA, `otc-easy-drug-ready-oral-v3-preapply-ready-${unit}.json`), JSON.stringify(ready, null, 2), 'utf8');
    summary.push({ unit, fpCount: ready.fpCount, masterCount: ready.masterCount, dryRunByteIdentical: ready.dryRun.byteIdentical, rollbackResidueClean: ready.rollbackTest.residueClean, READY: ready.ready });
  }
  console.log(JSON.stringify(summary, null, 2));
  console.log(`\n=== PRE_APPLY READY emit · units ${UNITS.length} · allReady=${summary.every((s) => s.READY)} ===`);
}
main();
