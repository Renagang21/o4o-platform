/**
 * WO-O4O-OTC-KO-EN-BUNDLE-RUNNER-HARDENING-DA-V1
 *
 * 범용 ko→en bundle runner — 여러 READY 그룹을 하나의 WO 로 순서대로 ko 승격 → en 완결.
 *
 * 설계 원칙(핵심): **기존 그룹별 runner 를 수정하지 않는다.**
 *   - ko : `drug-otc-grounded-upgrade-runner.ts --group=<key> [--apply]`
 *   - en : `drug-otc-en-complete-runner.ts       --group=<key> [--apply]`
 *   위 두 정본을 **자식 프로세스로 호출(wrapper/adapter)** 하고 산출 report 를 집계만 한다.
 *   → fingerprintOf()/ko 승격 정책/EN master 스코프 규칙/GROUP_REGISTRY·EN_REGISTRY 전부 불변.
 *
 * 산출 report 수집 계약(정본 runner 출력 실측):
 *   - en runner       : 성공·실패 모두 stdout 에 전체 JSON.
 *   - grounded runner : 성공 시 stdout JSON / 실패 시 stdout 요약줄에 `진단 JSON 보존: <outBase>.run.json`
 *                       → 그 파일을 읽어 진단 report 확보(실패해도 그룹 진단 JSON 보존).
 *   두 경로 모두 불가하면 **runner 계약 불일치** 로 보고 bundle 전체 중단.
 *
 * 그룹 실행 순서: preflight → ko dry-run → ko apply → ko 검증(ALREADY_UPGRADED)
 *                → en preflight → en dry-run → en apply → en 검증(ALREADY_COMPLETE) → 다음 그룹
 *
 * 이중게이트: `--apply` + `DRUG_OTC_BUNDLE_CONFIRM=YES` (자식 confirm env 는 bundle 이 주입).
 * dry-run 기본 · production DB write 0.
 *
 * Usage(apps/api-server):
 *   npx tsx src/scripts/drug-otc-ko-en-bundle-runner.ts --groups=k1,k2,k3 [--apply]
 *   npx tsx src/scripts/drug-otc-ko-en-bundle-runner.ts --bundle=<bundleKey> [--apply]
 *   npx tsx src/scripts/drug-otc-ko-en-bundle-runner.ts --selftest        # DB 미접속 fixture 검증
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const DATA_DIR = path.resolve(process.cwd(), 'src/scripts/data');
const KO_RUNNER = 'src/scripts/drug-otc-grounded-upgrade-runner.ts';
const EN_RUNNER = 'src/scripts/drug-otc-en-complete-runner.ts';
const KO_CONFIRM = 'DRUG_OTC_GROUNDED_UPGRADE_CONFIRM';
const EN_CONFIRM = 'DRUG_OTC_EN_COMPLETE_CONFIRM';

// ── 단계 상태 ────────────────────────────────────────────────────────────────
type StepStatus = 'READY' | 'ALREADY_UPGRADED' | 'ALREADY_COMPLETE' | 'APPLIED' | 'HOLD' | 'FAILED';
type Kind = 'ko' | 'en';
type Disposition = 'continue' | 'abort'; // 실패 시 다음 그룹 진행 여부

interface StepOutcome {
  kind: Kind;
  phase: 'dry-run' | 'apply';
  exitCode: number;
  report: any | null;      // 정본 runner report (수집 실패 시 null)
  reportSource: 'stdout' | 'file' | 'none';
  stdoutTail?: string;
}

/** 그룹 1건 실행 결과. */
interface GroupResult {
  groupKey: string;
  writeOwner: string | null;
  koStatus: StepStatus | null;
  enStatus: StepStatus | null;
  status: StepStatus;                 // 그룹 종합
  target: number | null;
  excluded: number | null;
  otherFp: number | null;
  koWritePlan: { spd: number; audit: number; total: number } | null;
  koWriteActual: { spd: number; audit: number; total: number } | null;
  enWritePlan: { total: number } | null;
  enWriteActual: { persist: number; flip: number; total: number } | null;
  disposition: Disposition | null;    // 실패 시에만
  reason: string | null;
  anomalies: string[];
}

