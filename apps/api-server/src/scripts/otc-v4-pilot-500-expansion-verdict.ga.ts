/**
 * WO-O4O-OTC-EASY-DRUG-MASTER-BY-MASTER-PILOT500-THEN-NEXT2000-CONTINUOUS-PRODUCTION-V1
 *   — pilot 500 전량 확대 게이트(EXPALL-01~14 + EXPALL-NOT) 판정. READ-ONLY, DB 접근 0.
 *
 * 입력: 결과 원장 · 재실행 원장 · 독립검증 · 예외 원장 · checkpoint 원장.
 * 실행: ../../node_modules/.bin/tsx src/scripts/otc-v4-pilot-500-expansion-verdict.ga.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { DATA_DIR } from './otc-v4-master-leaflet-contract.ga.js';
import { WO_500, BATCH_ID_500 } from './otc-v4-pilot-500-contract.ga.js';

const P = (f: string): string => path.join(DATA_DIR, f);
const J = (f: string): any => JSON.parse(fs.readFileSync(P(f), 'utf8'));
const OUT = P('otc-v4-pilot-500-expansion-verdict.ga.json');

const run1 = J('otc-v4-pilot-500-result-ledger.apply-run1.ga.json');
const run2 = J('otc-v4-pilot-500-result-ledger.ga.json');          // 재실행(멱등) 결과
const iv = J('otc-v4-pilot-500-independent-verification.ga.json');
const exc1 = J('otc-v4-pilot-500-exception-handoff-na.apply-run1.ga.json');
const ck = J('otc-v4-pilot-500-checkpoint-ledger.apply-run1.ga.json');
const green1 = J('otc-v4-pilot-500-green-ledger.apply-run1.ga.json');

const s1 = run1.summary, s2 = run2.summary;
const gate = (id: string, g: string, pass: boolean, evidence: string) => ({ id, gate: g, pass, evidence });

const ivBy = (id: string) => iv.gates.find((x: any) => x.id === id);
const excIds = exc1.rows.map((r: any) => r.masterId);

const gates = [
  gate('EXPALL-01', '500 전량 처리(processed = 500, 중단 0)', s1.processed === 500, `processed=${s1.processed} / target=${s1.target}`),
  gate('EXPALL-02', '개별 실패 후 다음 master 계속 처리', s1.green + s1.exception + s1.skip === 500 && s1.exception > 0 && s1.green > 0,
    `GREEN ${s1.green} + EXCEPTION ${s1.exception} + SKIP ${s1.skip} = 500 (예외 발생 후에도 생산 계속됨)`),
  gate('EXPALL-03', '실패 master DB residue 0', s1.failedMasterResidueDirty === 0 && ivBy('IV-04').pass && ivBy('IV-05').pass,
    `residueDirty=${s1.failedMasterResidueDirty} · IV-04 실패 residue=${ivBy('IV-04').actual} · IV-05 audit residue=${ivBy('IV-05').actual}`),
  gate('EXPALL-04', '정상 생산 master 공식 6섹션 mismatch 0', ivBy('IV-12').pass,
    `IV-12 ${ivBy('IV-12').actual} · 섹션 커버리지 ${JSON.stringify(ivBy('IV-12').detail?.coverage)}`),
  gate('EXPALL-05', '수치·연령·기간 누락 0', ivBy('IV-13').pass && ivBy('IV-14').pass && ivBy('IV-15').pass,
    `수치 ${ivBy('IV-13').actual} · 연령 ${ivBy('IV-14').actual} · 기간 ${ivBy('IV-15').actual}`),
  gate('EXPALL-06', 'canonicalDup 0', ivBy('IV-10').pass && ivBy('IV-07').pass && ivBy('IV-08').pass,
    `dup=${ivBy('IV-10').actual} · KO canonical 위반 ${ivBy('IV-07').actual} · EN canonical 위반 ${ivBy('IV-08').actual}`),
  gate('EXPALL-07', 'sourceRef 충돌·누출 0', ivBy('IV-11').pass,
    `타 master 누수=${ivBy('IV-11').actual} · SOURCE_REF_CONFLICT 예외 ${(s1.byExceptionCode || {}).SOURCE_REF_CONFLICT || 0}건`),
  gate('EXPALL-08', '기존 LIVE 변경 0', ivBy('IV-21').pass && ivBy('IV-18').pass,
    `대상 밖 mfds_drug_otc canonical 불변(${ivBy('IV-21').actual}) · 대상 밖 audit=${ivBy('IV-18').actual}`),
  gate('EXPALL-09', 'pilot 100 GREEN 80 불변', ivBy('IV-20').pass && ivBy('IV-22').pass && ivBy('IV-23').pass,
    `GREEN 80 ${ivBy('IV-20').actual} · 예외 20 write=${ivBy('IV-22').actual} · 교집합=${ivBy('IV-23').actual}`),
  gate('EXPALL-10', '재실행 시 완료 master 자동 skip', s2.skip === s1.green && s2.writeActual === 0 && s2.green === 0,
    `재실행 SKIP=${s2.skip}(=1차 GREEN ${s1.green}) · 신규 write=${s2.writeActual} · 신규 GREEN=${s2.green}`),
  gate('EXPALL-11', '예외 원장 누락·중복 0',
    exc1.total === s1.exception && new Set(excIds).size === excIds.length && exc1.invariantCheck?.allFailedWriteZero === true,
    `예외 원장 ${exc1.total}건 = 결과 예외 ${s1.exception}건 · 중복 ${excIds.length - new Set(excIds).size} · 전건 dbWriteActual 0=${exc1.invariantCheck?.allFailedWriteZero}`),
  gate('EXPALL-12', 'checkpoint 재개 PASS',
    ck.checkpoints.length === 20 && ck.checkpoints[ck.checkpoints.length - 1].processed === 500 && s2.writeActual === 0,
    `checkpoint ${ck.checkpoints.length}회 · 최종 processed=${ck.checkpoints[ck.checkpoints.length - 1].processed} · 재실행 중복 write=${s2.writeActual}`),
  gate('EXPALL-13', '독립검증(별개 코드경로) PASS', iv.verdict === 'PASS',
    `${iv.gatesPassed}/${iv.gatesTotal} · ${iv.independence}`),
];

/**
 * EXPALL-14 — 시스템 수준 오류 0 (SYS-01~SYS-17).
 * SYS-12("다른 세션의 LIVE write 감지")는 **전역 카운트 휴리스틱**이라 서로 겹치지 않는 병렬 세션도 잡는다.
 * 본 배치 실행 중 병렬 HFF 세션(source_type=o4o_hff_generated)이 자기 대상에 정상 생산을 수행했다.
 * 실측 귀속 판정은 아래와 같으며, 판정 자체는 사용자 결정 사항으로 남긴다(자동 무시하지 않는다).
 */
