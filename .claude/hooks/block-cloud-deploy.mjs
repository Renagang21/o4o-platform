#!/usr/bin/env node
/**
 * PreToolUse 훅 — 클라우드 세션에서만 운영 배포 명령을 거부한다 (AGENTS.md §9).
 *
 * - 클라우드 판별: CLAUDE_CODE_REMOTE === 'true' 또는 CLAUDE_CODE_REMOTE_SESSION_ID 존재.
 *   로컬 세션에서는 아무것도 하지 않는다 → .claude/settings.json 의 ask 규칙이 그대로 적용된다.
 * - 거부 대상
 *   · gcloud 배포: run deploy · run services update/update-traffic/replace ·
 *     run jobs deploy/update/create/execute/replace · builds submit · deploy(Cloud Deploy) ·
 *     app deploy · functions deploy
 *   · gh workflow run <deploy-* | delivery | promote> — 파일명 · 표시명, 숫자 ID 는 API 로 조회
 *   · gh run rerun <id> — 그 run 의 workflow 가 배포 계열이면
 *   · gh api …/dispatches — workflow dispatch API 직접 호출
 * - 숫자 ID 를 조회하지 못하면 클라우드에서는 거부한다(fail closed).
 *   그 밖의 예외는 허용(exit 0)으로 넘겨 일반 명령을 막지 않는다.
 */
import { execFileSync } from 'node:child_process';
import { baseName, commandIndex, readStdin, segments, tokenize } from './lib/shell.mjs';

const DEPLOY_NAME = /deploy|delivery|promote/i;

const isCloud = () =>
  process.env.CLAUDE_CODE_REMOTE === 'true' || Boolean(process.env.CLAUDE_CODE_REMOTE_SESSION_ID);

