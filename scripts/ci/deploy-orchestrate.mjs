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
 * WO-O4O-CICD-UNIFIED-DELIVERY-PIPELINE-V1 — Unified Delivery (`delivery.yml` · `promote.yml`) 판정 계층
 *   --plan-only : 태그 · dispatch 를 하지 않는다. 결정과 실행 계획(API · 의존 프런트 · 독립 프런트)만 GITHUB_OUTPUT 으로
 *                 내보내고, 배포는 workflow 가 `workflow_call` 로 reusable deploy workflow 를 호출해 수행한다.
 *   --mode promote : LEVEL_3 · 첫 rollout 승인 경로. 승인 대상 = 입력 SHA 하나(== main HEAD) + 그 시점에 계산된 서비스.
 *   API 의존 정밀화 : API 가 배포되지 않을 때 프런트를 막는 것은 **의존이 증명되지 않은** 경우뿐이다
 *                 (같은 commit 동시 변경 · 같은 WO 키 · WO 키 없음 · 판정 불가 = 의존). computeApiDependency.
 *   report      : 배포 뒤 serving SHA 를 다시 읽어 서비스별 DEPLOYED/FAILED 를 확정하고 commit status 를 갱신한다.
 *
 * 사용법
 *   node scripts/ci/deploy-orchestrate.mjs --target <sha> --freeze "<DEPLOY_FREEZE 원문>" [--dry-run true|false]
 *   node scripts/ci/deploy-orchestrate.mjs --base <sha> --head <sha> --freeze false --dry-run true   # 과거 diff 로 판정만 (fixture)
 *   node scripts/ci/deploy-orchestrate.mjs --plan-only --target <sha> --workflow-sha <github.sha> --freeze … [--mode promote --services a,b] [--shadow] [--status-context production]
 *   node scripts/ci/deploy-orchestrate.mjs report --decision <classify json> [--status-context production]
 */

import { spawnSync } from 'node:child_process';
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
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
  readServingSha,
} from './deploy-risk.mjs';
import { REPO_ROOT, buildWorkspaceGraph, readChangedFiles } from './detect-affected.mjs';

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

/** 배포를 실제로 실행하는 결정 (자동 · 승인) */
export const DEPLOYING = new Set(['AUTO_DEPLOY', 'PROMOTE']);

const MISSING_ENTRY = { deploy_required: true, status: 'UNKNOWN', reasons: ['판정 없음'] };

/**
 * API 의존 규칙 — API 가 배포 대상인데 이번에 배포되지 않으면, **API 변경에 의존하는** 프런트만 보류한다.
 *   deps 미제공 · deps[k] 없음 · dependent !== false → 의존으로 본다(종전 규칙 = 전부 보류, fail-closed).
 */
function applyApiDependency(out, perService, deps) {
  const api = out.api;
  if (perService.api?.deploy_required !== true || DEPLOYING.has(api.decision)) return out;
  for (const k of FRONTENDS) {
    if (!DEPLOYING.has(out[k].decision)) continue;
    const d = deps?.[k];
    if (d && d.dependent === false) {
      out[k] = { ...out[k], reason: `${out[k].reason} · API 와 독립 (${d.reason})` };
      continue;
    }
    out[k] = {
      decision: 'HELD_API_NOT_DEPLOYED',
      reason: `API 가 배포되지 않음(${api.decision}) — ${d ? d.reason : '프런트는 API 와 함께 통제 배포'}`,
    };
  }
  return out;
}

/**
 * 전체 결정 + API 의존 규칙.
 * @param {Record<string, object>} perService  assessServingGap 결과
 * @param {Record<string, {dependent: boolean, reason: string}>} [deps]  computeApiDependency 결과 (없으면 전부 의존)
 */
export function decideAll(perService, ctx, deps) {
  const out = {};
  for (const t of DEPLOY_TARGETS) out[t.key] = { ...decideOne(perService[t.key] ?? MISSING_ENTRY, ctx) };
  return applyApiDependency(out, perService, deps);
}

// ---------------------------------------------------------------------------
// Promote (LEVEL_3 · 첫 rollout 승인) — WO-O4O-CICD-UNIFIED-DELIVERY-PIPELINE-V1 §13 · §14
// ---------------------------------------------------------------------------

/**
 * 승인 1회의 서비스 결정. 사람이 고르는 것은 SHA 하나 — 서비스 · migration · rollout 방식은 여기서 다시 계산한다.
 *   - SHA == main HEAD (== 이 run 의 workflow SHA) 일 때만. HEAD 가 움직였으면 거절 → 새 SHA 로 다시 승인.
 *     (승인 범위 = serving → SHA 가 정확히 고정된다. 뒤에 쌓인 commit 이 승인 없이 섞이지 않는다.)
 *   - serving SHA 를 모르는 서비스(UNKNOWN)는 승인으로도 배포하지 않는다 — 범위를 고정할 수 없다(break-glass 대상).
 *   - LEVEL_2 서비스도 같은 SHA 면 함께 승격한다 (delivery 실패 · shadow 기간의 재시도 경로).
 */
