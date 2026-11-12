#!/usr/bin/env node
/**
 * PreToolUse 훅 — GitHub MCP 도구(mcp__github__*) 의 병합 · workflow 실행 · main 쓰기를 검사한다.
 *
 * 왜 필요한가 (2026-11-12 조사): 다른 PreToolUse 훅은 matcher 가 `Bash|PowerShell` 이라 MCP 도구에는 걸리지 않는다.
 * 클라우드 세션의 MCP 토큰은 저장소 소유자 계정으로 동작하므로, `actions_run_trigger` 로 deploy-* · promote 를
 * 실행하면 workflow 의 「triggering_actor == owner」 게이트도 통과한다. 클라우드에서는 GraphQL 이 막혀 `gh pr merge` 가
 * 실패하고, 병합 · PR 생성 경로는 MCP 뿐이다 — 그 경로에 안전장치를 둔다.
 *
 * 판정
 *   · enable_pr_auto_merge                      → 모든 세션 deny (auto-merge 는 쓰지 않는다 · AGENTS.md §4-1(e))
 *   · push_files · create_or_update_file · delete_file (branch 가 main · 비어 있음) → 모든 세션 deny (main 직접 쓰기)
 *   · actions_run_trigger
 *       - 대상 workflow 가 CI_WORKFLOWS(검사 전용) 이면 통과
 *       - 그 밖(deploy-* · delivery · promote · 운영 데이터 · secret 을 만지는 workflow · 특정 불가) 이면
 *         클라우드 deny / 로컬 approvalFor (운영 배포 · 운영 작업은 통합 담당 지시 시 로컬에서만 · AGENTS.md §9)
 *       - delete_workflow_run_logs → 클라우드 deny / 로컬 approvalFor (영구 삭제)
 *   · merge_pull_request
 *       - 공통: merge_method === 'squash' · expectedHeadSha(40자) 필수 — 확인한 HEAD 만 병합한다.
 *       - 클라우드: main 의 `.claude/integration-sessions.json` 에 이 세션이 상시 통합 세션으로 등록돼 있어야 하고,
 *                   PR 이 PROTECTED_PATHS(CI · 배포 인프라 · 에이전트 안전 설정)를 바꾸지 않아야 한다(그 PR 은 통합 담당이 직접 병합 · §5).
 *                   조회 실패는 deny(fail closed).
 *       - 로컬: approvalFor (승인 창 또는 OS 확인 대화상자).
 *
 * 등록은 main 에서 읽는다(작업 tree 가 아니라 GitHub API 의 main) — 세션이 자기 working tree 를 고쳐 스스로 지정할 수 없다.
 * 등록 파일 자체가 PROTECTED_PATHS 에 있어 통합 세션이 자기 지정 변경을 병합할 수도 없다.
 * 훅 입력 오류(JSON 아님 등)는 통과(exit 0) — 판정 대상이 아닌 일반 MCP 호출을 막지 않는다.
 */
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { approvalFor, readStdin } from './lib/shell.mjs';

export const REGISTRY_PATH = '.claude/integration-sessions.json';

/** 클라우드 세션에서도 실행 · 재실행 · 취소할 수 있는 검사 전용 workflow(운영 자원 · secret 을 쓰지 않는다). */
export const CI_WORKFLOWS = new Set([
  '.github/workflows/ci-pipeline.yml',
  '.github/workflows/ci-security.yml',
  '.github/workflows/ci-appstore-guard.yml',
  '.github/workflows/automation-pr-labeler.yml',
  '.github/workflows/automation-pr-overlap.yml',
]);

/** 이 경로를 바꾸는 PR 은 클라우드 통합 세션이 병합하지 않는다 — 통합 담당이 직접 판단한다(AGENTS.md §5 · §4-1(e)). */
export const PROTECTED_PATHS = [
  /^\.github\//,
  /^\.claude\/hooks\//,
  /^\.claude\/settings\.json$/,
  /^\.claude\/integration-sessions\.json$/,
  /^scripts\/ci\//,
  /(^|\/)Dockerfile[^/]*$/,
  /(^|\/)cloudbuild[^/]*$/,
];

