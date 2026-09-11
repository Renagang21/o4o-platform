/**
 * Computer Use V0 — agent 쪽 인자 한도 (서버 `computer-use-contract.ts` 의 사본)
 *
 * WO-O4O-COMPUTER-USE-V0 §15~§20·§26·§27
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 서버가 이미 검사한 값을 **여기서 다시 검사한다** (§26 "agent 도 서버를 믿지 않는다")
 *
 *   서버 버그 · 변조 · 중간자 어느 경우든, 이 파일의 규칙 밖 값은 PowerShell 경계를 넘지
 *   못한다. 규칙은 서버와 **글자 단위로 같아야** 한다 — 서버 테스트가 양쪽 파일을 읽어
 *   상수와 금지 패턴을 대조한다. 한쪽만 고치면 그 테스트가 실패한다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 이 파일은 순수 함수뿐이다. `child_process` · `fs` · `os` 를 가져오지 않는다.
 */

/** §27 텍스트 길이 상한. */
export const COMPUTER_TEXT_MAX_LENGTH = 500;
export const COMPUTER_TEXT_MIN_LENGTH = 1;

/** §19 허용 특수키. 이 셋 외에는 이름조차 없다. */
export const COMPUTER_ALLOWED_KEYS = Object.freeze(['ENTER', 'TAB', 'ESC']);

/** 정규화 좌표 — 닫힌 구간 [0,1] 의 유한한 수. 픽셀은 받지 않는다(§15). */
export function isValidNormalizedCoordinate(v) {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1;
}

export function validateClickArgs(args) {
  if (!args || typeof args !== 'object' || Array.isArray(args)) return { ok: false };
  const keys = Object.keys(args).sort();
  if (keys.length !== 2 || keys[0] !== 'x' || keys[1] !== 'y') return { ok: false };
  const { x, y } = args;
  if (!isValidNormalizedCoordinate(x) || !isValidNormalizedCoordinate(y)) return { ok: false };
  return { ok: true, args: { x, y } };
}

/** 제어문자 금지 — 줄바꿈 포함. ENTER 는 key 로만(§17·§19). */
const CONTROL_CHAR_RE = /[\u0000-\u001f\u007f-\u009f]/;

/** §17 금지 문자열 — credential 성격 · shell 명령 조립 성격. 서버 사본과 동일해야 한다. */
const TEXT_DENY_PATTERNS_ASCII = Object.freeze([
  /passw(or)?d/i,
  /\bpwd\b/i,
  /\botp\b/i,
  /credential/i,
  /\bsecret\b/i,
  /api[_-]?key/i,
  /\btoken\b/i,
  /^\s*(cmd|cmd\.exe|powershell|pwsh|bash|sh|wsl)\b/i,
  /&&|\|\||\|\s*[A-Za-z]|;\s*(rm|del|format|reg|net|sc|taskkill|shutdown)\b/i,
  /\$\(|`|\bInvoke-|\biex\b|\bcurl\b|\bwget\b/i,
  /\b(rm|del|rmdir|format|shutdown|taskkill|reg)\s+[-/\\]/i,
]);
const TEXT_DENY_KEYWORDS_KO = Object.freeze([
  '비밀번호',
  '비번',
  '암호',
  '인증번호',
  '공동인증',
  '공인인증',
  '보안카드',
]);

/** 텍스트 하나에 대한 거절 사유. 통과하면 null. */
export function textDenyReason(text) {
  if (typeof text !== 'string') return 'SHAPE';
  if (text.length < COMPUTER_TEXT_MIN_LENGTH || text.trim().length === 0) return 'EMPTY';
  if (text.length > COMPUTER_TEXT_MAX_LENGTH) return 'TOO_LONG';
  if (CONTROL_CHAR_RE.test(text)) return 'CONTROL_CHAR';
  const compact = text.replace(/\s+/g, '');
  if (TEXT_DENY_KEYWORDS_KO.some((k) => compact.includes(k))) return 'DENIED_CONTENT';
  if (TEXT_DENY_PATTERNS_ASCII.some((re) => re.test(text))) return 'DENIED_CONTENT';
  return null;
}

export function validateTextArgs(args) {
  if (!args || typeof args !== 'object' || Array.isArray(args)) return { ok: false, reason: 'SHAPE' };
  const keys = Object.keys(args);
  if (keys.length !== 1 || keys[0] !== 'text') return { ok: false, reason: 'SHAPE' };
  const reason = textDenyReason(args.text);
  if (reason) return { ok: false, reason };
  return { ok: true, args: { text: args.text } };
}

export function validateKeyArgs(args) {
  if (!args || typeof args !== 'object' || Array.isArray(args)) return { ok: false };
  const keys = Object.keys(args);
  if (keys.length !== 1 || keys[0] !== 'key') return { ok: false };
  const { key } = args;
  if (typeof key !== 'string' || !COMPUTER_ALLOWED_KEYS.includes(key)) return { ok: false };
  return { ok: true, args: { key } };
}

/**
 * §13·§34·§41 — 사용자가 직접 처리해야 하는 창 제목 표식.
 *
 * 대상 창 제목이 이 표식을 담고 있으면 상호작용을 **실행하지 않고** USER_ACTION_REQUIRED 로
 * 끝낸다. 로그인 폼 · 파일 대화상자에 O4O 가 입력을 넣는 경로를 여기서 끊는다.
 * 제목 자체는 agent 밖으로 나가지 않는다 — 판정 결과(boolean)만 나간다.
 */
const USER_ACTION_TITLE_MARKERS = Object.freeze([
  'login',
  'log in',
  'sign in',
  'sign-in',
  'passw',
  'otp',
  '로그인',
  '암호',
  '비밀번호',
  '인증',
  // 파일 대화상자 (§41)
  'save as',
  '다른 이름으로 저장',
  '열기',
  'open file',
  '저장',
]);

export function isUserActionTitle(title) {
  const t = String(title ?? '').toLowerCase();
  if (!t) return false;
  return USER_ACTION_TITLE_MARKERS.some((m) => t.includes(m));
}
