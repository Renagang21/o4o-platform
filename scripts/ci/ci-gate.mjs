#!/usr/bin/env node
/**
 * WO-O4O-CICD-SAFE-AUTODEPLOY-AND-RISK-GATE-V1 — Phase 1 CI success gate
 * WO-O4O-CICD-CI-GATE-STABILIZATION-AND-RISK-DETECTOR-REFINEMENT-V1 — MISSING · 조회 실패 bounded retry
 *
 * 원칙 A: CI 가 green 이 아닌 commit 은 production deploy 대상이 될 수 없다.
 *
 * 필수 CI (조사 근거 — CHECK-O4O-CICD-PRODUCTION-DEPLOY-CENSUS-AND-SIMPLIFICATION-V1 §A-1):
 *   `.github/workflows/ci-pipeline.yml` (name "CI Pipeline") 하나.
 *     - 모든 main push 에서 paths 필터 없이 돈다 (detect → full / admin-fast / docs-fast).
 *     - type-check · lint ratchet · 정적 guard · package/API Jest · Admin build 를 전부 담는다.
 *   **필수가 아닌 것** (advisory 로만 보고):
 *     - CodeQL(`ci-security.yml`) — SARIF upload 실패가 코드 결함과 무관하게 red 가 된 이력(PR #257/#259).
 *     - AppStore Guard · Guard Policy — paths 필터가 있어 SHA 마다 존재하지 않는다(부재 = 차단이 되면 안 됨).
 *     - SonarCloud — main 상시 red 이력 · 외부 서비스.
 *
 * 판정 (target SHA 에 대해 해당 workflow 의 **가장 최근 run** 을 본다 — re-run 은 attempt 가 올라간다):
 *   success                                   → GREEN (통과)
 *   failure · cancelled · timed_out · 기타 종료 → BLOCKED **즉시** (재조회해도 바뀌지 않는다)
 *   target 형식 오류                            → BLOCKED 즉시
 *   queued · in_progress · waiting · requested · pending (GitHub workflow run status)
 *                                              → PENDING — `--wait-seconds` 안에서 재조회
 *   run 0건                                     → MISSING — `--missing-wait-seconds` 안에서 재조회
 *   GitHub API 조회 실패(5xx · 네트워크)          → UNAVAILABLE — MISSING 과 같은 창에서 재조회
 *
 * 왜 MISSING 을 재조회하나 (CHECK-O4O-PRODUCTION-PENDING-DELTA-CENSUS-AND-CONTROLLED-RELEASE-V1 §8-3):
 *   2026-09-30 API dispatch 에서 **실제 success** 인 CI run 을 GitHub API 가 한 순간 0건으로 돌려줘
 *   `REQUIRED_CI_MISSING` 으로 차단됐다(직전 · 직후 조회는 success). push 직후 CI run 이 아직 생성 ·
 *   색인되지 않은 경우도 같은 모양이다. 그래서 MISSING 은 "잠시 뒤 다시 본다" 이고, 창이 끝나도 없으면
 *   `REQUIRED_CI_MISSING_AFTER_RETRY` 로 **차단한다(fail-closed 유지)**. 다른 SHA 로 옮겨 가지 않는다.
 *
 * 출력: GITHUB_OUTPUT `ci_green=true|false` · `ci_state` · `ci_reason` · `ci_attempts`. 차단 시 stdout 첫 줄
 *   `DEPLOY_BLOCKED: TARGET_SHA_CI_NOT_GREEN`. 재조회마다 `CI_GATE_WAIT reason=… target_sha=… attempt=n/N`.
 *   `--enforce` 면 차단 시 exit 1, 아니면(shadow) 항상 exit 0.
 *
 * 사용법
 *   GITHUB_TOKEN=… GITHUB_REPOSITORY=owner/repo node scripts/ci/ci-gate.mjs --target <sha> \
 *     [--wait-seconds 1800] [--missing-wait-seconds 300] [--interval-seconds 30] [--enforce]
 */

import { appendFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const REQUIRED_WORKFLOWS = [{ path: '.github/workflows/ci-pipeline.yml', name: 'CI Pipeline' }];
export const ADVISORY_WORKFLOWS = [{ path: '.github/workflows/ci-security.yml', name: 'CodeQL Security Analysis' }];

const SHA40 = /^[0-9a-f]{40}$/;
/** GitHub REST `workflow_run.status` 중 아직 끝나지 않은 값 (docs: requested · in_progress · completed · queued · pending · waiting) */
export const PENDING_STATUSES = new Set(['queued', 'in_progress', 'waiting', 'requested', 'pending']);
/** 재조회하면 바뀔 수 있는 상태 */
export const RETRYABLE = new Set(['PENDING', 'MISSING', 'UNAVAILABLE']);

/** run 목록에서 target SHA 의 가장 최근 run (created_at · run_attempt 순). */
export function latestRunFor(runs, targetSha) {
  const own = (runs ?? []).filter((r) => r && r.head_sha === targetSha);
  own.sort((a, b) => {
    const t = String(b.created_at ?? '').localeCompare(String(a.created_at ?? ''));
    return t !== 0 ? t : (b.run_attempt ?? 1) - (a.run_attempt ?? 1);
  });
  return own[0] ?? null;
}

/**
 * 한 번의 조회 결과 판정.
 * @param {string} targetSha
 * @param {Record<string, object[]>} runsByWorkflowPath  workflow path → runs(API 응답의 workflow_runs)
 * @returns {{state: 'GREEN'|'PENDING'|'MISSING'|'BLOCKED', green: boolean, reason: string, checks: object[]}}
 */
export function evaluateCiGate(targetSha, runsByWorkflowPath, required = REQUIRED_WORKFLOWS) {
  if (!SHA40.test(targetSha ?? '')) {
    return { state: 'BLOCKED', green: false, reason: `TARGET_SHA_INVALID (${targetSha})`, checks: [] };
  }
  const checks = [];
  let pending = false;
  let missing = null;
  let blocked = null;
  for (const wf of required) {
    const all = runsByWorkflowPath[wf.path] ?? [];
    const mismatch = all.filter((r) => r && r.head_sha && r.head_sha !== targetSha);
    const run = latestRunFor(all, targetSha);
    if (!run) {
      // 다른 SHA 의 run 은 절대 대신 인정하지 않는다 (wrong SHA).
      checks.push({ workflow: wf.name, state: 'MISSING', mismatched_runs: mismatch.length });
      missing ??= `REQUIRED_CI_MISSING (${wf.name})`;
      continue;
    }
    const entry = { workflow: wf.name, run_id: run.id, attempt: run.run_attempt ?? 1, status: run.status, conclusion: run.conclusion, event: run.event };
    checks.push(entry);
    if (PENDING_STATUSES.has(run.status)) {
      pending = true;
    } else if (run.status === 'completed' && run.conclusion === 'success') {
      // green
    } else {
      blocked ??= `FAILED_CHECK=${wf.name} (status=${run.status} conclusion=${run.conclusion})`;
    }
  }
  // 우선순위: 확정 실패 > 부재 > 진행 중 > green. 확정 실패는 재조회하지 않는다.
  if (blocked) return { state: 'BLOCKED', green: false, reason: blocked, checks };
  if (missing) return { state: 'MISSING', green: false, reason: missing, checks };
  if (pending) return { state: 'PENDING', green: false, reason: 'REQUIRED_CI_PENDING', checks };
  return { state: 'GREEN', green: true, reason: 'REQUIRED_CI_GREEN', checks };
}

/**
 * bounded retry 루프 — 네트워크 · 시계 · sleep 은 주입한다(결정적 시험).
 *
 * @param {object} p
 * @param {string} p.target
 * @param {(workflowPath: string) => Promise<object[]>} p.fetchRuns   실패 시 throw
 * @param {number} [p.waitSeconds]         PENDING 재조회 창
 * @param {number} [p.missingWaitSeconds]  MISSING · UNAVAILABLE 재조회 창 (run 생성 · 색인 지연용 — 짧게)
 * @param {number} [p.intervalSeconds]
 * @param {(ms: number) => Promise<void>} [p.sleep]
 * @param {() => number} [p.now]
 * @param {(line: string) => void} [p.log]
 */
export async function pollCiGate({
  target,
  fetchRuns,
  waitSeconds = 0,
  missingWaitSeconds = 0,
  intervalSeconds = 30,
  sleep = (ms) => new Promise((r) => setTimeout(r, ms)),
  now = () => Date.now(),
  log = (line) => console.log(line),
}) {
  const start = now();
  const windowFor = (state) => (state === 'PENDING' ? waitSeconds : missingWaitSeconds) * 1000;
  const maxWindow = Math.max(waitSeconds, missingWaitSeconds);
  const maxAttempts = Math.max(1, Math.floor(maxWindow / Math.max(1, intervalSeconds)) + 1);
  let attempt = 0;
  let result;
  for (;;) {
    attempt += 1;
    try {
      const runs = {};
      for (const wf of REQUIRED_WORKFLOWS) runs[wf.path] = await fetchRuns(wf.path);
      result = evaluateCiGate(target, runs);
    } catch (err) {
      result = { state: 'UNAVAILABLE', green: false, reason: `CI_STATUS_UNAVAILABLE (${err.message})`, checks: [] };
    }
    if (!RETRYABLE.has(result.state)) break;
    const elapsed = now() - start;
    if (elapsed + intervalSeconds * 1000 > windowFor(result.state) || attempt >= maxAttempts) break;
    log(`CI_GATE_WAIT reason=${result.reason} target_sha=${target} attempt=${attempt}/${maxAttempts}`);
    await sleep(intervalSeconds * 1000);
  }

  // 재조회 창을 다 쓰고도 확정되지 않은 상태 → 차단 (fail-closed). 사유에 AFTER_RETRY 를 붙여 즉시 차단과 구분한다.
  if (RETRYABLE.has(result.state)) {
    const suffix = attempt > 1 ? '_AFTER_RETRY' : '';
    const code = result.state === 'MISSING' ? 'REQUIRED_CI_MISSING' : result.state === 'PENDING' ? 'REQUIRED_CI_PENDING' : 'CI_STATUS_UNAVAILABLE';
    result = { ...result, state: 'BLOCKED', green: false, reason: `${code}${suffix} (${result.reason})` };
  }
  return { ...result, attempts: attempt };
}

async function fetchRunsFromGitHub(repo, token, workflowPath, sha) {
  const file = workflowPath.split('/').pop();
  const url = `https://api.github.com/repos/${repo}/actions/workflows/${file}/runs?head_sha=${sha}&per_page=50`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
  });
  if (!res.ok) throw new Error(`GitHub API ${res.status} ${res.statusText} (${file})`);
  const body = await res.json();
  return body.workflow_runs ?? [];
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

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const target = String(args.target ?? process.env.TARGET_SHA ?? '');
  const repo = process.env.GITHUB_REPOSITORY;
  const token = process.env.GITHUB_TOKEN;
  const enforce = args.enforce === true;
  const waitSeconds = Number(args['wait-seconds'] ?? 0);
  // 기본: PENDING 창과 같되 5분을 넘지 않는다 (run 생성 · 색인 지연은 보통 초 단위다).
  const missingWaitSeconds = Number(args['missing-wait-seconds'] ?? Math.min(waitSeconds, 300));
  const intervalSeconds = Number(args['interval-seconds'] ?? 30);

  const fetchRuns = async (wfPath) => {
    if (!repo || !token) throw new Error('GITHUB_REPOSITORY / GITHUB_TOKEN 없음');
    return fetchRunsFromGitHub(repo, token, wfPath, target);
  };
  const result = await pollCiGate({ target, fetchRuns, waitSeconds, missingWaitSeconds, intervalSeconds });

  const advisory = [];
  for (const wf of ADVISORY_WORKFLOWS) {
    const run = latestRunFor(await fetchRuns(wf.path).catch(() => []), target);
    advisory.push(`${wf.name}: ${run ? `${run.status}/${run.conclusion}` : '없음'}`);
  }

  const lines = [];
  if (!result.green) lines.push('DEPLOY_BLOCKED: TARGET_SHA_CI_NOT_GREEN');
  lines.push(`TARGET_SHA=${target}`);
  lines.push(`CI_STATE=${result.state}`);
  lines.push(`CI_REASON=${result.reason}`);
  lines.push(`CI_ATTEMPTS=${result.attempts}`);
  for (const c of result.checks) lines.push(`CHECK ${c.workflow}: ${c.state ?? `${c.status}/${c.conclusion}`} (run ${c.run_id ?? '-'} attempt ${c.attempt ?? '-'})`);
  for (const a of advisory) lines.push(`ADVISORY ${a}`);
  console.log(lines.join('\n'));

  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(
      process.env.GITHUB_STEP_SUMMARY,
      [`### CI gate — ${result.green ? '✅ GREEN' : '⛔ NOT GREEN'}${enforce ? '' : ' (shadow)'}`, '', ...lines.map((l) => `- \`${l}\``), ''].join('\n'),
    );
  }
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(
      process.env.GITHUB_OUTPUT,
      [`ci_green=${result.green}`, `ci_state=${result.state}`, `ci_reason=${result.reason.replace(/\r?\n/g, ' ')}`, `ci_attempts=${result.attempts}`, ''].join('\n'),
    );
  }
  if (enforce && !result.green) process.exit(1);
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) main();
