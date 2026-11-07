#!/usr/bin/env node
/**
 * PreToolUse 훅 — 모든 세션(클라우드 · 로컬)에서 콜론 refspec 으로 원격 branch 를 지우는 push 를 거부한다
 * (AGENTS.md §9: 원격 branch 삭제는 승인 필수 · settings deny).
 *
 * 왜 훅인가: `git push origin :<branch>` 를 permission 패턴으로 쓰면 `Bash(git push * :*)` 처럼 `:*` 로 끝나는데,
 * 끝의 `:*` 는 접두어 일치 문법과 겹쳐 의도대로 매칭되지 않는다(2026-11-07 실측). `--delete` · `-d` · force ·
 * main push 는 settings.json deny 가 그대로 막는다.
 *
 * 거부: git [-C <path>] [-c <k=v>] push … :<ref> | +:<ref>   (`:` · `+:` 단독 = matching push 는 삭제가 아니므로 통과)
 * 예외는 허용(exit 0)으로 넘겨 일반 명령을 막지 않는다.
 */
import { baseName, commandIndex, readStdin, segments, tokenize } from './lib/shell.mjs';

function deletesRemoteRef(segment) {
  const tokens = tokenize(segment.replace(/^[({]\s*/, ''));
  let i = commandIndex(tokens);
  if (baseName(tokens[i]) !== 'git') return null;
  i++;
  // git 전역 옵션을 건너뛰고 서브커맨드를 찾는다.
  while (i < tokens.length && tokens[i].startsWith('-')) {
    if (tokens[i] === '-C' || tokens[i] === '-c') i++;
    i++;
  }
  if (tokens[i] !== 'push') return null;
  // `:<ref>` 와 강제 표기 `+:<ref>` 모두 원격 삭제다. `:` · `+:` 단독(matching push)은 제외.
  const ref = tokens.slice(i + 1).find((t) => {
    if (t.startsWith('-')) return false;
    const r = t.replace(/^\+/, '');
    return r.startsWith(':') && r.length > 1;
  });
  return ref ?? null;
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

  for (const seg of segments(cmd)) {
    let ref = null;
    try {
      ref = deletesRemoteRef(seg);
    } catch {
      ref = null;
    }
    if (ref) {
      process.stdout.write(
        JSON.stringify({
          hookSpecificOutput: {
            hookEventName: 'PreToolUse',
            permissionDecision: 'deny',
            permissionDecisionReason:
              `원격 branch 삭제(${ref})는 Claude 안에서 실행하지 않는다 (AGENTS.md §9). ` +
              '필요하면 사용자가 GitHub 에서 직접 삭제한다.',
          },
        }),
      );
      return;
    }
  }
}

main();