// ── 실패 분류 (§5) ───────────────────────────────────────────────────────────
/** bundle 전체 중단 — 공통 장애·계약 위반·안전 침해. */
const ABORT_PATTERNS: Array<[RegExp, string]> = [
  [/ECONNREFUSED|ENOTFOUND|EHOSTUNREACH|ETIMEDOUT|connect .*failed|password authentication|role .* does not exist|SASL|no pg_hba|remaining connection slots|too many connections|too many clients|sorry, too many|connection terminated|Connection terminated|server closed the connection/i, 'DB 연결·인증 장애'],
  [/--group=<key> 필요|등록:|Cannot find module|SyntaxError|is not a function/i, 'runner 계약 불일치'],
  [/column .* does not exist|relation .* does not exist|type .* does not exist/i, '공통 스키마 불일치'],
  [/사후검증 실패|ROLLBACK/i, 'TX 사후검증 실패'],
  [/중복|duplicate/i, 'canonical duplicate'],
  [/초과|exceeds? envelope/i, 'writeActual 승인 봉투 초과'],
  [/대상 외|out-of-scope|target 밖/i, 'target 밖 write 정황'],
  [/소유권|ownership conflict/i, '소유권 충돌'],
];
/** 해당 그룹만 HOLD/FAILED — 다른 그룹과 무관함이 명확한 경우. */
const CONTINUE_PATTERNS: Array<[RegExp, string]> = [
  [/일관성 불일치|byte-identical/i, 'EN 재구성 불일치(그룹 한정)'],
  [/재고정 불일치|SSOT 미분류 fingerprint|비경구 혼입/i, 'fingerprint 재고정(그룹 한정)'],
  [/기존 authored canonical 충돌|기존 en canonical|부분\/충돌|기존 en needs_review/i, '기존 충돌(그룹 한정)'],
  [/target \d+ !== |excluded \d+ !== |ko canonical \d+ !== |필수필드 누락|빈 html|한글 포함|<table>|주석|이중 escape|sd-warn 없음/i, '그룹 게이트 불일치'],
  [/out en canonical 참조 없음|지문 비균일/i, 'EN 재사용 기준 부재(그룹 한정)'],
];

function classifyFailure(text: string): { disposition: Disposition; reason: string } {
  for (const [re, reason] of ABORT_PATTERNS) if (re.test(text)) return { disposition: 'abort', reason };
  for (const [re, reason] of CONTINUE_PATTERNS) if (re.test(text)) return { disposition: 'continue', reason };
  // 보수적 기본값: 분류 불가 → bundle 중단(안전 우선).
  return { disposition: 'abort', reason: '분류 불가 실패(보수적 중단)' };
}

// ── 정본 runner report → bundle 상태 ─────────────────────────────────────────
function mapStatus(kind: Kind, report: any): StepStatus | null {
  const s = report?.status;
  if (!s) return null;
  if (s === 'APPLIED') return 'APPLIED';
  if (s === 'ALREADY_UPGRADED') return 'ALREADY_UPGRADED';
  if (s === 'ALREADY_COMPLETE') return 'ALREADY_COMPLETE';
  if (s === 'PASS') return 'READY';
  if (s === 'ABORT') return 'HOLD';   // 게이트 거부 = 보류
  return 'FAILED';                     // FAIL 등
}

const koPlan = (r: any) => r?.writePlan ? { spd: r.writePlan.spd?.total ?? 0, audit: r.writePlan.audit?.total ?? 0, total: (r.writePlan.spd?.total ?? 0) + (r.writePlan.audit?.total ?? 0) } : null;
const koActual = (r: any) => r?.writeActual ? { spd: r.writeActual.spd?.total ?? 0, audit: r.writeActual.audit?.total ?? 0, total: (r.writeActual.spd?.total ?? 0) + (r.writeActual.audit?.total ?? 0) } : null;
const enPlan = (r: any) => r?.plan ? { total: r.plan.en_write_total ?? 0 } : null;
const enActual = (r: any) => (r?.step1_inserted != null || r?.step2_flipped != null)
  ? { persist: r.step1_inserted ?? 0, flip: r.step2_flipped ?? 0, total: (r.step1_inserted ?? 0) + (r.step2_flipped ?? 0) } : null;

