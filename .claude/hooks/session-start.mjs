#!/usr/bin/env node
/**
 * Claude Code SessionStart hook — 동기화 상태 요약 (AGENTS.md §4-1 (a)·(d))
 *
 * - 항상 `git fetch origin main` 한다(실패해도 세션을 막지 않는다).
 * - `git pull --ff-only origin main` 은 **기준 main checkout 이 clean 하고 진행 중 operation 이 없을 때만** 한다.
 *   작업 branch · linked worktree 에서는 merge/rebase 하지 않고 ahead/behind 만 보고한다(§4-1(d)).
 * - stdout 은 세션 문맥에 들어간다. 짧게 유지하고 항상 exit 0 으로 끝낸다.
 * - 세션 유형: CLAUDE_CODE_REMOTE=true → 클라우드(운영 DB 불가), 그 밖 → 데스크톱 로컬.
 */
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const cloud = process.env.CLAUDE_CODE_REMOTE === 'true';
const lines = [];

function git(args, timeout = 15000) {
  return execFileSync('git', args, { cwd: root, timeout, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}
function tryGit(args, timeout) {
  try { return { ok: true, out: git(args, timeout) }; } catch (error) { return { ok: false, out: String(error?.stderr || error?.message || error).trim().split('\n')[0] }; }
}

function operationInProgress(gitDir) {
  return ['MERGE_HEAD', 'CHERRY_PICK_HEAD', 'REVERT_HEAD', 'rebase-merge', 'rebase-apply']
    .filter((name) => existsSync(path.join(gitDir, name)));
}

/** 최근 7일 origin/main 에 추가·수정된 지시서 중 이 세션 유형이 실행할 미완료 항목. */
function pendingWorkOrders() {
  const changed = tryGit(['log', 'origin/main', '--since=7.days', '--diff-filter=AM', '--name-only', '--format=', '--', 'docs/work-orders']);
  if (!changed.ok || !changed.out) return [];
  const want = cloud ? /CLOUD|BOTH/ : /LOCAL|BOTH/;
  const result = [];
  for (const file of [...new Set(changed.out.split('\n').filter((f) => f.endsWith('.md')))]) {
    const body = tryGit(['show', `origin/main:${file}`]);
    if (!body.ok) continue;
    const head = body.out.split('\n').slice(0, 20).join('\n');
    // 헤더 형식: `> **실행 위치**: LOCAL` · `> **상태**: ACTIVE` (DOCUMENT-LIFECYCLE §6 · §10-6). 굵게 표기 유무 모두 허용.
    const where = /실행 위치\**\s*:\s*\**\s*(CLOUD|LOCAL|BOTH)/.exec(head)?.[1] ?? '';
    const status = /상태\**\s*:\s*\**\s*([A-Z_]+)/.exec(head)?.[1] ?? '';
    if (where && want.test(where) && !/^(COMPLETED|SUPERSEDED|ARCHIVED|OBSOLETE|DONE)$/.test(status)) result.push(`${file} (${status || '상태 미기재'})`);
    if (result.length >= 8) break;
  }
  return result;
}

try {
  lines.push(`[session-start] ${cloud ? '클라우드 세션 — 코드·문서 작업. 운영 DB 불가(필요하면 LOCAL 지시서로 넘긴다).' : '데스크톱 로컬 세션 — 운영 DB 는 read-only 만 자유, write 는 사용자 승인.'}`);

  // 전체 원격 fetch 는 큰 저장소에서 수십 초가 걸린다 — 판단에 필요한 origin/main 만 갱신한다.
  const fetched = tryGit(['fetch', '--quiet', 'origin', 'main'], 25000);
  if (!fetched.ok) lines.push(`fetch 실패(계속 진행): ${fetched.out}`);

  const branch = git(['rev-parse', '--abbrev-ref', 'HEAD']);
  const gitDir = path.resolve(root, git(['rev-parse', '--git-dir']));
  const commonDir = path.resolve(root, git(['rev-parse', '--git-common-dir']));
  const linkedWorktree = gitDir !== commonDir;
  const dirty = git(['status', '--porcelain']).split('\n').filter(Boolean).length;
  const ops = operationInProgress(gitDir);

  lines.push(`branch: ${branch}${linkedWorktree ? ' (linked worktree)' : ''} · 미커밋 ${dirty}건${ops.length ? ` · 진행 중 operation: ${ops.join(', ')}` : ''}`);

  if (branch === 'main' && !linkedWorktree && dirty === 0 && ops.length === 0 && fetched.ok) {
    const before = git(['rev-parse', 'HEAD']);
    const pulled = tryGit(['pull', '--ff-only', '--quiet', 'origin', 'main'], 30000);
    if (!pulled.ok) lines.push(`main fast-forward 실패 — merge/rebase 하지 않았다: ${pulled.out}`);
    else {
      const after = git(['rev-parse', 'HEAD']);
      lines.push(before === after ? 'main 최신 상태.' : `main fast-forward: ${before.slice(0, 8)}..${after.slice(0, 8)} (${git(['rev-list', '--count', `${before}..${after}`])} commits)`);
    }
  } else {
    const counts = tryGit(['rev-list', '--left-right', '--count', 'HEAD...origin/main']);
    if (counts.ok) {
      const [ahead, behind] = counts.out.split(/\s+/);
      lines.push(`origin/main 대비 ahead ${ahead} · behind ${behind} — 자동 merge/rebase 하지 않았다(AGENTS.md §4-1(d)).`);
    }
    if (branch === 'main' && (dirty || ops.length)) lines.push('기준 main checkout 이 clean 하지 않다 — 다른 세션 소유일 수 있으니 정리하지 말고 보고한다(§4-1(c)).');
  }

  if (existsSync(path.join(root, 'HANDOFF.md'))) lines.push('HANDOFF.md 있음 — 먼저 읽는다(/start).');
  const orders = pendingWorkOrders();
  if (orders.length) lines.push(`이 세션 유형의 최근 미완료 지시서:\n- ${orders.join('\n- ')}`);
} catch (error) {
  lines.push(`[session-start] 상태 확인 실패(세션은 계속): ${String(error?.message || error).split('\n')[0]}`);
}

process.stdout.write(`${lines.join('\n')}\n`);
process.exit(0);