export function decidePromoteOne(entry, { frozen, ciGreen, headIsTarget }) {
  if (!entry.deploy_required) return { decision: 'NO_DEPLOY', reason: entry.status };
  if (frozen) return { decision: 'BLOCKED_DEPLOY_FREEZE', reason: 'DEPLOY_FREEZE != false' };
  if (ciGreen !== true) return { decision: 'BLOCKED_CI_NOT_GREEN', reason: 'target CI not green' };
  if (!headIsTarget) return { decision: 'PROMOTE_REFUSED_NOT_HEAD', reason: 'promote 는 main HEAD 와 같은 SHA 만 — 최신 SHA 로 다시 승인' };
  if (entry.status === 'UNKNOWN') return { decision: 'PROMOTE_REFUSED_UNKNOWN_SERVING', reason: `serving → target 범위 고정 불가 (${entry.reasons?.[0] ?? 'unknown'}) — break-glass 수동 배포 대상` };
  const l3 = (entry.level3 ?? [])[0];
  if (l3) return { decision: 'PROMOTE', reason: `승인된 LEVEL_3 (${l3.rule} ${l3.file})` };
  if (entry.rollout_pending) return { decision: 'PROMOTE', reason: '승인된 첫 verified rollout' };
  return { decision: 'PROMOTE', reason: entry.level === LEVEL_3 ? '승인된 LEVEL_3' : 'LEVEL_2 (같은 SHA 승격)' };
}

/** @param {{services?: string[]}} [opts] services 를 주면 그 서비스만 승격(나머지 NOT_SELECTED) */
export function decidePromote(perService, ctx, deps, { services } = {}) {
  const out = {};
  for (const t of DEPLOY_TARGETS) {
    const d = decidePromoteOne(perService[t.key] ?? MISSING_ENTRY, ctx);
    out[t.key] = services && services.length > 0 && d.decision === 'PROMOTE' && !services.includes(t.key) ? { decision: 'NOT_SELECTED', reason: 'promote services 입력에 없음' } : d;
  }
  return applyApiDependency(out, perService, deps);
}

// ---------------------------------------------------------------------------
// API ↔ 프런트 의존 판정 (WO-O4O-CICD-UNIFIED-DELIVERY-PIPELINE-V1 §17)
// ---------------------------------------------------------------------------

const SHA40 = /^[0-9a-f]{40}$/;
const WO_KEY = /\bWO-[A-Z0-9]+(?:-[A-Z0-9]+)+\b/g;

const git = (args) => spawnSync('git', args, { cwd: REPO_ROOT, encoding: 'utf-8', maxBuffer: 64 * 1024 * 1024 });

/** commit 이력 공급자 — 테스트는 주입 대체한다. */
export const gitHistoryProvider = {
  /** base..target first-parent commit (오래된 것부터). main 의 commit 단위 = direct push 1개 · PR merge 1개. */
  firstParentCommits: (base, target) => {
    const r = git(['rev-list', '--first-parent', '--reverse', `${base}..${target}`]);
    return r.status === 0 ? { ok: true, commits: r.stdout.split(/\r?\n/).filter(Boolean) } : { ok: false, reason: (r.stderr || '').trim() };
  },
  parent: (sha) => {
    const r = git(['rev-parse', '--verify', '-q', `${sha}^1`]);
    return r.status === 0 ? r.stdout.trim() : null;
  },
  /** commit 의 작업 키(WO-…). merge commit 은 merge 된 branch 의 commit 메시지까지 본다. */
  workKeys: (sha) => {
    const own = git(['log', '-1', '--format=%B', sha]);
    let text = own.status === 0 ? own.stdout : '';
    if (git(['rev-parse', '--verify', '-q', `${sha}^2`]).status === 0) {
      const merged = git(['log', '--format=%B', `${sha}^1..${sha}^2`]);
      if (merged.status === 0) text += `\n${merged.stdout}`;
    }
    return new Set(text.match(WO_KEY) ?? []);
  },
  /** base..target 에서 file 을 마지막으로 바꾼 first-parent commit */
  originOf: (base, target, file) => {
    const r = git(['log', '--first-parent', '-1', '--format=%H%x09%s', `${base}..${target}`, '--', file]);
    if (r.status !== 0 || !r.stdout.trim()) return null;
    const [sha, subject] = r.stdout.trim().split('\t');
    return { sha, subject: subject ?? '' };
  },
};

/**
 * 프런트(web · admin)가 **이번에 배포되지 않는 API 변경**에 의존하는가.
 *
 * 독립(dependent=false)은 증명될 때만:
 *   API 의 serving→target 에서 API 를 바꾼 commit 집합 A, 프런트 X 의 serving→target 에서 X 를 바꾼 commit 집합 B 에 대해
 *   ① A ∩ B = ∅ (같은 commit 에서 함께 바뀐 적 없음 — 공유 계약 package 변경도 여기서 걸린다)
 *   ② A ∪ B 의 모든 commit 이 WO 키를 갖고, A 의 키와 B 의 키가 겹치지 않는다 (같은 작업의 분할 commit 이 아님)
 * 그 밖(키 없는 commit · 누적 효과로만 영향 · git 실패 · serving 불명)은 전부 dependent=true (fail-closed).
 *
 * @returns {Record<string, {dependent: boolean, reason: string}>}  배포가 필요한 프런트만
 */