// ── 자식 실행기(주입 가능 — selftest 는 mock 주입) ────────────────────────────
export type StepExec = (spec: { kind: Kind; groupKey: string; apply: boolean }) => Promise<StepOutcome>;

/** stdout 에서 첫 JSON 객체를 추출(brace depth scan). */
function extractJson(text: string): any | null {
  const start = text.indexOf('{');
  if (start < 0) return null;
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inStr) { if (esc) esc = false; else if (ch === '\\') esc = true; else if (ch === '"') inStr = false; continue; }
    if (ch === '"') inStr = true;
    else if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth === 0) { try { return JSON.parse(text.slice(start, i + 1)); } catch { return null; } } }
  }
  return null;
}

/** 실패 경로에서 runner 가 남긴 진단 JSON 파일명을 회수. */
function extractRunFile(text: string): string | null {
  const m = text.match(/([\w.\-]+\.run\.json)/);
  return m ? m[1] : null;
}

const spawnExec: StepExec = ({ kind, groupKey, apply }) => new Promise((resolve) => {
  const script = kind === 'ko' ? KO_RUNNER : EN_RUNNER;
  const args = ['tsx', script, `--group=${groupKey}`];
  if (apply) args.push('--apply');
  const env = { ...process.env } as Record<string, string>;
  if (apply) env[kind === 'ko' ? KO_CONFIRM : EN_CONFIRM] = 'YES';
  const child = spawn('npx', args, { cwd: process.cwd(), env, shell: process.platform === 'win32' });
  let out = '', err = '';
  child.stdout.on('data', (d) => { out += d.toString(); });
  child.stderr.on('data', (d) => { err += d.toString(); });
  child.on('close', (code) => {
    const combined = out + '\n' + err;
    let report = extractJson(out);
    let source: StepOutcome['reportSource'] = report ? 'stdout' : 'none';
    if (!report) {
      const f = extractRunFile(combined);
      if (f) { try { report = JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), 'utf8')); source = 'file'; } catch { /* keep null */ } }
    }
    resolve({ kind, phase: apply ? 'apply' : 'dry-run', exitCode: code ?? -1, report, reportSource: source, stdoutTail: combined.slice(-1200) });
  });
});

// ── bundle 실행 ──────────────────────────────────────────────────────────────
interface BundleConfig { bundleKey: string; writeOwner: string; groups: string[] }

/** 예시 bundle — 이미 완료된 그룹만(재실행 no-op regression 용). 신규 후보 등재 아님. */
const BUNDLE_REGISTRY: Record<string, BundleConfig> = {
  'regression-completed-da': {
    bundleKey: 'regression-completed-da',
    writeOwner: 'agent-da',
    groups: ['trimebutine-100mg-jeong', 'bacillus-liche-250mg-capsule', 'diosmin-300mg-capsule'],
  },
  // WO-O4O-OTC-TRACK-A-1H-PRODUCTION-DA-V1 (에이전트 다) — 생산 bundle 3그룹
  'track-a-1h-da': {
    bundleKey: 'track-a-1h-da',
    writeOwner: 'agent-da',
    groups: ['alfacalcidol-1mcg-softcap', 'ibuprofen-arginine-368mg-jeong', 'polysaccharide-iron-326mg-capsule'],
  },
};

