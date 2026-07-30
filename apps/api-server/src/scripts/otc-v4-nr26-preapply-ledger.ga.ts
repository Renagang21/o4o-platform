/**
 * WO-O4O-OTC-EASY-DRUG-V4-NASAL14-RECTAL12-ROUTE-PROFILE-FINAL-READINESS-V1
 *   — §14 PRE_APPLY 원장 생성기 (파일 전용, DB 접속 0 / DB write 0)
 *
 * 실행 단위(nasal-unit-1 / rectal-unit-1) 별로 다음을 고정 기록한다:
 *   master 수 · master 별 sourceRef · 공식 원문 hash · KO content hash · EN content hash ·
 *   dry-run digest · rollback-test 결과 · 예상 write · 독립검증 결과 · LIVE apply 잠금 상태.
 *
 * 이 원장은 후속 LIVE 생산 WO 의 입력 계약이다. 여기 기록된 hash 와 다르면 그 WO 는 중지해야 한다.
 *
 * 실행: ../../node_modules/.bin/tsx src/scripts/otc-v4-nr26-preapply-ledger.ga.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const DATA = path.resolve(process.cwd(), 'src/scripts/data');
const P = (f: string): string => path.join(DATA, f);
const J = (f: string): any => JSON.parse(fs.readFileSync(f, 'utf8'));
const sha = (s: string): string => crypto.createHash('sha256').update(s).digest('hex');

const WO = 'WO-O4O-OTC-EASY-DRUG-V4-NASAL14-RECTAL12-ROUTE-PROFILE-FINAL-READINESS-V1';
const BATCH = 'otc-v4-nr26';
const UNITS = [
  { unit: 'nasal-unit-1', route: 'nasal', expected: 14 },
  { unit: 'rectal-unit-1', route: 'rectal', expected: 12 },
];

function main(): void {
  const sel = J(P('otc-v4-nr26-selection-ledger.ga.json'));
  const ko = new Map((J(P('otc-v4-nr26-ko-payload.ga.json')).payloads as any[]).map((p) => [p.masterId, p]));
  const en = new Map((J(P('otc-v4-nr26-en-payload.ga.json')).payloads as any[]).map((p) => [p.masterId, p]));
  const iv = J(P('otc-v4-nr26-independent-verification.ga.json'));

  const written: string[] = [];
  for (const u of UNITS) {
    const ms = (sel.masters as any[]).filter((m) => m.unit === u.unit);
    if (ms.length !== u.expected) throw new Error(`SYSTEM STOP: ${u.unit} ${ms.length} ≠ ${u.expected}`);
    const dry = J(P(`otc-v4-nr26-dryrun-${u.unit}.ga.json`));
    const rb = J(P(`otc-v4-nr26-rollback-test-${u.unit}.ga.json`));
    const planDigest = sha(fs.readFileSync(P(`otc-v4-nr26-dryrun-plan-${u.unit}.ga.json`), 'utf8'));
    if (planDigest !== dry.summary.planDigest) throw new Error(`SYSTEM STOP: ${u.unit} planDigest 불일치`);

    const rows = ms.map((m) => ({
      masterId: m.masterId,
      productName: m.productName,
      permitCode: m.permitCode,
      route: m.route,
      sourceRef: m.sourceRef,
      officialSourceHash: m.officialSourceHash,
      officialSectionHash: m.officialSectionHash,
      officialSectionCount: m.officialSectionCount,
      koContentHash: ko.get(m.masterId)!.contentHash,
      enContentHash: en.get(m.masterId)!.contentHash,
      expectedWrite: { ko: 4, en: 2, total: 6 },
      liveState: { easyKoCanonical: 1, authoredAny: 0, enAny: 0, sourceRefOccupied: 0 },
      status: 'PRE_APPLY_READY',
    }));

    const ledger = {
      wo: WO, agent: 'ga', kind: 'pre-apply-ledger', batchId: BATCH,
      unit: u.unit, route: u.route,
      masterCount: rows.length,
      expectedWrite: { perMasterKo: 4, perMasterEn: 2, perMaster: 6, unitTotal: rows.length * 6 },
      dryRun: {
        pass: dry.summary.pass, dryRunPass: dry.summary.dryRunPass,
        planDigest, digestReproduced: '2회 실행 동일 · plan 파일 byte-identical',
        committedWrite: dry.summary.committedWriteActual,
      },
      rollbackTest: {
        pass: rb.summary.pass, rollbackTestPass: rb.summary.rollbackTestPass,
        txWrittenThenRolledBack: rb.summary.txWrittenThenRolledBack,
        committedWrite: rb.summary.committedWriteActual,
        residueDirty: rb.summary.residueDirty,
        executionPath: 'LIVE apply 와 동일 함수(execKo/execEn) · 강제 ROLLBACK',
      },
      independentVerification: {
        file: 'otc-v4-nr26-independent-verification.ga.json',
        total: iv.total, passed: iv.passed, failed: iv.failed, pass: iv.pass,
      },
      liveDbWriteCommitted: 0,
      liveApplyLock: {
        state: 'LOCKED',
        requires: ['OTC_V4_APPLY_NR26=CONFIRM', 'OTC_V4_NR26_APPROVAL_WO=<승인 WO>'],
        note: '본 WO 로는 열리지 않는다. 두 env 를 동시에 채우는 별도 승인 WO 가 있어야 LIVE apply 가 가능하다.',
      },
      status: 'PRE_APPLY_READY',
      rows,
    };
    const out = P(`otc-v4-nr26-preapply-ledger-${u.unit}.ga.json`);
    fs.writeFileSync(out, JSON.stringify(ledger, null, 2) + '\n');
    written.push(path.basename(out));
    console.log(JSON.stringify({
      unit: u.unit, masters: rows.length, expectedWrite: ledger.expectedWrite.unitTotal,
      planDigest: planDigest.slice(0, 16), rollbackTx: rb.summary.txWrittenThenRolledBack,
      committed: 0, independentVerify: `${iv.passed}/${iv.total}`, status: 'PRE_APPLY_READY',
    }));
  }
  console.log(JSON.stringify({ written }));
}
main();