export function computeApiDependency(target, perService, graph, { provider = gitDiffProvider, history = gitHistoryProvider } = {}) {
  const out = {};
  const fronts = FRONTENDS.filter((k) => perService[k]?.deploy_required === true);
  if (fronts.length === 0) return out;
  if (perService.api?.deploy_required !== true) {
    for (const k of fronts) out[k] = { dependent: false, reason: 'API 배포 대상 아님' };
    return out;
  }
  const allDependent = (reason) => {
    for (const k of fronts) out[k] = { dependent: true, reason };
    return out;
  };

  const affectsCache = new Map();
  const affects = (sha) => {
    if (!affectsCache.has(sha)) {
      let val = null;
      const parent = history.parent(sha);
      const read = parent ? provider.changedFiles(parent, sha) : { ok: false };
      if (read.ok) {
        const revOf = (which) => (which === 'base' ? parent : sha);
        const r = assessRisk(read.files, graph, {
          readLock: (which) => provider.readLock(revOf(which)),
          readFile: provider.readFile ? (which, file) => provider.readFile(revOf(which), file) : undefined,
          consumes: provider.consumesAt ? provider.consumesAt(sha, graph) : undefined,
        });
        val = Object.fromEntries(Object.entries(r.services).map(([k, s]) => [k, s.affected === true]));
      }
      affectsCache.set(sha, val);
    }
    return affectsCache.get(sha);
  };
  const keysCache = new Map();
  const keysOf = (sha) => {
    if (!keysCache.has(sha)) keysCache.set(sha, history.workKeys(sha));
    return keysCache.get(sha);
  };
  const rangeOf = (key) => {
    const s = perService[key]?.serving_sha;
    if (!SHA40.test(s ?? '')) return null;
    const r = history.firstParentCommits(s, target);
    return r.ok ? r.commits : null;
  };

  const apiRange = rangeOf('api');
  if (!apiRange) return allDependent('API serving→target commit 목록 불가 — 안전 fallback');
  const apiCommits = [];
  for (const c of apiRange) {
    const a = affects(c);
    if (!a) return allDependent(`commit ${c.slice(0, 9)} 판정 불가 — 안전 fallback`);
    if (a.api) apiCommits.push(c);
  }
  if (apiCommits.length === 0) return allDependent('API 변경 commit 을 특정할 수 없음(누적 효과) — 안전 fallback');
  const apiKeys = new Set();
  const unkeyedApi = apiCommits.find((c) => keysOf(c).size === 0);
  for (const c of apiCommits) for (const key of keysOf(c)) apiKeys.add(key);

  for (const k of fronts) {
    const range = rangeOf(k);
    if (!range) {
      out[k] = { dependent: true, reason: `${k} serving→target commit 목록 불가 — 안전 fallback` };
      continue;
    }
    let failed = null;
    const mine = range.filter((c) => {
      const a = affects(c);
      if (!a) failed = c;
      return a?.[k] === true;
    });
    if (failed) out[k] = { dependent: true, reason: `commit ${failed.slice(0, 9)} 판정 불가 — 안전 fallback` };
    else if (mine.length === 0) out[k] = { dependent: true, reason: `${k} 변경 commit 을 특정할 수 없음(누적 효과) — 안전 fallback` };
    else {
      const co = mine.find((c) => apiCommits.includes(c));
      const unkeyed = mine.find((c) => keysOf(c).size === 0);
      const shared = mine.flatMap((c) => [...keysOf(c)]).find((key) => apiKeys.has(key));
      if (co) out[k] = { dependent: true, reason: `같은 commit 에서 API 와 함께 변경 (${co.slice(0, 9)})` };
      else if (unkeyedApi) out[k] = { dependent: true, reason: `WO 키 없는 API commit ${unkeyedApi.slice(0, 9)} — 관련성 판단 불가` };
      else if (unkeyed) out[k] = { dependent: true, reason: `WO 키 없는 commit ${unkeyed.slice(0, 9)} — 관련성 판단 불가` };
      else if (shared) out[k] = { dependent: true, reason: `같은 작업 ${shared}` };
      else out[k] = { dependent: false, reason: `API 변경 ${apiCommits.length} commit 과 공유 commit · 작업 키 없음` };
    }
  }
  return out;
}

/**
 * LEVEL_3 누적 표시 (§15) — 차단 사유가 target 자신이 아니라 **이전 commit 의 LEVEL_3** 이면
 * `BLOCKED_BY_PENDING_LEVEL3` 로 밝힌다 (뒤에 쌓인 L2 commit 이 왜 자동 배포되지 않는지).
 */