async function runBundle(cfg: BundleConfig, opts: { apply: boolean; exec: StepExec }): Promise<any> {
  const mode = opts.apply ? 'APPLY' : 'dry-run';
  const summary: any = {
    wo: 'WO-O4O-OTC-KO-EN-BUNDLE-RUNNER-HARDENING-DA-V1',
    bundleKey: cfg.bundleKey, mode, writeOwner: cfg.writeOwner,
    groupOrder: [...cfg.groups], groupCount: cfg.groups.length,
    dbWrite: 0, groups: [] as GroupResult[],
    totals: { koPlan: 0, koActual: 0, enPlan: 0, enActual: 0, planTotal: 0, actualTotal: 0 },
    bundleStatus: 'INIT', abortedAt: null as string | null, abortReason: null as string | null,
  };

  for (const groupKey of cfg.groups) {
    const g: GroupResult = {
      groupKey, writeOwner: cfg.writeOwner, koStatus: null, enStatus: null, status: 'FAILED',
      target: null, excluded: null, otherFp: null,
      koWritePlan: null, koWriteActual: null, enWritePlan: null, enWriteActual: null,
      disposition: null, reason: null, anomalies: [],
    };

    // ── ko: dry-run → (apply) ────────────────────────────────────────────
    const koDry = await opts.exec({ kind: 'ko', groupKey, apply: false });
    if (!koDry.report) {
      g.status = 'FAILED'; g.disposition = 'abort'; g.reason = 'runner 계약 불일치(ko report 수집 실패)';
      summary.groups.push(g); summary.bundleStatus = 'ABORTED'; summary.abortedAt = groupKey; summary.abortReason = g.reason; break;
    }
    g.target = koDry.report.target ?? null; g.excluded = koDry.report.excluded ?? null; g.otherFp = koDry.report.otherFp ?? null;
    g.anomalies.push(...(koDry.report.anomalies ?? []));
    g.koWritePlan = koPlan(koDry.report);
    let koStatus = mapStatus('ko', koDry.report);

    if (koStatus === 'HOLD' || koStatus === 'FAILED') {
      const cls = classifyFailure(`${koDry.report.error ?? ''} ${(koDry.report.anomalies ?? []).join(' ')} ${koDry.stdoutTail ?? ''}`);
      g.koStatus = koStatus; g.status = koStatus; g.disposition = cls.disposition; g.reason = `ko ${cls.reason}`;
      summary.groups.push(g);
      if (cls.disposition === 'abort') { summary.bundleStatus = 'ABORTED'; summary.abortedAt = groupKey; summary.abortReason = g.reason; break; }
      continue; // ko 실패 → 같은 그룹 en 실행 금지(§5), 다음 그룹으로
    }

    if (opts.apply && koStatus === 'READY') {
      const koApply = await opts.exec({ kind: 'ko', groupKey, apply: true });
      if (!koApply.report) {
        g.status = 'FAILED'; g.disposition = 'abort'; g.reason = 'runner 계약 불일치(ko apply report 수집 실패)';
        summary.groups.push(g); summary.bundleStatus = 'ABORTED'; summary.abortedAt = groupKey; summary.abortReason = g.reason; break;
      }
      koStatus = mapStatus('ko', koApply.report);
      g.koWriteActual = koActual(koApply.report);
      g.anomalies.push(...(koApply.report.anomalies ?? []));
      if (koStatus !== 'APPLIED') {
        const cls = classifyFailure(`${koApply.report.error ?? ''} ${(koApply.report.anomalies ?? []).join(' ')} ${koApply.stdoutTail ?? ''}`);
        g.koStatus = koStatus ?? 'FAILED'; g.status = g.koStatus; g.disposition = cls.disposition; g.reason = `ko apply ${cls.reason}`;
        summary.groups.push(g);
        if (cls.disposition === 'abort') { summary.bundleStatus = 'ABORTED'; summary.abortedAt = groupKey; summary.abortReason = g.reason; break; }
        continue;
      }
      // 승인 봉투 초과 검사
      if (g.koWritePlan && g.koWriteActual && g.koWriteActual.total > g.koWritePlan.total) {
        g.status = 'FAILED'; g.disposition = 'abort'; g.reason = `ko writeActual ${g.koWriteActual.total} > plan ${g.koWritePlan.total} 초과`;
        summary.groups.push(g); summary.bundleStatus = 'ABORTED'; summary.abortedAt = groupKey; summary.abortReason = g.reason; break;
      }
      summary.dbWrite = 1;
      // ko 독립검증 = 재실행 ALREADY_UPGRADED 확인
      const koVerify = await opts.exec({ kind: 'ko', groupKey, apply: false });
      const vs = mapStatus('ko', koVerify.report);
      if (vs !== 'ALREADY_UPGRADED') {
        g.status = 'FAILED'; g.disposition = 'abort'; g.reason = `ko 재실행 ALREADY_UPGRADED 아님(${vs})`;
        summary.groups.push(g); summary.bundleStatus = 'ABORTED'; summary.abortedAt = groupKey; summary.abortReason = g.reason; break;
      }
      koStatus = 'ALREADY_UPGRADED';
    }
    g.koStatus = koStatus;

    // ── en: dry-run → (apply) ────────────────────────────────────────────
    const enDry = await opts.exec({ kind: 'en', groupKey, apply: false });
    if (!enDry.report) {
      g.status = 'FAILED'; g.disposition = 'abort'; g.reason = 'runner 계약 불일치(en report 수집 실패)';
      summary.groups.push(g); summary.bundleStatus = 'ABORTED'; summary.abortedAt = groupKey; summary.abortReason = g.reason; break;
    }
    g.anomalies.push(...(enDry.report.anomalies ?? []));
    g.enWritePlan = enPlan(enDry.report);
    let enStatus = mapStatus('en', enDry.report);

    if (enStatus === 'HOLD' || enStatus === 'FAILED') {
      const cls = classifyFailure(`${enDry.report.error ?? ''} ${(enDry.report.anomalies ?? []).join(' ')} ${enDry.stdoutTail ?? ''}`);
      g.enStatus = enStatus; g.status = enStatus; g.disposition = cls.disposition; g.reason = `en ${cls.reason}`;
      summary.groups.push(g);
      if (cls.disposition === 'abort') { summary.bundleStatus = 'ABORTED'; summary.abortedAt = groupKey; summary.abortReason = g.reason; break; }
      continue; // en 실패 → 해당 그룹만 실패, 다음 그룹 진행
    }

    if (opts.apply && enStatus === 'READY') {
      const enApply = await opts.exec({ kind: 'en', groupKey, apply: true });
      if (!enApply.report) {
        g.status = 'FAILED'; g.disposition = 'abort'; g.reason = 'runner 계약 불일치(en apply report 수집 실패)';
        summary.groups.push(g); summary.bundleStatus = 'ABORTED'; summary.abortedAt = groupKey; summary.abortReason = g.reason; break;
      }
      enStatus = mapStatus('en', enApply.report);
      g.enWriteActual = enActual(enApply.report);
      g.anomalies.push(...(enApply.report.anomalies ?? []));
      if (enStatus !== 'APPLIED') {
        const cls = classifyFailure(`${enApply.report.error ?? ''} ${(enApply.report.anomalies ?? []).join(' ')} ${enApply.stdoutTail ?? ''}`);
        g.enStatus = enStatus ?? 'FAILED'; g.status = g.enStatus; g.disposition = cls.disposition; g.reason = `en apply ${cls.reason}`;
        summary.groups.push(g);
        if (cls.disposition === 'abort') { summary.bundleStatus = 'ABORTED'; summary.abortedAt = groupKey; summary.abortReason = g.reason; break; }
        continue;
      }
      if (g.enWritePlan && g.enWriteActual && g.enWriteActual.total > g.enWritePlan.total) {
        g.status = 'FAILED'; g.disposition = 'abort'; g.reason = `en writeActual ${g.enWriteActual.total} > plan ${g.enWritePlan.total} 초과`;
        summary.groups.push(g); summary.bundleStatus = 'ABORTED'; summary.abortedAt = groupKey; summary.abortReason = g.reason; break;
      }
      summary.dbWrite = 1;
      const enVerify = await opts.exec({ kind: 'en', groupKey, apply: false });
      const evs = mapStatus('en', enVerify.report);
      if (evs !== 'ALREADY_COMPLETE') {
        g.status = 'FAILED'; g.disposition = 'abort'; g.reason = `en 재실행 ALREADY_COMPLETE 아님(${evs})`;
        summary.groups.push(g); summary.bundleStatus = 'ABORTED'; summary.abortedAt = groupKey; summary.abortReason = g.reason; break;
      }
      enStatus = 'ALREADY_COMPLETE';
    }
    g.enStatus = enStatus;
    g.status = (g.koStatus === 'ALREADY_UPGRADED' && g.enStatus === 'ALREADY_COMPLETE') ? 'ALREADY_COMPLETE'
      : (g.koStatus === 'READY' && g.enStatus === 'READY') ? 'READY' : (g.enStatus ?? 'FAILED');
    summary.groups.push(g);
  }

  // 집계
  for (const g of summary.groups) {
    summary.totals.koPlan += g.koWritePlan?.total ?? 0;
    summary.totals.koActual += g.koWriteActual?.total ?? 0;
    summary.totals.enPlan += g.enWritePlan?.total ?? 0;
    summary.totals.enActual += g.enWriteActual?.total ?? 0;
  }
  summary.totals.planTotal = summary.totals.koPlan + summary.totals.enPlan;
  summary.totals.actualTotal = summary.totals.koActual + summary.totals.enActual;
  if (summary.bundleStatus === 'INIT') {
    const done = summary.groups.filter((g: GroupResult) => g.status === 'ALREADY_COMPLETE').length;
    const held = summary.groups.filter((g: GroupResult) => g.status === 'HOLD' || g.status === 'FAILED').length;
    summary.bundleStatus = held === 0 ? (summary.totals.actualTotal === 0 && done === summary.groups.length ? 'NO_OP' : 'COMPLETED') : 'PARTIAL';
  }
  summary.statusCounts = summary.groups.reduce((a: Record<string, number>, g: GroupResult) => { a[g.status] = (a[g.status] || 0) + 1; return a; }, {});
  return summary;
}

