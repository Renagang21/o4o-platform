/**
 * PreToolUse 훅 공용 — Bash/PowerShell 명령 문자열을 분해한다.
 * heredoc 본문과 따옴표 안 문자열은 명령으로 보지 않는다.
 */
import { readFileSync } from 'node:fs';

export function readStdin() {
  try {
    return readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

/** 따옴표를 고려한 단순 토큰 분리 */
export function tokenize(segment) {
  const out = [];
  const re = /"([^"]*)"|'([^']*)'|(\S+)/g;
  let m;
  while ((m = re.exec(segment))) out.push(m[1] ?? m[2] ?? m[3]);
  return out;
}

/** heredoc 본문(<<EOF … EOF)은 명령이 아니라 데이터이므로 지운다 */
export function stripHeredocs(cmd) {
  const lines = cmd.split('\n');
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    out.push(lines[i]);
    const m = lines[i].match(/<<-?\s*(['"]?)([A-Za-z_][\w-]*)\1/);
    if (!m) continue;
    const end = m[2];
    while (i + 1 < lines.length && lines[i + 1].trim() !== end) i++;
    i++; // 종료 구분자 줄
  }
  return out.join('\n');
}

/** 따옴표 밖의 ; & | 줄바꿈 에서만 나눈다 (커밋 메시지 같은 따옴표 안 문자열은 명령으로 보지 않는다) */
export function segments(cmd) {
  const src = stripHeredocs(cmd);
  const out = [];
  let cur = '';
  let q = null;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (q) {
      if (c === q) q = null;
      else if (c === '\\' && q === '"') cur += src[i++];
      cur += c;
      continue;
    }
    // 줄 연속(백슬래시 + 줄바꿈)은 bash 처럼 공백 없이 제거한다 — `:\<LF>branch` 는 `:branch` 한 인자다.
    if (c === '\\' && (src[i + 1] === '\n' || (src[i + 1] === '\r' && src[i + 2] === '\n'))) {
      i += src[i + 1] === '\r' ? 2 : 1;
      continue;
    }
    if (c === '"' || c === "'") {
      q = c;
      cur += c;
      continue;
    }
    if (c === ';' || c === '&' || c === '|' || c === '\n') {
      out.push(cur);
      cur = '';
      continue;
    }
    cur += c;
  }
  out.push(cur);
  return out.map((s) => s.trim()).filter(Boolean);
}

/** 명령 위치의 토큰 index (VAR=값 · sudo · env 등 접두어를 건너뛴다) */
export function commandIndex(tokens) {
  const prefixes = new Set(['sudo', 'env', 'command', 'exec', 'time', 'nohup', 'call', '&', '(', '{']);
  let i = 0;
  while (i < tokens.length && (prefixes.has(tokens[i]) || /^[A-Za-z_]\w*=/.test(tokens[i]))) i++;
  return i;
}

export const baseName = (t = '') => t.split(/[\\/]/).pop().replace(/\.(cmd|exe)$/i, '').toLowerCase();

/**
 * 훅의 "ask" 가 실제 승인 창으로 이어지는 권한 모드.
 * 2026-11-09 로컬 auto 모드에서 훅이 ask 를 반환했는데도 승인 창 없이 실행됐다(gh label delete).
 * 그래서 이 목록 밖의 모드(auto · bypassPermissions · dontAsk · 알 수 없는 값 · permission_mode 없음)에서는
 * ask 대신 deny 로 막는다(fail closed). 사용자는 default 모드로 바꾼 뒤 다시 실행하거나 직접 실행한다.
 */
export const PROMPTING_MODES = new Set(['default', 'acceptEdits', 'plan']);

/** @param {unknown} permissionMode PreToolUse 입력의 permission_mode */
export const askOrDeny = (permissionMode) => (PROMPTING_MODES.has(permissionMode) ? 'ask' : 'deny');

/** deny 로 바뀐 경우 사유 끝에 붙이는 안내 */
export const modeDenyNote = (permissionMode) =>
  ` 현재 권한 모드(${permissionMode ?? '알 수 없음'})에서는 승인 창이 뜨지 않으므로 거부했다 — ` +
  'default 모드로 바꾼 뒤(Shift+Tab) 다시 실행하거나 사용자가 직접 실행한다.';
