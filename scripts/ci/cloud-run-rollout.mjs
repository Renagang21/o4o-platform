#!/usr/bin/env node
/**
 * WO-O4O-CICD-SAFE-AUTODEPLOY-AND-RISK-GATE-V1 — Phase 4 zero-traffic revision 검증 · 트래픽 전환
 *
 * 문제 (CHECK-O4O-CICD-PRODUCTION-DEPLOY-CENSUS-AND-SIMPLIFICATION-V1 §A-7):
 *   pin 서비스는 새 revision 이 0% 로 생기는데, 기존 verify 는 서비스 대표 URL(= 옛 revision)을 본다.
 *   → "새 revision 생성 성공 ≠ 새 revision 정상".
 *
 * 흐름 (verified 모드 — dispatch 입력으로만 선택, 기본은 기존 legacy 동작):
 *   plan      배포 전 traffic 상태 기록 (latest 추종인가 · pin 인가 · 어느 revision 이 몇 %)
 *   (deploy)  gcloud run deploy ... --no-traffic --tag <tag>        ← workflow 가 수행
 *   smoke     tag URL(= 새 revision 전용 주소)로 직접 HTTP 검사 · 또는 revision Ready 조건 검사
 *   switch    PASS 일 때만 전환. 이전이 latest 추종이면 --to-latest, pin 이면 --to-revisions <new>=100
 *   verify    (선택) 전환 후 공개 URL 검사 → 실패 시 rollback
 *             --expect-sha 를 주면 serving 상태도 검사한다: traffic 단일 100% · (--expect-revision) 그 revision ·
 *             serving revision label `o4o-commit-sha` == 기대 SHA. 하나라도 어긋나면 rollback.
 *   rollback  plan 에 기록된 이전 revision 으로 트래픽 복귀 (DB migration 은 되돌리지 않는다)
 *             복귀 뒤 실제 traffic 이 plan 과 같은지 다시 읽어 확인한다.
 *
 * smoke 실패 = switch 를 실행하지 않는다 = 기존 serving revision 유지.
 *   출력: `DEPLOY_FAILED_BEFORE_TRAFFIC_SWITCH SERVICE=<svc> REVISION=<rev>`
 *
 * API(o4o-core-api)는 ingress=internal-and-cloud-load-balancing 이라 run.app tag URL 에 외부(러너)가 닿을 수 없다.
 * 그래서 API 는 `--mode readiness`: 새 revision 의 Ready 조건(= startup probe 통과 = DB 연결 후 listen)을
 * control plane 으로 확인하고, 전환 뒤 LB `/health/ready` 로 검사해 실패 시 rollback 한다. (HTTP revision smoke 아님)
 *
 * 사용법
 *   node scripts/ci/cloud-run-rollout.mjs plan     --service S --out plan.json
 *   node scripts/ci/cloud-run-rollout.mjs smoke    --service S --tag T [--paths /,/health] [--mode http|readiness]
 *   node scripts/ci/cloud-run-rollout.mjs switch   --service S --tag T --plan plan.json
 *   node scripts/ci/cloud-run-rollout.mjs verify   --service S --url https://… --plan plan.json [--attempts 5]
 *   node scripts/ci/cloud-run-rollout.mjs rollback --service S --plan plan.json
 */

import { spawnSync } from 'node:child_process';
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PROJECT_ID = 'netureyoutube';
const REGION = 'asia-northeast3';
const LOC = [`--project=${PROJECT_ID}`, `--region=${REGION}`];

/** Cloud Run traffic tag 규칙: 소문자 시작 · 소문자/숫자/하이픈 · 짧게. commit SHA 앞 12자를 쓴다. */
export function tagForSha(sha) {
  if (!/^[0-9a-f]{12,40}$/.test(sha ?? '')) throw new Error(`tag 를 만들 수 없는 SHA: ${sha}`);
  return `sha-${sha.slice(0, 12)}`;
}

/**
 * 배포 전 traffic 상태 → plan.
 * @param {object} service  `gcloud run services describe --format=json`
 */
export function planFromService(service) {
  const traffic = service?.status?.traffic ?? [];
  const serving = traffic.filter((t) => (t.percent ?? 0) > 0);
  const followsLatest = serving.length === 1 && serving[0].latestRevision === true;
  return {
    mode: followsLatest ? 'latest' : 'pinned',
    previous: serving.map((t) => ({ revision: t.revisionName, percent: t.percent })),
    latest_ready: service?.status?.latestReadyRevisionName ?? null,
  };
}

