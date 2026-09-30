#!/usr/bin/env node
/**
 * WO-O4O-CICD-DEPLOY-FREEZE-CUTOVER-V1 — 자동 배포 오케스트레이터 (enforcement)
 *
 * main CI 완료 → 이 스크립트(deploy-auto.yml) → 서비스별 판정 → LEVEL_2 만 자동 verified 배포.
 *
 *   LEVEL_1                       → NO_DEPLOY
 *   LEVEL_2 · rollout_pending 아님  → AUTO_DEPLOY (verified rollout)
 *   LEVEL_2 · rollout_pending      → CONTROLLED_FIRST_ROLLOUT_REQUIRED (배포 방식 변경 뒤 첫 배포는 사람이)
 *   LEVEL_3 · serving SHA 불명      → AUTO_DEPLOY_BLOCKED reason=LEVEL_3 (controlled release 필요)
 *   DEPLOY_FREEZE ≠ 'false'        → BLOCKED_DEPLOY_FREEZE (변수 부재 · 공백 · 오타 포함 = fail-closed)
 *   CI not green                   → BLOCKED_CI_NOT_GREEN
 *   target ≠ main HEAD             → SUPERSEDED_BY_NEWER_MAIN (더 새 commit 의 cycle 이 누적 diff 로 처리)
 *
 * 서비스 독립 판정 + API 의존 규칙:
 *   서비스마다 독립적으로 판정한다 (예: API L3 · KPA L2 → KPA 만 배포). 단 **API 가 배포 대상인데 자동 배포되지
 *   않으면**(L3 · 첫 rollout · 실패) web · admin 의 자동 배포도 보류한다(HELD_API_NOT_DEPLOYED) — 프런트는
 *   같은 target 의 API 변경에 의존할 수 있다(2026-09-30 실측: neture 프런트만 반영 · API 미반영 불일치).
 *   API 를 자동 배포할 때는 **API 성공을 확인한 뒤** 프런트를 dispatch 한다.
 *
 * target 고정: `deploy/auto-<sha12>` 태그를 target SHA 에 만들고 그 태그 ref 로 dispatch 한다
 *   (2026-09-30 controlled release 에서 검증한 경로와 동일 · 배포 중 main 이 움직여도 대상 불변).
 *
 * 사용법
 *   node scripts/ci/deploy-orchestrate.mjs --target <sha> --freeze "<DEPLOY_FREEZE 원문>" [--dry-run true|false]
 *   node scripts/ci/deploy-orchestrate.mjs --base <sha> --head <sha> --freeze false --dry-run true   # 과거 diff 로 판정만 (fixture)
 */

import { appendFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { pollCiGate } from './ci-gate.mjs';
import {
  DEPLOY_TARGETS,
  LEVEL_3,
  assessRisk,
  assessServingGap,
  collectServingState,
  consumesFactory,
  gitDiffProvider,
} from './deploy-risk.mjs';
import { buildWorkspaceGraph, readChangedFiles } from './detect-affected.mjs';

/** DEPLOY_FREEZE 해석 — 정확히 'false'(대소문자 무관)일 때만 배포 허용. 부재 · 공백 · true/1/yes · 오타 = freeze. */
export function isFrozen(raw) {
  return String(raw ?? '').trim().toLowerCase() !== 'false';
}

export const FRONTENDS = DEPLOY_TARGETS.filter((t) => t.key !== 'api').map((t) => t.key);

/** 서비스 1개의 결정 (의존 규칙 적용 전) */
export function decideOne(entry, { frozen, ciGreen, headIsTarget }) {
  if (!entry.deploy_required) return { decision: 'NO_DEPLOY', reason: entry.status };
  if (frozen) return { decision: 'BLOCKED_DEPLOY_FREEZE', reason: 'DEPLOY_FREEZE != false' };
  if (ciGreen !== true) return { decision: 'BLOCKED_CI_NOT_GREEN', reason: 'target CI not green' };
  if (!headIsTarget) return { decision: 'SUPERSEDED_BY_NEWER_MAIN', reason: 'main 에 더 새 commit — 그 cycle 이 누적 diff 로 처리' };
  if (entry.status === 'UNKNOWN') return { decision: 'AUTO_DEPLOY_BLOCKED', reason: `LEVEL_3 (${entry.reasons?.[0] ?? 'unknown'})` };
  const runtimeL3 = (entry.level3 ?? []).length > 0;
  if (runtimeL3) {
    const first = entry.level3[0];
    return { decision: 'AUTO_DEPLOY_BLOCKED', reason: `LEVEL_3 (${first.rule} ${first.file})` };
  }
  if (entry.rollout_pending) return { decision: 'CONTROLLED_FIRST_ROLLOUT_REQUIRED', reason: '배포 방식 변경 뒤 첫 verified 배포는 통제' };
  if (entry.level === LEVEL_3) return { decision: 'AUTO_DEPLOY_BLOCKED', reason: 'LEVEL_3' };
  return { decision: 'AUTO_DEPLOY', reason: 'LEVEL_2' };
}

/**
 * 전체 결정 + API 의존 규칙.
 * @param {Record<string, object>} perService  assessServingGap 결과
 */
export function decideAll(perService, ctx) {
  const out = {};
  for (const t of DEPLOY_TARGETS) out[t.key] = { ...decideOne(perService[t.key] ?? { deploy_required: true, status: 'UNKNOWN', reasons: ['판정 없음'] }, ctx) };
  const api = out.api;
  const apiNeeded = perService.api?.deploy_required === true;
  if (apiNeeded && api.decision !== 'AUTO_DEPLOY') {
    for (const k of FRONTENDS) {
      if (out[k].decision === 'AUTO_DEPLOY') out[k] = { decision: 'HELD_API_NOT_DEPLOYED', reason: `API 가 자동 배포되지 않음(${api.decision}) — 프런트는 API 와 함께 통제 배포` };
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// GitHub dispatch (주입 가능)
// ---------------------------------------------------------------------------

const DISPATCH = {
  api: { file: 'deploy-api.yml', inputs: () => ({ rollout_mode: 'verified' }) },
  admin: { file: 'deploy-admin.yml', inputs: () => ({ rollout_mode: 'verified' }) },
};
const dispatchSpec = (key) => DISPATCH[key] ?? { file: 'deploy-web-services.yml', inputs: () => ({ service: key, rollout_mode: 'verified' }) };

export function autoTagName(sha) {
  return `deploy/auto-${sha.slice(0, 12)}`;
}

export function githubClient(repo, token, fetchImpl = fetch) {
  const call = async (method, url, body) => {
    const res = await fetchImpl(`https://api.github.com/repos/${repo}${url}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    return { status: res.status, ok: res.ok, json: text ? JSON.parse(text) : null };
  };
  return {
    headSha: async () => (await call('GET', '/git/ref/heads/main')).json?.object?.sha ?? null,
    ensureTag: async (tag, sha) => {
      const got = await call('GET', `/git/ref/tags/${tag}`);
      if (got.ok) {
        if (got.json?.object?.sha !== sha) throw new Error(`태그 ${tag} 가 다른 SHA 를 가리킴 (${got.json?.object?.sha})`);
        return 'exists';
      }
      const made = await call('POST', '/git/refs', { ref: `refs/tags/${tag}`, sha });
      if (!made.ok) throw new Error(`태그 생성 실패 ${made.status}`);
      return 'created';
    },
    dispatch: async (file, ref, inputs) => {
      const r = await call('POST', `/actions/workflows/${file}/dispatches`, { ref, inputs });
      if (r.status !== 204) throw new Error(`dispatch 실패 ${file} ${r.status}`);
    },
    findRun: async (file, sha, sinceIso) => {
      const r = await call('GET', `/actions/workflows/${file}/runs?event=workflow_dispatch&head_sha=${sha}&per_page=20`);
      const runs = (r.json?.workflow_runs ?? []).filter((x) => x.created_at >= sinceIso).sort((a, b) => b.id - a.id);
      return runs[0] ?? null;
    },
    runStatus: async (id) => (await call('GET', `/actions/runs/${id}`)).json,
  };
}

/**
 * 결정대로 dispatch. API 먼저 → 성공 확인 → 프런트.
 * @returns {Promise<Record<string, {dispatched: boolean, run_id?: number, conclusion?: string, error?: string}>>}
 */
export async function executeDecisions(decisions, target, gh, { sleep = (ms) => new Promise((r) => setTimeout(r, ms)), now = () => new Date(), log = console.log, waitApiMinutes = 45 } = {}) {
  const results = {};
  const auto = Object.entries(decisions).filter(([, d]) => d.decision === 'AUTO_DEPLOY').map(([k]) => k);
  if (auto.length === 0) return results;
  const tag = autoTagName(target);
  log(`target tag ${tag}: ${await gh.ensureTag(tag, target)}`);

  const fire = async (key) => {
    const spec = dispatchSpec(key);
    const since = new Date(now().getTime() - 5_000).toISOString();
    await gh.dispatch(spec.file, tag, spec.inputs());
    let run = null;
    for (let i = 0; i < 12 && !run; i += 1) {
      await sleep(10_000);
      run = await gh.findRun(spec.file, target, since);
    }
    results[key] = { dispatched: true, run_id: run?.id ?? null };
    log(`AUTO_DEPLOY_DISPATCHED service=${key} workflow=${spec.file} run=${run?.id ?? 'unknown'}`);
    return run;
  };

  if (auto.includes('api')) {
    const run = await fire('api');
    let conclusion = null;
    const deadline = now().getTime() + waitApiMinutes * 60_000;
    while (run?.id && now().getTime() < deadline) {
      const st = await gh.runStatus(run.id);
      if (st?.status === 'completed') {
        conclusion = st.conclusion;
        break;
      }
      await sleep(30_000);
    }
    results.api.conclusion = conclusion ?? 'timeout';
    if (conclusion !== 'success') {
      for (const k of auto.filter((x) => x !== 'api')) {
        results[k] = { dispatched: false, error: `HELD_API_NOT_DEPLOYED (api ${results.api.conclusion})` };
        log(`AUTO_DEPLOY_HELD service=${k} reason=api_${results.api.conclusion}`);
      }
      return results;
    }
  }
  for (const k of auto.filter((x) => x !== 'api')) {
    try {
      await fire(k);
    } catch (err) {
      results[k] = { dispatched: false, error: err.message };
    }
  }
  return results;
}

// ---------------------------------------------------------------------------

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

function render(report) {
  const lines = [
    `### 🚀 Deploy Auto — ${report.dry_run ? 'DRY-RUN (dispatch 0)' : 'ENFORCEMENT'}`,
    '',
    `- target: \`${report.target_sha}\` · CI green: **${report.ci_green}** (${report.ci_reason}) · DEPLOY_FREEZE: \`${report.freeze_raw}\` → frozen=${report.frozen} · target==main HEAD: ${report.head_is_target}`,
    '',
    '| service | serving SHA (source) | status | level | decision | reason |',
    '|---|---|---|---|---|---|',
  ];
  for (const s of report.services) {
    lines.push(`| ${s.key} | ${s.serving_sha ? s.serving_sha.slice(0, 9) : '—'} (${s.serving_source ?? '-'}) | ${s.status ?? '-'} | ${s.level ?? '-'} | **${s.decision}** | ${String(s.reason).slice(0, 120)} |`);
  }
  for (const [k, r] of Object.entries(report.execution ?? {})) lines.push(`- ${k}: ${r.dispatched ? `dispatched run ${r.run_id}${r.conclusion ? ` → ${r.conclusion}` : ''}` : `not dispatched — ${r.error}`}`);
  return lines.join('\n');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const dryRun = String(args['dry-run'] ?? 'true') !== 'false';
  const freezeRaw = String(args.freeze ?? '');
  const frozen = isFrozen(freezeRaw);
  const graph = buildWorkspaceGraph();
  const repo = process.env.GITHUB_REPOSITORY;
  const token = process.env.GITHUB_TOKEN;
  const gh = repo && token ? githubClient(repo, token) : null;

  let target;
  let perService;
  let ci = { green: false, reason: 'not checked', state: 'SKIPPED' };
  let headIsTarget = false;

  if (args.base && args.head) {
    // fixture 모드: 모든 서비스가 base 를 서빙한다고 보고 base..head 를 판정한다 (배포 0 강제)
    target = String(args.head);
    const read = readChangedFiles(args.base, args.head);
    const revOf = (w) => (w === 'base' ? args.base : args.head);
    const r = read.ok
      ? assessRisk(read.files, graph, { readLock: (w) => gitDiffProvider.readLock(revOf(w)), readFile: (w, f) => gitDiffProvider.readFile(revOf(w), f), consumes: consumesFactory(args.head, graph) })
      : null;
    perService = Object.fromEntries(
      DEPLOY_TARGETS.map((t) => {
        const s = r?.services[t.key];
        return [t.key, r ? { status: s.affected ? 'BEHIND' : 'BEHIND_NO_RUNTIME_CHANGE', deploy_required: s.affected, level: s.affected ? s.level : 'LEVEL_1', level3: s.affected ? s.level3.concat(r.pipeline_hits) : [], rollout_pending: s.rollout.length > 0, reasons: s.reasons } : { status: 'UNKNOWN', deploy_required: true, level: LEVEL_3, level3: [], reasons: [read.reason] }];
      }),
    );
    ci = { green: true, reason: 'fixture 모드 — CI 판정 생략', state: 'FIXTURE' };
    headIsTarget = true;
  } else {
    target = String(args.target ?? '');
    if (gh) {
      const r = await pollCiGate({ target, fetchRuns: (p) => fetchRunsVia(repo, token, p, target), waitSeconds: 0, missingWaitSeconds: 120, intervalSeconds: 20 });
      ci = { green: r.green, reason: r.reason, state: r.state };
      headIsTarget = (await gh.headSha()) === target;
    }
    perService = assessServingGap(target, collectServingState(), graph);
  }

  const decisions = decideAll(perService, { frozen, ciGreen: ci.green, headIsTarget });
  for (const [k, d] of Object.entries(decisions)) {
    if (d.decision === 'AUTO_DEPLOY_BLOCKED') console.log(`AUTO_DEPLOY_BLOCKED service=${k} reason=${d.reason}`);
    else if (d.decision !== 'NO_DEPLOY') console.log(`${d.decision} service=${k} reason=${d.reason}`);
  }

  const forceDry = dryRun || Boolean(args.base && args.head);
  let execution = {};
  if (!forceDry && gh) execution = await executeDecisions(decisions, target, gh);

  const report = {
    mode: 'enforcement',
    dry_run: forceDry,
    timestamp: new Date().toISOString(),
    target_sha: target,
    ci_green: ci.green,
    ci_reason: ci.reason,
    freeze_raw: freezeRaw,
    frozen,
    head_is_target: headIsTarget,
    services: DEPLOY_TARGETS.map((t) => ({ key: t.key, ...(perService[t.key] ?? {}), ...decisions[t.key] })),
    execution,
  };
  const text = render(report);
  console.log(text);
  if (args.json) writeFileSync(args.json, JSON.stringify(report, null, 2));
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${text}\n`);
  const failed = Object.values(execution).some((r) => r.conclusion && r.conclusion !== 'success');
  if (failed) process.exitCode = 1;
}

async function fetchRunsVia(repo, token, workflowPath, sha) {
  const file = workflowPath.split('/').pop();
  const res = await fetch(`https://api.github.com/repos/${repo}/actions/workflows/${file}/runs?head_sha=${sha}&per_page=50`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
  });
  if (!res.ok) throw new Error(`GitHub API ${res.status}`);
  return (await res.json()).workflow_runs ?? [];
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) main();