export function annotatePendingLevel3(decisions, perService, target, history = gitHistoryProvider) {
  for (const [k, d] of Object.entries(decisions)) {
    if (d.decision !== 'AUTO_DEPLOY_BLOCKED') continue;
    const entry = perService[k];
    const hit = (entry?.level3 ?? [])[0];
    if (!hit?.file || !SHA40.test(entry?.serving_sha ?? '')) continue;
    const origin = history.originOf(entry.serving_sha, target, hit.file);
    if (!origin || origin.sha === target) continue;
    d.pending_level3 = { since: origin.sha, subject: origin.subject.slice(0, 80) };
    d.reason = `BLOCKED_BY_PENDING_LEVEL3 since ${origin.sha.slice(0, 9)} — ${d.reason}`;
  }
  return decisions;
}

// ---------------------------------------------------------------------------
// 실행 계획 · 상태 표현 (§10 · §17 · §26 · §27)
// ---------------------------------------------------------------------------

export const WEB_KEYS = FRONTENDS.filter((k) => k !== 'admin');

/**
 * reusable deploy job 에 넘길 계획. API 를 배포하면 **의존 프런트는 API 성공 뒤**, 독립 프런트는 병렬.
 * deps 가 없거나 판정이 없으면 API 뒤로 보낸다(종전 순서 = 보수).
 */
export function buildPlan(decisions, deps) {
  const deploy = (k) => DEPLOYING.has(decisions[k]?.decision);
  const api = deploy('api');
  const afterApi = (k) => api && deps?.[k]?.dependent !== false;
  return {
    deploy_api: api,
    admin_after_api: deploy('admin') && afterApi('admin'),
    admin_parallel: deploy('admin') && !afterApi('admin'),
    web_after_api: WEB_KEYS.filter((k) => deploy(k) && afterApi(k)),
    web_parallel: WEB_KEYS.filter((k) => deploy(k) && !afterApi(k)),
  };
}

/** decision → 사용자에게 보이는 상태 */
export const STATE_OF = {
  NO_DEPLOY: 'NO_DEPLOY',
  AUTO_DEPLOY: 'DEPLOYING',
  PROMOTE: 'DEPLOYING',
  AUTO_DEPLOY_BLOCKED: 'HELD_LEVEL_3',
  CONTROLLED_FIRST_ROLLOUT_REQUIRED: 'HELD_ROLLOUT_PENDING',
  HELD_API_NOT_DEPLOYED: 'HELD_DEPENDENCY',
  BLOCKED_DEPLOY_FREEZE: 'BLOCKED_FREEZE',
  BLOCKED_CI_NOT_GREEN: 'BLOCKED_CI',
  SUPERSEDED_BY_NEWER_MAIN: 'SUPERSEDED',
  PROMOTE_REFUSED_NOT_HEAD: 'SUPERSEDED',
  PROMOTE_REFUSED_UNKNOWN_SERVING: 'HELD_LEVEL_3',
  NOT_SELECTED: 'HELD_LEVEL_3',
};
const STATE_ORDER = ['FAILED', 'BLOCKED_CI', 'BLOCKED_FREEZE', 'HELD_LEVEL_3', 'HELD_ROLLOUT_PENDING', 'HELD_DEPENDENCY', 'DEPLOYING', 'DEPLOYED', 'SUPERSEDED', 'NO_DEPLOY'];
const GH_STATE = {
  FAILED: 'failure',
  BLOCKED_CI: 'failure',
  BLOCKED_FREEZE: 'pending',
  HELD_LEVEL_3: 'pending',
  HELD_ROLLOUT_PENDING: 'pending',
  HELD_DEPENDENCY: 'pending',
  DEPLOYING: 'pending',
  DEPLOYED: 'success',
  SUPERSEDED: 'success',
  NO_DEPLOY: 'success',
};
const SHORT = { HELD_LEVEL_3: 'L3', HELD_ROLLOUT_PENDING: 'first-rollout', HELD_DEPENDENCY: 'needs-api' };

/**
 * 배선 검증 계획 (delivery.yml 수동 실행 · `wiring_services`) — 판정과 무관하게 지정 서비스의 reusable deploy workflow 를
 * `dry_run: 'true'` 로 호출한다. 호출된 workflow 는 freeze-notice · detect 까지만 돌고 ci-gate · build · deploy 는 0 이다.
 * api 를 포함하면 프런트는 API 뒤(after-api 경로), 포함하지 않으면 병렬 경로를 검증한다.
 */
export function wiringPlan(services) {
  const keys = services.filter((k) => DEPLOY_TARGETS.some((t) => t.key === k));
  const api = keys.includes('api');
  const web = WEB_KEYS.filter((k) => keys.includes(k));
  return {
    execute: 'true',
    dry_call: 'true',
    deploy_api: String(api),
    admin_after_api: String(api && keys.includes('admin')),
    admin_parallel: String(!api && keys.includes('admin')),
    web_after_api: api ? web : [],
    web_parallel: api ? [] : web,
    state: 'WIRING_TEST',
  };
}

export function promoteCommand(sha) {
  return `gh workflow run promote.yml -f sha=${sha}`;
}

/**
 * commit 1개의 production 상태 (commit status 1줄 · description ≤ 140자).
 * @param {{key: string, state: string}[]} services
 */
