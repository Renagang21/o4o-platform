/**
 * Security Log Redaction
 *
 * WO-O4O-TRUSTED-CLIENT-IP-AND-SECURITY-LOG-REDACTION-V1
 *
 * 배경:
 *   `securityMiddleware.sqlInjectionDetection` 은 탐지 시 `details: { query, body, params }` 로
 *   **요청 전문**을 보안 로그에 남겼다. 탐지 패턴에 `--` · `;` · `|` 가 포함돼 있어
 *   **비밀번호에 이 문자가 들어가면 로그인 요청이 그대로 걸리고 비밀번호가 로그에 적재**된다.
 *   이 경로의 로거(`utils/logger.ts`)는 winston 기반이며 redaction 설정이 없다
 *   (`common/logger/index.ts` 의 pino redact 는 이 경로에 적용되지 않는다).
 *
 * 원칙:
 *   1. 보안 이벤트 로그에 요청 값 전문을 담지 않는다 — **필드 이름만** 남기는 것을 기본으로 한다.
 *   2. 값을 남겨야 하는 경우에도 민감 키는 `[REDACTED]` 로 치환한다.
 *   3. 로그 폭주 방지를 위해 깊이·개수·길이 상한을 둔다.
 */

/** 민감 키 판정 — 부분 일치(대소문자 무시). snake/camel/kebab 표기를 함께 커버한다. */
const SENSITIVE_KEY_PATTERNS: readonly RegExp[] = [
  /pass(word|wd)?/i,
  /^pwd$/i,
  /token/i,          // token, accessToken, refreshToken, csrfToken ...
  /secret/i,
  /credential/i,
  /authorization/i,
  /^auth$/i,
  /cookie/i,
  /session[-_]?id/i,
  /api[-_]?key/i,
  /private[-_]?key/i,
  /client[-_]?secret/i,
  /\botp\b/i,
  /^pin$/i,
  /card[-_]?number/i,
  /\bcvv\b/i,
  /ssn/i,
  /resident[-_]?number/i,   // 주민등록번호
];

export const REDACTED = '[REDACTED]';

/** 키 이름이 민감 필드인지 판정한다. */
export function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEY_PATTERNS.some((re) => re.test(key));
}

const MAX_DEPTH = 3;
const MAX_KEYS = 30;
const MAX_ARRAY = 10;
const MAX_STRING = 200;

/**
 * 민감 키를 `[REDACTED]` 로 치환한 **새 값**을 돌려준다. 입력은 변형하지 않는다.
 * 깊이·개수·문자열 길이에 상한을 두어 로그 폭주를 막는다.
 */
export function redactSensitive(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined) return value;

  if (typeof value === 'string') {
    return value.length > MAX_STRING ? `${value.slice(0, MAX_STRING)}…[truncated]` : value;
  }
  if (typeof value !== 'object') return value;
  if (depth >= MAX_DEPTH) return '[Object]';

  if (Array.isArray(value)) {
    const out = value.slice(0, MAX_ARRAY).map((v) => redactSensitive(v, depth + 1));
    if (value.length > MAX_ARRAY) out.push(`…(+${value.length - MAX_ARRAY} more)`);
    return out;
  }

  const src = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  let count = 0;
  for (const key of Object.keys(src)) {
    if (count >= MAX_KEYS) {
      out['…'] = `(+${Object.keys(src).length - MAX_KEYS} more keys)`;
      break;
    }
    out[key] = isSensitiveKey(key) ? REDACTED : redactSensitive(src[key], depth + 1);
    count++;
  }
  return out;
}

/**
 * 탐지된 필드의 **이름만** 수집한다 (값은 담지 않는다).
 * 보안 이벤트 로그의 기본 형태 — "어디서 걸렸는지"만 남기고 "무엇이 들어왔는지"는 남기지 않는다.
 */
export function suspiciousFieldNames(
  source: unknown,
  predicate: (value: unknown) => boolean,
): string[] {
  if (!source || typeof source !== 'object') return [];
  const out: string[] = [];
  for (const [key, val] of Object.entries(source as Record<string, unknown>)) {
    if (predicate(val)) out.push(key);
    if (out.length >= MAX_KEYS) break;
  }
  return out;
}