// ── (§8) 비DB fixture self-test ──────────────────────────────────────────────
const koReport = (o: Partial<any>) => ({ status: 'PASS', groupKey: 'g', target: 10, excluded: 3, otherFp: 0, anomalies: [], writePlan: { spd: { total: 30 }, audit: { total: 10 } }, ...o });
const enReportF = (o: Partial<any>) => ({ status: 'PASS', groupKey: 'g', anomalies: [], plan: { en_write_total: 20 }, ...o });
const outcome = (kind: Kind, apply: boolean, report: any | null): StepOutcome =>
  ({ kind, phase: apply ? 'apply' : 'dry-run', exitCode: report && (report.status === 'ABORT' || report.status === 'FAIL') ? 1 : 0, report, reportSource: report ? 'stdout' : 'none', stdoutTail: report ? JSON.stringify(report) : 'FATAL unparseable' });

async function selfTest(): Promise<void> {
  const fails: string[] = [];
  const eq = (label: string, got: unknown, want: unknown) => { if (JSON.stringify(got) !== JSON.stringify(want)) fails.push(`${label}: got ${JSON.stringify(got)} !== want ${JSON.stringify(want)}`); };
  const G3 = ['a', 'b', 'c'];
  const cfg = (groups: string[]): BundleConfig => ({ bundleKey: 'fixture', writeOwner: 'agent-da', groups });

  // S1. 전부 완료 → no-op 집계(write 0)
  const allDone: StepExec = async ({ kind, apply }) => outcome(kind, apply,
    kind === 'ko' ? koReport({ status: 'ALREADY_UPGRADED' }) : enReportF({ status: 'ALREADY_COMPLETE' }));
  {
    const s1 = await runBundle(cfg(G3), { apply: true, exec: allDone });
    eq('S1 bundleStatus', s1.bundleStatus, 'NO_OP');
    eq('S1 actualTotal', s1.totals.actualTotal, 0);
    eq('S1 dbWrite', s1.dbWrite, 0);
    eq('S1 groups ALREADY_COMPLETE', s1.statusCounts.ALREADY_COMPLETE, 3);

    // S2. 첫 그룹 en 일관성 불일치(HOLD) → 다음 그룹 진행
    const holdFirst: StepExec = async ({ kind, groupKey, apply }) => {
      if (kind === 'en' && groupKey === 'a') return outcome(kind, apply, enReportF({ status: 'ABORT', anomalies: ['일관성 불일치: build md5 X !== live out en Y'], error: '이상 1건 → ABORT' }));
      return outcome(kind, apply, kind === 'ko' ? koReport({ status: 'ALREADY_UPGRADED' }) : enReportF({ status: 'ALREADY_COMPLETE' }));
    };
    const s2 = await runBundle(cfg(G3), { apply: true, exec: holdFirst });
    eq('S2 bundleStatus', s2.bundleStatus, 'PARTIAL');
    eq('S2 groupCount 실행', s2.groups.length, 3);
    eq('S2 a=HOLD', s2.groups[0].status, 'HOLD');
    eq('S2 a disposition', s2.groups[0].disposition, 'continue');
    eq('S2 b 완료', s2.groups[1].status, 'ALREADY_COMPLETE');
    eq('S2 c 완료', s2.groups[2].status, 'ALREADY_COMPLETE');

    // S3. 공통 장애(DB 인증) → bundle 전체 중단(잔여 그룹 미실행)
    const dbDown: StepExec = async ({ kind, apply }) => outcome(kind, apply, koReport({ status: 'FAIL', error: 'password authentication failed for user "o4o_api"' }));
    const s3 = await runBundle(cfg(G3), { apply: true, exec: dbDown });
    eq('S3 bundleStatus', s3.bundleStatus, 'ABORTED');
    eq('S3 abortedAt', s3.abortedAt, 'a');
    eq('S3 실행 그룹 1개만', s3.groups.length, 1);

    // S3b. runner 계약 불일치(report 수집 실패) → 중단
    const noReport: StepExec = async ({ kind, apply }) => outcome(kind, apply, null);
    const s3b = await runBundle(cfg(G3), { apply: true, exec: noReport });
    eq('S3b ABORTED', s3b.bundleStatus, 'ABORTED');
    eq('S3b reason 계약', /계약 불일치/.test(s3b.abortReason || ''), true);

    // S4. write 산식 ko=4T · en=2T · 총 6T (T=10 → ko40 · en20 · 60), 3그룹 = 180
    const T = 10;
    const applyOk: StepExec = async ({ kind, apply }) => {
      if (kind === 'ko') return outcome(kind, apply, apply
        ? koReport({ status: 'APPLIED', writeActual: { spd: { total: 3 * T }, audit: { total: T } } })
        : koReport({ status: 'PASS' }));
      return outcome(kind, apply, apply
        ? enReportF({ status: 'APPLIED', step1_inserted: T, step2_flipped: T })
        : enReportF({ status: 'PASS' }));
    };
    // 검증 단계(재실행)는 ALREADY_* 를 돌려줘야 하므로 호출 순서 기반 stateful mock
    const seen: Record<string, number> = {};
    const applyFlow: StepExec = async ({ kind, groupKey, apply }) => {
      const k = `${groupKey}:${kind}`; seen[k] = (seen[k] ?? 0) + 1;
      if (kind === 'ko') {
        if (apply) return outcome(kind, apply, koReport({ status: 'APPLIED', writeActual: { spd: { total: 3 * T }, audit: { total: T } } }));
        return outcome(kind, apply, seen[k] === 1 ? koReport({ status: 'PASS' }) : koReport({ status: 'ALREADY_UPGRADED' }));
      }
      if (apply) return outcome(kind, apply, enReportF({ status: 'APPLIED', step1_inserted: T, step2_flipped: T }));
      return outcome(kind, apply, seen[k] === 1 ? enReportF({ status: 'PASS' }) : enReportF({ status: 'ALREADY_COMPLETE' }));
    };
    const s4 = await runBundle(cfg(G3), { apply: true, exec: applyFlow });
    eq('S4 bundleStatus', s4.bundleStatus, 'COMPLETED');
    eq('S4 koActual(3그룹 4T)', s4.totals.koActual, 3 * 4 * T);
    eq('S4 enActual(3그룹 2T)', s4.totals.enActual, 3 * 2 * T);
    eq('S4 actualTotal(3그룹 6T)', s4.totals.actualTotal, 3 * 6 * T);
    eq('S4 dbWrite', s4.dbWrite, 1);
    void applyOk;

    // S5. 결과 JSON 결정론(동일 fixture 2회 → 동일 직렬화)
    const r1 = await runBundle(cfg(G3), { apply: true, exec: allDone });
    const r2 = await runBundle(cfg(G3), { apply: true, exec: allDone });
    eq('S5 결정론', JSON.stringify(r1), JSON.stringify(r2));

    // S6. ko 실패 시 같은 그룹 en 미실행
    const koFail: StepExec = async ({ kind, groupKey, apply }) => {
      if (kind === 'ko' && groupKey === 'a') return outcome(kind, apply, koReport({ status: 'ABORT', anomalies: ['target 5 !== expected 10 (그대로확장 SSOT 재고정 불일치)'], error: '이상 1건 → ABORT' }));
      if (kind === 'en' && groupKey === 'a') { fails.push('S6: ko 실패인데 en 실행됨'); return outcome(kind, apply, enReportF({})); }
      return outcome(kind, apply, kind === 'ko' ? koReport({ status: 'ALREADY_UPGRADED' }) : enReportF({ status: 'ALREADY_COMPLETE' }));
    };
    const s6 = await runBundle(cfg(G3), { apply: true, exec: koFail });
    eq('S6 a=HOLD', s6.groups[0].status, 'HOLD');
    eq('S6 a enStatus null(미실행)', s6.groups[0].enStatus, null);
    eq('S6 b·c 진행', [s6.groups[1].status, s6.groups[2].status], ['ALREADY_COMPLETE', 'ALREADY_COMPLETE']);

    // S7. 분류기 단위
    eq('S7 abort/DB', classifyFailure('ECONNREFUSED 127.0.0.1:5442').disposition, 'abort');
    eq('S7 abort/connslots', classifyFailure('FATAL remaining connection slots are reserved for non-replication superuser connections').reason, 'DB 연결·인증 장애');
    eq('S7 abort/TX', classifyFailure('사후검증 실패 canon1=0 → ROLLBACK').disposition, 'abort');
    eq('S7 continue/EN', classifyFailure('일관성 불일치: build md5 !== live out en').disposition, 'continue');
    eq('S7 continue/fp', classifyFailure('SSOT 미분류 fingerprint 3').disposition, 'continue');
    eq('S7 unknown→abort', classifyFailure('완전히 새로운 알 수 없는 오류').disposition, 'abort');

    if (fails.length) { console.error('SELFTEST FAIL\n  ' + fails.join('\n  ')); process.exit(1); }
    console.log('SELFTEST PASS (29건) — no-op 집계 · HOLD 후 계속 · 공통장애 중단 · 계약불일치 중단 · write 4T/2T/6T · 결정론 · ko실패시 en미실행 · 실패분류(연결슬롯 포함). DB 미접속·자식프로세스 미기동.');
  }
}