export function commitStatus(services, target) {
  const present = new Set(services.map((s) => s.state));
  const overall = STATE_ORDER.find((s) => present.has(s)) ?? 'NO_DEPLOY';
  const of = (...states) => services.filter((s) => states.includes(s.state));
  const parts = [overall];
  const moving = of('DEPLOYING', 'DEPLOYED');
  if (moving.length > 0) parts.push(`deploy: ${moving.map((s) => s.key).join(',')}`);
  const failed = of('FAILED');
  if (failed.length > 0) parts.push(`failed: ${failed.map((s) => s.key).join(',')}`);
  const held = of('HELD_LEVEL_3', 'HELD_ROLLOUT_PENDING', 'HELD_DEPENDENCY');
  if (held.length > 0) parts.push(`held: ${held.map((s) => `${s.key}(${SHORT[s.state]})`).join(',')}`);
  const hint = held.some((s) => s.state !== 'HELD_DEPENDENCY') && !present.has('BLOCKED_FREEZE') && !present.has('BLOCKED_CI') ? ` · ${promoteCommand(target)}` : '';
  let description = parts.join(' · ');
  const room = 140 - hint.length;
  if (description.length > room) description = `${description.slice(0, room - 1)}…`;
  return { overall, state: GH_STATE[overall], description: `${description}${hint}` };
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

// 연결 계층 오류 — 응답을 받기 전에 끊긴 경우만. HTTP 오류 status 는 여기 해당하지 않는다.
// 실측: serving 판정(~1분) 동안 놀던 keep-alive 소켓을 재사용하다 `UND_ERR_SOCKET other side closed`.
const NETWORK_ERROR_CODES = new Set(['UND_ERR_SOCKET', 'UND_ERR_CLOSED', 'UND_ERR_CONNECT_TIMEOUT', 'ECONNRESET', 'ECONNREFUSED', 'EPIPE', 'ETIMEDOUT', 'EAI_AGAIN']);
export function isNetworkError(err) {
  return err instanceof TypeError && NETWORK_ERROR_CODES.has(err.cause?.code);
}

/**
 * GitHub REST client. 연결 오류 재시도는 **GET 만** (멱등). POST 는 재시도하지 않는다 —
 * 요청이 서버에 닿았는지 모르는 채 다시 보내면 dispatch 가 중복될 수 있다.
 * 예외: 태그 생성 POST 가 연결 오류면 GET 으로 실제 생성 여부를 확인한다.
 */
export function githubClient(repo, token, fetchImpl = fetch, { sleep = (ms) => new Promise((r) => setTimeout(r, ms)), getAttempts = 3 } = {}) {
  // idempotent: 같은 요청을 다시 보내도 결과가 같은 POST (commit status = 같은 context 를 덮어쓴다) — GET 처럼 재시도한다.
  const call = async (method, url, body, { idempotent = false } = {}) => {
    const attempts = method === 'GET' || idempotent ? getAttempts : 1;
    for (let i = 1; ; i += 1) {
      try {
        const res = await fetchImpl(`https://api.github.com/repos/${repo}${url}`, {
          method,
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json' },
          body: body ? JSON.stringify(body) : undefined,
        });
        const text = await res.text();
        return { status: res.status, ok: res.ok, json: text ? JSON.parse(text) : null };
      } catch (err) {
        if (i >= attempts || !isNetworkError(err)) throw err;
        console.log(`GitHub API ${method} ${url} 연결 오류(${err.cause.code}) — 재시도 ${i}/${attempts - 1}`);
        await sleep(1_000 * i);
      }
    }
  };
  return {
    headSha: async () => (await call('GET', '/git/ref/heads/main')).json?.object?.sha ?? null,
    ensureTag: async (tag, sha) => {
      const got = await call('GET', `/git/ref/tags/${tag}`);
      if (got.ok) {
        if (got.json?.object?.sha !== sha) throw new Error(`태그 ${tag} 가 다른 SHA 를 가리킴 (${got.json?.object?.sha})`);
        return 'exists';
      }
      let made;
      try {
        made = await call('POST', '/git/refs', { ref: `refs/tags/${tag}`, sha });
      } catch (err) {
        if (!isNetworkError(err)) throw err;
        const check = await call('GET', `/git/ref/tags/${tag}`);
        if (check.ok && check.json?.object?.sha === sha) return 'created';
        throw err;
      }
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
    /**
     * commit status (statuses: write). 가시성 전용 — 실패해도 배포 판정에 영향 없다.
     * 멱등(같은 context 덮어쓰기)이라 연결 오류 재시도를 허용한다 — 실측: 판정(~1분) 뒤 첫 POST 가 idle 소켓 재사용으로
     * `fetch failed` (066dde821 Deploy Auto run 36872673189). dispatch POST 는 종전대로 재시도 0.
     */
    setStatus: async (sha, body) => {
      const r = await call('POST', `/statuses/${sha}`, body, { idempotent: true });
      if (!r.ok) throw new Error(`commit status 실패 ${r.status}`);
    },
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
  const title = report.plan_only
    ? `### 🚚 ${report.mode === 'promote' ? 'Promote' : 'Delivery'} — ${report.shadow ? 'SHADOW (판정만 · 배포 0)' : report.dry_run ? 'DRY-RUN (배포 0)' : report.execute ? 'EXECUTE' : 'NO EXECUTION'}`
    : `### 🚀 Deploy Auto — ${report.dry_run ? 'DRY-RUN (dispatch 0)' : 'ENFORCEMENT'}`;
  const lines = [
    title,
    '',
    `- target: \`${report.target_sha}\` · CI green: **${report.ci_green}** (${report.ci_reason}) · DEPLOY_FREEZE: \`${report.freeze_raw}\` → frozen=${report.frozen} · target==main HEAD: ${report.head_is_target}${report.identity ? ` (${report.identity})` : ''}`,
  ];
  if (report.commit_status) lines.push(`- commit status: **${report.commit_status.overall}** — ${report.commit_status.description}`);
  lines.push('', '| service | serving SHA (source) | status | level | decision | state | reason |', '|---|---|---|---|---|---|---|');
  for (const s of report.services) {
    lines.push(`| ${s.key} | ${s.serving_sha ? s.serving_sha.slice(0, 9) : '—'} (${s.serving_source ?? '-'}) | ${s.status ?? '-'} | ${s.level ?? '-'} | **${s.decision}** | ${STATE_OF[s.decision] ?? '-'} | ${String(s.reason).slice(0, 160)} |`);
  }
  if (report.plan) {
    const p = report.plan;
    lines.push(
      '',
      `- plan: api=${p.deploy_api} · web(after api)=${p.web_after_api.join(',') || '-'} · web(parallel)=${p.web_parallel.join(',') || '-'} · admin=${p.admin_after_api ? 'after api' : p.admin_parallel ? 'parallel' : '-'}`,
    );
  }
  for (const [k, d] of Object.entries(report.dependency ?? {})) lines.push(`- API 의존 ${k}: ${d.dependent ? '**의존**' : '독립'} — ${d.reason}`);
  for (const [k, r] of Object.entries(report.execution ?? {})) lines.push(`- ${k}: ${r.dispatched ? `dispatched run ${r.run_id}${r.conclusion ? ` → ${r.conclusion}` : ''}` : `not dispatched — ${r.error}`}`);
  return lines.join('\n');
}

const runUrl = () =>
  process.env.GITHUB_RUN_ID ? `${process.env.GITHUB_SERVER_URL ?? 'https://github.com'}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}` : undefined;

async function postStatus(gh, context, target, services) {
  const st = commitStatus(services, target);
  if (!gh || !context || !SHA40.test(target)) return st;
  try {
    await gh.setStatus(target, { state: st.state, description: st.description, context, target_url: runUrl() });
    console.log(`COMMIT_STATUS ${context}=${st.overall} (${st.state})`);
  } catch (err) {
    console.log(`::warning::commit status 기록 실패 (배포 판정과 무관): ${err.message}`);
  }
  return st;
}

function writeOutputs(pairs) {
  if (!process.env.GITHUB_OUTPUT) return;
  appendFileSync(process.env.GITHUB_OUTPUT, `${Object.entries(pairs).map(([k, v]) => `${k}=${typeof v === 'string' ? v : JSON.stringify(v)}`).join('\n')}\n`);
}

/** deploy-auto(dispatch 경로)의 결과 → 서비스별 상태 */
function autoStates(decisions, execution) {
  return Object.entries(decisions).map(([key, d]) => {
    const r = execution[key];
    let state = STATE_OF[d.decision] ?? 'NO_DEPLOY';
    if (d.decision === 'AUTO_DEPLOY' && r) state = !r.dispatched ? (String(r.error).startsWith('HELD_API') ? 'HELD_DEPENDENCY' : 'FAILED') : r.conclusion ? (r.conclusion === 'success' ? 'DEPLOYED' : 'FAILED') : 'DEPLOYING';
    return { key, state };
  });
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv[0] === 'report') return reportMain(parseArgs(argv.slice(1)));
  if (argv[0] === 'wiring') {
    const w = parseArgs(argv.slice(1));
    const list = String(w.services ?? '').split(/[\s,]+/).filter(Boolean);
    const bad = list.filter((s) => !DEPLOY_TARGETS.some((t) => t.key === s));
    if (list.length === 0 || bad.length > 0) {
      console.log(`::error::wiring services 오류: ${bad.join(', ') || '(비어 있음)'}`);
      process.exitCode = 1;
      return;
    }
    const plan = wiringPlan(list);
    writeOutputs({ ...plan, target_sha: String(w.target ?? '') });
    const text = `### 🔌 Delivery wiring test (dry_run 호출 · 배포 0)\n\n- services: ${list.join(', ')}\n- plan: api=${plan.deploy_api} · web(after api)=${plan.web_after_api.join(',') || '-'} · web(parallel)=${plan.web_parallel.join(',') || '-'} · admin=${plan.admin_after_api === 'true' ? 'after api' : plan.admin_parallel === 'true' ? 'parallel' : '-'}`;
    console.log(text);
    if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${text}\n`);
    return;
  }
  const args = parseArgs(argv);
  const planOnly = args['plan-only'] === true || args['plan-only'] === 'true';
  const mode = args.mode === 'promote' ? 'promote' : 'auto';
  const shadow = args.shadow === true || args.shadow === 'true';
  const dryRun = String(args['dry-run'] ?? 'true') !== 'false';
  const freezeRaw = String(args.freeze ?? '');
  const frozen = isFrozen(freezeRaw);
  const graph = buildWorkspaceGraph();
  const repo = process.env.GITHUB_REPOSITORY;
  const token = process.env.GITHUB_TOKEN;
  const gh = repo && token ? githubClient(repo, token) : null;
  const fixture = Boolean(args.base && args.head);

  let target;
  let perService;
  let ci = { green: false, reason: 'not checked', state: 'SKIPPED' };
  let headIsTarget = false;
  let identity = '';

  const services = typeof args.services === 'string' ? args.services.split(/[\s,]+/).filter(Boolean) : [];
  const unknownSvc = services.filter((s) => !DEPLOY_TARGETS.some((t) => t.key === s));
  if (unknownSvc.length > 0) {
    console.log(`::error::알 수 없는 services 입력: ${unknownSvc.join(', ')} (가능: ${DEPLOY_TARGETS.map((t) => t.key).join(', ')})`);
    process.exitCode = 1;
    return;
  }

  if (fixture) {
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
        return [t.key, r ? { serving_sha: String(args.base), serving_source: 'fixture-base', status: s.affected ? 'BEHIND' : 'BEHIND_NO_RUNTIME_CHANGE', deploy_required: s.affected, level: s.affected ? s.level : 'LEVEL_1', level3: s.affected ? s.level3.concat(r.pipeline_hits) : [], rollout_pending: s.rollout.length > 0, reasons: s.reasons } : { status: 'UNKNOWN', deploy_required: true, level: LEVEL_3, level3: [], reasons: [read.reason] }];
      }),
    );
    ci = { green: true, reason: 'fixture 모드 — CI 판정 생략', state: 'FIXTURE' };
    headIsTarget = true;
  } else {
    target = String(args.target ?? '');
    if (gh) {
      const r = await pollCiGate({ target, fetchRuns: (p) => fetchRunsVia(repo, token, p, target), waitSeconds: 0, missingWaitSeconds: 120, intervalSeconds: 20 });
      ci = { green: r.green, reason: r.reason, state: r.state };
      const head = await gh.headSha();
      headIsTarget = head === target;
      identity = `main HEAD ${String(head).slice(0, 9)}`;
      // Unified Delivery: 이 run 의 workflow 정의(= reusable deploy workflow 버전)도 target 이어야 한다 (TARGET_SHA identity).
      //   workflow_run · promote(dispatch) 의 github.sha 는 main 최신 commit 이다 — target 과 다르면 SUPERSEDED.
      if (planOnly) {
        const wfSha = String(args['workflow-sha'] ?? '');
        const ref = process.env.GITHUB_REF ?? '';
        if (wfSha !== target) headIsTarget = false;
        if (ref && ref !== 'refs/heads/main') headIsTarget = false;
        identity += ` · workflow ${wfSha.slice(0, 9) || '?'} · ref ${ref || '?'}`;
      }
    }
    perService = assessServingGap(target, collectServingState(), graph);
  }

  let deps = {};
  try {
    deps = computeApiDependency(target, perService, graph);
  } catch (err) {
    console.log(`API 의존 판정 예외 — 전부 의존으로 본다: ${err.message}`);
    deps = {};
  }
  const ctx = { frozen, ciGreen: ci.green, headIsTarget };
  // 의존 정밀화는 Unified Delivery(plan-only)에서만 적용한다. deploy-auto(dispatch 경로)는 cutover 전까지 종전 규칙
  //   (API 미배포 → 프런트 전부 보류) 그대로 — 판정 결과는 기록만 한다.
  const applied = planOnly ? deps : undefined;
  const decisions = mode === 'promote' ? decidePromote(perService, ctx, applied, { services }) : decideAll(perService, ctx, applied);
  annotatePendingLevel3(decisions, perService, target);
  for (const [k, d] of Object.entries(decisions)) {
    if (d.decision === 'AUTO_DEPLOY_BLOCKED') console.log(`AUTO_DEPLOY_BLOCKED service=${k} reason=${d.reason}`);
    else if (d.decision !== 'NO_DEPLOY') console.log(`${d.decision} service=${k} reason=${d.reason}`);
  }

  const forceDry = dryRun || fixture;
  const report = {
    mode: planOnly ? mode : 'enforcement',
    plan_only: planOnly,
    shadow,
    dry_run: forceDry,
    timestamp: new Date().toISOString(),
    target_sha: target,
    ci_green: ci.green,
    ci_reason: ci.reason,
    freeze_raw: freezeRaw,
    frozen,
    head_is_target: headIsTarget,
    identity,
    services: DEPLOY_TARGETS.map((t) => ({ key: t.key, ...(perService[t.key] ?? {}), ...decisions[t.key] })),
    dependency: deps,
    execution: {},
  };

  if (planOnly) {
    // 태그 · dispatch 0. 배포는 workflow 의 reusable job 이 수행한다.
    const plan = buildPlan(decisions, deps);
    const planned = plan.deploy_api || plan.admin_after_api || plan.admin_parallel || plan.web_after_api.length + plan.web_parallel.length > 0;
    report.plan = plan;
    report.execute = planned && !shadow && !forceDry;
    if (mode === 'promote' && !Object.values(decisions).some((d) => DEPLOYING.has(d.decision))) {
      console.log('::warning::승격할 서비스 없음 — 모든 서비스가 최신이거나 승인으로도 배포할 수 없는 상태');
    }
    const states = Object.entries(decisions).map(([key, d]) => ({ key, state: STATE_OF[d.decision] ?? 'NO_DEPLOY' }));
    report.commit_status = shadow || forceDry ? commitStatus(states, target) : await postStatus(gh, args['status-context'], target, states);
    const ex = report.execute;
    writeOutputs({
      execute: String(ex),
      dry_call: 'false',
      target_sha: target,
      deploy_api: String(ex && plan.deploy_api),
      admin_after_api: String(ex && plan.admin_after_api),
      admin_parallel: String(ex && plan.admin_parallel),
      web_after_api: ex ? plan.web_after_api : [],
      web_parallel: ex ? plan.web_parallel : [],
      state: report.commit_status.overall,
    });
  } else {
    let execution = {};
    if (!forceDry && gh) execution = await executeDecisions(decisions, target, gh);
    report.execution = execution;
    const states = autoStates(decisions, execution);
    report.commit_status = forceDry ? commitStatus(states, target) : await postStatus(gh, args['status-context'], target, states);
  }

  const text = render(report);
  console.log(text);
  if (args.json) writeFileSync(args.json, JSON.stringify(report, null, 2));
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${text}\n`);
  const failed = Object.values(report.execution).some((r) => r.conclusion && r.conclusion !== 'success');
  if (failed) process.exitCode = 1;
}

/**
 * 배포 뒤 확정 (Unified Delivery report job). 판정은 다시 하지 않는다 — classify 기록 + **지금 serving SHA** 만 본다.
 *   계획된 서비스: serving == target(단일 revision 100%) → DEPLOYED · 아니면 FAILED
 *   (API 가 실패했고 API 뒤에 배치된 프런트 → HELD_DEPENDENCY: reusable job 이 skip 되어 배포 0)
 */
export function finalizeStates(record, servingNow) {
  const plan = record.plan ?? {};
  const target = record.target_sha;
  const after = new Set([...(plan.web_after_api ?? []), ...(plan.admin_after_api ? ['admin'] : [])]);
  const planned = new Set([...(plan.deploy_api ? ['api'] : []), ...after, ...(plan.web_parallel ?? []), ...(plan.admin_parallel ? ['admin'] : [])]);
  const apiOk = !plan.deploy_api || servingNow.api?.sha === target;
  return record.services.map((s) => {
    if (!record.execute || !planned.has(s.key)) return { key: s.key, state: STATE_OF[s.decision] ?? 'NO_DEPLOY', serving: null };
    const now = servingNow[s.key] ?? { sha: null, source: 'not read' };
    if (now.sha === target) return { key: s.key, state: 'DEPLOYED', serving: now };
    if (after.has(s.key) && !apiOk) return { key: s.key, state: 'HELD_DEPENDENCY', serving: now };
    return { key: s.key, state: 'FAILED', serving: now };
  });
}

async function reportMain(args) {
  const record = JSON.parse(readFileSync(String(args.decision), 'utf-8'));
  const repo = process.env.GITHUB_REPOSITORY;
  const token = process.env.GITHUB_TOKEN;
  const gh = repo && token ? githubClient(repo, token) : null;
  const plan = record.plan ?? {};
  const keys = new Set([...(plan.deploy_api ? ['api'] : []), ...(plan.web_after_api ?? []), ...(plan.web_parallel ?? []), ...(plan.admin_after_api || plan.admin_parallel ? ['admin'] : [])]);
  const servingNow = {};
  for (const t of DEPLOY_TARGETS) if (record.execute && keys.has(t.key)) servingNow[t.key] = readServingSha(t);
  const states = finalizeStates(record, servingNow);
  const st = await postStatus(gh, args['status-context'], record.target_sha, states);
  const lines = [
    `### 📦 Delivery result — \`${record.target_sha}\``,
    '',
    `- commit status: **${st.overall}** — ${st.description}`,
    '',
    '| service | decision | final | serving after (source · revision) |',
    '|---|---|---|---|',
  ];
  for (const s of states) {
    const d = record.services.find((x) => x.key === s.key);
    const sv = s.serving ? `${s.serving.sha ? s.serving.sha.slice(0, 9) : '—'} (${s.serving.source}${s.serving.revision ? ` · ${s.serving.revision}` : ''})` : '-';
    lines.push(`| ${s.key} | ${d?.decision ?? '-'} | **${s.state}** | ${sv} |`);
  }
  const text = lines.join('\n');
  console.log(text);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${text}\n`);
  if (states.some((s) => s.state === 'FAILED')) process.exitCode = 1;
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
