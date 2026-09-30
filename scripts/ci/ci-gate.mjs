#!/usr/bin/env node
/**
 * WO-O4O-CICD-SAFE-AUTODEPLOY-AND-RISK-GATE-V1 — Phase 1 CI success gate
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
 *   success                       → GREEN
 *   in_progress · queued · waiting → PENDING (--wait-seconds 동안 재조회, 끝나도 PENDING 이면 차단)
 *   failure · cancelled · timed_out · 기타 → BLOCKED
 *   run 없음                       → BLOCKED (필수 CI 없음)
 *   target 형식 오류 · head_sha 불일치 → BLOCKED
 *
 * 출력: GITHUB_OUTPUT `ci_green=true|false` · `ci_state` · `ci_reason`. 차단 시 stdout 첫 줄
 *   `DEPLOY_BLOCKED: TARGET_SHA_CI_NOT_GREEN`. `--enforce` 면 차단 시 exit 1, 아니면(shadow) 항상 exit 0.
 *
 * 사용법
 *   GITHUB_TOKEN=… GITHUB_REPOSITORY=owner/repo node scripts/ci/ci-gate.mjs --target <sha> [--wait-seconds 1800] [--enforce]
 */

import { appendFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const REQUIRED_WORKFLOWS = [{ path: '.github/workflows/ci-pipeline.yml', name: 'CI Pipeline' }];
export const ADVISORY_WORKFLOWS = [{ path: '.github/workflows/ci-security.yml', name: 'CodeQL Security Analysis' }];

const SHA40 = /^[0-9a-f]{40}$/;
const PENDING = new Set(['queued', 'in_progress', 'waiting', 'requested', 'pending']);

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
 * @param {string} targetSha
 * @param {Record<string, object[]>} runsByWorkflowPath  workflow path → runs(API 응답의 workflow_runs)
 * @returns {{state: 'GREEN'|'PENDING'|'BLOCKED', green: boolean, reason: string, checks: object[]}}
 */
export function evaluateCiGate(targetSha, runsByWorkflowPath, required = REQUIRED_WORKFLOWS) {
  if (!SHA40.test(targetSha ?? '')) {
    return { state: 'BLOCKED', green: false, reason: `TARGET_SHA_INVALID (${targetSha})`, checks: [] };
  }
  const checks = [];
  let pending = false;
  let blocked = null;
  for (const wf of required) {
    const all = runsByWorkflowPath[wf.path] ?? [];
    const mismatch = all.filter((r) => r && r.head_sha && r.head_sha !== targetSha);
    const run = latestRunFor(all, targetSha);
    if (!run) {
      checks.push({ workflow: wf.name, state: 'MISSING', mismatched_runs: mismatch.length });
      blocked ??= `REQUIRED_CI_MISSING (${wf.name})`;
      continue;
    }
    const entry = { workflow: wf.name, run_id: run.id, attempt: run.run_attempt ?? 1, status: run.status, conclusion: run.conclusion, event: run.event };
    checks.push(entry);
    if (PENDING.has(run.status)) {
      pending = true;
    } else if (run.status === 'completed' && run.conclusion === 'success') {
      // green
    } else {
      blocked ??= `FAILED_CHECK=${wf.name} (status=${run.status} conclusion=${run.conclusion})`;
    }
  }
  if (blocked) return { state: 'BLOCKED', green: false, reason: blocked, checks };
  if (pending) return { state: 'PENDING', green: false, reason: 'REQUIRED_CI_PENDING', checks };
  return { state: 'GREEN', green: true, reason: 'REQUIRED_CI_GREEN', checks };
}

async function fetchRuns(repo, token, workflowPath, sha) {
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

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const target = String(args.target ?? process.env.TARGET_SHA ?? '');
  const repo = process.env.GITHUB_REPOSITORY;
  const token = process.env.GITHUB_TOKEN;
  const waitSeconds = Number(args['wait-seconds'] ?? 0);
  const enforce = args.enforce === true;
  const deadline = Date.now() + waitSeconds * 1000;

  let result;
  let advisory = [];
  for (;;) {
    try {
      if (!repo || !token) throw new Error('GITHUB_REPOSITORY / GITHUB_TOKEN 없음');
      const runs = {};
      for (const wf of REQUIRED_WORKFLOWS) runs[wf.path] = await fetchRuns(repo, token, wf.path, target);
      result = evaluateCiGate(target, runs);
      advisory = [];
      for (const wf of ADVISORY_WORKFLOWS) {
        const run = latestRunFor(await fetchRuns(repo, token, wf.path, target).catch(() => []), target);
        advisory.push(`${wf.name}: ${run ? `${run.status}/${run.conclusion}` : '없음'}`);
      }
    } catch (err) {
      // 조회 실패 = CI 상태를 모름 = 차단 (fail-closed)
      result = { state: 'BLOCKED', green: false, reason: `CI_STATUS_UNAVAILABLE (${err.message})`, checks: [] };
    }
    if (result.state !== 'PENDING' || Date.now() >= deadline) break;
    console.log(`CI pending for ${target.slice(0, 9)} — 30s 후 재조회`);
    await sleep(30_000);
  }

  const lines = [];
  if (!result.green) {
    lines.push('DEPLOY_BLOCKED: TARGET_SHA_CI_NOT_GREEN');
  }
  lines.push(`TARGET_SHA=${target}`);
  lines.push(`CI_STATE=${result.state}`);
  lines.push(`CI_REASON=${result.reason}`);
  for (const c of result.checks) lines.push(`CHECK ${c.workflow}: ${c.state ?? `${c.status}/${c.conclusion}`} (run ${c.run_id ?? '-'} attempt ${c.attempt ?? '-'})`);
  for (const a of advisory) lines.push(`ADVISORY ${a}`);
  console.log(lines.join('\n'));

  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(
      process.env.GITHUB_STEP_SUMMARY,
      [
        `### CI gate — ${result.green ? '✅ GREEN' : '⛔ NOT GREEN'}${enforce ? '' : ' (shadow)'}`,
        '',
        ...lines.map((l) => `- \`${l}\``),
        '',
      ].join('\n'),
    );
  }
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(
      process.env.GITHUB_OUTPUT,
      [`ci_green=${result.green}`, `ci_state=${result.state}`, `ci_reason=${result.reason.replace(/\r?\n/g, ' ')}`, ''].join('\n'),
    );
  }
  if (enforce && !result.green) process.exit(1);
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) main();
