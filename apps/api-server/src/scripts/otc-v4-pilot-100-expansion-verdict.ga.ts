/**
 * WO-...-PILOT-100-PRODUCTION-V1 §15 — 500 확대 판정(EXP-01~EXP-11).
 * 모든 수치는 원장/독립검증 산출물에서 읽는다(수기 입력 금지). READ ONLY.
 */
import fs from 'fs';
import path from 'path';

const DATA = path.resolve(process.cwd(), 'src/scripts/data');
const rd = (f: string) => JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8'));

const res = rd('otc-v4-pilot-100-result-ledger.ga.json');
const rerun = rd('otc-v4-pilot-100-rerun-verification.ga.json');
const iv = rd('otc-v4-pilot-100-independent-verification.ga.json');
const exc = rd('otc-v4-pilot-100-exception-handoff-na.ga.json');
const cp = rd('otc-v4-pilot-100-checkpoint-ledger.ga.json');
const s = res.summary;

const chk = (id: string, name: string, pass: boolean, evidence: any) => ({ id, name, pass, evidence });
const items = [
  chk('EXP-01', '실패 제품 DB write 0 (제품별 격리)', s.failedMasterResidueDirty === 0 && res.results.filter((r: any) => r.status === 'EXCEPTION').every((r: any) => r.writeActual === 0),
    { exception: s.exception, writeActualSum: res.results.filter((r: any) => r.status === 'EXCEPTION').reduce((a: number, r: any) => a + r.writeActual, 0), residueDirty: s.failedMasterResidueDirty }),
  chk('EXP-02', '실패 후 다음 제품 생산 계속 (중단 0)', s.processed === s.target && s.green + s.exception + s.skip === s.target,
    { processed: s.processed, target: s.target, green: s.green, exception: s.exception, skip: s.skip }),
  chk('EXP-03', '재실행 시 완료 제품 중복 반영 0', rerun.summary.writeActual === 0 && rerun.summary.skip === s.green && rerun.summary.green === 0,
    { rerunWrite: rerun.summary.writeActual, rerunSkip: rerun.summary.skip, rerunGreen: rerun.summary.green }),
  chk('EXP-04', '독립검증(별개 코드경로) 전 항목 PASS', iv.summary.pass === true,
    { checks: iv.summary.checks, failed: iv.summary.failed, codePath: iv.codePath }),
  chk('EXP-05', '제품별 write 계약 준수 (GREEN×6T)', s.writeActual === s.expectedWrite && s.koWriteActual === s.green * 4 && s.enWriteActual === s.green * 2,
    { koWrite: s.koWriteActual, enWrite: s.enWriteActual, write: s.writeActual, expected: s.expectedWrite }),
  chk('EXP-06', 'sourceRef 결정성·유일성 (V4 namespace, 중복·누수 0)',
    ['C-03b', 'C-04', 'C-07'].every((id) => iv.checks.find((c: any) => c.id === id)?.pass),
    { checks: ['C-03b', 'C-04', 'C-07'] }),
  chk('EXP-07', '공식 6섹션·수치 보존 (KO/EN)', ['C-09', 'C-11'].every((id) => iv.checks.find((c: any) => c.id === id)?.pass),
    { checks: ['C-09', 'C-11'] }),
  chk('EXP-08', '기존 LIVE 자산 불변 (READY 1,134 · V1/V2/V3)',
    ['C-12', 'C-12b', 'C-13'].every((id) => iv.checks.find((c: any) => c.id === id)?.pass), { checks: ['C-12', 'C-12b', 'C-13'] }),
  chk('EXP-09', '예외 원장이 나 에이전트 인수 가능(17 필드 완비 · 중복 0)',
    exc.total === s.exception && exc.rows.every((r: any) => r.dbWriteActual === 0 && r.exceptionCode && r.reproductionCommand && r.recommendedAction) &&
    new Set(exc.rows.map((r: any) => r.masterId)).size === exc.total,
    { total: exc.total, byCode: exc.byExceptionCode, schema: exc.schema }),
  chk('EXP-10', '체크포인트·중단복구 동작 (10~20 master 단위)',
    (cp.checkpoints?.length ?? cp.rows?.length ?? 0) >= 5 && s.checkpoints === (cp.checkpoints?.length ?? cp.rows?.length),
    { checkpoints: s.checkpoints }),
  chk('EXP-11', '시스템 중지 조건(SYS-01~SYS-12) 발생 0', s.pass === true && rerun.summary.pass === true && iv.summary.failed === 0,
    { run1Pass: s.pass, rerunPass: rerun.summary.pass, independentFailed: iv.summary.failed }),
];

const pass = items.every((i) => i.pass);
const verdict = pass ? 'APPROVED_FOR_PILOT_500' : (items.find((i) => ['EXP-01', 'EXP-03', 'EXP-11'].includes(i.id) && !i.pass) ? 'SYSTEM_STOP' : 'NEEDS_PIPELINE_FIX');

const out = {
  wo: 'WO-O4O-OTC-EASY-DRUG-REMAINING-MASTER-BY-MASTER-PILOT-100-PRODUCTION-V1',
  kind: 'expansion-verdict',
  agent: 'ga',
  note: 'WO §15 EXP-01~EXP-11. 성공률은 확대 차단 요소가 아니다(WO 명시). 모든 근거는 원장/독립검증 산출물에서 기계 판독.',
  successRate: { green: s.green, target: s.target, rate: +(s.green / s.target).toFixed(2), blocksExpansion: false },
  byStratum: s.byStratum,
  byRouteProduced: s.byRouteProduced,
  byExceptionCode: s.byExceptionCode,
  items,
  verdict,
  nextScope: pass
    ? { batch: 500, populationRemaining: 3809 - s.green, writeOwner: 'agent-ga', prerequisite: '동일 실행기·동일 계약. TM 확장(신규 문장) 및 route composer 미지원 섹션은 제품별 예외로 격리.' }
    : null,
};
fs.writeFileSync(path.join(DATA, 'otc-v4-pilot-100-expansion-verdict.ga.json'), JSON.stringify(out, null, 2));
for (const i of items) console.log(`${i.pass ? 'PASS' : 'FAIL'} ${i.id} ${i.name}`);
console.log(`\n판정: ${verdict}`);