/** tag 가 붙은 새 revision 의 전용 URL 과 revision 이름. */
export function taggedTarget(service, tag) {
  const entry = (service?.status?.traffic ?? []).find((t) => t.tag === tag);
  if (!entry) return null;
  return { url: entry.url ?? null, revision: entry.revisionName ?? null, percent: entry.percent ?? 0 };
}

/** switch 명령 인자 — 이전 방식을 보존한다 (latest 추종 → to-latest · pin → 새 revision 에 pin). */
export function switchArgs(serviceName, plan, newRevision) {
  if (!newRevision) throw new Error('새 revision 이름 없음');
  const base = ['run', 'services', 'update-traffic', serviceName, ...LOC];
  return plan.mode === 'latest' ? [...base, '--to-latest'] : [...base, `--to-revisions=${newRevision}=100`];
}

/** rollback 명령 인자 — plan 의 이전 분배를 그대로 복원한다. */
export function rollbackArgs(serviceName, plan) {
  if (!plan?.previous?.length) throw new Error('plan 에 이전 traffic 기록 없음 — rollback 불가');
  const spec = plan.previous.map((p) => `${p.revision}=${p.percent}`).join(',');
  return ['run', 'services', 'update-traffic', serviceName, ...LOC, `--to-revisions=${spec}`];
}

/**
 * HTTP smoke 판정 — 2xx/3xx 이고, `/` 계열은 HTML 이어야 한다(빈 200 · 오류 페이지 방지).
 * @param {{path: string, status: number, body: string}[]} results
 */
export function evaluateSmoke(results) {
  const failures = [];
  for (const r of results) {
    if (!(r.status >= 200 && r.status < 400)) {
      failures.push(`${r.path} → HTTP ${r.status}`);
      continue;
    }
    if ((r.path === '/' || r.path === '') && !/<html|<!doctype html/i.test(r.body ?? '')) {
      failures.push(`${r.path} → HTML 아님`);
    }
  }
  return { ok: failures.length === 0 && results.length > 0, failures: results.length === 0 ? ['검사 경로 0개'] : failures };
}

/**
 * 전환 후 serving 상태 판정 (WO-O4O-CICD-WEB-VERIFIED-ROLLOUT-POST-SWITCH-VERIFY-ROLLBACK-V1).
 * @param {object} service   `gcloud run services describe --format=json`
 * @param {object} revision  serving revision 의 `gcloud run revisions describe --format=json` (없으면 null)
 */
export function evaluateServing(service, revision, { expectRevision, expectSha } = {}) {
  const serving = planFromService(service).previous;
  const failures = [];
  if (!(serving.length === 1 && serving[0].percent === 100)) {
    failures.push(`traffic 단일 100% 아님: ${serving.map((p) => `${p.revision}=${p.percent}%`).join(', ') || '(없음)'}`);
  } else if (expectRevision && serving[0].revision !== expectRevision) {
    failures.push(`serving revision ${serving[0].revision} ≠ 새 revision ${expectRevision}`);
  }
  if (expectSha) {
    const label = revision?.metadata?.labels?.['o4o-commit-sha'];
    if (label !== expectSha) failures.push(`serving revision o4o-commit-sha=${label ?? '(없음)'} ≠ ${expectSha}`);
  }
  return { ok: failures.length === 0, failures, revision: serving.length === 1 ? serving[0].revision : null };
}

/** rollback 뒤 실제 traffic 이 plan.previous 와 같은가 (순서 무관). */
export function rollbackConfirmed(service, plan) {
  const key = (list) => list.map((p) => `${p.revision}=${p.percent}`).sort().join(',');
  return key(planFromService(service).previous) === key(plan?.previous ?? []);
}

/** revision Ready 조건 판정 (readiness 모드). */
export function evaluateReadiness(revision) {
  const cond = (revision?.status?.conditions ?? []).find((c) => c.type === 'Ready');
  return { ok: cond?.status === 'True', detail: cond ? `${cond.status}${cond.reason ? ` (${cond.reason})` : ''}` : 'Ready 조건 없음' };
}

// ---------------------------------------------------------------------------

const defaultRun = (cmd, args) => spawnSync(cmd, args, { encoding: 'utf-8', maxBuffer: 32 * 1024 * 1024, shell: process.platform === 'win32' });

function gcloudJson(args, run) {
  const out = run('gcloud', [...args, ...LOC, '--format=json']);
  if (out.status !== 0) throw new Error(`gcloud ${args.slice(0, 3).join(' ')} 실패: ${(out.stderr || '').trim().slice(0, 300)}`);
  return JSON.parse(out.stdout || 'null');
}

