/**
 * Computer Use V0 — 인자 계약 (순수)
 *
 * WO-O4O-COMPUTER-USE-V0 §15~§20·§25~§27
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 이 파일이 정하는 것
 *
 *   서버가 agent 로 보낼 수 있는 **유일한 세 가지 인자 형상**과, 그 값의 검증 규칙이다.
 *
 *     click     → { x, y }   client 영역 기준 정규화 좌표 0..1 (§15 — V0 는 이 하나로 canonical)
 *     type_text → { text }   일반 텍스트 1~500 자, 제어문자 없음 (§17·§27)
 *     key       → { key }    ENTER | TAB | ESC 뿐 (§19·§20)
 *
 *   이 셋 밖의 형상은 존재하지 않는다. "hotkey 문자열" · "키 조합" · "스크롤" · "드래그" ·
 *   "우클릭" · "더블클릭" 을 담을 칸이 없다(§5·§22). 칸이 없으면 실수로 열 수도 없다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ 서버와 agent 가 **같은 규칙을 각자** 검사한다 (§20·§25·§26)
 *
 *   `tools/o4o-local-agent/src/computer-use-limits.mjs` 가 agent 쪽 사본이다. 서버가 (버그로든
 *   변조로든) 규칙 밖 값을 보내도 agent 가 다시 거절한다. 두 목록이 어긋나면 서버 테스트가
 *   실패한다(양쪽 파일을 함께 읽어 비교한다).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ 텍스트 검사는 "credential 을 걸러내는 필터" 가 아니다 (§3·§17·§34)
 *
 *   로그인 대행 금지는 **경로 부재**로 지킨다 — 로그인 요청은 type_text tool 자체가 선택되지
 *   않고(라우터), 로그인 창이 앞에 있으면 agent 가 실행하지 않는다(창 제목 표식). 아래
 *   `TEXT_DENY_PATTERNS` 는 그 위에 얹은 **마지막 안전망**이며, 이것만으로 안전하다고 보지 않는다.
 */

// ─── 한도 ────────────────────────────────────────────────────────────────────

/** §27 텍스트 길이 상한. 짧은 입력만 — 문서 붙여넣기 · 대량 입력 용도가 아니다. */
export const COMPUTER_TEXT_MAX_LENGTH = 500;
export const COMPUTER_TEXT_MIN_LENGTH = 1;

/** §19 허용 특수키. 이 셋 외에는 이름조차 없다 — WIN · ALT+F4 · CTRL+ALT+DEL 은 표현 불가. */
export const COMPUTER_ALLOWED_KEYS: readonly string[] = Object.freeze(['ENTER', 'TAB', 'ESC']);

/** §31 한 요청당 상호작용 상한. inspect 는 세지 않는다(읽기). activate 도 창 축이라 따로다. */
export const MAX_COMPUTER_ACTIONS_PER_REQUEST = 1;

// ─── 인자 형상 ───────────────────────────────────────────────────────────────

export interface ComputerClickArgs {
  /** client 영역 가로 위치, 0..1. */
  x: number;
  /** client 영역 세로 위치, 0..1. */
  y: number;
}

export interface ComputerTextArgs {
  text: string;
}

export interface ComputerKeyArgs {
  key: string;
}

export type ComputerActionArgs = ComputerClickArgs | ComputerTextArgs | ComputerKeyArgs;

// ─── 검증 ────────────────────────────────────────────────────────────────────

/**
 * 정규화 좌표. **닫힌 구간 [0,1]** 이고 유한한 수여야 한다.
 *
 * 픽셀 좌표를 받지 않는다(§15 canonical 하나). 픽셀로 바꾸는 것은 agent 가 실제 client 크기를
 * 알게 된 순간에만 한다. 범위 밖은 여기서 끝나며 명령이 발행되지 않는다(§16).
 */
export function isValidNormalizedCoordinate(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1;
}

export function validateClickArgs(args: unknown): { ok: boolean; args?: ComputerClickArgs } {
  if (!args || typeof args !== 'object' || Array.isArray(args)) return { ok: false };
  const keys = Object.keys(args as Record<string, unknown>).sort();
  if (keys.length !== 2 || keys[0] !== 'x' || keys[1] !== 'y') return { ok: false };
  const { x, y } = args as Record<string, unknown>;
  if (!isValidNormalizedCoordinate(x) || !isValidNormalizedCoordinate(y)) return { ok: false };
  return { ok: true, args: { x, y } };
}