const sys12 = {
  id: 'SYS-12',
  literalTrigger: true,
  attributedTo: 'o4o_hff_generated (병렬 HFF 생산 세션)',
  evidence: {
    hffRowsOnMy500Targets: 0,
    writesOnPilot100Green80SinceBaseline: 0,
    myTargetsOtherSourceTypeWrites: 'mfds_easy_drug 416건 — 본 배치 자신의 demote',
    outsideMySourceTypeCanonicalUnchanged: ivBy('IV-21').actual,
    sourceRefLeak: ivBy('IV-11').actual,
    outsideAudit: ivBy('IV-18').actual,
  },
  assessment: 'SYS-12 가 방지하려는 실제 위험(타 세션이 본 배치 대상을 변경)은 발생하지 않았다. 대상 교집합 0, 귀속 누수 0.',
  decision: 'USER_DECISION_REQUIRED — 지시서 §7 즉시 중지 목록에 명시된 조건이므로 자동 통과 처리하지 않는다.',
};

const sysOthers = {
  'SYS-01': `officialSourceHash 불일치 0 (prep systemStop 없음)`,
  'SYS-02~SYS-11': '실행기·독립검증 전 게이트 PASS',
  'SYS-13': `pilot 100 GREEN 80 ${ivBy('IV-20').actual}`,
  'SYS-14': `pilot 100 예외 20 write ${ivBy('IV-22').actual}`,
  'SYS-15': `재실행 SKIP ${s2.skip} / 신규 write ${s2.writeActual}`,
  'SYS-16': `checkpoint 재개 중복 write ${s2.writeActual}`,
  'SYS-17': `sourceRef 타 master 재사용 ${ivBy('IV-11').actual}`,
};

gates.push(gate('EXPALL-14', '시스템 수준 오류 0(SYS-01~SYS-17 미발동)', false,
  'SYS-12 가 문자 그대로 발동(병렬 HFF 세션). 귀속 증거상 본 배치 오염 0 — 사용자 판단 필요'));
gates.push(gate('EXPALL-NOT', '성공률은 전량 확대 차단 기준이 아니다', true,
  `성공률 ${((s1.green / s1.processed) * 100).toFixed(1)}% 는 판정에 사용하지 않음`));

const blocking = gates.filter((g) => !g.pass && g.id !== 'EXPALL-NOT');
const verdict = blocking.length === 0 ? 'APPROVED_FOR_REMAINING_ALL'
  : blocking.every((g) => g.id === 'EXPALL-14') ? 'PENDING_USER_DECISION_SYS12'
  : 'NEEDS_PIPELINE_FIX';

const out = {
  wo: WO_500, batchId: BATCH_ID_500, kind: 'expansion-verdict',
  counts: { target: s1.target, processed: s1.processed, green: s1.green, exception: s1.exception, skip: s1.skip, writeActual: s1.writeActual, expectedWrite: s1.expectedWrite },
  rerun: { skip: s2.skip, green: s2.green, writeActual: s2.writeActual },
  byExceptionCode: s1.byExceptionCode, byRouteProduced: s1.byRouteProduced, byStratum: s1.byStratum,
  greenLedgerTotal: green1.total,
  independentVerification: { verdict: iv.verdict, passed: `${iv.gatesPassed}/${iv.gatesTotal}` },
  gates, sys12, sysOthers,
  finalVerdictEnum: ['APPROVED_FOR_REMAINING_ALL', 'NEEDS_PIPELINE_FIX', 'SYSTEM_STOP'],
  verdict,
  note: verdict === 'PENDING_USER_DECISION_SYS12'
    ? 'EXPALL-01~13 및 EXPALL-NOT 전부 PASS. 유일한 미충족은 SYS-12 문자적 발동이며 귀속 증거상 본 배치 오염은 0. 전량 확대 착수는 사용자 판단 필요.'
    : '',
};
fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n', 'utf8');
console.log(JSON.stringify({ verdict, blocking: blocking.map((g) => g.id), gates: gates.map((g) => ({ id: g.id, pass: g.pass })) }, null, 2));