export const isCloud = () =>
  process.env.CLAUDE_CODE_REMOTE === 'true' || Boolean(process.env.CLAUDE_CODE_REMOTE_SESSION_ID);

/** `cse_XXX` · `session_XXX` 는 같은 세션이다(환경 변수 · claude.ai URL 표기 차이). */
export const normalizeSessionId = (id = '') => String(id).trim().replace(/^(cse_|session_)/, '');

const short = (name = '') => String(name).replace(/^mcp__github__/, '');

function gh(args, cwd) {
  if (process.env.O4O_HOOK_GH_OFFLINE === '1') throw new Error('offline (test)');
  const r = spawnSync('gh', args, { cwd, encoding: 'utf8', timeout: 25000, stdio: ['ignore', 'pipe', 'pipe'] });
  if (r.status !== 0) throw new Error((r.stderr || '').trim() || `gh exit ${r.status}`);
  return r.stdout;
}

/** workflow_id(파일명 · 경로 · 숫자 ID) → `.github/workflows/<file>` */
export function workflowPath(workflowId, slug, cwd) {
  const id = String(workflowId ?? '').trim();
  if (!id) return null;
  if (/^\d+$/.test(id)) return gh(['api', `repos/${slug}/actions/workflows/${id}`, '--jq', '.path'], cwd).trim();
  const file = id.split('/').pop();
  return `.github/workflows/${file}`;
}

function runPath(runId, slug, cwd) {
  if (!/^\d+$/.test(String(runId ?? ''))) return null;
  return gh(['api', `repos/${slug}/actions/runs/${runId}`, '--jq', '.path'], cwd).trim();
}

/** @returns {{ sessions: Set<string> }} main 에 등록된 상시 통합 세션 */
function registeredSessions(slug, cwd) {
  const b64 = gh(['api', `repos/${slug}/contents/${REGISTRY_PATH}?ref=main`, '--jq', '.content'], cwd);
  const json = JSON.parse(Buffer.from(b64.replace(/\s+/g, ''), 'base64').toString('utf8'));
  const list = Array.isArray(json?.cloud) ? json.cloud : [];
  return new Set(list.map((e) => normalizeSessionId(e?.session)).filter(Boolean));
}

function prFiles(slug, number, cwd) {
  const out = gh(['api', `repos/${slug}/pulls/${number}/files`, '--paginate', '--jq', '.[].filename'], cwd);
  return out.split('\n').map((s) => s.trim()).filter(Boolean);
}

const deny = (reason) => ({ decision: 'deny', reason });

/**
 * @returns {{ decision: 'deny'|'approve', reason: string } | null} null = 판정 대상 아님(통과)
 */