function gcloudWrite(args, run) {
  console.log(`$ gcloud ${args.join(' ')}`);
  const out = run('gcloud', args);
  if (out.status !== 0) throw new Error(`gcloud 실패: ${(out.stderr || '').trim().slice(0, 500)}`);
  return out;
}

async function httpGet(url, timeoutMs = 20_000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { redirect: 'manual', signal: ctrl.signal, headers: { 'User-Agent': 'o4o-revision-smoke' } });
    return { status: res.status, body: (await res.text()).slice(0, 4096) };
  } catch (err) {
    return { status: 0, body: String(err.message ?? err) };
  } finally {
    clearTimeout(t);
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function summary(lines) {
  console.log(lines.join('\n'));
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${lines.map((l) => `- ${l}`).join('\n')}\n`);
}

function output(pairs) {
  if (!process.env.GITHUB_OUTPUT) return;
  appendFileSync(process.env.GITHUB_OUTPUT, `${Object.entries(pairs).map(([k, v]) => `${k}=${v}`).join('\n')}\n`);
}

/** plan 의 이전 분배로 traffic 복귀 → 실제 상태를 다시 읽어 확인. 확인 결과(boolean)를 돌려준다. */
function doRollback(svc, plan, run) {
  gcloudWrite(rollbackArgs(svc, plan), run);
  const confirmed = rollbackConfirmed(gcloudJson(['run', 'services', 'describe', svc], run), plan);
  const spec = plan.previous.map((p) => `${p.revision}=${p.percent}%`).join(', ');
  summary([
    confirmed
      ? `↩️ ${svc} traffic 복귀 확인: ${spec} (DB migration 은 되돌리지 않음)`
      : `❌ ${svc} traffic 복귀 확인 실패 — 기대 ${spec} · 수동 확인 필요`,
  ]);
  return confirmed;
}

export async function runCommand(cmd, args, { run = defaultRun, get = httpGet, wait = sleep } = {}) {
  const svc = args.service;
  if (!svc) throw new Error('--service 필요');

  if (cmd === 'plan') {
    const plan = planFromService(gcloudJson(['run', 'services', 'describe', svc], run));
    if (args.out) writeFileSync(args.out, JSON.stringify(plan, null, 2));
    summary([`**${svc}** 배포 전 traffic: mode=\`${plan.mode}\` · ${plan.previous.map((p) => `${p.revision}=${p.percent}%`).join(', ')}`]);
    return { ok: true, plan };
  }

  if (cmd === 'smoke') {
    const tag = args.tag;
    const service = gcloudJson(['run', 'services', 'describe', svc], run);
    const target = taggedTarget(service, tag);
    if (!target?.revision) {
      summary([`DEPLOY_FAILED_BEFORE_TRAFFIC_SWITCH SERVICE=${svc} REVISION=unknown — tag \`${tag}\` 를 찾지 못함`]);
      return { ok: false };
    }
    output({ new_revision: target.revision });
    if (target.percent !== 0) {
      summary([`DEPLOY_FAILED_BEFORE_TRAFFIC_SWITCH SERVICE=${svc} REVISION=${target.revision} — 새 revision 이 이미 ${target.percent}% 를 받고 있음 (--no-traffic 미적용?)`]);
      return { ok: false, revision: target.revision };
    }
    if ((args.mode ?? 'http') === 'readiness') {
      const r = evaluateReadiness(gcloudJson(['run', 'revisions', 'describe', target.revision], run));
      summary([`${r.ok ? '✅' : '❌'} ${svc} 새 revision \`${target.revision}\` Ready=${r.detail} (control plane · traffic 0%)`]);
      if (!r.ok) summary([`DEPLOY_FAILED_BEFORE_TRAFFIC_SWITCH SERVICE=${svc} REVISION=${target.revision}`]);
      return { ok: r.ok, revision: target.revision };
    }
    if (!target.url) {
      summary([`DEPLOY_FAILED_BEFORE_TRAFFIC_SWITCH SERVICE=${svc} REVISION=${target.revision} — tag URL 없음`]);
      return { ok: false, revision: target.revision };
    }
    const paths = String(args.paths ?? '/').split(',').map((p) => p.trim()).filter(Boolean);
    const attempts = Number(args.attempts ?? 3);
    let verdict = { ok: false, failures: [] };
    for (let i = 1; i <= attempts; i += 1) {
      const results = [];
      for (const p of paths) results.push({ path: p, ...(await get(`${target.url}${p === '/' ? '' : p}`)) });
      verdict = evaluateSmoke(results);
      if (verdict.ok) break;
      if (i < attempts) await wait(10_000);
    }
    summary([
      `${verdict.ok ? '✅' : '❌'} ${svc} 새 revision \`${target.revision}\` 직접 smoke (${target.url}) paths=${paths.join(',')}`,
      ...verdict.failures.map((f) => `  - ${f}`),
    ]);
    if (!verdict.ok) summary([`DEPLOY_FAILED_BEFORE_TRAFFIC_SWITCH SERVICE=${svc} REVISION=${target.revision}`]);
    return { ok: verdict.ok, revision: target.revision };
  }

  if (cmd === 'switch') {
    const plan = JSON.parse(readFileSync(args.plan, 'utf-8'));
    const service = gcloudJson(['run', 'services', 'describe', svc], run);
    const target = taggedTarget(service, args.tag);
    if (!target?.revision) throw new Error(`tag ${args.tag} revision 없음 — 전환하지 않는다`);
    gcloudWrite(switchArgs(svc, plan, target.revision), run);
    // tag 는 새 revision 전용 주소일 뿐이다 — 남겨 두면 traffic 목록에 누적된다. 실패해도 배포 실패는 아니다.
    const rm = run('gcloud', ['run', 'services', 'update-traffic', svc, ...LOC, `--remove-tags=${args.tag}`]);
    const after = planFromService(gcloudJson(['run', 'services', 'describe', svc], run));
    summary([
      `🔀 ${svc} traffic 전환: \`${target.revision}\` (방식 보존: ${plan.mode === 'latest' ? '--to-latest' : 'pin'}) → 현재 ${after.previous.map((p) => `${p.revision}=${p.percent}%`).join(', ')}`,
      rm.status === 0 ? `  - tag \`${args.tag}\` 제거` : `  - ⚠️ tag \`${args.tag}\` 제거 실패(무해 · 수동 정리 가능)`,
    ]);
    const switched = after.previous.length === 1 && after.previous[0].revision === target.revision && after.previous[0].percent === 100;
    if (!switched) throw new Error(`전환 후 상태가 기대와 다름: ${JSON.stringify(after.previous)}`);
    return { ok: true, revision: target.revision };
  }

  if (cmd === 'verify') {
    const attempts = Number(args.attempts ?? 5);
    const plan = JSON.parse(readFileSync(args.plan, 'utf-8'));
    let last = null;
    let publicOk = false;
    for (let i = 1; i <= attempts; i += 1) {
      last = await get(args.url);
      if (last.status >= 200 && last.status < 300) {
        publicOk = true;
        break;
      }
      if (i < attempts) await wait(10_000);
    }
    if (!publicOk) {
      summary([`❌ ${svc} 전환 후 공개 검사 FAIL: ${args.url} (HTTP ${last?.status}) — rollback 실행`]);
      return { ok: false, rolledBack: true, rollbackConfirmed: doRollback(svc, plan, run) };
    }
    summary([`✅ ${svc} 전환 후 공개 검사 PASS: ${args.url} (HTTP ${last.status})`]);
    if (args['expect-sha']) {
      const service = gcloudJson(['run', 'services', 'describe', svc], run);
      const servingRev = planFromService(service).previous;
      const revision = servingRev.length === 1 ? gcloudJson(['run', 'revisions', 'describe', servingRev[0].revision], run) : null;
      const s = evaluateServing(service, revision, { expectRevision: args['expect-revision'], expectSha: args['expect-sha'] });
      if (!s.ok) {
        summary([`❌ ${svc} serving 검증 FAIL — rollback 실행`, ...s.failures.map((f) => `  - ${f}`)]);
        return { ok: false, rolledBack: true, rollbackConfirmed: doRollback(svc, plan, run) };
      }
      summary([`✅ ${svc} serving 검증 PASS: \`${s.revision}\` 단일 100% · o4o-commit-sha=${args['expect-sha']}`]);
    }
    return { ok: true };
  }

  if (cmd === 'rollback') {
    const plan = JSON.parse(readFileSync(args.plan, 'utf-8'));
    return { ok: doRollback(svc, plan, run) };
  }

  throw new Error(`알 수 없는 명령: ${cmd}`);
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) out[a.slice(2)] = true;
    else {
      out[a.slice(2)] = next;
      i += 1;
    }
  }
  return out;
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  const [cmd, ...rest] = process.argv.slice(2);
  if (cmd === 'tag') {
    console.log(tagForSha(rest[0]));
  } else {
    runCommand(cmd, parseArgs(rest))
      .then((r) => process.exit(r.ok ? 0 : 1))
      .catch((err) => {
        console.error(`❌ ${err.message}`);
        process.exit(1);
      });
  }
}
