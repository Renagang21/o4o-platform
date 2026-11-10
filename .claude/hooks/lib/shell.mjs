/**
 * PreToolUse 훅 공용 — Bash/PowerShell 명령 문자열을 분해한다.
 * heredoc 본문과 따옴표 안 문자열은 명령으로 보지 않는다.
 */
import { spawnSync } from 'node:child_process';
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
 * 2026-11-09 로컬 auto 모드에서 훅이 ask 를 반환했는데도 승인 창 없이 실행됐다(gh label delete, #1009).
 * 이 목록 밖의 모드(auto · bypassPermissions · dontAsk · 알 수 없는 값 · permission_mode 없음)에서는 ask 를 쓰지 않고,
 * 훅이 직접 OS 확인 대화상자를 띄워 사람의 응답을 받는다(approvalFor · 2026-11-10). 띄울 수 없으면 deny(fail closed).
 */
export const PROMPTING_MODES = new Set(['default', 'acceptEdits', 'plan']);

export const CONFIRM_DIALOG_SECONDS = 120;

/**
 * 훅이 직접 띄우는 OS 확인 대화상자 — 모델이 누를 수 없는 사람 승인 경로.
 * - Windows: WScript.Shell Popup(예/아니요 · 기본 버튼 '아니요' · 항상 위 · 120초 뒤 자동 닫힘).
 * - macOS: osascript display dialog(기본 버튼 '거부' · 120초 뒤 닫힘).
 * - 그 밖(Linux 클라우드 등) · 실행 실패 → 'unavailable'.
 * - `O4O_HOOK_CONFIRM_DIALOG=off` 이면 띄우지 않는다(테스트용). 어떤 환경 변수로도 'yes' 를 만들 수 없다.
 * 제목 · 본문은 환경 변수로 넘겨 따옴표 해석 문제를 피한다.
 * @returns {'yes'|'no'|'timeout'|'unavailable'}
 */
export function confirmDialog(title, text, seconds = CONFIRM_DIALOG_SECONDS) {
  if (process.env.O4O_HOOK_CONFIRM_DIALOG === 'off') return 'unavailable';
  const env = { ...process.env, O4O_DLG_TITLE: title, O4O_DLG_TEXT: text };
  const opts = { env, timeout: (seconds + 15) * 1000, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], windowsHide: true };
  try {
    if (process.platform === 'win32') {
      // 4 = 예/아니요 · 48 = 경고 아이콘 · 256 = 두 번째 버튼(아니요) 기본 · 4096 = 항상 위(system modal)
      const script =
        '$s = New-Object -ComObject WScript.Shell; ' +
        `$r = $s.Popup($env:O4O_DLG_TEXT, ${seconds}, $env:O4O_DLG_TITLE, 4 + 48 + 256 + 4096); [Console]::Out.Write($r)`;
      const r = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', script], opts);
      const out = String(r.stdout ?? '').trim();
      if (out === '6') return 'yes';
      if (out === '7') return 'no';
      if (out === '-1') return 'timeout';
      return 'unavailable';
    }
    if (process.platform === 'darwin') {
      const script =
        'set r to display dialog (system attribute "O4O_DLG_TEXT") with title (system attribute "O4O_DLG_TITLE") ' +
        `buttons {"거부", "승인"} default button "거부" with icon caution giving up after ${seconds}\n` +
        'if gave up of r then return "timeout"\nreturn button returned of r';
      const r = spawnSync('osascript', ['-e', script], opts);
      const out = String(r.stdout ?? '').trim();
      if (r.status !== 0) return out ? 'unavailable' : 'no'; // 취소(-128)도 0 이 아니다 → 거부 취급
      if (out === '승인') return 'yes';
      if (out === 'timeout') return 'timeout';
      return 'no';
    }
  } catch {
    /* fall through */
  }
  return 'unavailable';
}

/**
 * 로컬 위험 명령의 승인 판정.
 * - 승인 창이 뜨는 모드 → 'ask'(Claude Code 승인 창).
 * - 그 밖의 모드 → 훅이 OS 확인 대화상자를 띄운다. '예' 만 'allow', 아니요 · 시간 초과 · 띄울 수 없음은 'deny'.
 * @param {unknown} permissionMode PreToolUse 입력의 permission_mode
 * @returns {{ decision: 'ask'|'allow'|'deny', note: string }}
 */
export function approvalFor(permissionMode, { title, reason, command }) {
  if (PROMPTING_MODES.has(permissionMode)) return { decision: 'ask', note: '' };
  const shown = String(command ?? '').replace(/\s+/g, ' ').trim().slice(0, 400);
  const text =
    `Claude Code 가 승인이 필요한 명령을 실행하려 합니다.\n\n사유: ${reason}\n\n명령: ${shown}\n\n` +
    `실행을 허용하려면 '예'를 누르세요. ${CONFIRM_DIALOG_SECONDS}초 안에 응답이 없으면 거부합니다.`;
  const result = confirmDialog(title, text);
  const mode = permissionMode || '알 수 없음';
  if (result === 'yes') return { decision: 'allow', note: ` 권한 모드 ${mode} — 사용자가 확인 대화상자에서 승인했다.` };
  const why = {
    no: '사용자가 확인 대화상자에서 거부했다',
    timeout: `확인 대화상자에 ${CONFIRM_DIALOG_SECONDS}초 동안 응답이 없었다`,
    unavailable: '확인 대화상자를 띄울 수 없었다',
  }[result];
  return {
    decision: 'deny',
    note:
      ` 권한 모드 ${mode} 에서는 Claude Code 승인 창이 뜨지 않아 확인 대화상자로 물었으나 ${why}. ` +
      '다시 실행해 대화상자에서 승인하거나, default 모드로 바꾼 뒤(Shift+Tab) 다시 실행하거나, 사용자가 직접 실행한다.',
  };
}