export function judge(toolName, input, { cloud, cwd }) {
  const tool = short(toolName);
  const slug = `${input?.owner ?? ''}/${input?.repo ?? ''}`;

  if (tool === 'enable_pr_auto_merge') {
    return deny('auto-merge 는 쓰지 않는다 — 통합 세션이 gate 를 확인한 뒤 한 번에 하나씩 병합한다 (AGENTS.md §4-1(e))');
  }

  if (tool === 'push_files' || tool === 'create_or_update_file' || tool === 'delete_file') {
    const branch = String(input?.branch ?? '').replace(/^refs\/heads\//, '').trim();
    if (!branch || branch === 'main') {
      return deny(`main 직접 쓰기 금지 (${tool} · branch=${branch || '(기본 branch)'}) — main 반영 경로는 PR merge 하나다 (AGENTS.md §4-1(e))`);
    }
    return null;
  }

  if (tool === 'actions_run_trigger') {
    const method = String(input?.method ?? '');
    if (method === 'delete_workflow_run_logs') {
      return { decision: cloud ? 'deny' : 'approve', reason: `workflow run 로그 영구 삭제 (run ${input?.run_id ?? '?'}) — AGENTS.md §9` };
    }
    let target;
    try {
      target = method === 'run_workflow' ? workflowPath(input?.workflow_id, slug, cwd) : runPath(input?.run_id, slug, cwd);
    } catch (e) {
      target = null;
    }
    if (target && CI_WORKFLOWS.has(target)) return null;
    const what = target ? `${method} → ${target}` : `${method} — 대상 workflow 를 특정할 수 없음`;
    return cloud
      ? deny(`클라우드 세션은 검사 전용 workflow 밖을 실행 · 재실행 · 취소하지 않는다 (${what}). 배포 · 운영 workflow 는 통합 담당 지시로 로컬 세션에서 한다 (AGENTS.md §4-1(f) · §9)`)
      : { decision: 'approve', reason: `운영 workflow 조작 (${what}) — 통합 담당의 지시가 있을 때만 승인한다 (AGENTS.md §9)` };
  }

  if (tool === 'merge_pull_request') {
    const n = input?.pullNumber;
    if (input?.merge_method !== 'squash') {
      return deny(`PR #${n} 병합 방식이 squash 가 아니다 (merge_method=${input?.merge_method ?? '(미지정)'}) — 기본은 squash 다. 다른 방식은 통합 담당이 직접 한다 (AGENTS.md §4-1(e))`);
    }
    if (!/^[0-9a-f]{40}$/.test(String(input?.expectedHeadSha ?? ''))) {
      return deny(`PR #${n} 병합에 expectedHeadSha(확인한 HEAD 40자)가 없다 — CI · 리뷰를 확인한 HEAD 만 병합한다`);
    }
    if (!cloud) return { decision: 'approve', reason: `PR #${n} squash 병합 (HEAD ${input.expectedHeadSha.slice(0, 10)})` };

    const me = normalizeSessionId(process.env.CLAUDE_CODE_REMOTE_SESSION_ID);
    try {
      const sessions = registeredSessions(slug, cwd);
      if (!me || !sessions.has(me)) {
        return deny(`이 클라우드 세션은 main 의 ${REGISTRY_PATH} 에 상시 통합 세션으로 등록돼 있지 않다 — 병합은 통합 세션만 한다 (AGENTS.md §4 역할)`);
      }
    } catch (e) {
      return deny(`상시 통합 세션 등록(${REGISTRY_PATH} @ main)을 확인하지 못했다: ${e.message}`);
    }
    let files;
    try {
      files = prFiles(slug, n, cwd);
    } catch (e) {
      return deny(`PR #${n} 의 변경 파일을 확인하지 못했다: ${e.message}`);
    }
    const hit = files.filter((f) => PROTECTED_PATHS.some((re) => re.test(f)));
    if (hit.length) {
      return deny(`PR #${n} 은 CI · 배포 인프라 · 에이전트 안전 설정을 바꾼다 (${hit.slice(0, 5).join(', ')}${hit.length > 5 ? ' …' : ''}) — CI 결과만 보고하고 병합은 통합 담당이 직접 한다 (AGENTS.md §5 · §4-1(e))`);
    }
    return null;
  }

  return null;
}

function main() {
  let payload;
  try {
    payload = JSON.parse(readStdin() || '{}');
  } catch {
    return;
  }
  const toolName = payload?.tool_name;
  if (typeof toolName !== 'string' || !toolName.startsWith('mcp__github__')) return;
  const input = payload.tool_input ?? {};
  const cwd = payload.cwd || process.cwd();
  const cloud = isCloud();

  const verdict = judge(toolName, input, { cloud, cwd });
  if (!verdict) return;

  let decision = 'deny';
  let reason = verdict.reason;
  if (verdict.decision === 'approve') {
    // 대화상자에는 판정에 쓴 필드만 보인다(commit 메시지 같은 긴 본문은 넣지 않는다 — approvalFor 길이 상한).
    const fields = ['pullNumber', 'merge_method', 'expectedHeadSha', 'method', 'workflow_id', 'ref', 'run_id']
      .filter((k) => input[k] !== undefined && input[k] !== '')
      .map((k) => `${k}=${typeof input[k] === 'object' ? JSON.stringify(input[k]) : input[k]}`);
    const shown = `${short(toolName)} ${input.owner ?? ''}/${input.repo ?? ''} ${fields.join(' ')}`;
    const a = approvalFor(payload.permission_mode, { title: 'O4O GitHub 작업 승인', reason, command: shown });
    decision = a.decision;
    reason += a.note;
  }
  process.stdout.write(
    JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: decision, permissionDecisionReason: reason } }),
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