function repoSlug(tokens, cwd) {
  const i = tokens.findIndex((t) => t === '-R' || t === '--repo');
  if (i >= 0 && tokens[i + 1]) return tokens[i + 1];
  const eq = tokens.find((t) => t.startsWith('--repo='));
  if (eq) return eq.slice('--repo='.length);
  try {
    const url = execFileSync('git', ['remote', 'get-url', 'origin'], { cwd, stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
    const m = url.match(/([^/:]+\/[^/]+?)(?:\.git)?$/);
    if (m) return m[1];
  } catch {
    /* fall through */
  }
  return null;
}

function ghJson(path, jq, cwd) {
  return execFileSync('gh', ['api', path, '--jq', jq], {
    cwd,
    timeout: 15000,
    stdio: ['ignore', 'pipe', 'ignore'],
  })
    .toString()
    .trim();
}

/** gh 서브커맨드 뒤 첫 위치 인자 (값을 받는 플래그는 건너뛴다) */
function firstPositional(tokens, start) {
  const valueFlags = new Set(['-R', '--repo', '-r', '--ref', '-f', '--raw-field', '-F', '--field', '--json']);
  for (let i = start; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.startsWith('-')) {
      if (valueFlags.has(t)) i++;
      continue;
    }
    return t;
  }
  return null;
}

function check(segment, cwd) {
  const tokens = tokenize(segment.replace(/^[({]\s*/, ''));
  const at = commandIndex(tokens);
  const word = baseName(tokens[at]);

  // gcloud 배포 — gcloud 이후의 위치 인자(플래그 제외, beta/alpha 제외)에서 명령 그룹을 찾는다.
  if (word === 'gcloud') {
    const gAt = at;
    const pos = tokens.slice(gAt + 1).filter((t) => !t.startsWith('-') && t !== 'beta' && t !== 'alpha');
    const groups = [
      ['run', 'deploy'],
      ['run', 'services', 'update'],
      ['run', 'services', 'update-traffic'],
      ['run', 'services', 'replace'],
      ['run', 'jobs', 'deploy'],
      ['run', 'jobs', 'update'],
      ['run', 'jobs', 'create'],
      ['run', 'jobs', 'execute'],
      ['run', 'jobs', 'replace'],
      ['builds', 'submit'],
      ['app', 'deploy'],
      ['functions', 'deploy'],
      ['deploy'], // Cloud Deploy — 첫 위치에서만
    ];
    // --project p 처럼 값을 받는 플래그의 값이 앞에 섞일 수 있어 시작 위치를 0~2 까지 본다.
    for (const g of groups) {
      const maxStart = g.length === 1 ? 0 : 2;
      for (let i = 0; i <= maxStart; i++) {
        if (g.every((w, k) => pos[i + k] === w)) return `gcloud 운영 배포 명령 (${g.join(' ')})`;
      }
    }
  }

  if (word !== 'gh') return null;
  const ghAt = at;
  // 서브커맨드 앞의 gh 전역 옵션(-R/--repo <값>, --repo=…, 그 밖의 -플래그)은 건너뛴다.
  // repoSlug() 는 전역 옵션을 포함한 전체 인자에서 -R/--repo 를 읽는다.
  const args = tokens.slice(ghAt + 1);
  let s = 0;
  while (s < args.length && args[s].startsWith('-')) {
    s += args[s] === '-R' || args[s] === '--repo' ? 2 : 1;
  }
  const sub = args.slice(s);

  // gh api …/dispatches
  if (sub[0] === 'api' && sub.some((t) => /\/dispatches\b/.test(t))) return 'workflow dispatch API 호출';

  // gh workflow run <target>
  if (sub[0] === 'workflow' && sub[1] === 'run') {
    const target = firstPositional(sub, 2);
    if (!target) return null; // 대화형 선택 — 클라우드에서는 실행 불가
    if (/^\d+$/.test(target)) {
      const slug = repoSlug(args, cwd);
      try {
        const info = ghJson(`repos/${slug}/actions/workflows/${target}`, '"\\(.path) \\(.name)"', cwd);
        return DEPLOY_NAME.test(info) ? `배포 workflow 실행 (ID ${target} → ${info})` : null;
      } catch {
        return `workflow ID ${target} 를 조회하지 못해 배포 여부를 확인할 수 없음`;
      }
    }
    return DEPLOY_NAME.test(target) ? `배포 workflow 실행 (${target})` : null;
  }

  // gh run rerun <run-id>
  if (sub[0] === 'run' && sub[1] === 'rerun') {
    const id = firstPositional(sub, 2);
    if (!id || !/^\d+$/.test(id)) return null;
    const slug = repoSlug(args, cwd);
    try {
      const info = ghJson(`repos/${slug}/actions/runs/${id}`, '"\\(.path) \\(.name)"', cwd);
      return DEPLOY_NAME.test(info) ? `배포 workflow 재실행 (run ${id} → ${info})` : null;
    } catch {
      return `run ${id} 를 조회하지 못해 배포 여부를 확인할 수 없음`;
    }
  }
  return null;
}

function main() {
  if (!isCloud()) return;
  let payload;
  try {
    payload = JSON.parse(readStdin() || '{}');
  } catch {
    return;
  }
  const cmd = payload?.tool_input?.command;
  if (typeof cmd !== 'string' || !cmd) return;
  const cwd = payload.cwd || process.cwd();

  for (const seg of segments(cmd)) {
    let reason = null;
    try {
      reason = check(seg, cwd);
    } catch {
      reason = null;
    }
    if (reason) {
      process.stdout.write(
        JSON.stringify({
          hookSpecificOutput: {
            hookEventName: 'PreToolUse',
            permissionDecision: 'deny',
            permissionDecisionReason:
              `클라우드 세션에서는 운영 배포를 실행하지 않는다 (AGENTS.md §9): ${reason}. ` +
              '배포는 merge 후 자동 Delivery 를 따르거나 로컬 세션에서 승인 후 실행한다.',
          },
        }),
      );
      return;
    }
  }
}

main();