// ── CLI ──────────────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  if (argv.includes('--selftest')) { await selfTest(); return; }

  const bundleArg = (argv.find((a) => a.startsWith('--bundle=')) || '').split('=')[1];
  const groupsArg = (argv.find((a) => a.startsWith('--groups=')) || '').split('=')[1];
  let cfg: BundleConfig | null = null;
  if (bundleArg && BUNDLE_REGISTRY[bundleArg]) cfg = BUNDLE_REGISTRY[bundleArg];
  else if (groupsArg) cfg = { bundleKey: `adhoc-${groupsArg.split(',').length}g`, writeOwner: process.env.DRUG_OTC_BUNDLE_OWNER || 'agent-da', groups: groupsArg.split(',').map((s) => s.trim()).filter(Boolean) };
  if (!cfg || cfg.groups.length === 0) {
    console.error(`--bundle=<key> 또는 --groups=k1,k2 필요. 등록 bundle: ${Object.keys(BUNDLE_REGISTRY).join(', ')}\n(비DB 검증: --selftest)`);
    process.exit(2);
  }

  const apply = argv.includes('--apply') && process.env.DRUG_OTC_BUNDLE_CONFIRM === 'YES';
  console.log(`[bundle ${apply ? 'APPLY' : 'dry-run'}] ${cfg.bundleKey} · owner=${cfg.writeOwner} · ${cfg.groups.length}그룹 순서: ${cfg.groups.join(' → ')}`);

  const summary = await runBundle(cfg, { apply, exec: spawnExec });
  fs.writeFileSync(path.join(DATA_DIR, `otc-ko-en-bundle-${cfg.bundleKey}.summary.json`), JSON.stringify(summary, null, 2), 'utf8');
  console.log(JSON.stringify(summary, null, 2));
  console.log(`\n[bundle] ${cfg.bundleKey} status=${summary.bundleStatus} · 그룹 ${JSON.stringify(summary.statusCounts)} · write plan ${summary.totals.planTotal} / actual ${summary.totals.actualTotal}`);
  if (summary.abortedAt) console.log(`  ABORTED at ${summary.abortedAt}: ${summary.abortReason}`);
  if (!apply) console.log('  (dry-run — write 0. apply: --apply + DRUG_OTC_BUNDLE_CONFIRM=YES)');
  if (summary.bundleStatus === 'ABORTED') process.exit(1);
}

main().catch((e) => { console.error('FATAL', e instanceof Error ? e.message : e); process.exit(1); });
