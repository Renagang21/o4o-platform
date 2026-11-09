#!/usr/bin/env node
/**
 * PreToolUse 훅 — 운영 배포 명령을 클라우드 세션에서는 거부하고, 로컬 세션에서는 항상 승인을 묻는다 (AGENTS.md §9).
 *
 * - 클라우드 판별: CLAUDE_CODE_REMOTE === 'true' 또는 CLAUDE_CODE_REMOTE_SESSION_ID 존재.
 *   · 클라우드 → permissionDecision "deny".
 *   · 로컬 → permissionDecision "ask". settings.json 의 ask 규칙은 auto 권한 모드에서 승인 창 없이
 *     통과하는 것이 로컬에서 확인됐다(2026-11-09). 훅이 직접 ask 를 반환해 권한 모드와 관계없이 승인을 묻는다.
 * - 대상
 *   · gcloud 배포: run deploy · run services update/update-traffic/replace ·
 *     run jobs deploy/update/create/execute/replace · builds submit · deploy(Cloud Deploy) ·
 *     app deploy · functions deploy
 *   · gh workflow run <deploy-* | delivery | promote> — 파일명 · 표시명, 숫자 ID 는 API 로 조회
 *   · gh run rerun <id> — 그 run 의 workflow 가 배포 계열이면
 *   · gh api …/dispatches — workflow dispatch API 직접 호출
 *   · gh api …/actions/runs/<id>/rerun(-failed-jobs) · …/actions/jobs/<id>/rerun — 배포 run · job 재실행
 * - 숫자 ID 를 조회하지 못하거나, workflow run · run rerun 의 대상을 특정하지 못하면 배포로 본다(fail closed —
 *   클라우드 거부 · 로컬 승인 요청). 그 밖의 예외는 허용(exit 0)으로 넘겨 일반 명령을 막지 않는다.
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
  // --json 은 값 없는 플래그다(gh workflow run: STDIN 으로 입력을 읽음) — 다음 토큰을 소비하지 않는다.
  const valueFlags = new Set(['-R', '--repo', '-r', '--ref', '-f', '--raw-field', '-F', '--field']);
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

  if (sub[0] === 'api') {
    // gh api …/dispatches
    if (sub.some((t) => /\/dispatches\b/.test(t))) return 'workflow dispatch API 호출';
    // gh api …/actions/runs/<id>/rerun(-failed-jobs) · …/actions/jobs/<id>/rerun — gh run rerun 과 같은 재실행 경로
    for (const t of sub) {
      const run = t.match(/actions\/runs\/(\d+)\/(rerun|rerun-failed-jobs)\b/);
      const job = t.match(/actions\/jobs\/(\d+)\/rerun\b/);
      if (!run && !job) continue;
      const fromPath = t.match(/repos\/([^/{}]+\/[^/{}]+)\/actions\//);
      const slug = fromPath ? fromPath[1] : repoSlug(args, cwd);
      const [kind, id] = run ? ['runs', run[1]] : ['jobs', job[1]];
      const jq = run ? '"\\(.path) \\(.name)"' : '.workflow_name';
      try {
        const info = ghJson(`repos/${slug}/actions/${kind}/${id}`, jq, cwd);
        return DEPLOY_NAME.test(info) ? `API 로 배포 workflow 재실행 (${kind} ${id} → ${info})` : null;
      } catch {
        return `${kind} ${id} 를 조회하지 못해 배포 여부를 확인할 수 없음`;
      }
    }
    return null;
  }

  // gh workflow run <target>
  if (sub[0] === 'workflow' && sub[1] === 'run') {
    const target = firstPositional(sub, 2);
    // 대상을 특정하지 못하면 거부한다(fail closed). 대화형 선택은 클라우드에서 어차피 실행되지 않는다.
    if (!target) return 'gh workflow run 의 대상 workflow 를 특정할 수 없음';
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
    if (!id) return 'gh run rerun 의 대상 run 을 특정할 수 없음'; // 대화형 선택 — fail closed
    if (!/^\d+$/.test(id)) return null;
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

/**
 * 명령 문자열에서 첫 번째 배포 판정 사유를 찾는다. 없으면 null.
 * @param {string} cmd
 * @param {string} cwd
 */
function findDeployReason(cmd, cwd) {
  for (const seg of segments(cmd)) {
    let reason = null;
    try {
      reason = check(seg, cwd);
    } catch {
      reason = null;
    }
    if (reason) return reason;
  }
  return null;
}

/**
 * PreToolUse 응답. 클라우드는 거부, 로컬은 승인 요청.
 * @param {string} reason
 * @param {boolean} cloud
 */
function decisionFor(reason, cloud) {
  return {
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: cloud ? 'deny' : 'ask',
      permissionDecisionReason: cloud
        ? `클라우드 세션에서는 운영 배포를 실행하지 않는다 (AGENTS.md §9): ${reason}. ` +
          '배포는 merge 후 자동 Delivery 를 따르거나 로컬 세션에서 승인 후 실행한다.'
        : `운영 배포 명령 — 통합 담당의 지시가 있을 때만 승인한다 (AGENTS.md §9): ${reason}. ` +
          '권한 모드와 관계없이 이 훅이 승인을 묻는다.',
    },
  };
}

function main() {
  let payload;
  try {
    payload = JSON.parse(readStdin() || '{}');
  } catch {
    return;
  }
  const cmd = payload?.tool_input?.command;
  if (typeof cmd !== 'string' || !cmd) return;
  const cwd = payload.cwd || process.cwd();

  const reason = findDeployReason(cmd, cwd);
  if (reason) process.stdout.write(JSON.stringify(decisionFor(reason, isCloud())));
}

main();