/**
 * 제어문자 금지 — 줄바꿈도 포함이다. ENTER 는 key tool 로만 낼 수 있다(§17·§19).
 * 그래야 "텍스트 안에 개행을 섞어 여러 줄 명령을 흘리는" 형태가 성립하지 않는다.
 */
// eslint-disable-next-line no-control-regex -- 제어문자 자체를 거르는 규칙이다
const CONTROL_CHAR_RE = /[\u0000-\u001f\u007f-\u009f]/;

/**
 * §17 금지 문자열 — credential 성격 · shell 명령 조립 성격.
 *
 * ASCII 만 정규식 리터럴에 두고 한글 표식은 문자열 배열로 둔다 (esbuild ascii charset 함정 —
 * `ai-tool-router.ts` 머리말 참조).
 */
const TEXT_DENY_PATTERNS_ASCII: readonly RegExp[] = Object.freeze([
  /passw(or)?d/i,
  /\bpwd\b/i,
  /\botp\b/i,
  /credential/i,
  /\bsecret\b/i,
  /api[_-]?key/i,
  /\btoken\b/i,
  // shell 조립 성격 — 시작 토큰 · 연결자 · 치환.
  /^\s*(cmd|cmd\.exe|powershell|pwsh|bash|sh|wsl)\b/i,
  /&&|\|\||\|\s*[A-Za-z]|;\s*(rm|del|format|reg|net|sc|taskkill|shutdown)\b/i,
  /\$\(|`|\bInvoke-|\biex\b|\bcurl\b|\bwget\b/i,
  /\b(rm|del|rmdir|format|shutdown|taskkill|reg)\s+[-/\\]/i,
]);
const TEXT_DENY_KEYWORDS_KO: readonly string[] = Object.freeze([
  '비밀번호', // 비밀번호
  '비번', // 비번
  '암호', // 암호
  '인증번호', // 인증번호
  '공동인증', // 공동인증
  '공인인증', // 공인인증
  '보안카드', // 보안카드
]);

export type ComputerTextDenyReason = 'EMPTY' | 'TOO_LONG' | 'CONTROL_CHAR' | 'DENIED_CONTENT';

export function validateTextArgs(
  args: unknown,
): { ok: boolean; args?: ComputerTextArgs; reason?: ComputerTextDenyReason | 'SHAPE' } {
  if (!args || typeof args !== 'object' || Array.isArray(args)) return { ok: false, reason: 'SHAPE' };
  const keys = Object.keys(args as Record<string, unknown>);
  if (keys.length !== 1 || keys[0] !== 'text') return { ok: false, reason: 'SHAPE' };
  const text = (args as Record<string, unknown>).text;
  if (typeof text !== 'string') return { ok: false, reason: 'SHAPE' };
  const reason = textDenyReason(text);
  if (reason) return { ok: false, reason };
  return { ok: true, args: { text } };
}

/** 텍스트 하나에 대한 거절 사유. 통과하면 null. agent 쪽 사본과 규칙이 같아야 한다. */
export function textDenyReason(text: string): ComputerTextDenyReason | null {
  if (text.length < COMPUTER_TEXT_MIN_LENGTH || text.trim().length === 0) return 'EMPTY';
  if (text.length > COMPUTER_TEXT_MAX_LENGTH) return 'TOO_LONG';
  if (CONTROL_CHAR_RE.test(text)) return 'CONTROL_CHAR';
  const compact = text.replace(/\s+/g, '');
  if (TEXT_DENY_KEYWORDS_KO.some((k) => compact.includes(k))) return 'DENIED_CONTENT';
  if (TEXT_DENY_PATTERNS_ASCII.some((re) => re.test(text))) return 'DENIED_CONTENT';
  return null;
}

export function validateKeyArgs(args: unknown): { ok: boolean; args?: ComputerKeyArgs } {
  if (!args || typeof args !== 'object' || Array.isArray(args)) return { ok: false };
  const keys = Object.keys(args as Record<string, unknown>);
  if (keys.length !== 1 || keys[0] !== 'key') return { ok: false };
  const key = (args as Record<string, unknown>).key;
  // 대소문자 정규화도 하지 않는다 — 정확히 'ENTER' | 'TAB' | 'ESC' 만. 조합('CTRL+…')은 표현 불가.
  if (typeof key !== 'string' || !COMPUTER_ALLOWED_KEYS.includes(key)) return { ok: false };
  return { ok: true, args: { key } };
}
